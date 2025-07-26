'use client';

import { cn } from '@/lib/utils';
import { WalletSelector } from './WalletSelector';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem
} from './ui/carousel';

export default function Login({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { connected, account } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
      if (intervalRef.current) clearInterval(intervalRef.current);
      startInterval();
    });

    const startInterval = () => {
      intervalRef.current = setInterval(() => {
        console.log('scrolling');
        api?.scrollNext();
      }, 7000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        startInterval();
      }
    };

    startInterval();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [api]);

  useEffect(() => {
    if (connected && account) {
      router.push('/home');
    }
  }, [connected, router, account]);

  return (
    <div
      className={cn('flex flex-col items-center gap-6', className)}
      {...props}
    >
      <Carousel opts={{ loop: true }} setApi={setApi} className="w-full">
        <CarouselContent>
          <CarouselItem
            key="what-is-a-vault"
            className="flex flex-col items-center gap-4"
          >
            <img src="/onboarding_1.png" alt="Petra Vault" className="w-72" />
            <div className="text-center grid gap-2 max-w-xs">
              <h2 className="text-2xl font-bold">What is a Vault?</h2>
              <p className="text-balance text-sm text-muted-foreground text-center">
                A Vault is a multisig wallet that requires multiple signatures
                to execute transactions.
              </p>
            </div>
          </CarouselItem>
          <CarouselItem
            key="why-use-a-vault"
            className="flex flex-col items-center gap-4"
          >
            <img src="/onboarding_2.png" alt="Petra Vault" className="w-72" />
            <div className="text-center grid gap-2 max-w-xs">
              <h2 className="text-2xl font-bold">Why use a Vault?</h2>
              <p className="text-balance text-sm text-muted-foreground text-center">
                A Vault is a more secure way to manage your assets and publish
                smart contracts.
              </p>
            </div>
          </CarouselItem>
          <CarouselItem
            key="is-a-vault-transparent"
            className="flex flex-col items-center gap-4"
          >
            <img src="/onboarding_3.png" alt="Petra Vault" className="w-72" />
            <div className="text-center grid gap-2 max-w-xs">
              <h2 className="text-2xl font-bold">Is a Vault transparent?</h2>
              <p className="text-balance text-sm text-muted-foreground text-center">
                A Vault is using Move Framework code which means all of your
                multisig operations are visible and executable on-chain.
              </p>
            </div>
          </CarouselItem>
        </CarouselContent>
      </Carousel>
      <div className="flex items-center gap-2 ">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className="p-1"
          >
            <div
              className={cn(
                'w-3 h-3 md:w-2 md:h-2 rounded-full transition-all',
                current === index + 1 ? 'bg-primary' : 'bg-secondary'
              )}
            />
          </button>
        ))}
      </div>

      <br className="hidden md:block" />

      <div className="flex flex-col items-center gap-4 text-center border p-8 rounded-sm max-w-xs">
        <div>
          <h2 className="text-xl font-bold">Get Started</h2>
          <p className="text-balance text-sm text-muted-foreground">
            Connect your wallet to create a new Petra Vault or open an existing
            one
          </p>
        </div>
        <WalletSelector />
      </div>
    </div>
  );
}
