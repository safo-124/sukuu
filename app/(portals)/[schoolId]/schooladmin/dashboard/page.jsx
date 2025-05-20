// File: app/(portals)/[schoolId]/schooladmin/dashboard/page.jsx
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Users, BookOpenText, CalendarCheck, Building, UserPlus, DollarSign, ListOrdered, MessageSquare, BarChartHorizontalBig, Settings2, UserCheck
} from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Helper to format date (can be moved to a utils file if used elsewhere)
const formatDate = (dateString, options = { year: 'numeric', month: 'short', day: 'numeric' }) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString('en-US', options);
};


async function getSchoolDashboardData(schoolId, userId) {
    // Verify admin belongs to this school & fetch school details
    const schoolAdminAssignment = await prisma.schoolAdmin.findFirst({ // findFirst to avoid error if user is admin of multiple schools through this specific check
        where: {
            userId: userId,
            schoolId: schoolId,
        },
        include: {
            school: true // Fetch all school details
        }
    });

    if (!schoolAdminAssignment || !schoolAdminAssignment.school) {
        console.warn(`User ${userId} is not an authorized admin for school ${schoolId}, or school not found.`);
        return null;
    }
    const school = schoolAdminAssignment.school;

    // Fetch school-specific stats
    const studentCount = await prisma.student.count({ where: { schoolId: schoolId, isActive: true } });
    const teacherCount = await prisma.teacher.count({
      where: {
        schoolId: schoolId,
        user: { isActive: true } // Assuming Teacher model has a 'user' relation to User model which has 'isActive'
      }
    });
    const classCount = await prisma.class.count({
      where: {
        schoolId: schoolId,
        academicYear: school.currentAcademicYear || undefined // Use current academic year from school
      }
    });
    const recentlyEnrolledStudents = await prisma.student.findMany({
        where: { schoolId: schoolId, isActive: true },
        orderBy: { enrollmentDate: 'desc' },
        take: 5,
        select: {
            id: true,
            firstName: true,
            lastName: true,
            enrollmentDate: true,
            profilePictureUrl: true,
            currentClass: {
                select: { name: true, section: true }
            }
        }
    });

    return {
        school, // Full school object
        studentCount,
        teacherCount,
        classCount,
        recentlyEnrolledStudents
    };
}

export async function generateMetadata({ params }) {
  const school = await prisma.school.findUnique({ where: { id: params.schoolId }, select: {name: true}});
  if (!school) return { title: "School Dashboard | Sukuu" };
  return {
    title: `${school.name} Dashboard | School Admin - Sukuu`,
  };
}

export default async function SchoolAdminDashboardPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/dashboard`);
  }
  
  const dashboardData = await getSchoolDashboardData(schoolId, session.user.id);

  // If SCHOOL_ADMIN is not authorized for this specific schoolId (checked in getSchoolDashboardData)
  if (!dashboardData && session.user.role === "SCHOOL_ADMIN") {
    redirect("/unauthorized?message=You are not authorized to manage this school.");
  }
  
  // If data couldn't be loaded for any reason (e.g. schoolId invalid and SuperAdmin is viewing)
  if (!dashboardData) {
     return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">School Admin Dashboard</h1>
            <Card className="border-destructive bg-destructive/10">
                <CardHeader><CardTitle className="text-destructive">Error</CardTitle></CardHeader>
                <CardContent><p>Could not load dashboard data for School ID: {schoolId}. The school may not exist or access is restricted.</p></CardContent>
            </Card>
        </div>
    );
  }

  const { school, studentCount, teacherCount, classCount, recentlyEnrolledStudents } = dashboardData;

  const quickActions = [
    { label: "Manage Students", href: `/${schoolId}/schooladmin/students`, icon: Users },
    { label: "Manage Staff", href: `/${schoolId}/schooladmin/staff`, icon: UserPlus },
    { label: "Manage Classes", href: `/${schoolId}/schooladmin/academics/classes`, icon: ListOrdered }, // Assuming classes under academics
    // { label: "School Finances", href: `/${schoolId}/schooladmin/finance`, icon: DollarSign },
    // { label: "School Settings", href: `/${schoolId}/schooladmin/settings`, icon: Settings2 },
    // { label: "Announcements", href: `/${schoolId}/schooladmin/communication/announcements`, icon: MessageSquare },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="pb-2 border-b">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Welcome to <span className="text-primary">{school.name}</span>
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
          Here's an overview of your school's current status and activities.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Students</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{studentCount}</div>
            <p className="text-xs text-muted-foreground pt-1">Currently enrolled and active.</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Teachers</CardTitle>
            <UserCheck className="h-5 w-5 text-primary" /> 
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{teacherCount}</div>
            <p className="text-xs text-muted-foreground pt-1">Currently active teaching staff.</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
            <BookOpenText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{classCount}</div>
            <p className="text-xs text-muted-foreground pt-1">For {school.currentAcademicYear || "current year"}.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Access common tasks quickly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map(action => (
              <Link key={action.href} href={action.href} passHref>
                <Button variant="outline" className="w-full justify-start text-left h-auto py-3">
                  <action.icon className="mr-3 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{action.label}</p>
                  </div>
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recently Enrolled Students */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Enrollments</CardTitle>
            <CardDescription>Latest students added to your school.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentlyEnrolledStudents.length > 0 ? (
              <Table>
                <TableCaption className="sr-only">A list of recently enrolled students.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Class</TableHead>
                    <TableHead className="text-right">Enrolled On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentlyEnrolledStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={student.profilePictureUrl || undefined} alt={`${student.firstName} ${student.lastName}`} />
                          <AvatarFallback>{student.firstName?.[0]}{student.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {student.currentClass ? `${student.currentClass.name} ${student.currentClass.section || ''}`.trim() : "N/A"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">{formatDate(student.enrollmentDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent student enrollments to display.</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* School Profile Summary Card - Placed below or alongside others */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-6 w-6" />
            School Profile Summary
          </CardTitle>
          <CardDescription>Key details about {school.name}.</CardDescription>
        </CardHeader>
        <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="font-medium text-muted-foreground">Official Email</dt><dd className="text-foreground">{school.schoolEmail}</dd></div>
                <div><dt className="font-medium text-muted-foreground">Phone Number</dt><dd className="text-foreground">{school.phoneNumber || "N/A"}</dd></div>
                <div className="md:col-span-2"><dt className="font-medium text-muted-foreground">Address</dt><dd className="text-foreground">{[school.address, school.city, school.stateOrRegion, school.country, school.postalCode].filter(Boolean).join(', ') || "N/A"}</dd></div>
                <div><dt className="font-medium text-muted-foreground">Website</dt><dd className="text-foreground">{school.website ? <Link href={school.website.startsWith('http')? school.website : `https://${school.website}`} target="_blank" className="text-primary hover:underline">{school.website}</Link> : "N/A"}</dd></div>
                <div><dt className="font-medium text-muted-foreground">Current Academic Year</dt><dd className="text-foreground">{school.currentAcademicYear || "N/A"}</dd></div>
                <div><dt className="font-medium text-muted-foreground">Current Term</dt><dd className="text-foreground">{school.currentTerm?.replace("_", " ") || "N/A"}</dd></div>
                <div><dt className="font-medium text-muted-foreground">Currency</dt><dd className="text-foreground">{school.currency}</dd></div>
                <div><dt className="font-medium text-muted-foreground">Timezone</dt><dd className="text-foreground">{school.timezone}</dd></div>
                <div><dt className="font-medium text-muted-foreground">Status</dt><dd><Badge variant={school.isActive ? "default" : "destructive"} className={school.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}>{school.isActive ? "Active" : "Inactive"}</Badge></dd></div>
            </dl>
        </CardContent>
      </Card>

    </div>
  );
}