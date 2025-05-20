// File: app/(portals)/[schoolId]/schooladmin/staff/teachers/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, UsersRound, AlertTriangle, ChevronLeft } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import TeachersDataTable from "@/components/schooladmin/TeachersDataTable"; // We will create this next
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Helper function (can be shared)
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

async function getSchoolStaffData(schoolId, userId) {
  const session = await getServerSession(authOptions); // Get session again for role check
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(userId, schoolId);

  if (!authorizedSchoolAdmin) {
      return { error: "Unauthorized", teachers: [], schoolName: null };
  }

  try {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true }
    });

    if (!school) {
        return { error: "SchoolNotFound", teachers: [], schoolName: null };
    }

    const teachers = await prisma.teacher.findMany({
      where: { schoolId: schoolId },
      include: {
        user: { // Include related User details
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            isActive: true,
            profilePicture: true,
          },
        },
      },
      orderBy: [
        { user: { lastName: 'asc' } },
        { user: { firstName: 'asc' } },
      ],
    });
    return { error: null, teachers, schoolName: school.name };
  } catch (error) {
    console.error(`Failed to fetch teachers for school ${schoolId}:`, error);
    return { error: "DataFetchError", teachers: [], schoolName: (await prisma.school.findUnique({where: {id: schoolId}}))?.name || "this school" };
  }
}

export async function generateMetadata({ params }) {
  const schoolName = (await prisma.school.findUnique({ where: { id: params.schoolId }, select: { name: true } }))?.name;
  if (!schoolName) return { title: "Manage Teachers | Sukuu" };
  return {
    title: `Manage Teachers - ${schoolName} | Sukuu`,
    description: `View, add, and manage teachers for ${schoolName}.`,
  };
}

export default async function ManageTeachersPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/staff/teachers`);
  }

  const { error, teachers, schoolName } = await getSchoolStaffData(schoolId, session.user.id);
  
  if (error === "Unauthorized") {
    redirect(`/unauthorized?message=You are not authorized to manage teachers for this school.`);
  }
  if (error === "SchoolNotFound") {
    redirect(`/school-admin-portal?error=school_not_found`); // Or a more generic error page
  }

  if (error === "DataFetchError" && teachers.length === 0) {
    return (
      <div className="space-y-6">
         <Link href={`/${schoolId}/schooladmin/staff`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Staff Overview
            </Button>
        </Link>
        <Card className="border-destructive bg-destructive/10">
          <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Failed to Load Teachers</CardTitle></CardHeader>
          <CardContent><p>{error}</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <Link href={`/${schoolId}/schooladmin/staff`} passHref>
                <Button variant="outline" size="sm" className="mb-3 text-xs sm:text-sm">
                <ChevronLeft className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                Back to Staff Overview
                </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Manage Teachers <span className="text-xl text-muted-foreground">({schoolName || ""})</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-1">
                Oversee all teaching staff at your school.
            </p>
        </div>
        <Link href={`/${schoolId}/schooladmin/staff/teachers/new`} passHref>
          <Button size="lg" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Teacher
          </Button>
        </Link>
      </div>
      <TeachersDataTable teachers={teachers} schoolId={schoolId} />
    </div>
  );
}