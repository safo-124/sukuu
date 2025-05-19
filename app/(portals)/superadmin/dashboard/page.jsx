// File: app/(portals)/superadmin/dashboard/page.jsx
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { School, Users, Settings, BarChart3, PlusCircle } from "lucide-react"; // Added BarChart3 for stats, PlusCircle for create
// import { getServerSession } from "next-auth/next"; // For server-side data fetching in the future
// import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path if needed
// import prisma from "@/lib/prisma"; // If fetching data

export default async function SuperAdminDashboardPage() {
  // const session = await getServerSession(authOptions); // If you need session data for checks

  // --- Placeholder Data ---
  // In the future, you'll fetch this data from your database, e.g.:
  // const totalSchools = await prisma.school.count();
  // const activeUsers = await prisma.user.count({ where: { isActive: true } });
  // const systemHealth = "Operational"; // This might come from a monitoring service or DB check

  const stats = {
    totalSchools: 0,    // Placeholder
    activeUsers: 1,     // Placeholder (Super Admin themselves)
    systemHealth: "Operational",
    pendingApprovals: 0 // Example of another stat
  };
  // --- End Placeholder Data ---

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Super Admin Dashboard
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Platform overview and management tools for Sukuu.
          </p>
        </div>
        <Link href="/superadmin/schools/new" passHref>
          <Button size="lg" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New School
          </Button>
        </Link>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <School className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSchools}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Schools registered on the platform.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Total active users across all roles.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Settings className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-500">{stats.systemHealth}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Current operational status.
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Items requiring attention.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Section */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/superadmin/schools" passHref>
            <Card className="hover:border-primary transition-colors h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <School className="h-6 w-6 text-primary" />
                  Manage Schools
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  View, edit, or add new educational institutions to the platform.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Example for a future "System Settings" quick action */}
          {/* <Link href="/superadmin/settings" passHref>
            <Card className="hover:border-primary transition-colors h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-6 w-6 text-primary" />
                  System Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Configure global parameters, integrations, and platform defaults.
                </p>
              </CardContent>
            </Card>
          </Link> */}

          {/* Example for a future "User Management" quick action */}
          {/* <Link href="/superadmin/users" passHref>
            <Card className="hover:border-primary transition-colors h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-6 w-6 text-primary" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Oversee all user accounts, roles, and permissions across the platform.
                </p>
              </CardContent>
            </Card>
          </Link> */}
        </div>
      </div>
    </>
  );
}