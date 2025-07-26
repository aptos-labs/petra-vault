'use client';

import { useQuery } from '@tanstack/react-query';
import { createHighlighter } from 'shiki';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  lang?: string;
}

export default function CodeBlock({
  value,
  className,
  ...props
}: CodeBlockProps) {
  const { data: highlighter } = useQuery({
    queryKey: ['highlighter'],
    queryFn: async () => {
      const highlighter = await createHighlighter({
        themes: ['github-light'],
        langs: ['json']
      });

      return highlighter;
    }
  });

  const out = highlighter?.codeToHtml(value, {
    lang: 'json',
    theme: 'github-light'
  });

  const sanitizedHtml = out ? DOMPurify.sanitize(out) : null;

  return sanitizedHtml ? (
    <div
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      {...props}
      className={cn(
        'text-[10px] md:text-xs font-mono [&_*]:font-mono',
        className
      )}
    />
  ) : (
    <div className="w-full h-32" />
  );
}
