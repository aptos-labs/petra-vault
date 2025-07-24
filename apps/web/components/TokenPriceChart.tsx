'use client';

import { memo } from 'react';
import { Area, AreaChart, YAxis } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import useTokenHistoricalPrices from '@/hooks/useTokenHistoricalPrices';

interface TokenPriceChartProps {
  address: string;
  className?: string;
}

function TokenPriceChart({ address, className }: TokenPriceChartProps) {
  const {
    data: priceData,
    isLoading,
    error
  } = useTokenHistoricalPrices({ address, lookback: 'day' });

  if (isLoading || error || !priceData || priceData.length === 0) {
    return null;
  }

  const chartData = priceData.map((item) => ({
    timestamp: item.bucketed_timestamp_minutes_utc,
    price: item.price_usd
  }));

  // Calculate min and max prices for full height scaling
  const prices = priceData.map((item) => item.price_usd);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const isPositive =
    (priceData[priceData.length - 1]?.price_usd || 0) >=
    (priceData[0]?.price_usd || 0);

  const dynamicConfig = {
    price: {
      label: 'Price (USD)',
      color: isPositive ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)' // green for up, red for down
    }
  };

  // If the deviation is less than 0.1%, don't show the chart. This is specific to stable coins.
  if (maxPrice / minPrice - 1 < 0.001) {
    return null;
  }

  return (
    <div className={`h-8 w-20 ${className || ''}`}>
      <ChartContainer config={dynamicConfig} className="h-8 w-full">
        <AreaChart
          data={chartData}
          margin={{ top: 1, right: 1, bottom: 1, left: 1 }}
        >
          <defs>
            <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="hsl(142 76% 36%)"
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor="hsl(142 76% 36%)"
                stopOpacity={0.05}
              />
            </linearGradient>
            <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3} />
              <stop
                offset="100%"
                stopColor="hsl(0 84% 60%)"
                stopOpacity={0.05}
              />
            </linearGradient>
          </defs>
          <YAxis domain={[minPrice, maxPrice]} hide />
          <Area
            type="monotone"
            dataKey="price"
            stroke="var(--color-price)"
            strokeWidth={1.5}
            fill={
              isPositive ? 'url(#positiveGradient)' : 'url(#negativeGradient)'
            }
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

export default memo(TokenPriceChart);
