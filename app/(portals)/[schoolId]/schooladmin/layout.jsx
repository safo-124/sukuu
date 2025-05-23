// File: app/(portals)/[schoolId]/schooladmin/layout.jsx
import Link from "next/link";
import {
  Home,             // For Dashboard
  UsersRound,       // For Students
  UserCheck,        // For Staff Management
  BookCopy,         // For Academics
  CalendarClock,    // For Timetable
  DollarSign,       // For Finance
  Settings,         // For School Settings
  ShieldAlert,      // Icon for School Admin Panel Branding
  PanelLeft,        // Icon for Mobile Menu Toggle
  GraduationCap,    // For Grading (within Academics)
  CheckSquare,      // For Attendance (NEW)
  FileText,         // For Examinations (Placeholder)
  Megaphone,        // For Communication (NEW)
  BarChart2,        // For Reports (Placeholder)
} from "lucide-react";

import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { UserNavDropdown } from "@/components/auth/UserNavDropdown";
import { NavLink } from "@/components/common/NavLink"; // Ensure this path is correct
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import prisma from "@/lib/prisma";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge"; // For "Soon" badge

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
        return { name: "School Portal", logoUrl: null }; // Fallback
    }
}

// Define navigation items for the School Admin sidebar
const schoolAdminNavItems = (schoolId) => [
  { href: `/${schoolId}/schooladmin/dashboard`, icon: Home, label: "Dashboard", exact: true },
  { href: `/${schoolId}/schooladmin/students`, icon: UsersRound, label: "Students" },
  { href: `/${schoolId}/schooladmin/staff`, icon: UserCheck, label: "Staff" },
  { href: `/${schoolId}/schooladmin/academics`, icon: BookCopy, label: "Academics" },
  { href: `/${schoolId}/schooladmin/attendance`, icon: CheckSquare, label: "Attendance" }, // NEW
  { href: `/${schoolId}/schooladmin/timetable`, icon: CalendarClock, label: "Timetable" },
  { href: `/${schoolId}/schooladmin/examinations`, icon: FileText, label: "Examinations", disabled: true }, // Kept as example
  { href: `/${schoolId}/schooladmin/finance`, icon: DollarSign, label: "Finance", disabled: true },
  { href: `/${schoolId}/schooladmin/communication`, icon: Megaphone, label: "Communication" }, // NEW
  { href: `/${schoolId}/schooladmin/reports`, icon: BarChart2, label: "Reports", disabled: true }, // Kept as example
  { href: `/${schoolId}/schooladmin/settings`, icon: Settings, label: "School Settings", disabled: true },
];


export default async function SchoolAdminLayout({ children, params }) {
  const { schoolId } = params;
  const schoolData = await getSchoolLayoutData(schoolId);
  const schoolName = schoolData?.name || "School Admin";
  const schoolLogoUrl = schoolData?.logoUrl;

  const navItems = schoolAdminNavItems(schoolId);

  const SidebarHeader = () => (
    <div className="flex h-16 items-center border-b px-4 lg:h-[68px] lg:px-6 shrink-0">
      <Link href={`/${schoolId}/schooladmin/dashboard`} className="flex items-center gap-2.5 font-semibold text-primary">
        {schoolLogoUrl ? (
          <img src={schoolLogoUrl} alt={`${schoolName} Logo`} className="h-8 w-8 object-contain rounded-sm" />
        ) : (
          <ShieldAlert className="h-7 w-7" />
        )}
        <span className="text-lg truncate" title={schoolName}>
          {schoolName.length > 16 ? schoolName.substring(0, 16) + "..." : schoolName}
        </span>
      </Link>
    </div>
  );

  const SidebarNav = () => (
    <ScrollArea className="flex-1 py-2">
      <nav className="grid items-start px-2 text-sm font-medium lg:px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const renderedIcon = Icon ? <Icon className="h-4 w-4" /> : undefined;
          return (
            <NavLink
              key={item.href}
              href={item.disabled ? "#!" : item.href}
              exact={item.exact}
              icon={renderedIcon}
              className={item.disabled ? "pointer-events-none !text-muted-foreground/60 !bg-transparent hover:!bg-transparent focus-visible:!ring-0 focus-visible:!ring-offset-0" : ""}
            >
              <span className="flex-grow">{item.label}</span> {/* Ensure label takes available space */}
              {item.disabled && <Badge variant="outline" className="ml-auto text-xs px-1.5 py-0.5">Soon</Badge>}
            </NavLink>
          );
        })}
      </nav>
    </ScrollArea>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Desktop Sidebar */}
      <div className="hidden border-r bg-card md:block no-print">
        <div className="flex h-full max-h-screen flex-col">
          <SidebarHeader />
          <SidebarNav />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col bg-muted/40 dark:bg-background">
        <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-4 lg:h-[68px] lg:px-6 sticky top-0 z-30 backdrop-blur-sm bg-card/75 dark:bg-card/65 no-print">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0 w-[240px] sm:w-[280px] no-print">
                <SheetHeader className="p-0 sr-only"> {/* Keeping this sr-only as SidebarHeader provides visible title */}
                  <SheetTitle >School Navigation Menu</SheetTitle>
                  <SheetDescription>
                    Access different sections of the {schoolName} admin portal.
                  </SheetDescription>
                </SheetHeader>
                <SidebarHeader /> 
                <SidebarNav />
              </SheetContent>
            </Sheet>
            <Link href={`/${schoolId}/schooladmin/dashboard`} className="md:hidden">
                <span className="font-semibold text-primary truncate" title={schoolName}>
                    {schoolName.length > 15 ? schoolName.substring(0, 15) + "..." : schoolName}
                </span>
            </Link>
          </div>
          
          <div className="w-full flex-1 hidden md:block"></div>

          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            <ThemeToggleButton />
            <UserNavDropdown />
          </div>
        </header>

        <ScrollArea className="flex-1">
          <main className="flex flex-col gap-4 p-4 md:p-6 lg:gap-6 lg:p-8">
            {children}
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}