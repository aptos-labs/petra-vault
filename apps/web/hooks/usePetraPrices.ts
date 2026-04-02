import { Endpoints } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

export const fetchCoinsResponseSchema = z.record(
  z.record(z.number().nullable())
);

export type FetchCoinsResponse = z.infer<typeof fetchCoinsResponseSchema>;

export const usePetraCoinsPrices = () => {
  return useQuery({
    staleTime: 10 * 60_000,
    queryKey: ['petra-coins-prices'],
    queryFn: async () => {
      const response = await fetch(`${Endpoints.PETRA_PRICING}/prices`);
      return (await response.json()) as FetchCoinsResponse;
    }
  });
};
