// File: app/(portals)/[schoolId]/schooladmin/timetable/periods/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Clock4, ChevronLeft, AlertTriangle } from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SchoolPeriodsManager from "@/components/schooladmin/SchoolPeriodsManager"; // We'll create this next

async function getPageData(schoolId, userId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;
    if (!isSuperAdmin && userId) {
        const assignment = await prisma.schoolAdmin.findFirst({ where: { userId: userId, schoolId: schoolId }});
        authorizedSchoolAdmin = !!assignment;
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden" };

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true }
    });
    if (!school) return { error: "SchoolNotFound" };

    const periods = await prisma.schoolPeriod.findMany({
        where: { schoolId: schoolId },
        orderBy: { sortOrder: 'asc' }
    });

    return { schoolName: school.name, periods, error: null };
  } catch (error) {
    console.error("Failed to fetch data for school periods page:", error);
    return { error: "DataFetchError" };
  }
}

export async function generateMetadata({ params }) {
  const data = await getPageData(params.schoolId, null);
  if (!data.schoolName) return { title: "Manage School Periods | Sukuu" };
  return { title: `Manage School Periods - ${data.schoolName} | Sukuu` };
}

export default async function ManageSchoolPeriodsPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/timetable/periods`);
  }

  const { schoolName, periods, error } = await getPageData(schoolId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized");
  if (error === "SchoolNotFound") notFound();
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/timetable`} passHref><Button variant="outline" size="sm"><ChevronLeft />Back</Button></Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load page data.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${schoolId}/schooladmin/timetable`} passHref>
            <Button variant="outline" size="sm" className="mb-3">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Timetable Overview
            </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <Clock4 className="h-8 w-8 text-primary" />
            Manage School Periods
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
            Define and organize the daily time slots for <span className="font-semibold text-primary">{schoolName}</span>.
        </p>
      </div>
      
      <SchoolPeriodsManager schoolId={schoolId} initialPeriods={periods || []} />
    </div>
  );
}