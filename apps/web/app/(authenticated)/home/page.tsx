'use client';

import { Button } from '@/components/ui/button';
import { useVaults } from '@/context/useVaults';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VerticalCutReveal from '@/components/ui/vertical-cut-reveal';
import VaultRow from '@/components/VaultRow';
import { LoadingSpinner } from '@/components/LoaderSpinner';
import { motion } from 'motion/react';

export default function Home() {
  const { vaults, hasHydrated } = useVaults();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && vaults && vaults.length === 0) {
      router.push('/onboarding');
    }
  }, [vaults, router, hasHydrated]);

  if (!hasHydrated)
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );

  if (!vaults?.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-2xl font-semibold">No Vaults Found</h2>
        <p className="text-gray-600">Create your first vault to get started</p>
        <Button asChild>
          <Link href="/onboarding">Create Vault</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="max-w-lg w-full flex flex-col gap-2 items-center px-2">
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
            My Petra Vaults
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
            Select one of your vaults to continue
          </VerticalCutReveal>
        </p>
        <br />
        <div className="w-full flex flex-col gap-4">
          {vaults.map((vault, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              key={`${vault.address.toString()}-${vault.network}-${i}`}
            >
              <VaultRow vault={vault} />
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: vaults.length * 0.1
            }}
          >
            <Button
              asChild
              variant="secondary"
              data-testid="authenticated-create-vault-button"
            >
              <Link href="/onboarding" className="w-full">
                Create Vault
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
