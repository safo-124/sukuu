// File: app/(portals)/[schoolId]/schooladmin/timetable/manage/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { CalendarClock, ChevronLeft, AlertTriangle, ListChecks } from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

async function getPageData(schoolId, userId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;
    if (!isSuperAdmin && userId) {
        const assignment = await prisma.schoolAdmin.findFirst({ where: { userId: userId, schoolId: schoolId }});
        authorizedSchoolAdmin = !!assignment;
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden", school: null, classes: [] };

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, currentAcademicYear: true } // Need currentAcademicYear to filter classes
    });
    if (!school) return { error: "SchoolNotFound", school: null, classes: [] };

    // Fetch classes for the school's current academic year by default
    const classes = await prisma.class.findMany({
      where: { 
        schoolId: schoolId,
        academicYear: school.currentAcademicYear || undefined // Filter if currentAcademicYear is set
      },
      select: { 
        id: true, 
        name: true, 
        section: true, 
        academicYear: true,
        _count: { select: { currentStudents: {where: {isActive: true}}}}
      },
      orderBy: [{ academicYear: 'desc' }, { name: 'asc' }, { section: 'asc' }]
    });

    return { school, classes, error: null };
  } catch (error) {
    console.error("Failed to fetch data for timetable class selection page:", error);
    return { error: "DataFetchError", school: null, classes: [] };
  }
}

export async function generateMetadata({ params }) {
  let schoolName = "Select Class for Timetable";
  try {
      const school = await prisma.school.findUnique({where: {id: params.schoolId}, select: {name: true}});
      if (school) schoolName = school.name;
  } catch(e) {/* use default */}
  return {
    title: `Select Class - Timetable Management - ${schoolName} | Sukuu`,
    description: `Choose a class to manage its timetable for ${schoolName}.`,
  };
}

export default async function SelectClassForTimetablePage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/timetable/manage`);
  }

  const { school, classes, error } = await getPageData(schoolId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized");
  if (error === "SchoolNotFound" || !school) notFound();
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/timetable`} passHref>
                <Button variant="outline" size="sm" className="mb-4"><ChevronLeft />Back to Timetable Overview</Button>
            </Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load class list for timetable management.</p></CardContent></Card>
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
            <ListChecks className="h-8 w-8 text-primary" />
            Select Class to Manage Timetable
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
            Choose a class from <span className="font-semibold text-primary">{school.name}</span> to view or edit its weekly schedule.
            {school.currentAcademicYear && <span className="block text-sm">Defaulting to classes in {school.currentAcademicYear}.</span>}
        </p>
      </div>
      
      {classes.length === 0 ? (
        <Card>
            <CardContent className="pt-6 text-center">
                <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground mb-3"/>
                <p className="text-lg font-semibold">No Classes Found</p>
                <p className="text-muted-foreground text-sm">
                    No classes are available for the current academic year ({school.currentAcademicYear || 'not set'}).
                </p>
                <p className="text-xs text-muted-foreground mt-1">Please ensure classes are defined for this academic year.</p>
                <Link href={`/${schoolId}/schooladmin/academics/classes/new`} passHref className="mt-4 inline-block">
                    <Button variant="secondary">Add New Class</Button>
                </Link>
            </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Available Classes</CardTitle>
                <CardDescription>Select a class to proceed with its timetable management.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[calc(100vh-20rem)] sm:h-[calc(100vh-22rem)]"> {/* Adjust height as needed */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classes.map((cls) => (
                        <Link key={cls.id} href={`/${schoolId}/schooladmin/timetable/manage/${cls.id}`} passHref>
                            <Card className="hover:shadow-lg hover:border-primary transition-all cursor-pointer h-full flex flex-col">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">{cls.name} {cls.section || ""}</CardTitle>
                                    <CardDescription className="text-xs">{cls.academicYear}</CardDescription>
                                </CardHeader>
                                <CardContent className="text-xs text-muted-foreground flex-grow">
                                    <p>Students: {cls._count.currentStudents}</p>
                                    {/* Add more info if needed, e.g., homeroom teacher */}
                                </CardContent>
                                <CardFooter className="pt-3">
                                    <Button variant="outline" size="sm" className="w-full">Manage Timetable</Button>
                                </CardFooter>
                            </Card>
                        </Link>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      )}
    </div>
  );
}