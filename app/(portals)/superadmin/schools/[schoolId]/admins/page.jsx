// File: app/(portals)/superadmin/schools/[schoolId]/admins/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, PlusCircle, UserCog, Users, Mail, CalendarDays } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Helper to format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

async function getSchoolAndAdmins(schoolId) {
  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        admins: { // Fetch related SchoolAdmin records
          include: {
            user: true, // Include the User details for each SchoolAdmin
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
      },
    });
    return school;
  } catch (error) {
    console.error("Failed to fetch school and its admins:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const school = await getSchoolAndAdmins(params.schoolId); // Re-uses the fetch logic
  if (!school) {
    return { title: "School Not Found" };
  }
  return {
    title: `Manage Admins: ${school.name} | Super Admin - Sukuu`,
    description: `View and manage administrators for ${school.name}.`,
  };
}

export default async function ManageSchoolAdminsPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
    redirect(`/auth/signin?callbackUrl=/superadmin/schools/${schoolId}/admins`);
  }

  const schoolWithAdmins = await getSchoolAndAdmins(schoolId);

  if (!schoolWithAdmins) {
    notFound();
  }

  const { name: schoolName, admins } = schoolWithAdmins;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/superadmin/schools/${schoolId}/view`} passHref> {/* Link back to school view page */}
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to School Details
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Manage Admins: <span className="text-primary">{schoolName}</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            View and assign school administrators for this institution.
          </p>
        </div>
        <Link href={`/superadmin/schools/${schoolId}/admins/new`} passHref>
          <Button size="lg" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New School Admin
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Current School Administrators ({admins.length})
          </CardTitle>
          <CardDescription>
            The following users have administrative access to {schoolName}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {admins.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden md:table-cell">Date Added</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    {/* <TableHead className="text-right">Actions</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((adminEntry) => (
                    <TableRow key={adminEntry.id}>
                      <TableCell>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={adminEntry.user.profilePicture || undefined} alt={adminEntry.user.firstName} />
                          <AvatarFallback>
                            {adminEntry.user.firstName?.[0] || ''}{adminEntry.user.lastName?.[0] || ''}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
                        {adminEntry.user.firstName} {adminEntry.user.lastName}
                      </TableCell>
                      <TableCell>{adminEntry.user.email}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(adminEntry.createdAt)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={adminEntry.user.isActive ? "default" : "destructive"}
                               className={adminEntry.user.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}>
                          {adminEntry.user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      {/* <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Edit</Button> 
                      </TableCell> */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <UserCog className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                No administrators have been assigned to this school yet.
              </p>
              <Link href={`/superadmin/schools/${schoolId}/admins/new`} passHref className="mt-4 inline-block">
                <Button variant="secondary">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add First School Admin
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}