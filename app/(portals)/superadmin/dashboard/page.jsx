// File: app/(portals)/superadmin/dashboard/page.jsx
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { School, Users, Settings, BarChart3, PlusCircle, ListChecks, Clock3 } from "lucide-react"; // Added ListChecks, Clock3
import prisma from "@/lib/prisma"; // For fetching data
import { Badge } from "@/components/ui/badge"; // To display school status

// Helper to format date (can be moved to a utils file)
const formatDate = (dateString, options = { year: 'numeric', month: 'short', day: 'numeric' }) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString(undefined, options);
};


export default async function SuperAdminDashboardPage() {
  // Fetch dynamic data
  const totalSchools = await prisma.school.count();
  const activeUsers = await prisma.user.count({ where: { isActive: true } }); // Example: Platform-wide active users
  const recentlyAddedSchools = await prisma.school.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: 3, // Get the latest 3 schools
    select: { // Select only necessary fields
        id: true,
        name: true,
        schoolEmail: true,
        createdAt: true,
        isActive: true,
    }
  });

  const stats = {
    totalSchools: totalSchools,
    activeUsers: activeUsers,
    systemHealth: "Operational", // This can remain static or be fetched from a status service
    pendingTasks: 0, // Placeholder, could be count of pending approvals if feature exists
  };

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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 mb-8"> {/* Increased gap */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <School className="h-5 w-5 text-primary" /> {/* Themed icon color */}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSchools}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Registered schools on the platform.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-5 w-5 text-primary" />
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
            <Settings className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.systemHealth}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Current operational status.
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <ListChecks className="h-5 w-5 text-primary" /> {/* Changed Icon */}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Items requiring administrative attention.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recently Added Schools Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Recently Added Schools</h2>
        {recentlyAddedSchools.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            {recentlyAddedSchools.map((school) => (
              <Card key={school.id} className="hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{school.name}</CardTitle>
                    <Badge variant={school.isActive ? "default" : "destructive"}
                           className={school.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}>
                      {school.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">{school.schoolEmail}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                    Registered: {formatDate(school.createdAt)}
                  </div>
                </CardContent>
                <div className="p-4 pt-0 mt-auto"> {/* Footer actions */}
                  <Link href={`/superadmin/schools/${school.id}/view`} passHref>
                    <Button variant="outline" size="sm" className="w-full">View Details</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No schools have been added recently.
            </CardContent>
          </Card>
        )}
      </div>


      {/* Quick Actions Section (remains similar) */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Quick Actions</h2>
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/superadmin/schools" passHref>
            <Card className="hover:border-primary transition-colors h-full flex flex-col group">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl group-hover:text-primary transition-colors">
                  <School className="h-6 w-6" />
                  Manage All Schools
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  View, edit, or add new educational institutions to the platform.
                </p>
              </CardContent>
            </Card>
          </Link>
          {/* Add more quick action cards here */}
        </div>
      </div>
    </>
  );
}