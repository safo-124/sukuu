// File: components/common/NavLink.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({ href, icon, children, exact = false, className: propClassName }) {
  const pathname = usePathname();
  // For exact match on overview, and startsWith for deeper paths like /classes/new
  const isActive = exact ? pathname === href : (pathname.startsWith(href) && href !== `/${pathname.split('/')[1]}/${pathname.split('/')[2]}/academics`); 
  // The href !== /.../academics part is to prevent "Overview" from being active when on /classes if exact is false for Overview.
  // A simpler active check if `exact` is reliable:
  // const isActive = exact ? pathname === href : pathname.startsWith(href);


  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive 
          ? "bg-primary/10 text-primary font-semibold" 
          : "text-muted-foreground hover:text-foreground",
        propClassName // Allow passing additional classes like for disabled state
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {icon && <span className={cn(isActive ? "text-primary" : "")}>{icon}</span>}
      <span>{children}</span>
    </Link>
  );
}