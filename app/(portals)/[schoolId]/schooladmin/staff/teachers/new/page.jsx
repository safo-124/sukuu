// File: app/(portals)/[schoolId]/schooladmin/staff/teachers/new/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, UserPlus as AddTeacherIcon, AlertTriangle } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import TeacherForm from "@/components/schooladmin/TeacherForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

async function getPageData(schoolId, userId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;

    if (!isSuperAdmin && userId) {
        const assignment = await prisma.schoolAdmin.findFirst({
            where: { userId: userId, schoolId: schoolId }
        });
        authorizedSchoolAdmin = !!assignment;
    } else if (!isSuperAdmin && !userId) {
        authorizedSchoolAdmin = false;
    }

    if (!authorizedSchoolAdmin) {
        return { error: "Forbidden", school: null };
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true }
    });

    if (!school) return { error: "SchoolNotFound", school: null };
    return { school, error: null };
  } catch (error) {
    console.error("Failed to fetch data for new teacher page:", error);
    return { error: "DataFetchError", school: null };
  }
}

export async function generateMetadata({ params }) {
  const schoolData = await getPageData(params.schoolId, null);
  const schoolName = schoolData.school?.name;
  if (!schoolName) return { title: "Add Teacher | Sukuu" };
  return {
    title: `Register New Teacher - ${schoolName} | Sukuu`,
    description: `Add a new teacher to the staff of ${schoolName}.`,
  };
}

export default async function AddNewTeacherPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/staff/teachers/new`);
  }

  const { school, error } = await getPageData(schoolId, session.user.id);

  if (error === "Forbidden") {
    redirect("/unauthorized?message=You are not authorized to add teachers to this school.");
  }
  if (error === "SchoolNotFound" || !school) {
    notFound();
  }
   if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/staff/teachers`} passHref>
                <Button variant="outline" size="sm" className="mb-4">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Manage Teachers
                </Button>
            </Link>
            <Card className="border-destructive bg-destructive/10">
                <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader>
                <CardContent><p>Could not load necessary data for this page. Please try again.</p></CardContent>
            </Card>
        </div>
     );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/${schoolId}/schooladmin/staff/teachers`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Manage Teachers
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <AddTeacherIcon className="h-8 w-8 text-primary" />
            Register New Teacher
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            For school: <span className="font-semibold text-primary">{school.name}</span>
          </p>
        </div>
      </div>
      
      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle>New Teacher Information</CardTitle>
            <CardDescription>
                Enter the details for the new teacher. An account will be created for them to log in using the email and password provided.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <TeacherForm schoolId={schoolId} /> {/* initialData is not passed for create mode */}
        </CardContent>
      </Card>
    </div>
  );
}