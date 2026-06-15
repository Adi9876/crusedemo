import crypto from 'crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';

export class ExchangeService {
  private getBaseUrl(): string {
    return env.BYBIT_USE_TESTNET === 'true'
      ? 'https://api-testnet.bybit.com'
      : 'https://api.bybit.com';
  }

  /**
   * Routes a spot order directly to the Bybit V5 API.
   */
  async createSpotOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'LIMIT' | 'MARKET',
    amount: string,
    price?: string
  ): Promise<{
    orderId: string;
    status: string;
    cummulativeQuoteQty: string;
    executedQty: string;
  }> {
    const baseUrl = this.getBaseUrl();
    const bybitSymbol = `${symbol.toUpperCase()}USDT`;

    const timestamp = Date.now().toString();
    const recvWindow = '5000';

    // Bybit V5 casing: Buy/Sell, Limit/Market
    const bybitSide = side === 'BUY' ? 'Buy' : 'Sell';
    const bybitType = type === 'LIMIT' ? 'Limit' : 'Market';

    const bodyPayload: Record<string, any> = {
      category: 'spot',
      symbol: bybitSymbol,
      side: bybitSide,
      orderType: bybitType,
      qty: amount,
    };

    if (type === 'LIMIT') {
      if (!price) {
        throw new AppError(400, 'EXCHANGE_ROUTING_ERROR', 'Price is required for LIMIT orders');
      }
      bodyPayload.price = price;
      bodyPayload.timeInForce = 'GTC'; // Good 'Til Cancelled
    }

    const jsonBodyString = JSON.stringify(bodyPayload);

    // Signature calculation: timestamp + apiKey + recvWindow + jsonBodyString
    const signatureText = timestamp + env.BYBIT_API_KEY + recvWindow + jsonBodyString;
    const signature = crypto
      .createHmac('sha256', env.BYBIT_API_SECRET)
      .update(signatureText)
      .digest('hex');

    const url = `${baseUrl}/v5/order/create`;

    console.log(`[ExchangeService] Routing order to Bybit: ${bybitSide} ${amount} ${symbol} @ ${price || 'MARKET'}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BAPI-API-KEY': env.BYBIT_API_KEY,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-SIGN': signature,
          'X-BAPI-RECV-WINDOW': recvWindow,
        },
        body: jsonBodyString,
      });

      const body = await response.json() as any;

      if (!response.ok || !body || body.retCode !== 0) {
        console.error(`[ExchangeService] Bybit API Error response:`, body);
        throw new AppError(
          502,
          'EXCHANGE_API_ERROR',
          `Bybit API error: ${body?.retMsg || response.statusText} (code: ${body?.retCode ?? 'unknown'})`
        );
      }

      const orderId = String(body.result?.orderId);
      console.log(`[ExchangeService] Order routed successfully. Bybit OrderID: ${orderId}`);
      return {
        orderId,
        status: 'PENDING_EXTERNAL',
        cummulativeQuoteQty: '0',
        executedQty: '0',
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.error(`[ExchangeService] Connection or execution error:`, err);
      throw new AppError(
        502,
        'EXCHANGE_CONNECTION_FAILED',
        `Failed to reach exchange or process order: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  async getExternalOrderStatus(orderId: string, symbol: string): Promise<{
    status: string;
    executedQty: string;
    cummulativeQuoteQty: string;
  }> {
    const baseUrl = this.getBaseUrl();
    const bybitSymbol = `${symbol.toUpperCase()}USDT`;
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    const queryString = `category=spot&symbol=${bybitSymbol}&orderId=${orderId}`;

    const signatureText = timestamp + env.BYBIT_API_KEY + recvWindow + queryString;
    const signature = crypto
      .createHmac('sha256', env.BYBIT_API_SECRET)
      .update(signatureText)
      .digest('hex');

    const url = `${baseUrl}/v5/order/realtime-order?${queryString}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-BAPI-API-KEY': env.BYBIT_API_KEY,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-SIGN': signature,
          'X-BAPI-RECV-WINDOW': recvWindow,
        },
      });

      const body = await response.json() as any;

      if (!response.ok || !body || body.retCode !== 0) {
        throw new AppError(
          502,
          'EXCHANGE_API_ERROR',
          `Bybit API error: ${body?.retMsg || response.statusText} (code: ${body?.retCode ?? 'unknown'})`
        );
      }

      const orderData = body.result?.list?.[0];
      if (!orderData) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found on Bybit');
      }

      return {
        status: orderData.orderStatus, // Bybit statuses: New, PartiallyFilled, Filled, Cancelled, Rejected
        executedQty: orderData.cumExecQty,
        cummulativeQuoteQty: orderData.cumExecValue,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        502,
        'EXCHANGE_CONNECTION_FAILED',
        `Failed to fetch order status: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  async getWalletBalances(): Promise<Array<{ currency: string; balance: string; locked: string; available: string }>> {
    try {
      return await this.fetchBalancesFromBybit('UNIFIED');
    } catch (err) {
      console.log('[ExchangeService] Failed to fetch UNIFIED balances, trying SPOT...', err);
      try {
        return await this.fetchBalancesFromBybit('SPOT');
      } catch (err2) {
        console.error('[ExchangeService] Failed to fetch SPOT balances too:', err2);
        throw err2;
      }
    }
  }

  private async fetchBalancesFromBybit(accountType: 'UNIFIED' | 'SPOT'): Promise<Array<{ currency: string; balance: string; locked: string; available: string }>> {
    const baseUrl = this.getBaseUrl();
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    const queryString = `accountType=${accountType}`;
    
    const signatureText = timestamp + env.BYBIT_API_KEY + recvWindow + queryString;
    const signature = crypto
      .createHmac('sha256', env.BYBIT_API_SECRET)
      .update(signatureText)
      .digest('hex');
      
    const url = `${baseUrl}/v5/account/wallet-balance?${queryString}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': env.BYBIT_API_KEY,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-SIGN': signature,
        'X-BAPI-RECV-WINDOW': recvWindow,
      },
    });
    
    const text = await response.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (_) {}

    if (!response.ok || !body || body.retCode !== 0) {
      throw new Error(`Bybit balance fetch failed for ${accountType}: ${body?.retMsg || response.statusText || text || `HTTP ${response.status}`}`);
    }
    
    const coinList = body.result?.list?.[0]?.coin || [];
    return coinList.map((c: any) => ({
      currency: String(c.coin).toUpperCase(),
      balance: String(c.walletBalance || '0'),
      locked: String(c.locked || '0'),
      available: String(c.free || c.availableToWithdraw || c.walletBalance || '0'),
    }));
  }

  async getDepositAddress(coin: string, subMemberId?: string): Promise<{
    coin: string;
    chains: Array<{
      chainType: string;
      addressDeposit: string;
      tagDeposit: string;
      chain: string;
    }>;
  }> {
    const baseUrl = this.getBaseUrl();
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    let queryString = `coin=${coin.toUpperCase()}`;
    if (subMemberId) {
      queryString += `&subMemberId=${subMemberId}`;
    }
    
    const signatureText = timestamp + env.BYBIT_API_KEY + recvWindow + queryString;
    const signature = crypto
      .createHmac('sha256', env.BYBIT_API_SECRET)
      .update(signatureText)
      .digest('hex');
      
    const url = `${baseUrl}/v5/asset/deposit/query-address?${queryString}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': env.BYBIT_API_KEY,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-SIGN': signature,
        'X-BAPI-RECV-WINDOW': recvWindow,
      },
    });
    
    const body = await response.json() as any;
    if (!response.ok || !body || body.retCode !== 0) {
      throw new Error(`Bybit query deposit address failed: ${body?.retMsg || response.statusText}`);
    }
    
    return {
      coin: String(body.result?.coin),
      chains: (body.result?.chains || []).map((ch: any) => ({
        chainType: String(ch.chainType),
        addressDeposit: String(ch.addressDeposit),
        tagDeposit: String(ch.tagDeposit || ''),
        chain: String(ch.chain),
      })),
    };
  }

  async getDepositHistory(coin?: string): Promise<Array<{
    id: string;
    currency: string;
    amount: string;
    network: string;
    txHash: string;
    status: 'CONFIRMED' | 'FAILED' | 'PENDING';
    createdAt: Date;
  }>> {
    const baseUrl = this.getBaseUrl();
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    let queryString = '';
    if (coin) {
      queryString = `coin=${coin.toUpperCase()}`;
    }
    
    const signatureText = timestamp + env.BYBIT_API_KEY + recvWindow + queryString;
    const signature = crypto
      .createHmac('sha256', env.BYBIT_API_SECRET)
      .update(signatureText)
      .digest('hex');
      
    const url = `${baseUrl}/v5/asset/deposit/query-record?${queryString}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': env.BYBIT_API_KEY,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-SIGN': signature,
        'X-BAPI-RECV-WINDOW': recvWindow,
      },
    });
    
    const body = await response.json() as any;
    if (!response.ok || !body || body.retCode !== 0) {
      throw new Error(`Bybit query deposit records failed: ${body?.retMsg || response.statusText}`);
    }
    
    const rows = body.result?.rows || [];
    return rows.map((r: any) => {
      const rawStatus = Number(r.status);
      let status: 'CONFIRMED' | 'FAILED' | 'PENDING' = 'PENDING';
      if (rawStatus === 2) status = 'CONFIRMED';
      else if (rawStatus === 3) status = 'FAILED';
      
      return {
        id: String(r.id || r.txID || Math.random().toString(36).slice(2)),
        currency: String(r.coin).toUpperCase(),
        amount: String(r.amount),
        network: String(r.chain),
        txHash: String(r.txID || ''),
        status,
        createdAt: r.successAt ? new Date(Number(r.successAt)) : new Date(),
      };
    });
  }

  async createSubMember(username: string): Promise<string> {
    const baseUrl = this.getBaseUrl();
    const timestamp = Date.now().toString();
    const recvWindow = '5000';

    const bodyPayload = {
      username,
      memberType: 1, // 1: normal sub-account
    };

    const jsonBodyString = JSON.stringify(bodyPayload);

    const signatureText = timestamp + env.BYBIT_API_KEY + recvWindow + jsonBodyString;
    const signature = crypto
      .createHmac('sha256', env.BYBIT_API_SECRET)
      .update(signatureText)
      .digest('hex');

    const url = `${baseUrl}/v5/user/create-sub-member`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BAPI-API-KEY': env.BYBIT_API_KEY,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-SIGN': signature,
          'X-BAPI-RECV-WINDOW': recvWindow,
        },
        body: jsonBodyString,
      });

      const body = await response.json() as any;

      if (!response.ok || !body || body.retCode !== 0) {
        console.error(`[ExchangeService] Bybit Create Sub-Member Error response:`, body);
        throw new AppError(
          502,
          'EXCHANGE_API_ERROR',
          `Bybit sub-account creation error: ${body?.retMsg || response.statusText} (code: ${body?.retCode ?? 'unknown'})`
        );
      }

      const uid = String(body.result?.uid);
      console.log(`[ExchangeService] Sub-account created successfully. UID: ${uid}`);
      return uid;
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.error(`[ExchangeService] Connection or execution error creating sub-account:`, err);
      throw new AppError(
        502,
        'EXCHANGE_CONNECTION_FAILED',
        `Failed to reach exchange or process sub-account creation: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

