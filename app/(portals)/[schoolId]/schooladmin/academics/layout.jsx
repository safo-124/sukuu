// File: app/(portals)/[schoolId]/schooladmin/academics/layout.jsx
import Link from "next/link";
import {
  BookCopy, // Main icon for Academics section
  Home,     // For Overview
  ListOrdered, // For Classes
  Tag,      // For Subjects
  CalendarDays as SessionsIcon, // For Academic Sessions
  GraduationCap // For Grading & Reports
} from "lucide-react";
import { NavLink } from "@/components/common/NavLink"; // Your custom client-side NavLink
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils"; // Import cn if NavLink uses it for advanced styling

async function getSchoolNameForLayout(schoolId) {
    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { name: true }
        });
        return school?.name;
    } catch (error) {
        console.error("Error fetching school name for academics layout:", error);
        return "Selected School"; // Fallback name
    }
}

export default async function AcademicsLayout({ children, params }) {
  const { schoolId } = params;
  const schoolName = await getSchoolNameForLayout(schoolId);

  // Define sub-navigation items for the Academics section
  // Ensure 'icon' holds the component type (e.g., Home, not <Home />)
  const academicNavItems = [
    {
      href: `/${schoolId}/schooladmin/academics`,
      label: "Overview",
      icon: Home, 
      exact: true,
    },
    {
      href: `/${schoolId}/schooladmin/academics/classes`,
      label: "Classes",
      icon: ListOrdered,
      exact: false,
    },
    {
      href: `/${schoolId}/schooladmin/academics/subjects`,
      label: "Subjects",
      icon: Tag,
      exact: false,
    },
    {
      href: `/${schoolId}/schooladmin/academics/sessions`,
      label: "Academic Sessions",
      icon: SessionsIcon,
      exact: false,
    },
    {
      href: `/${schoolId}/schooladmin/academics/grading`,
      label: "Grading & Reports",
      icon: GraduationCap,
      exact: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/${schoolId}/schooladmin/dashboard`} passHref>
            <Button variant="outline" size="sm" className="text-xs sm:text-sm"> {/* Removed mb-2/mb-0, handled by parent space-y */}
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

      {/* Sub-navigation bar for Academics section */}
      <nav className="flex flex-wrap items-center gap-x-1 gap-y-1 border-b pb-3 -mt-2 mb-6 overflow-x-auto"> {/* Added mb-6 */}
        {academicNavItems.map((item) => {
          const IconComponent = item.icon; // Get the icon component type
          return (
            <NavLink // NavLink itself is a Next.js Link component styled as a button/tab
              key={item.href}
              href={item.disabled ? "#!" : item.href} // Handle disabled state if needed in NavLink
              exact={item.exact}
              // Pass the rendered icon element as the 'icon' prop
              icon={IconComponent ? <IconComponent className="h-4 w-4" /> : undefined}
              // Add a class if item is disabled, NavLink can use this
              className={item.disabled ? "pointer-events-none !text-muted-foreground/60 !bg-transparent hover:!bg-transparent focus-visible:!ring-0 focus-visible:!ring-offset-0" : ""}
            >
              {item.label} {/* The label is the child of NavLink */}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-2"> {/* Ensure there's some space if -mt-2 was too much */}
        {children}
      </div>
    </div>
  );
}