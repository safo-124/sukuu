// File: app/(portals)/[schoolId]/schooladmin/dashboard/page.jsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, BookOpenText, CalendarCheck } from "lucide-react";

async function getSchoolDashboardData(schoolId, userId) {
    // Verify admin belongs to this school
    const schoolAdminAssignment = await prisma.schoolAdmin.findUnique({
        where: {
            userId_schoolId: { // Assuming you have @@unique([userId, schoolId]) on SchoolAdmin model
                userId: userId,
                schoolId: schoolId,
            }
        },
        include: {
            school: { select: { name: true } }
        }
    });

    if (!schoolAdminAssignment) {
        console.warn(`User ${userId} is not an authorized admin for school ${schoolId}.`);
        return null; // Or throw an error / redirect
    }

    // Fetch school-specific stats
    const studentCount = await prisma.student.count({ where: { schoolId: schoolId, isActive: true } });
    const teacherCount = await prisma.teacher.count({ where: { schoolId: schoolId /*, user: { isActive: true } */ } }); // Assuming Teacher links to User for active status
    const classCount = await prisma.class.count({ where: { schoolId: schoolId /*, academicYear: current_year */ }});

    return {
        schoolName: schoolAdminAssignment.school.name,
        studentCount,
        teacherCount,
        classCount,
    };
}


export async function generateMetadata({ params }) {
  // A simpler fetch for name, or reuse part of getSchoolDashboardData
  const school = await prisma.school.findUnique({ where: { id: params.schoolId }, select: {name: true}});
  if (!school) return { title: "School Dashboard" };
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

  if (!dashboardData && session.user.role === "SCHOOL_ADMIN") {
    // This means the SCHOOL_ADMIN is not authorized for this specific schoolId
    // Middleware might catch broad role, but page-level check confirms school assignment
    redirect("/unauthorized"); // Or to /school-admin-portal to re-select if they have multiple schools
  }
  
  if (!dashboardData && session.user.role === "SUPER_ADMIN"){
    // Super admin trying to access a non-existent school or has no specific assignment.
    // For simplicity, let's allow super admin to see even if dashboardData is null for them,
    // or redirect them. Here, we'll just show a generic message if data is null.
    // This case should ideally be handled by a general "school not found" if schoolId is invalid.
     return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">School Admin Dashboard for School ID: {schoolId}</h1>
            <p className="text-destructive">Could not load dashboard data. The school may not exist or you lack specific permissions. (SuperAdmin view)</p>
        </div>
    );
  }


  const { schoolName, studentCount, teacherCount, classCount } = dashboardData || { schoolName: "School", studentCount:0, teacherCount:0, classCount:0 };


  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Welcome to <span className="text-primary">{schoolName}</span>
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
          Manage your school's operations, staff, students, and academics.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{studentCount}</div>
            <p className="text-xs text-muted-foreground pt-1">Active students enrolled.</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <Users className="h-5 w-5 text-primary" /> 
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{teacherCount}</div>
            <p className="text-xs text-muted-foreground pt-1">Active teaching staff.</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <BookOpenText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{classCount}</div>
            <p className="text-xs text-muted-foreground pt-1">Active classes this academic year.</p>
          </CardContent>
        </Card>
      </div>
      {/* Add Quick Actions specific to School Admin later */}
    </>
  );
}