import { useQuery, UseQueryOptions } from '@tanstack/react-query';

interface HistoricalPriceData {
  bucketed_timestamp_minutes_utc: string;
  price_usd: number;
}

interface HistoricalPricesResponse {
  data: HistoricalPriceData[];
  error: string | null;
  message: string;
  status: string;
}

interface UseTokenHistoricalPricesParameters
  extends Omit<UseQueryOptions<HistoricalPriceData[]>, 'queryFn' | 'queryKey'> {
  address?: string;
  lookback?: 'day' | 'week' | 'month' | 'year' | 'all';
}

export default function useTokenHistoricalPrices({
  address,
  lookback = 'day',
  ...options
}: UseTokenHistoricalPricesParameters) {
  const enabled = Boolean(address && (options.enabled ?? true));

  const query = useQuery<HistoricalPriceData[]>({
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
    enabled,
    queryKey: ['token-historical-prices', address, lookback],
    queryFn: async () => {
      if (!address) throw new Error('Address is required');

      const response = await fetch(
        `https://api.mainnet.aptoslabs.com/v1/analytics/token/historical_prices?address=${encodeURIComponent(address)}&lookback=${lookback}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch historical prices');
      }

      const data: HistoricalPricesResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data.data
        .sort(
          (a, b) =>
            new Date(a.bucketed_timestamp_minutes_utc).getTime() -
            new Date(b.bucketed_timestamp_minutes_utc).getTime()
        )
        .filter((item) => !!item.price_usd);
    }
  });

  return query;
}
