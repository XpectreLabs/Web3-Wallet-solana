// src/components/PriceChart.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Historical SOL/USD price chart for the dashboard.
// Data source: CoinGecko market_chart endpoint (same provider already used
// for the live price in HomeView, keeping a single external dependency).
// ─────────────────────────────────────────────────────────────────────────────

import { FC, useEffect, useState, useMemo, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { C } from '../utils/theme';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type RangeOption = '24h' | '7d' | '30d' | '1y';

interface PricePoint {
  timestamp: number; // unix ms
  price: number;
}

const RANGE_CONFIG: Record<RangeOption, { label: string; days: number }> = {
  '24h': { label: '24H', days: 1 },
  '7d': { label: '7D', days: 7 },
  '30d': { label: '30D', days: 30 },
  '1y': { label: '1Y', days: 365 },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatXAxisTick(timestamp: number, range: RangeOption): string {
  const date = new Date(timestamp);
  if (range === '24h') {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  }
  if (range === '1y') {
    return date.toLocaleDateString('en-US', { month: 'short' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTooltipDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP
// ═══════════════════════════════════════════════════════════════════════════

interface TooltipPayloadItem {
  payload: PricePoint;
}

const CustomTooltip: FC<{ active?: boolean; payload?: TooltipPayloadItem[] }> = ({
  active,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div
      className="rounded-lg px-3 py-2 border shadow-xl"
      style={{ backgroundColor: C.surfaceSolid, borderColor: C.border }}
    >
      <p className="text-[#7a8fa6] text-[11px] font-medium">
        {formatTooltipDate(point.timestamp)}
      </p>
      <p className="text-white text-[15px] font-bold mt-0.5">
        ${point.price.toFixed(2)}
      </p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const PriceChart: FC = () => {
  const [range, setRange] = useState<RangeOption>('7d');
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (selectedRange: RangeOption) => {
    setLoading(true);
    setError(null);

    try {
      const { days } = RANGE_CONFIG[selectedRange];
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=${days}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!res.ok) throw new Error('Failed to fetch price history');

      const json = await res.json();
      const prices: [number, number][] = json?.prices ?? [];

      if (prices.length === 0) {
        setError('No price data available');
        setData([]);
        return;
      }

      setData(prices.map(([timestamp, price]) => ({ timestamp, price })));
    } catch {
      setError('Unable to load price history');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(range);
  }, [range, fetchHistory]);

  // Determine if price trended up or down over the selected range
  const { isPositive, percentChange } = useMemo(() => {
    if (data.length < 2) return { isPositive: true, percentChange: 0 };
    const first = data[0].price;
    const last = data[data.length - 1].price;
    const change = ((last - first) / first) * 100;
    return { isPositive: change >= 0, percentChange: change };
  }, [data]);

  const lineColor = isPositive ? C.green : C.red;

  return (
    <div
      className="rounded-2xl p-6 md:p-8"
      style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
    >
      {/* ── Header: title + range selector ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-white text-lg font-bold tracking-wide">
            SOL Price History
          </h2>
          {data.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-white text-2xl font-extrabold">
                ${data[data.length - 1].price.toFixed(2)}
              </span>
              <span
                className="text-[13px] font-bold"
                style={{ color: lineColor }}
              >
                {isPositive ? '+' : ''}
                {percentChange.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Range selector pills */}
        <div
          className="flex gap-1 p-1 rounded-lg self-start sm:self-auto"
          style={{ backgroundColor: C.surfaceSolid, border: `1px solid ${C.border}` }}
        >
          {(Object.keys(RANGE_CONFIG) as RangeOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setRange(opt)}
              className="px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors cursor-pointer"
              style={{
                backgroundColor: range === opt ? C.gold : 'transparent',
                color: range === opt ? '#10131c' : C.muted,
              }}
            >
              {RANGE_CONFIG[opt].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart area ── */}
      <div className="h-64 w-full">
        {loading && (
          <div className="h-full w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-6 h-6 rounded-full border-2 animate-spin"
                style={{
                  borderColor: C.border,
                  borderTopColor: C.gold,
                }}
              />
              <span className="text-xp-muted text-[13px]">Loading chart...</span>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="h-full w-full flex items-center justify-center">
            <p className="text-xp-muted text-[14px]">{error}</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke={C.border}
                vertical={false}
              />

              <XAxis
                dataKey="timestamp"
                tickFormatter={(ts) => formatXAxisTick(ts, range)}
                stroke={C.muted}
                tick={{ fill: C.muted, fontSize: 11 }}
                axisLine={{ stroke: C.border }}
                tickLine={false}
                minTickGap={40}
              />

              <YAxis
                domain={['auto', 'auto']}
                stroke={C.muted}
                tick={{ fill: C.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                width={50}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="price"
                stroke={lineColor}
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{ r: 4, fill: lineColor, stroke: C.bg, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
