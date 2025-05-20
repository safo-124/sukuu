// File: app/(portals)/[schoolId]/schooladmin/academics/sessions/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, CalendarDays, AlertTriangle } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma"; // For initial data fetch
import AcademicSessionSettingsForm from "@/components/schooladmin/AcademicSessionSettingsForm";
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
    if (!authorizedSchoolAdmin) return { error: "Forbidden" };

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, currentAcademicYear: true, currentTerm: true }
    });

    if (!school) return { error: "SchoolNotFound" };
    return { school, error: null };
  } catch (error) {
    console.error("Failed to fetch data for academic sessions page:", error);
    return { error: "DataFetchError" };
  }
}

export async function generateMetadata({ params }) {
  const pageData = await getPageData(params.schoolId, null);
  const schoolName = pageData.school?.name;
  if (!schoolName) return { title: "Academic Sessions | Sukuu" };
  return {
    title: `Academic Sessions - ${schoolName} | Sukuu`,
    description: `Manage academic years and terms for ${schoolName}.`,
  };
}

export default async function AcademicSessionsPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/sessions`);
  }

  const { school, error } = await getPageData(schoolId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized");
  if (error === "SchoolNotFound" || !school) notFound();
  if (error === "DataFetchError") {
    return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/academics`} passHref><Button variant="outline" size="sm" className="mb-4"><ChevronLeft />Back to Academics</Button></Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load data for this page.</p></CardContent></Card>
        </div>
    );
  }

  const currentSettings = {
    currentAcademicYear: school.currentAcademicYear,
    currentTerm: school.currentTerm,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/${schoolId}/schooladmin/academics`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Academics Overview
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            Academic Session Settings
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Manage the current academic year and term for <span className="font-semibold text-primary">{school.name}</span>.
          </p>
        </div>
      </div>
      
      <Card className="w-full max-w-2xl shadow-md"> {/* Constrain width for settings form */}
        <CardHeader>
            <CardTitle>Current Academic Settings</CardTitle>
            <CardDescription>
                Set the active academic year and term/semester for your school. This will affect class listings, enrollments, and other modules.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <AcademicSessionSettingsForm schoolId={schoolId} currentSettings={currentSettings} />
        </CardContent>
      </Card>
    </div>
  );
}