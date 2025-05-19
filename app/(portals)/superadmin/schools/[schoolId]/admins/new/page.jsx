// File: app/(portals)/superadmin/schools/[schoolId]/admins/new/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, UserPlus } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import SchoolAdminForm from "@/components/superadmin/SchoolAdminForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

async function getSchoolName(schoolId) {
  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });
    return school?.name;
  } catch (error) {
    console.error("Failed to fetch school name:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const schoolName = await getSchoolName(params.schoolId);
  if (!schoolName) {
    return { title: "School Not Found" };
  }
  return {
    title: `Add Admin to ${schoolName} | Super Admin - Sukuu`,
    description: `Create a new school administrator account for ${schoolName}.`,
  };
}

export default async function AddNewSchoolAdminPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
    redirect(`/auth/signin?callbackUrl=/superadmin/schools/${schoolId}/admins/new`);
  }

  const schoolName = await getSchoolName(schoolId);

  if (!schoolName) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/superadmin/schools/${schoolId}/admins`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Manage Admins for {schoolName}
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <UserPlus className="h-8 w-8 text-primary" />
            Add New Administrator
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            For school: <span className="font-semibold text-primary">{schoolName}</span>
          </p>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Administrator Details</CardTitle>
          <CardDescription>
            Enter the details for the new school administrator. They will be able to log in with these credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SchoolAdminForm schoolId={schoolId} schoolName={schoolName} />
        </CardContent>
      </Card>
    </div>
  );
}