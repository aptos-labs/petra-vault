import { Endpoints } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

export const ecosystemAppSchema = z.object({
  categories: z.array(z.string()),
  platform: z.array(z.string()),
  description: z.string(),
  isPopular: z.boolean(),
  link: z.string().optional(),
  logoUrl: z.string(),
  logoUrlDark: z.string(),
  name: z.string(),
  supportsAptosConnect: z.boolean().optional(),
  tester: z.string(),
  type: z.string(),
  widget: z.string().optional()
});

export type EcosystemApp = z.infer<typeof ecosystemAppSchema>;

export const ecosystemAppsResponseSchema = z.object({
  data: z.array(ecosystemAppSchema)
});

export type EcosystemAppsResponse = z.infer<typeof ecosystemAppsResponseSchema>;

export const usePetraEcosystemApps = () => {
  return useQuery({
    queryKey: ['petra-ecosystem-apps'],
    queryFn: async () => {
      const response = await fetch(`${Endpoints.PETRA_PRICING}/ecosystem/v2/list?platform=web`);
      return (await response.json()) as EcosystemAppsResponse;
    }
  });
};