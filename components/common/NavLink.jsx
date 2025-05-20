// File: components/common/NavLink.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils"; // For conditional classes

export function NavLink({ href, icon, children, exact = false }) { // 'icon' is now expected to be a ReactNode
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
        isActive && "bg-muted text-primary font-semibold" // Active state styling
      )}
    >
      {/* Render the icon ReactNode directly. Lucide icons often inherit color via 'currentColor' */}
      {icon}
      <span>{children}</span> {/* Wrap children in span for consistent styling if needed */}
    </Link>
  );
}