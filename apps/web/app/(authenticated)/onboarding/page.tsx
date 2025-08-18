'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOnboarding } from '@/context/OnboardingProvider';
import OnboardingAddOrImport from '@/components/OnboardingAddOrImport';
import VerticalCutReveal from '@/components/ui/vertical-cut-reveal';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import OnboardingImportSetName from '@/components/OnboardingImportSetName';
import OnboardingSetConfig from '@/components/OnboardingSetConfig';
import OnboardingReview from '@/components/OnboardingReview';

export default function OnboardingPage() {
  const { page, importVaultAddress } = useOnboarding();
  const searchParams = useSearchParams();

  // If the address is in the search params, set it as the import vault address
  useEffect(() => {
    const address = searchParams.get('address');
    if (address && page.current === 'add-or-import') {
      importVaultAddress.set(address);
      page.set('set-name');
    }
  }, [searchParams, page, importVaultAddress]);

  const clearSearchParams = () => {
    if (searchParams.get('address')) {
      const params = new URLSearchParams(searchParams);
      params.delete('address');
      window.location.search = params.toString();
    }
  };

  const goBackRoutes = {
    'set-name': 'add-or-import',
    'set-config': 'add-or-import',
    review: 'set-config',
    'not-found': 'add-or-import'
  } as const;

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="max-w-lg w-full h-full flex flex-col gap-2 items-center px-2 py-24">
        <h1 className="font-display text-2xl font-bold">
          <VerticalCutReveal
            splitBy="characters"
            staggerDuration={0.02}
            staggerFrom="first"
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 21
            }}
          >
            Welcome to Petra Vault
          </VerticalCutReveal>
        </h1>
        <p className="text-muted-foreground">
          <VerticalCutReveal
            splitBy="characters"
            staggerDuration={0.02}
            staggerFrom="first"
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 21
            }}
          >
            Create or import a vault to get started
          </VerticalCutReveal>
        </p>
        <br />

        <div className="w-full h-full">
          {page.current === 'add-or-import' ? (
            <OnboardingAddOrImport key="add-or-import" />
          ) : page.current === 'set-name' ? (
            <OnboardingImportSetName key="set-name" />
          ) : page.current === 'set-config' ? (
            <OnboardingSetConfig key="set-config" />
          ) : page.current === 'review' ? (
            <OnboardingReview key="review" />
          ) : (
            <div>
              <h1>Page not found</h1>
            </div>
          )}

          {page.current in goBackRoutes && (
            <div className="w-full h-fit flex justify-start py-2">
              <Button
                variant="ghost"
                onClick={() => {
                  page.set(
                    goBackRoutes[page.current as keyof typeof goBackRoutes]
                  );
                  clearSearchParams();
                }}
              >
                <ArrowLeftIcon />
                Go Back
              </Button>
            </div>
          )}

          <br />
        </div>
      </div>
    </div>
  );
}
