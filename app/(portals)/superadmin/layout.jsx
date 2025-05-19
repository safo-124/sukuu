// File: app/(portals)/superadmin/layout.jsx
import Link from "next/link";
import {
  Home,
  School as SchoolIcon,
  ShieldCheck, // Using ShieldCheck for Super Admin branding
} from "lucide-react";
// No need for SignOutButton here anymore as it's in UserNavDropdown
// No need for Avatar here anymore as it's in UserNavDropdown

import { ThemeToggleButton } from "@/components/common/ThemeToggleButton"; // Import Theme Toggle
import { UserNavDropdown } from "@/components/auth/UserNavDropdown";   // Import User Nav

// NavLink component (can be kept here or moved to a common components folder)
function NavLink({ href, icon: Icon, children, exact = false }) {
  // For active state, this would need to be a client component using usePathname
  // As a server component, we can't easily determine active state without passing the current path
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
    >
      <Icon className="h-5 w-5" /> {/* Slightly larger icons */}
      {children}
    </Link>
  );
}

export default async function SuperAdminLayout({ children }) {
  // Session data will be primarily accessed by UserNavDropdown client-side via useSession
  // No need to pass session from here unless other parts of this server layout need it directly

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Sidebar */}
      <div className="hidden border-r bg-card md:block"> {/* Use bg-card for theme consistency */}
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-16 items-center border-b px-4 lg:h-[68px] lg:px-6"> {/* Slightly taller header */}
            <Link href="/superadmin/dashboard" className="flex items-center gap-2 font-semibold text-primary">
              <ShieldCheck className="h-7 w-7" /> {/* Updated Icon */}
              <span className="text-lg">Sukuu SuperPanel</span> {/* Updated Title */}
            </Link>
          </div>
          <div className="flex-1 py-2"> {/* Added padding */}
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4 space-y-1"> {/* Added space-y-1 */}
              <NavLink href="/superadmin/dashboard" icon={Home}>
                Dashboard
              </NavLink>
              <NavLink href="/superadmin/schools" icon={SchoolIcon}>
                Manage Schools
              </NavLink>
              {/* Example of more links you might add later */}
              {/*
              <NavLink href="/superadmin/users" icon={Users}>
                Manage Users
              </NavLink>
              <NavLink href="/superadmin/subscriptions" icon={DollarSign}>
                Subscriptions
              </NavLink>
              <NavLink href="/superadmin/settings" icon={Settings}>
                System Settings
              </NavLink>
              */}
            </nav>
          </div>
          {/* Optional: Sidebar footer like app version or quick help */}
          {/* <div className="mt-auto p-4 border-t">
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Sukuu Platform</p>
          </div> */}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col bg-muted/40 dark:bg-background"> {/* Ensure main area background also adapts */}
        {/* Header / Navbar */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:h-[68px] lg:px-6 sticky top-0 z-30 backdrop-blur-md bg-card/80 dark:bg-card/70"> {/* Sticky, blurred header */}
          {/* Mobile Sidebar Toggle Button - Future: Implement with Sheet component from shadcn */}
          <div className="md:hidden">
            {/* <Button variant="outline" size="icon"> <PanelLeft className="h-5 w-5" /> </Button> */}
            <span className="font-semibold text-primary">Sukuu SuperPanel</span>
          </div>
          
          <div className="w-full flex-1">
            {/* Optional: Breadcrumbs or Global Search Bar */}
            {/* <form> <div className="relative"> <SearchIcon /> <Input /> </div> </form> */}
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <ThemeToggleButton />
            <UserNavDropdown />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:gap-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}