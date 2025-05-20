// File: app/(portals)/[schoolId]/schooladmin/academics/layout.jsx
import Link from "next/link";
import { BookCopy, Home, ListOrdered, Tag, CalendarDays, GraduationCap } from "lucide-react"; // Ensured all icons are here
import { NavLink } from "@/components/common/NavLink";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

async function getSchoolNameForLayout(schoolId) {
    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { name: true }
        });
        return school?.name;
    } catch (error) {
        console.error("Error fetching school name for academics layout:", error);
        return "Selected School";
    }
}

export default async function AcademicsLayout({ children, params }) {
  const { schoolId } = params;
  const schoolName = await getSchoolNameForLayout(schoolId);

  // Define sub-navigation items for the Academics section - ALL ENABLED
  const academicNavItems = [
    {
      href: `/${schoolId}/schooladmin/academics`,
      label: "Overview",
      exact: true,
    },
    {
      href: `/${schoolId}/schooladmin/academics/classes`,
      label: "Classes",
      exact: false, // Will match /classes, /classes/new, /classes/[id]/edit etc.
    },
    {
      href: `/${schoolId}/schooladmin/academics/subjects`,
      label: "Subjects",
      exact: false,
      // disabled: false, // Or remove disabled property
    },
    {
      href: `/${schoolId}/schooladmin/academics/sessions`,
      label: "Academic Sessions",
      exact: false,
      // disabled: false, // Or remove disabled property
    },
    {
      href: `/${schoolId}/schooladmin/academics/grading`,
      label: "Grading & Reports",
      exact: false,
      // disabled: false, // Or remove disabled property
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/${schoolId}/schooladmin/dashboard`} passHref>
            <Button variant="outline" size="sm" className="mb-2 sm:mb-0 text-xs sm:text-sm">
              <ChevronLeft className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
              Back to School Dashboard
            </Button>
        </Link>
      </div>
      
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-primary/10 rounded-md">
            <BookCopy className="h-7 w-7 text-primary" />
        </div>
        <div>
            <h2 className="text-2xl font-bold tracking-tight">
                Academics Management
            </h2>
            <p className="text-sm text-muted-foreground">
                Configure and manage academic structures for {schoolName}.
            </p>
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b pb-4 -mt-2 overflow-x-auto">
        {academicNavItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href} // Link will be active even if page doesn't exist yet
            exact={item.exact}
          >
            <Button 
              variant="ghost" // Active state handled by NavLink's internal cn()
              size="sm"
              className="text-sm text-muted-foreground hover:text-primary data-[active=true]:text-primary data-[active=true]:bg-muted" // Example direct active styling
              asChild // Important: Button acts as a child of NavLink's Link
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          </NavLink>
        ))}
      </nav>

      <div className="mt-2">
        {children}
      </div>
    </div>
  );
}