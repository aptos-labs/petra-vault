import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface HackenBadgeProps {
  className?: string;
}

export default function HackenBadge({ className }: HackenBadgeProps) {
  return (
    <Link href="https://hacken.io/audits/petra-vault" target="_blank">
      <img
        src="https://wp.hacken.io/wp-content/uploads/2024/12/audited-by-hacken-outline-light.svg"
        alt="Audited by Hacken"
        className={cn('min-w-36 h-auto max-w-full', className)}
      />
    </Link>
  );
}
