"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const markdownComponents = {
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-2 last:mb-0" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-2 list-inside list-disc space-y-0.5 pl-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-2 list-inside list-decimal space-y-0.5 pl-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  code: ({
    children,
    className,
    ...props
  }: React.HTMLAttributes<HTMLElement> & { className?: string }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="rounded bg-muted/70 px-1 py-0.5 font-mono text-[0.9em]"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className={cn("block overflow-x-auto rounded bg-muted/70 p-3 font-mono text-sm", className)}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="mb-2 overflow-x-auto rounded-lg" {...props}>
      {children}
    </pre>
  ),
  a: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:opacity-90"
      {...props}
    >
      {children}
    </a>
  ),
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mb-1.5 text-base font-semibold" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mb-1 text-sm font-semibold" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-1 text-sm font-medium" {...props}>
      {children}
    </h3>
  ),
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="border-l-2 border-muted-foreground/40 pl-3 italic text-muted-foreground"
      {...props}
    >
      {children}
    </blockquote>
  ),
};

export interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  if (!content?.trim()) return null;
  return (
    <div className={cn("text-sm leading-relaxed [&_*:last-child]:mb-0", className)}>
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  );
}
