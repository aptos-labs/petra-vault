import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface HackenBadgeProps {
  className?: string;
}

export default function HackenBadge({ className }: HackenBadgeProps) {
  return (
    <Link
      href="https://hacken.io/audits/petra-vault"
      target="_blank"
      className="flex items-center gap-2"
    >
      <span className="font-medium">Audited by</span>

      <img
        src="/hacken_wordmark.svg"
        alt="Hacken Wordmark"
        className={cn('h-3 w-auto max-w-full', className)}
      />
    </Link>
  );
}
