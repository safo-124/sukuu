// File: app/auth/signin/page.jsx
"use client"; // Still a client component to manage session status for redirect

import SignInForm from "@/components/auth/SignInForm"; // Adjust path if needed
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "authenticated") {
      const callbackUrl = searchParams.get("callbackUrl") || "/"; // Default redirect to homepage
      router.replace(callbackUrl); // Use replace to avoid adding signin page to history
    }
  }, [status, router, searchParams]);

  if (status === "loading" || status === "authenticated") {
    // Show a loading state or a blank page while checking session/redirecting
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Loading...</p> {/* Or a spinner component */}
        </div>
    );
  }

  // Only render the form if not authenticated and not loading
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <SignInForm />
    </div>
  );
}