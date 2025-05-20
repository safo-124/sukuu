// File: app/page.js
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton"; // For a nicer loading state

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Add console logs to see what's happening
  useEffect(() => {
    console.log("[HomePage] Session Status:", status);
    if (session) {
      console.log("[HomePage] Session Data:", session);
    }
  }, [status, session]);

  useEffect(() => {
    if (status === "loading") {
      console.log("[HomePage] Effect: Session is loading. Waiting...");
      return; // Wait until session status is resolved
    }

    if (status === "unauthenticated") {
      console.log("[HomePage] Effect: User is unauthenticated. Redirecting to /auth/signin.");
      router.replace("/auth/signin");
    } else if (status === "authenticated") {
      console.log("[HomePage] Effect: User is authenticated. Role:", session?.user?.role);
      if (session?.user?.role) {
        switch (session.user.role) {
          case "SUPER_ADMIN":
            console.log("[HomePage] Effect: Redirecting SUPER_ADMIN to /superadmin/dashboard.");
            router.replace("/superadmin/dashboard");
            break;
          // Add cases for other roles here as you build them:
          // case "SCHOOL_ADMIN":
          //   router.replace("/schooladmin/dashboard"); // This will need schoolId context
          //   break;
          default:
            console.warn("[HomePage] Effect: Authenticated user with unhandled role. Redirecting to /auth/signin as fallback. Role:", session.user.role);
            router.replace("/auth/signin"); // Or a generic authenticated page like /dashboard
            break;
        }
      } else {
        // This case should ideally not happen if your JWT/session callbacks are set up correctly
        console.error("[HomePage] Effect: Authenticated, but user role is missing in session. Redirecting to /auth/signin.");
        router.replace("/auth/signin");
      }
    }
  }, [status, session, router]);


  // Show a loading skeleton while the session status is being determined
  // or while the redirect initiated by useEffect is in progress.
  if (status === "loading") {
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

  // If not loading, useEffect should be handling redirects.
  // This UI is a fallback if redirects are slow or if there's an unexpected state.
  return (
     <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <div className="space-y-6 w-full max-w-lg text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary mb-6">
            <span className="text-3xl font-bold text-primary-foreground">S</span>
          </div>
           <p className="text-lg text-muted-foreground">Preparing your Sukuu experience...</p>
        </div>
        <p className="mt-10 text-sm text-muted-foreground animate-pulse">Please wait a moment...</p>
      </div>
  );
}