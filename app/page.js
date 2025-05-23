// File: app/page.js
import Link from "next/link";
import { Button } from "@/components/ui/button";
import LandingNavbar from "@/components/layout/LandingNavbar";
import AuthenticatedRedirector from "@/components/auth/AuthenticatedRedirector";
import { ArrowRight, CheckCircle, Layers } from "lucide-react";


function FeatureListItem({ children }) {
  return (
    <li className="flex items-start">
      {/* Icon color can also use theme variables if needed, e.g., text-primary */}
      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-3 mt-1 shrink-0" />
      <span className="text-foreground/90 dark:text-foreground/80">{children}</span>
    </li>
  );
}

export default function LandingPage() {
  return (
    <>
      <AuthenticatedRedirector />
      <LandingNavbar /> {/* Ensure LandingNavbar also adapts its text/button colors */}
      
      {/* Main page container - set a base background that works for both modes or use theme variables */}
      <main className="flex flex-col items-center justify-center min-h-screen px-4 py-16 pt-24 md:pt-32 relative overflow-hidden bg-slate-50 dark:bg-slate-900">
        {/* Optional subtle background elements if desired */}
        <div className="absolute inset-0 -z-10 opacity-50 dark:opacity-30">
            {/* Example subtle pattern - adjust for light/dark if kept */}
            {/* <div className="absolute inset-0 bg-[radial-gradient(theme(colors.slate.200)_1px,transparent_1px)] dark:bg-[radial-gradient(theme(colors.slate.700)_1px,transparent_1px)] [background-size:16px_16px]"></div> */}
        </div>
        
        <div 
          className="
            w-full max-w-3xl p-8 md:p-12 
            rounded-2xl shadow-2xl 
            text-center relative z-10
            border 
            border-slate-300/50 dark:border-slate-700/50 
            bg-background/70 dark:bg-slate-800/50 
            backdrop-blur-xl 
          "
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/40 shadow-lg">
            <Layers className="h-8 w-8 text-primary" />
          </div>

          <h1 
            className="
              text-4xl sm:text-5xl md:text-6xl font-extrabold 
              text-slate-900 dark:text-slate-50 /* Theme-aware headline color */
              mb-6 leading-tight tracking-tight
            "
          >
            Welcome to Sukuu!
          </h1>
          <p className="text-lg md:text-xl text-slate-700 dark:text-slate-300 mb-10 leading-relaxed">
            The definitive platform to streamline school administration, enhance communication, and empower your entire educational community.
          </p>

          <div className="text-left text-sm md:text-base space-y-3 mb-12 px-4">
            {/* FeatureListItem already uses theme-aware text color via inheritance or direct styling */}
            <FeatureListItem>Efficiently manage student and staff records.</FeatureListItem>
            <FeatureListItem>Simplify academic processes: classes, subjects, and grading.</FeatureListItem>
            <FeatureListItem>Foster seamless communication within your school community.</FeatureListItem>
            <FeatureListItem>Access insightful reports for data-driven decision-making.</FeatureListItem>
          </div>

          <Link href="/auth/signin" passHref>
            <Button 
              size="lg" 
              className="
                w-full sm:w-auto px-8 py-3 text-base font-semibold group 
                bg-slate-900 hover:bg-slate-700 dark:bg-slate-50 dark:hover:bg-slate-200
                text-slate-50 dark:text-slate-900 /* Theme-aware button text/bg */
                shadow-lg hover:shadow-md transition-all duration-300
              "
            >
              Access Portal / Sign In
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
            Administrators & Staff: Securely access your dedicated portal.
          </p>
        </div>

        <footer className="fixed bottom-0 left-0 right-0 p-4 text-center text-xs text-muted-foreground print:hidden">
            &copy; {new Date().getFullYear()} Sukuu Platform. All rights reserved.
        </footer>
      </main>
    </>
  );
}