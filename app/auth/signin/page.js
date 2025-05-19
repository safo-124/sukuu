// File: app/auth/signin/page.jsx
"use client";

import SignInForm from "@/components/auth/SignInForm"; // Adjust path if needed
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react"; // Import Suspense

// This new component will contain the logic that uses client-side hooks
function SignInPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams(); // useSearchParams is now inside this Suspense-wrapped component

  useEffect(() => {
    if (status === "authenticated") {
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      router.replace(callbackUrl); // Use replace to avoid adding signin page to history
    }
  }, [status, router, searchParams, session]); // Added session to dependency array

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading session information...</p> {/* Or a spinner component */}
      </div>
    );
  }

  // Only render the form if not authenticated and not loading
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <SignInForm /> {/* SignInForm also uses useSearchParams, and will benefit from this Suspense boundary */}
    </div>
  );
}


export default function SignInPage() {
  // The SignInPage itself no longer directly calls useSearchParams or useSession
  // It just sets up the Suspense boundary.
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading page...</p> {/* Fallback UI for the entire page content */}
      </div>
    }>
      <SignInPageContent />
    </Suspense>
  );
}