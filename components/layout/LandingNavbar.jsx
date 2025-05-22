// File: components/layout/LandingNavbar.jsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { School } from "lucide-react"; // Or your actual logo component/image

export default function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6 bg-transparent print:hidden">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
          <School className="h-7 w-7 text-white" /> {/* White icon for dark background */}
          <span className="text-slate-100">Sukuu</span> {/* Light text */}
        </Link>
        <div>
          <Link href="/auth/signin" passHref>
            <Button 
              variant="outline" 
              className="
                bg-white/10 hover:bg-white/20  /* Lighter glass for button */
                backdrop-blur-md 
                border-white/30 hover:border-white/50
                text-slate-100 hover:text-white 
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