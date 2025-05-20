// File: components/auth/SignOutButton.jsx
"use client"; // This component uses a client-side hook (onClick)

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button"; // Assuming shadcn/ui Button
import { LogOut } from "lucide-react"; // For an icon

// Props allow for customization if needed (e.g., variant, size, className, callbackUrl)
export default function SignOutButton({
  variant = "outline", // Default variant
  size = "default",    // Default size
  className = "",
  callbackUrl = "/",   // Default redirect after sign out
  children,            // Allow custom children, e.g., just text or different icon
}) {
  const handleSignOut = () => {
    signOut({ callbackUrl: callbackUrl });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSignOut}
      className={className}
    >
      {children ? (
        children
      ) : (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </>
      )}
    </Button>
  );
}