import type { MarketTicker } from '../hooks/useMarketData';

/** Stablecoins used as quote currency — not shown as tradable base assets */
export const QUOTE_CURRENCIES = new Set(['USDT', 'USDC']);

export function getTradeableMarkets(
  markets: MarketTicker[] | null | undefined
): MarketTicker[] {
  return (markets ?? []).filter((m) => !QUOTE_CURRENCIES.has(m.symbol));
}
