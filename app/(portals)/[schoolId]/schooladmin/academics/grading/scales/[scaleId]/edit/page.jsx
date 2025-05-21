// File: app/(portals)/[schoolId]/schooladmin/academics/grading/scales/[scaleId]/edit/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Edit, ListChecks, AlertTriangle, Scale as GradeScaleIcon } from "lucide-react"; // Using Scale as GradeScaleIcon
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import GradeScaleForm from "@/components/schooladmin/GradeScaleForm"; // For editing scale's name/desc
import GradeScaleEntriesManager from "@/components/schooladmin/GradeScaleEntriesManager"; // We'll create this next
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Helper function
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

async function getGradeScaleWithEntries(schoolId, scaleId, userId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(userId, schoolId);

    if (!authorizedSchoolAdmin) {
      return { error: "Forbidden", gradeScale: null, schoolName: null };
    }

    const gradeScale = await prisma.gradeScale.findUnique({
      where: { 
        id: scaleId,
        schoolId: schoolId // Ensure scale belongs to this school
      },
      include: {
        school: { select: { name: true } },
        entries: { // Fetch all entries for this scale
          orderBy: { minPercentage: 'asc' }
        }
      }
    });

    if (!gradeScale) {
      return { error: "GradeScaleNotFound", gradeScale: null, schoolName: null };
    }
    
    return { error: null, gradeScale, schoolName: gradeScale.school.name };
  } catch (error) {
    console.error(`Failed to fetch grade scale ${scaleId} for school ${schoolId}:`, error);
    return { error: "DataFetchError", gradeScale: null, schoolName: null };
  }
}

export async function generateMetadata({ params }) {
  const data = await getGradeScaleWithEntries(params.schoolId, params.scaleId, null);
  if (!data.gradeScale || !data.schoolName) {
    return { title: "Edit Grade Scale | Sukuu" };
  }
  return {
    title: `Edit Grade Scale: ${data.gradeScale.name} - ${data.schoolName} | Sukuu`,
  };
}

export default async function EditGradeScalePage({ params }) {
  const { schoolId, scaleId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/grading/scales/${scaleId}/edit`);
  }

  const { gradeScale, schoolName, error } = await getGradeScaleWithEntries(schoolId, scaleId, session.user.id);

  if (error === "Forbidden") {
    redirect("/unauthorized?message=You are not authorized to edit this grade scale.");
  }
  if (error === "GradeScaleNotFound" || !gradeScale) {
    notFound();
  }
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/academics/grading/settings`} passHref>
                <Button variant="outline" size="sm" className="mb-4"><ChevronLeft />Back to Grading Settings</Button>
            </Link>
            <Card className="border-destructive bg-destructive/10">
                <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader>
                <CardContent><p>Could not load grade scale data for editing.</p></CardContent>
            </Card>
        </div>
    );
  }

  // Prepare initial data for the GradeScaleForm (name, description, isActive)
  const gradeScaleInitialData = {
    id: gradeScale.id,
    name: gradeScale.name,
    description: gradeScale.description,
    isActive: gradeScale.isActive,
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <Link href={`/${schoolId}/schooladmin/academics/grading/settings`} passHref>
            <Button variant="outline" size="sm" className="mb-3">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Grading Settings
            </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <Edit className="h-8 w-8 text-primary" />
            Edit Grade Scale: <span className="text-primary truncate max-w-lg">{gradeScale.name}</span>
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
            Modify the scale details and manage its grade entries for <span className="font-semibold text-primary">{schoolName}</span>.
        </p>
      </div>
      
      {/* Form for Grade Scale Details (Name, Description, isActive) */}
      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle>Scale Definition</CardTitle>
            <CardDescription>Update the name, description, or active status of this grade scale.</CardDescription>
        </CardHeader>
        <CardContent>
            <GradeScaleForm 
                schoolId={schoolId} 
                initialData={gradeScaleInitialData} // Pass only scale details
            />
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Section for Managing Grade Scale Entries */}
      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="h-6 w-6"/>Grade Entries</CardTitle>
            <CardDescription>Define the percentage ranges, grade letters, points, and remarks for this scale.</CardDescription>
        </CardHeader>
        <CardContent>
            <GradeScaleEntriesManager 
                schoolId={schoolId}
                scaleId={gradeScale.id} 
                initialEntries={gradeScale.entries || []} 
            />
        </CardContent>
      </Card>
    </div>
  );
}