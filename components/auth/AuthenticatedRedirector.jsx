// File: components/auth/AuthenticatedRedirector.jsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthenticatedRedirector() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role) {
        switch (session.user.role) {
          case "SUPER_ADMIN":
            router.replace("/superadmin/dashboard");
            break;
          case "SCHOOL_ADMIN":
            router.replace("/school-admin-portal");
            break;
          // Add other roles as their portals are built
          // case "TEACHER":
          //   router.replace("/teacher-portal");
          //   break;
          default:
            // Fallback for authenticated users with unhandled roles
            // For now, let them stay on landing, or redirect to a generic placeholder
            console.warn("Authenticated user with unhandled role on landing page:", session.user.role);
            break; 
        }
      }
    }
  }, [status, session, router]);

  return null; // This component does not render anything
}