// File: app/(portals)/[schoolId]/schooladmin/academics/subjects/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, Tag as SubjectIcon, AlertTriangle, ChevronLeft } from "lucide-react"; // Using Tag as SubjectIcon
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import SubjectsDataTable from "@/components/schooladmin/SubjectsDataTable"; // We will create this next
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Helper function (can be shared)
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

async function getSubjectsForSchool(schoolId, userId) {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(userId, schoolId);

  if (!authorizedSchoolAdmin) {
      return { error: "Unauthorized", subjects: [], schoolName: null };
  }

  try {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true }
    });

    if (!school) {
        return { error: "SchoolNotFound", subjects: [], schoolName: null };
    }

    const subjects = await prisma.subject.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
    });
    return { error: null, subjects, schoolName: school.name };
  } catch (error) {
    console.error(`Failed to fetch subjects for school ${schoolId}:`, error);
    return { error: "DataFetchError", subjects: [], schoolName: (await prisma.school.findUnique({where: {id: schoolId}, select:{name:true}}))?.name || "this school" };
  }
}

export async function generateMetadata({ params }) {
  const schoolName = (await prisma.school.findUnique({ where: { id: params.schoolId }, select: { name: true } }))?.name;
  if (!schoolName) return { title: "Manage Subjects | Sukuu" };
  return {
    title: `Manage Subjects - ${schoolName} | Sukuu`,
    description: `View, create, and manage academic subjects for ${schoolName}.`,
  };
}

export default async function ManageSubjectsPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/subjects`);
  }

  const { error, subjects, schoolName } = await getSubjectsForSchool(schoolId, session.user.id);
  
  if (error === "Unauthorized") {
    redirect(`/unauthorized?message=You are not authorized to manage subjects for this school.`);
  }
  if (error === "SchoolNotFound") {
    redirect(`/school-admin-portal?error=school_not_found`);
  }

  if (error === "DataFetchError" && subjects.length === 0) {
    return (
      <div className="space-y-6">
         <Link href={`/${schoolId}/schooladmin/academics`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Academics Overview
            </Button>
        </Link>
        <Card className="border-destructive bg-destructive/10">
          <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Failed to Load Subjects</CardTitle></CardHeader>
          <CardContent><p>{error}</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <Link href={`/${schoolId}/schooladmin/academics`} passHref>
                <Button variant="outline" size="sm" className="mb-3 text-xs sm:text-sm">
                <ChevronLeft className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                Back to Academics Overview
                </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Manage Subjects <span className="text-xl text-muted-foreground">({schoolName || ""})</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-1">
                Oversee all academic subjects offered at your school.
            </p>
        </div>
        <Link href={`/${schoolId}/schooladmin/academics/subjects/new`} passHref>
          <Button size="lg" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Subject
          </Button>
        </Link>
      </div>
      <SubjectsDataTable subjects={subjects} schoolId={schoolId} />
    </div>
  );
}