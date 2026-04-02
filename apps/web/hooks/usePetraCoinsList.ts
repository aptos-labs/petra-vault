import { Endpoints } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

export const coinMetadataSchema = z.object({
  asset_type: z.string(),
  bridge: z.string().optional(),
  decimals: z.number(),
  logo_url: z.string().optional(),
  name: z.string(),
  source: z.enum(['panora', 'default']),
  symbol: z.string(),
  website_url: z.string().optional()
});

export type CoinMetadata = z.infer<typeof coinMetadataSchema>;

export const usePetraCoinsList = () => {
  return useQuery({
    staleTime: 10 * 60_000,
    queryKey: ['petra-coins-list'],
    queryFn: async () => {
      const response = await fetch(`${Endpoints.PETRA_PRICING}/coins/list`);
      return (await response.json()) as { data: CoinMetadata[] };
    }
  });
};
