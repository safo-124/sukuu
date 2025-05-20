// File: app/(portals)/[schoolId]/schooladmin/layout.jsx
import Link from "next/link";
import {
  Home,             // For Dashboard
  UsersRound,       // For Students
  UserCheck,        // For Staff Management
  BookCopy,         // For Academics (Classes, Subjects)
  CalendarClock,    // For Timetable
  FileText,         // For Examinations/Grading (Example)
  DollarSign,       // For Finance
  Megaphone,        // For Communication (Example)
  Settings,         // For School Settings
  BarChart2,        // For Reports (Example)
  ShieldAlert,      // Icon for School Admin Panel Branding
  PanelLeft,        // Icon for Mobile Menu Toggle
  // Add other icons from lucide-react as needed for new nav items
} from "lucide-react";

import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { UserNavDropdown } from "@/components/auth/UserNavDropdown";
import { NavLink } from "@/components/common/NavLink"; // Ensure this path is correct
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription, // Import for accessibility
  SheetHeader,      // Import for accessibility
  SheetTitle,       // Import for accessibility
  SheetTrigger,
} from "@/components/ui/sheet";
import prisma from "@/lib/prisma";
import { ScrollArea } from "@/components/ui/scroll-area";
// import { cn } from "@/lib/utils"; // Not directly used in this file anymore, but NavLink might use it

// Function to fetch school data for the layout (name and logo)
async function getSchoolLayoutData(schoolId) {
    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { name: true, logoUrl: true }
        });
        return school;
    } catch (error) {
        console.error(`Error fetching school data for layout (ID: ${schoolId}):`, error);
        return null; // Return null or a default object if preferred
    }
}

// Define navigation items for the School Admin sidebar
// These represent core modules that would interact with the database for the specific school
const schoolAdminNavItems = (schoolId) => [
  { href: `/${schoolId}/schooladmin/dashboard`, iconComponent: Home, label: "Dashboard" },
  { href: `/${schoolId}/schooladmin/students`, iconComponent: UsersRound, label: "Students" },
  { href: `/${schoolId}/schooladmin/staff`, iconComponent: UserCheck, label: "Staff" },
  { href: `/${schoolId}/schooladmin/academics`, iconComponent: BookCopy, label: "Academics" }, // Could lead to sub-menu for Classes, Subjects
  { href: `/${schoolId}/schooladmin/timetable`, iconComponent: CalendarClock, label: "Timetable" },
  // { href: `/${schoolId}/schooladmin/attendance`, iconComponent: CheckSquare, label: "Attendance" },
  // { href: `/${schoolId}/schooladmin/examinations`, iconComponent: FileText, label: "Examinations" },
  { href: `/${schoolId}/schooladmin/finance`, iconComponent: DollarSign, label: "Finance" }, // Fees, Invoices, Payments
  // { href: `/${schoolId}/schooladmin/communication`, iconComponent: Megaphone, label: "Communication" },
  // { href: `/${schoolId}/schooladmin/reports`, iconComponent: BarChart2, label: "Reports" },
  { href: `/${schoolId}/schooladmin/settings`, iconComponent: Settings, label: "School Settings" },
];


export default async function SchoolAdminLayout({ children, params }) {
  const { schoolId } = params;
  const schoolData = await getSchoolLayoutData(schoolId);
  // Provide default names if schoolData or schoolName is null/undefined
  const schoolName = schoolData?.name || "School Portal";
  const schoolLogoUrl = schoolData?.logoUrl;

  const navItems = schoolAdminNavItems(schoolId);

  // Reusable component for the sidebar's top section (logo and school name)
  const SidebarHeader = () => (
    <div className="flex h-16 items-center border-b px-4 lg:h-[68px] lg:px-6 shrink-0">
      <Link href={`/${schoolId}/schooladmin/dashboard`} className="flex items-center gap-2.5 font-semibold text-primary"> {/* Adjusted gap */}
        {schoolLogoUrl ? (
          <img src={schoolLogoUrl} alt={`${schoolName} Logo`} className="h-8 w-8 object-contain rounded-sm" />
        ) : (
          <ShieldAlert className="h-7 w-7" /> // Default icon
        )}
        <span className="text-lg truncate" title={schoolName}>
          {schoolName.length > 16 ? schoolName.substring(0, 16) + "..." : schoolName} {/* Adjusted truncation */}
        </span>
      </Link>
    </div>
  );

  // Reusable component for the sidebar's navigation links
  const SidebarNav = () => (
    <ScrollArea className="flex-1 py-2"> {/* ScrollArea wraps only the nav part */}
      <nav className="grid items-start px-2 text-sm font-medium lg:px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.iconComponent; // Get the component type
          const renderedIcon = Icon ? <Icon className="h-5 w-5" /> : null; // Render icon server-side

          return (
            <NavLink
              key={item.href}
              href={item.href}
              icon={renderedIcon} // Pass the rendered JSX element
              exact={item.href.endsWith("dashboard")} // 'exact' prop for NavLink active state logic
            >
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </ScrollArea>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Desktop Sidebar */}
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col"> {/* Main flex container for sidebar */}
          <SidebarHeader />
          <SidebarNav />
          {/* Optional footer could go here, e.g., inside the flex-col before its end */}
          {/* <div className="mt-auto p-4 border-t"> <p className="text-xs text-muted-foreground">Version 1.0</p> </div> */}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col bg-muted/40 dark:bg-background">
        {/* Header / Navbar */}
        <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-4 lg:h-[68px] lg:px-6 sticky top-0 z-30 backdrop-blur-sm bg-card/75 dark:bg-card/65">
          <div className="flex items-center gap-2 md:hidden"> {/* Container for mobile menu toggle and title */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0 w-[240px] sm:w-[280px]">
                {/* SheetHeader, SheetTitle, SheetDescription for accessibility */}
                <SheetHeader className="p-0 sr-only"> {/* Making header visually hidden but present for ARIA unless SidebarHeader is used as title */}
                  <SheetTitle >School Navigation Menu</SheetTitle> {/* Could be dynamic with schoolName */}
                  <SheetDescription>
                    Access different sections of the {schoolName} admin portal.
                  </SheetDescription>
                </SheetHeader>
                {/* Render the visual header and nav links */}
                <SidebarHeader /> {/* This provides the visual header */}
                <SidebarNav />
                {/* Optional footer for mobile sheet */}
              </SheetContent>
            </Sheet>
            <Link href={`/${schoolId}/schooladmin/dashboard`} className="md:hidden">
                <span className="font-semibold text-primary truncate" title={schoolName}>
                    {schoolName.length > 15 ? schoolName.substring(0, 15) + "..." : schoolName}
                </span>
            </Link>
          </div>
          
          {/* This div is for centering elements in the middle of the header if needed, or for breadcrumbs on desktop */}
          <div className="w-full flex-1 hidden md:block"> 
            {/* Breadcrumbs or page title could go here for larger screens */}
          </div>

          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            <ThemeToggleButton />
            <UserNavDropdown />
          </div>
        </header>

        <ScrollArea className="flex-1"> {/* Make main content area scrollable */}
          <main className="flex flex-col gap-4 p-4 md:p-6 lg:gap-6 lg:p-8">
            {children}
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}