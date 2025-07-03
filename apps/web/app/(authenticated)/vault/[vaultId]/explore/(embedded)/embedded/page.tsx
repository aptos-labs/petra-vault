'use client';

import { LoadingSpinner } from '@/components/LoaderSpinner';
import {
  PetraVaultApprovalModal,
  PetraVaultApprovalModalRef
} from '@/components/modals/PetraVaultApprovalModal';
import { Button } from '@/components/ui/button';
import { UnknownDappWarning } from '@/components/ui/UnknownDappWarning';
import { useActiveVault } from '@/context/ActiveVaultProvider';
import { useAppSettings } from '@/context/useAppSettings';
import { usePetraEcosystemApps } from '@/hooks/usePetraEcosystemApps';
import { isKnownEcosystemApp } from '@/lib/ecosystem';
import { PetraVaultApprovalClient } from '@/wallet/PetraVaultApprovalClient';
import { PetraVaultRequestHandler } from '@/wallet/PetraVaultRequestHandler';
import { useAptosCore } from '@aptos-labs/react';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { ArrowLeftIcon, GearIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function VaultExploreEmbeddedPage() {
  const approvalModalRef = useRef<PetraVaultApprovalModalRef>(null);
  const { id, vaultAddress, network } = useActiveVault();
  const { getSettingsForUrl, updateSettingsForUrl } = useAppSettings();
  const searchParams = useSearchParams();
  const router = useRouter();
  const core = useAptosCore();

  const { data: ecosystemApps, isLoading: isLoadingApps } =
    usePetraEcosystemApps();

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isReady, setIsReady] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [isUnknownApp, setIsUnknownApp] = useState(false);

  const url = searchParams.get('url');

  const handleIframeLoad = () => {
    setIsIframeLoading(false);
  };

  const handleRequest = useCallback(
    async (e: MessageEvent) => {
      if (!url) return;

      const { aptos } = core.client.getClients({ network: { network } });

      const handler = new PetraVaultRequestHandler({
        aptos,
        vaultAddress: AccountAddress.from(vaultAddress),
        approvalClient: new PetraVaultApprovalClient(approvalModalRef),
        allowedOrigins: [new URL(url).origin]
      });

      const response = await handler.handleRequest(e);
      if (response) e.source?.postMessage(response, { targetOrigin: e.origin });
    },
    [core.client, network, vaultAddress, url]
  );

  useEffect(() => {
    window.addEventListener('message', handleRequest);

    return () => {
      window.removeEventListener('message', handleRequest);
    };
  }, [handleRequest]);

  // Effect to handle warning logic once apps data is loaded
  useEffect(() => {
    if (!url) return;

    // Wait for ecosystem apps data to load before checking if app is known
    if (isLoadingApps) {
      setIsReady(false);
      setShowWarning(false);
      setIsUnknownApp(false);
      return;
    }

    const ecosystemAppsData = ecosystemApps?.data || [];
    const knownApp = isKnownEcosystemApp(url, ecosystemAppsData);

    if (!knownApp) {
      // If it's not a known app, prevent loading entirely
      setIsUnknownApp(true);
      setShowWarning(false);
      setIsReady(false);
    } else {
      // If it's a known app, check user settings for warnings
      const settings = getSettingsForUrl(url);

      if (settings.ignoreUnknownAppWarning) {
        // Skip warning and go directly to the app
        setIsUnknownApp(false);
        setShowWarning(false);
        setIsReady(true);
        setIsIframeLoading(true);
      } else {
        // Show warning for known apps by default
        setIsUnknownApp(false);
        setShowWarning(true);
        setIsReady(false);
      }
    }
  }, [url, ecosystemApps, isLoadingApps, getSettingsForUrl]);

  if (!url) {
    return <div>No URL provided</div>;
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="secondary"
          className="w-fit"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon className="size-4" />
          Go Back
        </Button>

        <Link href={`/vault/${id}/settings/apps`}>
          <Button variant="outline" size="icon">
            <GearIcon />
          </Button>
        </Link>
      </div>
      <div className="relative flex-1 border rounded-md">
        {/* Show loading while apps data is being fetched */}
        {isLoadingApps ? (
          <div className="w-full h-full rounded-md flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : isUnknownApp ? (
          <div className="w-full h-full rounded-md flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="text-center max-w-md">
              <h3 className="text-lg font-medium mb-2 text-red-600">
                Unknown App
              </h3>
              <p className="text-sm">
                This URL is not from a known app in the Petra ecosystem. For
                security reasons, only known apps can be loaded.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push(`/vault/${id}/explore`)}
              >
                Go Back
              </Button>
            </div>
          </div>
        ) : isReady ? (
          <>
            <iframe
              sandbox="allow-scripts allow-same-origin"
              ref={iframeRef}
              src={url}
              className="w-full h-full rounded-md"
              onLoad={handleIframeLoad}
            />
            {isIframeLoading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-md flex items-center justify-center gap-2">
                <LoadingSpinner />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full rounded-md flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}

        {showWarning && url && (
          <UnknownDappWarning
            url={url}
            onContinue={(rememberChoice) => {
              if (rememberChoice) {
                // Save the user's choice to ignore warnings for this domain
                updateSettingsForUrl(url, { ignoreUnknownAppWarning: true });
              }
              setShowWarning(false);
              setIsReady(true);
              setIsIframeLoading(true);
            }}
            onGoBack={() => {
              router.push(`/vault/${id}/explore`);
            }}
          />
        )}
      </div>

      <PetraVaultApprovalModal ref={approvalModalRef} />
    </div>
  );
}
