// File: app/auth/signin/page.jsx
"use client";

import SignInForm from "@/components/auth/SignInForm";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function SignInPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "authenticated") {
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      router.replace(callbackUrl);
    }
  }, [status, router, searchParams, session]);

  if (status === "loading" || status === "authenticated") {
    return (
      // Background will use themed primary/secondary colors
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/80 via-primary/50 to-secondary/80 dark:from-primary/70 dark:via-primary/40 dark:to-secondary/70">
        {/* Skeleton card with adaptive background for glassmorphism */}
        <div className="w-full max-w-sm p-8 space-y-6 bg-background/30 dark:bg-background/20 backdrop-blur-md rounded-xl shadow-2xl border border-border/30">
          <Skeleton className="h-8 w-1/2 mx-auto bg-muted/70 dark:bg-muted/50" />
          <Skeleton className="h-6 w-3/4 mx-auto bg-muted/70 dark:bg-muted/50" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full bg-muted/70 dark:bg-muted/50" />
            <Skeleton className="h-10 w-full bg-muted/70 dark:bg-muted/50" />
            <Skeleton className="h-10 w-full bg-muted/60 dark:bg-muted/40" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-primary/80 via-primary/50 to-secondary/80 dark:from-primary/70 dark:via-primary/40 dark:to-secondary/70">
      <SignInForm />
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/80 via-primary/50 to-secondary/80 dark:from-primary/70 dark:via-primary/40 dark:to-secondary/70">
        <div className="w-full max-w-sm p-8 space-y-6 bg-background/30 dark:bg-background/20 backdrop-blur-md rounded-xl shadow-2xl border border-border/30">
          <Skeleton className="h-8 w-1/2 mx-auto bg-muted/70 dark:bg-muted/50" />
          <Skeleton className="h-6 w-3/4 mx-auto bg-muted/70 dark:bg-muted/50" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full bg-muted/70 dark:bg-muted/50" />
            <Skeleton className="h-10 w-full bg-muted/70 dark:bg-muted/50" />
            <Skeleton className="h-10 w-full bg-muted/60 dark:bg-muted/40" />
          </div>
        </div>
      </div>
    }>
      <SignInPageContent />
    </Suspense>
  );
}