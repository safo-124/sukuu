// File: app/page.js
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton"; // For a nicer loading state

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Don't do anything while session is loading
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      // User is not authenticated, redirect to sign-in page
      router.replace("/auth/signin");
    } else if (status === "authenticated") {
      // User is authenticated, redirect based on role
      if (session?.user?.role) {
        switch (session.user.role) {
          case "SUPER_ADMIN":
            router.replace("/superadmin/dashboard");
            break;
          // Add cases for other roles as you build them:
          // case "SCHOOL_ADMIN":
          //   // School admin dashboard might need a schoolId, handle that logic
          //   router.replace("/select-school"); // Or a default school admin page
          //   break;
          // case "TEACHER":
          //   router.replace("/teacher/dashboard");
          //   break;
          // case "PARENT":
          //   router.replace("/parent/dashboard");
          //   break;
          default:
            // Fallback for authenticated users with unhandled roles
            // or if you want a generic authenticated landing spot
            console.warn("Authenticated user with unhandled role or no specific redirect:", session.user.role);
            router.replace("/auth/signin"); // Or a generic dashboard if you have one e.g. /dashboard
            break;
        }
      } else {
        // Authenticated but role is not defined, should not happen with our setup
        console.error("Authenticated user session found, but role is missing.");
        router.replace("/auth/signin"); // Fallback to sign-in
      }
    }
  }, [status, session, router]);

  // Display a loading UI while the session is loading or redirect is in progress
  // This prevents a flash of content if there was any, and provides feedback.
  // The conditions ensure this loading UI is shown only when appropriate for this page's logic.
  const showLoading = status === "loading" || 
                      (status === "unauthenticated" && (typeof window !== 'undefined' && window.location.pathname === '/')) ||
                      (status === "authenticated" && (typeof window !== 'undefined' && window.location.pathname === '/'));

  if (showLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <div className="space-y-6 w-full max-w-lg text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary mb-6">
            <span className="text-3xl font-bold text-primary-foreground">S</span>
          </div>
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
          <div className="pt-4">
            <Skeleton className="h-12 w-32 mx-auto" />
          </div>
        </div>
        <p className="mt-10 text-sm text-muted-foreground animate-pulse">Initializing Sukuu Platform...</p>
      </div>
    );
  }

  // This content should ideally not be visible for long, as redirects will occur.
  // It acts as a fallback during the very brief moment before a redirect JS might execute.
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Loading your experience...</p>
    </div>
  );
}