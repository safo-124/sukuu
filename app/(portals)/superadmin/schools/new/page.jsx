// File: app/(portals)/superadmin/schools/new/page.jsx
import SchoolForm from "@/components/superadmin/SchoolForm"; // Adjust path if needed
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// This page is a Server Component by default.
// The SchoolForm itself is a Client Component.

export const metadata = {
  title: "Create New School | Super Admin - Sukuu",
  description: "Register a new school on the Sukuu platform.",
};

export default function CreateNewSchoolPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href="/superadmin/schools" passHref>
            <Button variant="outline" size="sm" className="mb-2 sm:mb-0">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Schools
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Register New School
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Provide the necessary details to add a new school to the platform.
          </p>
        </div>
      </div>

      {/* School Form Component */}
      {/* The SchoolForm is wrapped in a Card internally */}
      <SchoolForm />
      
    </div>
  );
}