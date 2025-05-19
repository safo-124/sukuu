// File: app/auth/signin/page.jsx
"use client";

import SignInForm from "@/components/auth/SignInForm";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

// This is the content that relies on client-side hooks
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
    // Show a more structured skeleton while session is loading or redirecting
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="w-full max-w-sm p-8 space-y-6">
          <Skeleton className="h-8 w-1/2 mx-auto" /> {/* For title */}
          <Skeleton className="h-6 w-3/4 mx-auto" /> {/* For description */}
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" /> {/* For email input */}
            <Skeleton className="h-10 w-full" /> {/* For password input */}
            <Skeleton className="h-10 w-full" /> {/* For button */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <SignInForm />
    </div>
  );
}

// Main page component with Suspense boundary
export default function SignInPage() {
  return (
    <Suspense fallback={
      // Fallback for the entire Suspense boundary (initial page load)
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="w-full max-w-sm p-8 space-y-6">
          <Skeleton className="h-8 w-1/2 mx-auto" />
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    }>
      <SignInPageContent />
    </Suspense>
  );
}