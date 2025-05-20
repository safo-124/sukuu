// File: app/page.js
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Console logs for debugging (can be removed once fixed)
  useEffect(() => {
    console.log("[HomePage] Session Status:", status);
    if (session) {
      console.log("[HomePage] Session Data:", session);
    }
  }, [status, session]);

  useEffect(() => {
    if (status === "loading") {
      console.log("[HomePage] Effect: Session is loading. Waiting...");
      return;
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
          case "SCHOOL_ADMIN": // <<< ADD THIS CASE
            console.log("[HomePage] Effect: Redirecting SCHOOL_ADMIN to /school-admin-portal.");
            router.replace("/school-admin-portal"); // Placeholder for School Admin area
            break;
          // Add cases for "TEACHER", "PARENT", "STUDENT" later
          default:
            console.warn("[HomePage] Effect: Authenticated user with unhandled role. Redirecting to /auth/signin as fallback. Role:", session.user.role);
            router.replace("/auth/signin");
            break;
        }
      } else {
        console.error("[HomePage] Effect: Authenticated, but user role is missing in session. Redirecting to /auth/signin.");
        router.replace("/auth/signin");
      }
    }
  }, [status, session, router]);

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