import { useMemo, useRef, useState, useCallback } from 'react';
import type { KlineEntry } from '../hooks/useMarketData';

interface PriceChartProps {
  klines: KlineEntry[];
  height?: number;
  loading?: boolean;
  className?: string;
  maxCandles?: number;
  livePrice?: number;
  showVolume?: boolean;
}

const BULL = '#01c6ac';
const BEAR = '#ef4444';
const BULL_SOFT = 'rgba(1,198,172,0.15)';
const BEAR_SOFT = 'rgba(239,68,68,0.12)';
const GRID = 'rgba(255,255,255,0.05)';
const LABEL = 'rgba(255,255,255,0.35)';

function fmtPrice(v: number) {
  if (v >= 10000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function fmtVol(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(0);
}

function fmtTime(ts: number, interval?: string) {
  const d = new Date(ts);
  const isShort = interval === '1' || interval === '15';
  if (isShort) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PriceChart({
  klines,
  height = 280,
  loading = false,
  className = '',
  maxCandles = 100,
  livePrice,
  showVolume = true,
}: PriceChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number; idx: number } | null>(null);

  const displayKlines = useMemo(() => {
    let ks = klines.length > maxCandles ? klines.slice(-maxCandles) : klines;
    // Append a synthetic "live" candle for the current price if provided
    if (livePrice && ks.length > 0) {
      const last = ks[ks.length - 1];
      ks = [
        ...ks.slice(0, -1),
        {
          ...last,
          close: livePrice,
          high: Math.max(last.high, livePrice),
          low: Math.min(last.low, livePrice),
        },
      ];
    }
    return ks;
  }, [klines, maxCandles, livePrice]);

  const SVG_W = 900;
  const CHART_PAD = { top: 12, right: 68, bottom: showVolume ? 72 : 28, left: 8 };
  const VOL_H = showVolume ? 46 : 0;
  const priceH = height - CHART_PAD.top - CHART_PAD.bottom;
  const innerW = SVG_W - CHART_PAD.left - CHART_PAD.right;

  const chart = useMemo(() => {
    if (!displayKlines.length) return null;

    const lows = displayKlines.map((k) => k.low);
    const highs = displayKlines.map((k) => k.high);
    const min = Math.min(...lows) * 0.9998;
    const max = Math.max(...highs) * 1.0002;
    const range = max - min || 1;

    const maxVol = Math.max(...displayKlines.map((k) => (k as any).volume ?? 0));

    const yP = (v: number) =>
      CHART_PAD.top + priceH - ((v - min) / range) * priceH;

    const step = innerW / displayKlines.length;
    const bodyW = Math.max(1.5, step * 0.6);

    const candles = displayKlines.map((k, i) => {
      const cx = CHART_PAD.left + i * step + step / 2;
      const isBull = k.close >= k.open;
      const color = isBull ? BULL : BEAR;
      const soft = isBull ? BULL_SOFT : BEAR_SOFT;
      const bodyTop = Math.min(yP(k.open), yP(k.close));
      const bodyH = Math.max(1, Math.abs(yP(k.close) - yP(k.open)));
      const vol = (k as any).volume ?? 0;
      const volH = maxVol > 0 ? (vol / maxVol) * VOL_H * 0.85 : 0;
      const volY = height - CHART_PAD.bottom + VOL_H - volH;

      return {
        cx, isBull, color, soft,
        highY: yP(k.high), lowY: yP(k.low),
        bodyTop, bodyH, bodyW,
        volH, volY,
        close: k.close, open: k.open, high: k.high, low: k.low,
        time: k.time,
        vol,
      };
    });

    // Y grid
    const TICKS = 6;
    const yGrid = Array.from({ length: TICKS }, (_, i) => {
      const v = min + (range * i) / (TICKS - 1);
      return { y: yP(v), label: fmtPrice(v) };
    });

    // Close line path
    const closePath = displayKlines
      .map((k, i) => {
        const x = CHART_PAD.left + i * step + step / 2;
        return `${i === 0 ? 'M' : 'L'} ${x} ${yP(k.close)}`;
      })
      .join(' ');

    // Area fill path below close line
    const firstX = CHART_PAD.left + step / 2;
    const lastX = CHART_PAD.left + (displayKlines.length - 1) * step + step / 2;
    const baseY = CHART_PAD.top + priceH;
    const areaPath = `${closePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;

    // X-axis labels (show ~6 evenly spaced)
    const xLabelCount = Math.min(6, displayKlines.length);
    const xLabels = Array.from({ length: xLabelCount }, (_, i) => {
      const idx = Math.round((i / (xLabelCount - 1)) * (displayKlines.length - 1));
      const k = displayKlines[idx];
      const x = CHART_PAD.left + idx * step + step / 2;
      return { x, label: fmtTime(k.time) };
    });

    const livePriceY = livePrice ? yP(livePrice) : null;

    return {
      candles, yGrid, closePath, areaPath, xLabels, step,
      livePriceY, liveY_label: livePrice ? fmtPrice(livePrice) : null,
      priceH, min, max
    };
  }, [displayKlines, height, priceH, innerW, livePrice, VOL_H, showVolume]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!chart || !svgRef.current || !displayKlines.length) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * SVG_W;
      const svgY = ((e.clientY - rect.top) / rect.height) * height;
      const step = innerW / displayKlines.length;
      const idx = Math.max(
        0,
        Math.min(
          displayKlines.length - 1,
          Math.round((svgX - CHART_PAD.left - step / 2) / step)
        )
      );
      setCursor({ x: CHART_PAD.left + idx * step + step / 2, y: svgY, idx });
    },
    [chart, displayKlines.length, height, innerW]
  );

  const cursorCandle = cursor ? chart?.candles[cursor.idx] : null;

  if (loading) {
    return (
      <div
        className={`rounded-xl border border-card-border bg-primary/30 animate-pulse ${className}`}
        style={{ height }}
      />
    );
  }

  if (!chart || !displayKlines.length) {
    return (
      <div
        className={`rounded-xl border border-card-border bg-primary/30 flex items-center justify-center text-text-muted text-sm ${className}`}
        style={{ height }}
      >
        No chart data available
      </div>
    );
  }

  const lastCandle = chart.candles[chart.candles.length - 1];
  const isBullish = lastCandle?.isBull;

  return (
    <div className={`relative rounded-xl border border-card-border bg-primary/30 overflow-hidden ${className}`} style={{ height }}>
      {/* Crosshair tooltip */}
      {cursorCandle && (
        <div className="absolute top-2 left-2 text-[10px] text-text-muted flex flex-wrap gap-x-3 gap-y-0.5 pointer-events-none z-10 bg-primary/80 px-2 py-1 rounded-lg border border-card-border">
          <span className="text-white font-medium">{new Date(cursorCandle.time).toLocaleString()}</span>
          <span>O: <span className="text-text-light">{fmtPrice(cursorCandle.open)}</span></span>
          <span>H: <span className="text-accent-teal">{fmtPrice(cursorCandle.high)}</span></span>
          <span>L: <span className="text-red-400">{fmtPrice(cursorCandle.low)}</span></span>
          <span>C: <span className={cursorCandle.isBull ? 'text-accent-teal' : 'text-red-400'}>{fmtPrice(cursorCandle.close)}</span></span>
          {cursorCandle.vol > 0 && (
            <span>Vol: <span className="text-white">{fmtVol(cursorCandle.vol)}</span></span>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCursor(null)}
        role="img"
        aria-label="Price chart"
        style={{ cursor: 'crosshair', display: 'block' }}
      >
        {/* Gradient defs */}
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isBullish ? BULL : BEAR} stopOpacity="0.18" />
            <stop offset="100%" stopColor={isBullish ? BULL : BEAR} stopOpacity="0" />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={CHART_PAD.left} y={CHART_PAD.top} width={innerW} height={chart.priceH} />
          </clipPath>
        </defs>

        {/* Y-axis grid lines + labels */}
        {chart.yGrid.map((g, i) => (
          <g key={i}>
            <line x1={CHART_PAD.left} y1={g.y} x2={SVG_W - CHART_PAD.right} y2={g.y} stroke={GRID} strokeWidth="1" />
            <text x={SVG_W - CHART_PAD.right + 6} y={g.y + 4} fill={LABEL} fontSize="9.5" textAnchor="start">{g.label}</text>
          </g>
        ))}

        {/* X-axis labels */}
        {chart.xLabels.map((xl, i) => (
          <text key={i} x={xl.x} y={height - CHART_PAD.bottom + VOL_H + 14} fill={LABEL} fontSize="9.5" textAnchor="middle">{xl.label}</text>
        ))}

        {/* Area fill */}
        <path d={chart.areaPath} fill="url(#areaGrad)" clipPath="url(#chartClip)" />

        {/* Close line */}
        <path d={chart.closePath} fill="none" stroke={isBullish ? BULL : BEAR} strokeWidth="1" strokeOpacity="0.5" clipPath="url(#chartClip)" />

        {/* Volume bars */}
        {showVolume && chart.candles.map((c, i) => (
          <rect
            key={`v${i}`}
            x={c.cx - c.bodyW / 2}
            y={c.volY}
            width={c.bodyW}
            height={c.volH}
            fill={c.color}
            fillOpacity="0.45"
          />
        ))}

        {/* Candle bodies + wicks */}
        {chart.candles.map((c, i) => (
          <g key={i}>
            <line x1={c.cx} y1={c.highY} x2={c.cx} y2={c.lowY} stroke={c.color} strokeWidth="1" />
            <rect
              x={c.cx - c.bodyW / 2}
              y={c.bodyTop}
              width={c.bodyW}
              height={c.bodyH}
              fill={c.isBull ? c.color : c.soft}
              stroke={c.color}
              strokeWidth="0.5"
              rx="0.5"
            />
          </g>
        ))}

        {/* Live price line */}
        {chart.livePriceY !== null && (
          <g>
            <line
              x1={CHART_PAD.left}
              y1={chart.livePriceY!}
              x2={SVG_W - CHART_PAD.right}
              y2={chart.livePriceY!}
              stroke={isBullish ? BULL : BEAR}
              strokeWidth="1"
              strokeDasharray="4 3"
              strokeOpacity="0.8"
            />
            <rect
              x={SVG_W - CHART_PAD.right + 2}
              y={chart.livePriceY! - 9}
              width={CHART_PAD.right - 4}
              height={18}
              fill={isBullish ? BULL : BEAR}
              rx="3"
            />
            <text
              x={SVG_W - CHART_PAD.right + (CHART_PAD.right - 4) / 2 + 2}
              y={chart.livePriceY! + 4}
              fill="white"
              fontSize="9"
              textAnchor="middle"
              fontWeight="bold"
            >
              {chart.liveY_label}
            </text>
          </g>
        )}

        {/* Crosshair */}
        {cursor && (
          <g pointerEvents="none">
            <line x1={cursor.x} y1={CHART_PAD.top} x2={cursor.x} y2={height - CHART_PAD.bottom + VOL_H} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4 3" />
            <line x1={CHART_PAD.left} y1={cursor.y} x2={SVG_W - CHART_PAD.right} y2={cursor.y} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4 3" />
            {/* Price badge on y-axis */}
            <rect x={SVG_W - CHART_PAD.right + 2} y={cursor.y - 9} width={CHART_PAD.right - 4} height={18} fill="rgba(255,255,255,0.15)" rx="3" />
            <text x={SVG_W - CHART_PAD.right + (CHART_PAD.right - 4) / 2 + 2} y={cursor.y + 4} fill="white" fontSize="8.5" textAnchor="middle">
              {cursorCandle ? fmtPrice(cursorCandle.close) : ''}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
