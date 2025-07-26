'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fallbackEcosystemApps } from '@/lib/ecosystem';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ArrowTopRightIcon } from '@radix-ui/react-icons';
import { SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActiveVault } from '@/context/ActiveVaultProvider';
import {
  groupAndSortWallets,
  useWallet
} from '@aptos-labs/wallet-adapter-react';
import useAnalytics from '@/hooks/useAnalytics';
import { useIsMobile } from '@/hooks/useMobile';
import { LoadingSpinner } from '@/components/LoaderSpinner';
import { usePetraEcosystemApps } from '@/hooks/usePetraEcosystemApps';
import { EcosystemApp } from '@/hooks/usePetraEcosystemApps';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export default function VaultExplorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trackEvent = useAnalytics();
  const { id } = useActiveVault();
  const isMobile = useIsMobile();

  // Initialize state from search params
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get('search') || ''
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('categories')?.split(',').filter(Boolean) || []
  );

  const {
    data: ecosystemAppsData,
    isLoading,
    error,
    isSuccess
  } = usePetraEcosystemApps();

  const ecosystemApps: EcosystemApp[] =
    ecosystemAppsData?.data || fallbackEcosystemApps;

  const { wallets = [], notDetectedWallets = [] } = useWallet();

  const { availableWallets } = groupAndSortWallets([
    ...wallets,
    ...notDetectedWallets
  ]);

  // Update search params in URL
  const updateSearchParams = useCallback(
    (newSearchTerm: string, newSelectedCategories: string[]) => {
      const params = new URLSearchParams();

      if (newSearchTerm) {
        params.set('search', newSearchTerm);
      }

      if (newSelectedCategories.length > 0) {
        params.set('categories', newSelectedCategories.join(','));
      }

      const paramString = params.toString();
      const newUrl = paramString ? `?${paramString}` : '';

      router.replace(`/vault/${id}/explore${newUrl}`, { scroll: false });
    },
    [router, id]
  );

  // Get all unique categories from apps
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    ecosystemApps
      .filter((app) => app.link !== undefined)
      .forEach((app) => {
        app.categories.forEach((category) => categories.add(category));
      });
    return Array.from(categories).sort();
  }, [ecosystemApps]);

  // Filter apps based on search term and selected categories
  const filteredApps = useMemo(() => {
    return ecosystemApps
      .filter((app) => app.link !== undefined)
      .filter((app) => {
        // Search filter
        const matchesSearch =
          searchTerm === '' ||
          app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.description.toLowerCase().includes(searchTerm.toLowerCase());

        // Category filter
        const matchesCategory =
          selectedCategories.length === 0 ||
          selectedCategories.some((category) =>
            app.categories.includes(category)
          );

        return matchesSearch && matchesCategory;
      });
  }, [ecosystemApps, searchTerm, selectedCategories]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
  };

  // Update search params when filters change
  useEffect(() => {
    updateSearchParams(searchTerm, selectedCategories);
  }, [searchTerm, selectedCategories, updateSearchParams]);

  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-8">
          <img
            src="/petra_logo.svg"
            alt="Petra Logo"
            className="w-12 mr-2 text-black"
          />
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
          <img
            src="/petra_logo.svg"
            alt="Petra Logo"
            className="w-12 mr-2 text-black"
          />
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
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search apps by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium py-2">Filter by Category</h3>
              <AnimatePresence>
                {(selectedCategories.length > 0 || searchTerm) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                      Clear all filters
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((category) => (
                <motion.div
                  key={category}
                  layout
                  initial={{ width: 'auto' }}
                  animate={{ width: 'auto' }}
                  transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}
                  className="inline-block"
                >
                  <Badge
                    variant={
                      selectedCategories.includes(category)
                        ? 'default'
                        : 'secondary'
                    }
                    className="capitalize text-xs cursor-pointer hover:opacity-80 transition-opacity w-full"
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                    <AnimatePresence>
                      {selectedCategories.includes(category) && (
                        <motion.span
                          initial={{ opacity: 0, y: -10, width: 0 }}
                          animate={{ opacity: 1, y: 0, width: 'auto' }}
                          exit={{ opacity: 0, y: -10, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="ml-1 text-xs overflow-hidden inline-block"
                        >
                          ✓
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {filteredApps.length} of{' '}
              {ecosystemApps.filter((app) => app.link !== undefined).length}{' '}
              apps
            </span>
            <AnimatePresence>
              {(selectedCategories.length > 0 || searchTerm) && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs"
                >
                  Filters applied: {searchTerm && `"${searchTerm}"`}
                  {searchTerm && selectedCategories.length > 0 && ', '}
                  {selectedCategories.length > 0 &&
                    `${selectedCategories.length} categories`}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <Separator />

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Unable to load latest apps. Showing cached apps.
            </p>
          </div>
        )}

        {/* Apps Grid */}
        {isSuccess && (
          <>
            {filteredApps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="space-y-2">
                  <p className="text-lg font-medium text-muted-foreground">
                    No apps found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filter criteria
                  </p>
                  {(selectedCategories.length > 0 || searchTerm) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                      className="mt-4"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredApps.map((app) => (
                  <Link
                    key={app.name}
                    href={`/vault/${id}/explore/embedded?url=${app.link}`}
                    onClick={() =>
                      trackEvent('view_app', {
                        app_name: app.name,
                        app_url: app.link!
                      })
                    }
                  >
                    <Card className="hover:bg-accent/30 transition-all cursor-pointer h-full">
                      <CardContent className="h-full">
                        <div className="flex justify-between gap-4">
                          <div className="flex flex-1 flex-col gap-2">
                            <p className="font-medium font-display">
                              {app.name}
                            </p>
                            <div className="flex items-center gap-2 w-full flex-wrap">
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
                            className="w-8 h-8 rounded-full flex-shrink-0"
                          />
                        </div>

                        <Separator className="my-4" />

                        <div className="text-xs text-muted-foreground flex justify-between gap-2">
                          <p className="flex-1 line-clamp-2">
                            {app.description}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0"
                          >
                            <ArrowTopRightIcon className="size-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <br />
      <br />
    </div>
  );
}
