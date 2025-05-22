// File: app/(portals)/[schoolId]/schooladmin/attendance/reports/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { BarChart3, ChevronLeft, UserSearch, Users } from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function getSchoolName(schoolId) { /* ... (same helper as above) ... */ 
    try {
        const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true }});
        return school?.name;
    } catch (error) { return "Selected School"; }
}

export async function generateMetadata({ params }) {
  const schoolName = await getSchoolName(params.schoolId);
  return { title: `Attendance Reports - ${schoolName} | Sukuu` };
}

export default async function AttendanceReportsHubPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  // Authorization checks
  if (!session || !session.user) redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/attendance/reports`);
  if (session.user.role !== 'SUPER_ADMIN') {
    const isAdminForSchool = await prisma.schoolAdmin.findFirst({ where: { userId: session.user.id, schoolId: schoolId }});
    if (!isAdminForSchool) redirect(`/unauthorized`);
  }
  const schoolName = await getSchoolName(schoolId);

  const reportSections = [
    {
      title: "Student Attendance Report",
      description: "View detailed attendance records and summaries for individual students over a selected period.",
      href: `/${schoolId}/schooladmin/attendance/reports/student`,
      icon: UserSearch,
      cta: "Generate Student Report",
    },
    {
      title: "Class Attendance Summary",
      description: "Get an overview of attendance for an entire class on a specific day or over a period.",
      href: `/${schoolId}/schooladmin/attendance/reports/class`, // Placeholder
      icon: Users,
      cta: "View Class Summary",
      disabled: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/${schoolId}/schooladmin/attendance`} passHref>
            <Button variant="outline" size="sm" className="mb-3 text-xs sm:text-sm">
              <ChevronLeft className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
              Back to Attendance Management
            </Button>
        </Link>
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
                <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Attendance Reports</h1>
                <p className="text-lg text-muted-foreground mt-1">
                    Generate various attendance reports for <span className="font-semibold text-primary">{schoolName}</span>.
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportSections.map((section) => (
          <Card key={section.title} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader className="flex-row items-start gap-4 space-y-0 pb-4">
              <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                 <section.icon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{section.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-1">{section.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-grow" />
            <CardFooter>
              <Link href={section.disabled ? "#!" : section.href} passHref className="w-full">
                <Button className="w-full" disabled={section.disabled}>
                  {section.cta}
                </Button>
              </Link>
            </CardFooter>
            {section.disabled && <p className="text-xs text-center text-muted-foreground pb-4 -mt-2">(Coming Soon)</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}