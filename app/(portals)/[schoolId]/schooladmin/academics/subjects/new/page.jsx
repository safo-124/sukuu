// File: app/(portals)/[schoolId]/schooladmin/academics/subjects/new/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, PlusCircle, AlertTriangle, Tag as SubjectIcon } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import SubjectForm from "@/components/schooladmin/SubjectForm";
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
    console.error("Failed to fetch data for new subject page:", error);
    return { error: "DataFetchError", school: null };
  }
}

export async function generateMetadata({ params }) {
  const schoolData = await getPageData(params.schoolId, null); // No userId needed for just metadata
  const schoolName = schoolData.school?.name;
  if (!schoolName) return { title: "Add Subject | Sukuu" };
  return {
    title: `Add New Subject - ${schoolName} | Sukuu`,
    description: `Create a new academic subject for ${schoolName}.`,
  };
}

export default async function AddNewSubjectPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/subjects/new`);
  }

  const { school, error } = await getPageData(schoolId, session.user.id);

  if (error === "Forbidden") {
    redirect("/unauthorized?message=You are not authorized to add subjects to this school.");
  }
  if (error === "SchoolNotFound" || !school) {
    notFound();
  }
   if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/academics/subjects`} passHref>
                <Button variant="outline" size="sm" className="mb-4">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Manage Subjects
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
          <Link href={`/${schoolId}/schooladmin/academics/subjects`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Manage Subjects
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <PlusCircle className="h-8 w-8 text-primary" />
            Create New Subject
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            For school: <span className="font-semibold text-primary">{school.name}</span>
          </p>
        </div>
      </div>
      
      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><SubjectIcon className="h-6 w-6"/>New Subject Details</CardTitle>
            <CardDescription>
                Define the name, code (optional), and description for the new academic subject.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <SubjectForm schoolId={schoolId} /> {/* No initialData for create mode */}
        </CardContent>
      </Card>
    </div>
  );
}