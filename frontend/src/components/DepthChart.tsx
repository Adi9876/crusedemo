import { useMemo } from 'react';
import type { OrderBookEntry } from '../hooks/useMarketData';

interface DepthChartProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  height?: number;
  loading?: boolean;
  className?: string;
}

const BULL = '#01c6ac';
const BEAR = '#ef4444';
// const BULL_FILL = 'rgba(1,198,172,0.15)';
// const BEAR_FILL = 'rgba(239,68,68,0.15)';
const LABEL = 'rgba(255,255,255,0.35)';
const GRID = 'rgba(255,255,255,0.04)';

function fmt(v: number) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(0);
}
function fmtP(v: number) {
  if (v >= 10000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

export default function DepthChart({
  bids,
  asks,
  height = 260,
  loading = false,
  className = '',
}: DepthChartProps) {
  const W = 900;
  const PAD = { top: 16, bottom: 32, left: 8, right: 68 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  const chart = useMemo(() => {
    if (!bids.length && !asks.length) return null;

    // Build cumulative depth
    let bidCum = 0;
    const bidPoints = [...bids]
      .sort((a, b) => b.price - a.price)
      .slice(0, 50)
      .map((e) => {
        bidCum += e.amount;
        return { price: e.price, cum: bidCum };
      });

    let askCum = 0;
    const askPoints = [...asks]
      .sort((a, b) => a.price - b.price)
      .slice(0, 50)
      .map((e) => {
        askCum += e.amount;
        return { price: e.price, cum: askCum };
      });

    if (!bidPoints.length || !askPoints.length) return null;

    const midPrice = (bidPoints[0].price + askPoints[0].price) / 2;
    const allPrices = [...bidPoints.map((b) => b.price), ...askPoints.map((a) => a.price)];
    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    const rangeP = maxP - minP || 1;

    const maxCum = Math.max(bidCum, askCum) * 1.05;

    const xScale = (p: number) => PAD.left + ((p - minP) / rangeP) * innerW;
    const yScale = (v: number) => PAD.top + innerH - (v / maxCum) * innerH;

    // Build SVG path for bids
    const bidPath = bidPoints
      .slice()
      .reverse()
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xScale(pt.price)} ${yScale(pt.cum)}`)
      .join(' ');
    const bidFirstX = xScale(bidPoints[bidPoints.length - 1].price);
    const bidLastX = xScale(bidPoints[0].price);
    const bidArea = `${bidPath} L ${bidFirstX} ${PAD.top + innerH} L ${bidLastX} ${PAD.top + innerH} Z`;

    // Build SVG path for asks
    const askPath = askPoints
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xScale(pt.price)} ${yScale(pt.cum)}`)
      .join(' ');
    const askFirstX = xScale(askPoints[0].price);
    const askLastX = xScale(askPoints[askPoints.length - 1].price);
    const askArea = `${askPath} L ${askLastX} ${PAD.top + innerH} L ${askFirstX} ${PAD.top + innerH} Z`;

    const midX = xScale(midPrice);

    // Price labels
    const TICKS = 6;
    const xLabels = Array.from({ length: TICKS }, (_, i) => {
      const p = minP + (rangeP * i) / (TICKS - 1);
      return { x: xScale(p), label: fmtP(p) };
    });

    // Vol labels
    const YTICKS = 4;
    const yLabels = Array.from({ length: YTICKS }, (_, i) => {
      const v = (maxCum * i) / (YTICKS - 1);
      return { y: yScale(v), label: fmt(v) };
    });

    return { bidPath, bidArea, askPath, askArea, midX, midPrice, xLabels, yLabels, PAD, innerH };
  }, [bids, asks, height, innerW, innerH]);

  if (loading) {
    return (
      <div
        className={`rounded-xl border border-card-border bg-primary/30 animate-pulse ${className}`}
        style={{ height }}
      />
    );
  }

  if (!chart) {
    return (
      <div
        className={`rounded-xl border border-card-border bg-primary/30 flex items-center justify-center text-text-muted text-sm ${className}`}
        style={{ height }}
      >
        No depth data
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl border border-card-border bg-primary/30 overflow-hidden ${className}`} style={{ height }}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="bidGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BULL} stopOpacity="0.3" />
            <stop offset="100%" stopColor={BULL} stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="askGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BEAR} stopOpacity="0.3" />
            <stop offset="100%" stopColor={BEAR} stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {chart.yLabels.map((yl, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={yl.y} x2={W - PAD.right} y2={yl.y} stroke={GRID} strokeWidth="1" />
            <text x={W - PAD.right + 6} y={yl.y + 4} fill={LABEL} fontSize="9" textAnchor="start">{yl.label}</text>
          </g>
        ))}

        {/* Bid area */}
        <path d={chart.bidArea} fill="url(#bidGrad)" />
        <path d={chart.bidPath} fill="none" stroke={BULL} strokeWidth="1.5" />

        {/* Ask area */}
        <path d={chart.askArea} fill="url(#askGrad)" />
        <path d={chart.askPath} fill="none" stroke={BEAR} strokeWidth="1.5" />

        {/* Mid price line */}
        <line
          x1={chart.midX}
          y1={PAD.top}
          x2={chart.midX}
          y2={PAD.top + chart.innerH}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text x={chart.midX} y={PAD.top - 4} fill={LABEL} fontSize="9" textAnchor="middle">
          {fmtP(chart.midPrice)}
        </text>

        {/* X labels */}
        {chart.xLabels.map((xl, i) => (
          <text key={i} x={xl.x} y={height - 8} fill={LABEL} fontSize="9" textAnchor="middle">{xl.label}</text>
        ))}

        {/* Legend */}
        <rect x={PAD.left + 8} y={PAD.top + 8} width={8} height={8} fill={BULL} rx="1" />
        <text x={PAD.left + 20} y={PAD.top + 16} fill={BULL} fontSize="10">Bids</text>
        <rect x={PAD.left + 58} y={PAD.top + 8} width={8} height={8} fill={BEAR} rx="1" />
        <text x={PAD.left + 70} y={PAD.top + 16} fill={BEAR} fontSize="10">Asks</text>
      </svg>
    </div>
  );
}
