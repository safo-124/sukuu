// File: app/page.js
// This page is a Server Component (no "use client" at the top)

import Link from "next/link";
import { Button } from "@/components/ui/button";
import LandingNavbar from "@/components/layout/LandingNavbar";
import AuthenticatedRedirector from "@/components/auth/AuthenticatedRedirector";
import { ArrowRight, CheckCircle, Layers } from "lucide-react"; // Added Layers for an abstract icon

export const metadata = {
  title: "Sukuu - Smart School Management, Simplified",
  description: "Welcome to Sukuu, the all-in-one platform to manage your educational institution efficiently.",
};

function FeatureListItem({ children }) {
  return (
    <li className="flex items-start">
      <CheckCircle className="h-5 w-5 text-slate-400 dark:text-sky-400 mr-3 mt-1 shrink-0" /> {/* Adjusted icon color */}
      <span>{children}</span>
    </li>
  );
}

export default function LandingPage() {
  return (
    <>
      <AuthenticatedRedirector />
      <LandingNavbar />
      {/* Ensure the body background from layout.js provides the dark base */}
      <main className="flex flex-col items-center justify-center min-h-screen px-4 py-16 pt-24 md:pt-32 relative overflow-hidden">
        {/* Optional: Subtle background pattern or elements */}
        <div className="absolute inset-0 -z-10">
          {/* Example: very subtle grid pattern or abstract shapes */}
          {/* <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px]"></div> */}
        </div>
        
        <div 
          className="
            w-full max-w-3xl p-8 md:p-12 
            rounded-2xl shadow-2xl 
            bg-slate-800/20 backdrop-blur-2xl /* Darker, more translucent glass on a dark bg */
            border border-slate-700/60  /* Subtle border for dark glass */
            text-center relative z-10
          "
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 shadow-lg">
            <Layers className="h-8 w-8 text-slate-100" /> {/* Abstract icon */}
          </div>

          <h1 
            className="
              text-4xl sm:text-5xl md:text-6xl font-extrabold 
              text-slate-50 /* Bright white or very light grey text */
              mb-6 leading-tight tracking-tight
            "
            // For black and white, solid color is better than gradient text
            // style={{ textShadow: '0 1px 3px rgba(255,255,255,0.1)' }} 
          >
            Sukuu: Empowering Education.
          </h1>
          <p className="text-lg md:text-xl text-slate-300 dark:text-slate-400 mb-10 leading-relaxed">
            The definitive platform to streamline school administration, enhance communication, and empower your entire educational community.
          </p>

          <div className="text-left text-sm md:text-base text-slate-300 dark:text-slate-400 space-y-3 mb-12 px-4">
            <FeatureListItem>Unified management for students, staff, and academics.</FeatureListItem>
            <FeatureListItem>Simplified grading, attendance, and reporting.</FeatureListItem>
            <FeatureListItem>Seamless communication channels for all stakeholders.</FeatureListItem>
            <FeatureListItem>Intuitive, responsive design for all devices.</FeatureListItem>
          </div>

          <Link href="/auth/signin" passHref>
            <Button 
              size="lg" 
              className="
                w-full sm:w-auto px-8 py-3 text-base font-semibold group 
                bg-slate-50 hover:bg-slate-200 
                text-slate-900 /* Dark text on light button */
                shadow-lg hover:shadow-md transition-all duration-300
              "
            >
              Access Portal / Sign In
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <p className="mt-6 text-xs text-slate-500 dark:text-slate-600">
            Administrators & Staff: Securely access your dedicated portal.
          </p>
        </div>

        <footer className="fixed bottom-0 left-0 right-0 p-4 text-center text-xs text-slate-500 dark:text-slate-600 print:hidden">
            &copy; {new Date().getFullYear()} Sukuu Platform. All rights reserved.
        </footer>
      </main>
    </>
  );
}