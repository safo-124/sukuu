// File: app/(portals)/[schoolId]/schooladmin/academics/grading/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { GraduationCap, FileText, Settings, BarChart3, ChevronLeft, ListPlus, Edit } from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ensure this path is correct
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function getSchoolName(schoolId) {
  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });
    return school?.name;
  } catch (error) {
    console.error("Failed to fetch school name for grading overview:", error);
    return "Selected School"; // Fallback
  }
}

export async function generateMetadata({ params }) {
  const schoolName = await getSchoolName(params.schoolId);
  return {
    title: `Grading & Reports - ${schoolName || 'School'} | Sukuu`,
    description: `Manage assessments, grades, and academic reports for ${schoolName || 'this school'}.`,
  };
}

export default async function GradingOverviewPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/grading`);
  }
  if (session.user.role !== 'SUPER_ADMIN') {
    const isAdminForSchool = await prisma.schoolAdmin.findFirst({
      where: { userId: session.user.id, schoolId: schoolId },
    });
    if (!isAdminForSchool) {
      redirect(`/unauthorized?message=You are not authorized to manage grading for this school.`);
    }
  }

  const schoolName = await getSchoolName(schoolId);

  // Ensure all titles are unique if used as keys, or use href as key
  const gradingSections = [
    {
      id: "manage-assessments", // Added an id for a more robust key
      title: "Manage Assessments",
      description: "Define and organize tests, exams, assignments, and other evaluation criteria.",
      href: `/${schoolId}/schooladmin/academics/grading/assessments`,
      icon: ListPlus,
      cta: "Go to Assessments",
      disabled: false,
    },
    {
      id: "enter-view-marks", // Added an id
      title: "Enter & View Marks", // Changed from "/" to "&" from a previous version
      description: "Input and review student marks for various defined assessments.",
      href: `/${schoolId}/schooladmin/academics/grading/assessments`, // This directs to assessments list first
      icon: Edit,
      cta: "Manage Student Marks",
      disabled: false,
    },
    {
      id: "generate-reports", // Added an id
      title: "Generate Academic Reports", // This title should be unique
      description: "Create and view student report cards, transcripts, and performance summaries.",
      href: `/${schoolId}/schooladmin/academics/grading/reports-dashboard`, 
      icon: BarChart3,
      cta: "Access Reports",
      disabled: false, 
    },
    {
      id: "grading-settings", // Added an id
      title: "Grading Scales & Settings",
      description: "Configure grading systems, GPA calculations, and report card comments.",
      href: `/${schoolId}/schooladmin/academics/grading/settings`, 
      icon: Settings,
      cta: "Configure Settings",
      disabled: false, 
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/${schoolId}/schooladmin/academics`} passHref>
            <Button variant="outline" size="sm" className="mb-3 text-xs sm:text-sm">
              <ChevronLeft className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
              Back to Academics Overview
            </Button>
        </Link>
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
                <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                    Grading & Reports
                </h1>
                <p className="text-lg text-muted-foreground mt-1">
                    Manage all aspects of student assessment and academic reporting for <span className="font-semibold text-primary">{schoolName}</span>.
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gradingSections.map((section) => (
          // Using section.id (or section.href if href is guaranteed unique) as key
          <Card key={section.id || section.href} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader className="flex-row items-start gap-4 space-y-0 pb-4">
              <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                 <section.icon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{section.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-1">{section.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-grow" /> {/* Spacer */}
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