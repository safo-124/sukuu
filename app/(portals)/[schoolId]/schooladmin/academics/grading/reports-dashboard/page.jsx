// File: app/(portals)/[schoolId]/schooladmin/academics/grading/reports-dashboard/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { BarChart3, ChevronLeft, FileSpreadsheet, Users } from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function getSchoolName(schoolId) { /* ... (same as in grading/page.jsx) ... */ 
    try {
        const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true }});
        return school?.name;
    } catch (error) { return "Selected School"; }
}

export async function generateMetadata({ params }) {
  const schoolName = await getSchoolName(params.schoolId);
  return { title: `Academic Reports - ${schoolName} | Sukuu` };
}

export default async function ReportsDashboardPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  // Authorization checks (same as other admin pages)
  if (!session || !session.user) redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/grading/reports-dashboard`);
  if (session.user.role !== 'SUPER_ADMIN') {
    const isAdminForSchool = await prisma.schoolAdmin.findFirst({ where: { userId: session.user.id, schoolId: schoolId }});
    if (!isAdminForSchool) redirect(`/unauthorized`);
  }
  const schoolName = await getSchoolName(schoolId);

  const reportTypes = [
    {
      title: "Student Term Report Card",
      description: "Generate individual report cards for students for a selected term and academic year.",
      href: `/${schoolId}/schooladmin/academics/grading/reports/student-term-report`,
      icon: FileSpreadsheet,
      cta: "Generate Report Cards",
    },
    {
      title: "Class Performance Summary",
      description: "View overall performance statistics for a class in different subjects.",
      href: `/${schoolId}/schooladmin/academics/grading/reports/class-summary`, // Placeholder
      icon: Users,
      cta: "View Class Summaries",
      disabled: true,
    },
    // Add more report types later (e.g., Transcripts, Subject Reports)
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/${schoolId}/schooladmin/academics/grading`} passHref>
            <Button variant="outline" size="sm" className="mb-3 text-xs sm:text-sm">
              <ChevronLeft className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
              Back to Grading Overview
            </Button>
        </Link>
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
                <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Academic Reports</h1>
                <p className="text-lg text-muted-foreground mt-1">
                    Generate and view various academic performance reports for <span className="font-semibold text-primary">{schoolName}</span>.
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report) => (
          <Card key={report.title} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader className="flex-row items-start gap-4 space-y-0 pb-4">
              <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                 <report.icon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{report.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-1">{report.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-grow" />
            <CardFooter>
              <Link href={report.disabled ? "#!" : report.href} passHref className="w-full">
                <Button className="w-full" disabled={report.disabled}>
                  {report.cta}
                </Button>
              </Link>
            </CardFooter>
            {report.disabled && <p className="text-xs text-center text-muted-foreground pb-4 -mt-2">(Coming Soon)</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}