"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";

/**
 * Ссылки на договоры через наши API: открытие во вкладке (fetch → blob → URL),
 * чтобы не срабатывал принудительный download из‑за заголовков upstream.
 */
export function DocumentLink({
  href,
  children,
  className,
  title,
  ...rest
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel"> & {
  href: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
      {...rest}
    >
      {children}
    </a>
  );
}
