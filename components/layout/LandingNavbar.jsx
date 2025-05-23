// File: components/layout/LandingNavbar.jsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { School } from "lucide-react";

export default function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6 bg-transparent print:hidden">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-foreground dark:text-slate-100"> {/* Theme-aware */}
          <School className="h-7 w-7 text-primary" /> {/* Primary color for icon should adapt */}
          <span>Sukuu</span>
        </Link>
        <div>
          <Link href="/auth/signin" passHref>
            <Button 
              variant="outline" 
              className="
                bg-background/30 hover:bg-accent/70  
                backdrop-blur-md 
                border-border/50 hover:border-border/80 
                text-foreground hover:text-accent-foreground
                transition-colors duration-300
              "
            >
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}