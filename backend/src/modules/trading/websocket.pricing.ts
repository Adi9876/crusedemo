import { WebSocket } from 'ws';
import { env } from '../../config/env.js';
import { MatchingEngine } from './matching.engine.js';
import { MarketService } from '../market/market.service.js';

// Supported trading symbols (converted to uppercase with USDT for Bybit subscription)
const SUPPORTED_SYMBOLS = [
  'btc', 'eth', 'bnb', 'sol', 'xrp',
  'ada', 'doge', 'pol', 'avax', 'link', 'usdc'
];

export class WebSocketPricingService {
  private static ws: WebSocket | null = null;
  private static reconnectTimeout: NodeJS.Timeout | null = null;
  private static pingInterval: NodeJS.Timeout | null = null;
  private static reconnectInterval = 5000; // 5 seconds
  private static isShuttingDown = false;

  /**
   * Initializes and starts the real-time WebSocket connection to Bybit.
   */
  static start(): void {
    if (this.ws) {
      console.log('[WebSocketPricingService] Already running');
      return;
    }

    this.isShuttingDown = false;
    const url = env.BYBIT_USE_TESTNET === 'true'
      ? 'wss://stream-testnet.bybit.com/v5/public/spot'
      : 'wss://stream.bybit.com/v5/public/spot';

    console.log(`[WebSocketPricingService] Connecting to Bybit live ticker streams (${url})...`);

    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log('[WebSocketPricingService] WebSocket connected successfully to Bybit ticker streams');
        this.reconnectInterval = 5000; // Reset reconnect timer

        // Subscribe to tickers for supported symbols
        // POL uses POLUSDT, USDC uses USDCUSDT, all others use SYMBOLUSDT
        // Bybit limits each subscribe message to max 10 topics — split into batches
        const args = SUPPORTED_SYMBOLS.map((sym) => {
          const upper = sym.toUpperCase();
          if (upper === 'USDC') return 'tickers.USDCUSDT';
          return `tickers.${upper}USDT`;
        });

        const BATCH_SIZE = 10;
        for (let i = 0; i < args.length; i += BATCH_SIZE) {
          const batch = args.slice(i, i + BATCH_SIZE);
          const subscribePayload = { op: 'subscribe', args: batch };
          setTimeout(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify(subscribePayload));
            }
          }, i === 0 ? 0 : 200 * (i / BATCH_SIZE));
        }

        // Start ping interval (every 20s) to keep connection alive
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
        }
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ op: 'ping' }));
          }
        }, 20000);
      });

      this.ws.on('message', (rawData) => {
        try {
          const payload = JSON.parse(rawData.toString());
          // console.log('[WebSocketPricingService] Received WS payload:', JSON.stringify(payload));

          // Handle pong or other message types if needed, but only tickers topic updates matching engine
          if (payload.topic && payload.topic.startsWith('tickers.') && payload.data) {
            const tickerData = payload.data;
            if (tickerData.symbol && tickerData.lastPrice) {
              const bybitSymbol = String(tickerData.symbol);
              const currentPrice = parseFloat(tickerData.lastPrice);

              // Map Bybit symbols back to our internal symbols:
              // POLUSDT -> POL, USDCUSDT -> USDC, BTCUSDT -> BTC, etc.
              let symbol: string;
              if (bybitSymbol === 'USDCUSDT') {
                symbol = 'USDC';
              } else if (bybitSymbol === 'POLUSDT') {
                symbol = 'POL';
              } else {
                symbol = bybitSymbol.replace(/USDT$/, '').toUpperCase();
              }

              // Update ticker REST cache in real-time
              MarketService.updateTickerInCache(symbol, {
                price: currentPrice,
                change24h: tickerData.price24hPcnt ? parseFloat(tickerData.price24hPcnt) * 100 : undefined,
                high24h: tickerData.highPrice24h ? parseFloat(tickerData.highPrice24h) : undefined,
                low24h: tickerData.lowPrice24h ? parseFloat(tickerData.lowPrice24h) : undefined,
                volume24h: tickerData.turnover24h ? parseFloat(tickerData.turnover24h) : undefined,
              });

              // Run price checks in MatchingEngine asynchronously
              void MatchingEngine.checkMarketPriceUpdates(symbol, currentPrice);
            }
          }
        } catch (parseErr) {
          console.error('[WebSocketPricingService] Error parsing message payload:', parseErr);
        }
      });

      this.ws.on('close', (code, reason) => {
        console.warn(`[WebSocketPricingService] Connection closed (code: ${code}, reason: ${reason.toString() || 'none'})`);
        this.cleanupSession();
        this.triggerReconnect();
      });

      this.ws.on('error', (err) => {
        console.error('[WebSocketPricingService] Connection error:', err);
        // 'close' event will follow error and handle reconnection
      });
    } catch (connectionErr) {
      console.error('[WebSocketPricingService] Error initializing connection:', connectionErr);
      this.cleanupSession();
      this.triggerReconnect();
    }
  }

  /**
   * Cleans up the active connection session ping interval and instances.
   */
  private static cleanupSession(): void {
    this.ws = null;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Schedules a reconnection attempt.
   */
  private static triggerReconnect(): void {
    if (this.isShuttingDown) return;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    console.log(`[WebSocketPricingService] Attempting to reconnect in ${this.reconnectInterval / 1000} seconds...`);
    this.reconnectTimeout = setTimeout(() => {
      // Exponential backoff capped at 60s
      this.reconnectInterval = Math.min(this.reconnectInterval * 2, 60000);
      this.start();
    }, this.reconnectInterval);
  }

  /**
   * Terminate the WebSocket connection (useful for server shutdown).
   */
  static stop(): void {
    console.log('[WebSocketPricingService] Stopping service...');
    this.isShuttingDown = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.cleanupSession();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
