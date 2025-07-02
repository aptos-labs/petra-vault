'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePetraEcosystemApps, fallbackEcosystemApps } from '@/lib/ecosystem';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowTopRightIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { useActiveVault } from '@/context/ActiveVaultProvider';
import {
  groupAndSortWallets,
  useWallet
} from '@aptos-labs/wallet-adapter-react';
import useAnalytics from '@/hooks/useAnalytics';
import { useIsMobile } from '@/hooks/useMobile';
import { LoadingSpinner } from '@/components/LoaderSpinner';

export default function VaultExplorePage() {
  const trackEvent = useAnalytics();
  const { id } = useActiveVault();
  const isMobile = useIsMobile();

  // Fetch ecosystem apps from API
  const { data: ecosystemAppsData, isLoading, error } = usePetraEcosystemApps();
  
  // Use API data if available, otherwise fallback to hardcoded apps
  const ecosystemApps = ecosystemAppsData?.data || fallbackEcosystemApps;

  const { wallets = [], notDetectedWallets = [] } = useWallet();

  const { availableWallets } = groupAndSortWallets([
    ...wallets,
    ...notDetectedWallets
  ]);

  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-8">
          <img src="/petra_logo.png" alt="Petra Logo" className="w-12 mr-2" />
          <p className="font-display text-center">
            This feature is only available on Desktop.
          </p>
        </div>
      </div>
    );
  }

  if (!availableWallets.find((e) => e.name === 'Petra')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-8">
          <img src="/petra_logo.png" alt="Petra Logo" className="w-12 mr-2" />
          <p className="font-display text-center">
            The <b>Petra Wallet extension</b> is required to use this feature.
            Please install it and refresh the page to continue.
          </p>
          <Link
            href="https://chromewebstore.google.com/detail/petra-aptos-wallet/ejjladinnckdgjemekebdpeokbikhfci"
            target="_blank"
          >
            <Button className="w-fit">Install Petra Wallet</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <br />
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      )}
      
      {/* Error state - show fallback apps */}
      {error && !isLoading && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Unable to load latest apps. Showing cached apps.
          </p>
        </div>
      )}
      
      {/* Apps */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ecosystemApps
            .filter((app) => app.link) // Only show apps with links (exclude widgets)
            .map((app) => (
            <Link
              key={app.name}
              href={`/vault/${id}/explore/embedded?url=${app.link}`}
              onClick={() =>
                trackEvent('view_app', { app_name: app.name, app_url: app.link })
              }
            >
              <Card className="hover:bg-accent/30 transition-all cursor-pointer">
                <CardContent>
                  <div className="flex justify-between gap-4">
                    <div className="flex flex-1 flex-col gap-2">
                      <p className="font-medium font-display">{app.name}</p>
                      <div className="flex items-center gap-2  w-full flex-wrap">
                        {app.categories.map((category) => (
                          <Badge
                            key={category}
                            variant="secondary"
                            className="capitalize text-xs"
                          >
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <img
                      src={app.logoUrl}
                      alt={app.name}
                      className="w-8 h-8 rounded-full"
                    />
                  </div>

                  <Separator className="my-4" />

                  <div className="text-xs text-muted-foreground flex justify-between gap-2">
                    <p className="flex-1">{app.description}</p>
                    <Button variant="ghost" size="icon">
                      <ArrowTopRightIcon className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
