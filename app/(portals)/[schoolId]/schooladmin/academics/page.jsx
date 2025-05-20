// File: app/(portals)/[schoolId]/schooladmin/academics/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { BookCopy, ListOrdered, Tag, GraduationCap, CalendarDays as SessionsIcon, LibraryBig } from "lucide-react"; // Ensured all icons, renamed CalendarDays

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function getSchoolName(schoolId) {
  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });
    return school?.name;
  } catch (error) {
    console.error("Failed to fetch school name for academics page:", error);
    return "Selected School"; // Fallback name
  }
}

export async function generateMetadata({ params }) {
  const schoolName = await getSchoolName(params.schoolId);
  return {
    title: `Academics - ${schoolName} | Sukuu`,
    description: `Manage academic settings, classes, subjects, and more for ${schoolName}.`,
  };
}

export default async function AcademicsHomePage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics`);
  }
  if (session.user.role !== 'SUPER_ADMIN') {
    const isAdminForSchool = await prisma.schoolAdmin.findFirst({
      where: { userId: session.user.id, schoolId: schoolId },
    });
    if (!isAdminForSchool) {
      redirect(`/unauthorized?message=You are not authorized to manage academics for this school.`);
    }
  }

  const schoolName = await getSchoolName(schoolId);

  if (!schoolName && session.user.role !== 'SUPER_ADMIN') { 
    redirect("/school-admin-portal?error=school_not_found");
  }

  // All sections are now enabled (disabled property removed or set to false)
  const academicSections = [
    {
      title: "Manage Classes",
      description: "Define and organize all classes, sections, and assign homeroom teachers.",
      href: `/${schoolId}/schooladmin/academics/classes`,
      icon: ListOrdered,
      cta: "Go to Classes",
    },
    {
      title: "Manage Subjects",
      description: "Create and manage subjects offered by the school across different levels.",
      href: `/${schoolId}/schooladmin/academics/subjects`,
      icon: Tag,
      cta: "Go to Subjects",
    },
    {
      title: "Academic Sessions",
      description: "Manage academic years, terms, or semesters for the school.",
      href: `/${schoolId}/schooladmin/academics/sessions`,
      icon: SessionsIcon, // Using aliased CalendarDays
      cta: "Manage Sessions",
    },
    {
      title: "Grading System",
      description: "Configure grading policies, report card templates, and examination settings.",
      href: `/${schoolId}/schooladmin/academics/grading`,
      icon: GraduationCap,
      cta: "Configure Grading",
    },
  ];

  return (
    <div className="space-y-8">
      {/* The main page title is now part of the AcademicsLayout */}
      {/* If AcademicsLayout doesn't have a title, you can add one here:
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Academics Overview
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
          Select an academic area to manage for <span className="font-semibold text-primary">{schoolName || "your school"}</span>.
        </p>
      </div>
      */}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6"> {/* Adjusted grid for potentially fewer items shown at once */}
        {academicSections.map((section) => (
          <Card key={section.title} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader className="flex-row items-start gap-4 space-y-0 pb-4">
              <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-center shrink-0"> {/* Slightly larger icon container */}
                 <section.icon className="h-7 w-7 text-primary" /> {/* Slightly larger icon */}
              </div>
              <div>
                <CardTitle className="text-xl">{section.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-1">{section.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-grow" /> {/* Spacer */}
            <CardFooter>
              <Link href={section.href} passHref className="w-full"> {/* Link is always active */}
                <Button className="w-full">
                  {section.cta}
                </Button>
              </Link>
            </CardFooter>
            {/* No "Coming Soon" message needed as all are enabled */}
          </Card>
        ))}
      </div>
    </div>
  );
}