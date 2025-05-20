import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { BookCopy, ListOrdered, Tag, GraduationCap, LibraryBig, CalendarDays } from "lucide-react"; // Added LibraryBig

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Helper function (can be shared or kept local if only used here)
async function getSchoolName(schoolId) {
  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });
    return school?.name;
  } catch (error) {
    console.error("Failed to fetch school name for academics page:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const schoolName = await getSchoolName(params.schoolId);
  if (!schoolName) return { title: "Academics | Sukuu" };
  return {
    title: `Academics - ${schoolName} | Sukuu`,
    description: `Manage academic settings, classes, subjects, and more for ${schoolName}.`,
  };
}

export default async function AcademicsHomePage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  // Authorization: Ensure user is logged in and is a School Admin for this school or a Super Admin
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
    // If school name isn't found and user isn't a super admin who might be exploring,
    // it implies an issue or invalid schoolId for a regular school admin.
    redirect("/school-admin-portal?error=school_not_found");
  }

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
      href: `/${schoolId}/schooladmin/academics/subjects`, // Placeholder link
      icon: Tag,
      cta: "Go to Subjects",
      disabled: true, // Mark as disabled if not yet implemented
    },
    {
      title: "Academic Sessions",
      description: "Manage academic years, terms, or semesters for the school.",
      href: `/${schoolId}/schooladmin/academics/sessions`, // Placeholder link
      icon: CalendarDays, // You'll need to import CalendarDays from lucide-react
      cta: "Manage Sessions",
      disabled: true,
    },
    {
      title: "Grading System",
      description: "Configure grading policies, report card templates, and examination settings.",
      href: `/${schoolId}/schooladmin/academics/grading`, // Placeholder link
      icon: GraduationCap,
      cta: "Configure Grading",
      disabled: true,
    },
    // Add more sections as needed, e.g., Curriculum, Promotions
  ];


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Academics Management
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
          Oversee academic structures and settings for <span className="font-semibold text-primary">{schoolName || "your school"}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {academicSections.map((section) => (
          <Card key={section.title} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader className="flex-row items-start gap-4 space-y-0 pb-4"> {/* Adjusted for icon layout */}
              <div className="p-2 bg-primary/10 rounded-md flex items-center justify-center">
                 <section.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{section.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-1">{section.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="mt-auto pt-0"> {/* mt-auto pushes button to bottom, pt-0 removes extra space */}
              <Link href={section.disabled ? "#" : section.href} passHref>
                <Button className="w-full" disabled={section.disabled}>
                  {section.cta}
                </Button>
              </Link>
              {section.disabled && <p className="text-xs text-center text-muted-foreground mt-2">(Coming Soon)</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}