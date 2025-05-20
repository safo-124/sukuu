// File: app/(portals)/[schoolId]/schooladmin/academics/layout.jsx
import { BookCopy, Home } from "lucide-react"; // For overall section icon
import { NavLink } from "@/components/common/NavLink"; // Using the client-side NavLink for active states
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";


// Function to fetch school data for the layout (name)
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
  const academicNavItems = [
    {
      href: `/${schoolId}/schooladmin/academics`,
      label: "Overview",
      exact: true, // For NavLink active state matching
    },
    {
      href: `/${schoolId}/schooladmin/academics/classes`,
      label: "Classes",
      exact: false,
    },
    {
      href: `/${schoolId}/schooladmin/academics/subjects`,
      label: "Subjects",
      exact: false,
      disabled: true, // Mark as disabled if not yet implemented
    },
    {
      href: `/${schoolId}/schooladmin/academics/sessions`,
      label: "Academic Sessions",
      exact: false,
      disabled: true,
    },
    {
      href: `/${schoolId}/schooladmin/academics/grading`,
      label: "Grading & Reports",
      exact: false,
      disabled: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Optional: A link to go back to the main School Admin Dashboard */}
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

      {/* Sub-navigation bar for Academics section */}
      <nav className="flex flex-wrap gap-x-2 gap-y-2 border-b pb-4 -mt-2"> {/* Negative margin to pull closer to title */}
        {academicNavItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.disabled ? "#" : item.href}
            exact={item.exact}
            // Pass simple string for children, NavLink handles styling
          >
            <Button 
              variant={item.disabled ? "ghost" : "ghost"} // Active state handled by NavLink's internal cn()
              size="sm"
              className={`text-sm ${item.disabled ? 'cursor-not-allowed text-muted-foreground/70' : 'text-muted-foreground hover:text-primary'}`}
              disabled={item.disabled}
              asChild={!item.disabled} // Important: Use asChild only if not disabled, so Link works
            >
              {item.disabled ? <span>{item.label}</span> : <Link href={item.href}>{item.label}</Link>}
            </Button>
             {/* {item.disabled && <Badge variant="outline" className="ml-1 text-xs">Soon</Badge>} */}

          </NavLink>
        ))}
      </nav>

      {/* Content of the specific academics page (e.g., overview, classes list) */}
      <div className="mt-2"> {/* Added margin-top to space from nav */}
        {children}
      </div>
    </div>
  );
}