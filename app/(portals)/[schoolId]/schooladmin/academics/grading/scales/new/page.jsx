// File: app/(portals)/[schoolId]/schooladmin/academics/grading/scales/new/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, PlusCircle, AlertTriangle, Scale } from "lucide-react"; // Scale for Grade Scale icon
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import GradeScaleForm from "@/components/schooladmin/GradeScaleForm";
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
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden", schoolName: null };

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true }
    });
    if (!school) return { error: "SchoolNotFound", schoolName: null };

    return { schoolName: school.name, error: null };
  } catch (error) {
    console.error("Failed to fetch data for new grade scale page:", error);
    return { error: "DataFetchError", schoolName: null };
  }
}

export async function generateMetadata({ params }) {
  const data = await getPageData(params.schoolId, null);
  if (!data.schoolName) return { title: "New Grade Scale | Sukuu" };
  return {
    title: `Create New Grade Scale - ${data.schoolName} | Sukuu`,
  };
}

export default async function CreateNewGradeScalePage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/grading/scales/new`);
  }

  const { schoolName, error } = await getPageData(schoolId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized");
  if (error === "SchoolNotFound") notFound();
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/academics/grading/settings`} passHref>
                <Button variant="outline" size="sm" className="mb-4"><ChevronLeft />Back</Button>
            </Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load page data.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/${schoolId}/schooladmin/academics/grading/settings`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Grading Settings
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <Scale className="h-8 w-8 text-primary" /> {/* Changed icon */}
            Create New Grade Scale
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            For school: <span className="font-semibold text-primary">{schoolName}</span>
          </p>
        </div>
      </div>
      
      <Card className="w-full max-w-2xl mx-auto shadow-md"> {/* Constrained width and centered */}
        <CardHeader>
            <CardTitle>Grade Scale Definition</CardTitle>
            <CardDescription>
                Define a new grading scale. After creation, you will be able to add specific grade entries (e.g., A+, A, B+ with percentage ranges).
            </CardDescription>
        </CardHeader>
        <CardContent>
            {/* SchoolId is needed by the form to construct API endpoint */}
            <GradeScaleForm schoolId={schoolId} /> 
        </CardContent>
      </Card>
    </div>
  );
}