// File: app/(portals)/[schoolId]/schooladmin/staff/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { UserCheck, UsersRound, Briefcase, UserCog } from "lucide-react"; // UserCheck for Staff, UsersRound for Teachers, Briefcase for Non-teaching

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter, // Added for button
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

async function getSchoolName(schoolId) {
  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });
    return school?.name;
  } catch (error) {
    console.error("Failed to fetch school name for staff overview:", error);
    return "Selected School";
  }
}

export async function generateMetadata({ params }) {
  const schoolName = await getSchoolName(params.schoolId);
  return {
    title: `Staff Management - ${schoolName} | Sukuu`,
    description: `Manage all staff members, including teachers and non-teaching staff, for ${schoolName}.`,
  };
}

export default async function StaffManagementOverviewPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  // Authorization
  if (!session || !session.user) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/staff`);
  }
  if (session.user.role !== 'SUPER_ADMIN') {
    const isAdminForSchool = await prisma.schoolAdmin.findFirst({
      where: { userId: session.user.id, schoolId: schoolId },
    });
    if (!isAdminForSchool) {
      redirect(`/unauthorized?message=You are not authorized to manage staff for this school.`);
    }
  }

  const schoolName = await getSchoolName(schoolId);

  const staffSections = [
    {
      title: "Manage Teachers",
      description: "Oversee all teaching staff, their profiles, assignments, and roles.",
      href: `/${schoolId}/schooladmin/staff/teachers`,
      icon: UsersRound, // Icon representing teachers
      cta: "Go to Teachers",
    },
    {
      title: "Manage Accountants",
      description: "Handle accountant profiles and their financial system access (if applicable).",
      href: `/${schoolId}/schooladmin/staff/accountants`, // Placeholder
      icon: Briefcase, // Icon representing non-teaching/admin staff
      cta: "Go to Accountants",
      disabled: true,
    },
    {
      title: "Manage Other Staff",
      description: "Administer profiles for librarians, support staff, and other non-teaching personnel.",
      href: `/${schoolId}/schooladmin/staff/other`, // Placeholder
      icon: UserCog, // Generic staff settings/management icon
      cta: "Go to Other Staff",
      disabled: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/${schoolId}/schooladmin/dashboard`} passHref>
            <Button variant="outline" size="sm" className="mb-3 text-xs sm:text-sm">
              <ChevronLeft className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
              Back to School Dashboard
            </Button>
        </Link>
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
                <UserCheck className="h-7 w-7 text-primary" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                    Staff Management
                </h1>
                <p className="text-lg text-muted-foreground mt-1">
                    Administer all staff members for <span className="font-semibold text-primary">{schoolName}</span>.
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffSections.map((section) => (
          <Card key={section.title} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader className="flex-row items-start gap-4 space-y-0 pb-4">
              <div className="p-2 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
                 <section.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{section.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-1">{section.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-grow" /> {/* Spacer to push footer down */}
            <CardFooter>
              <Link href={section.disabled ? "#" : section.href} passHref className="w-full">
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