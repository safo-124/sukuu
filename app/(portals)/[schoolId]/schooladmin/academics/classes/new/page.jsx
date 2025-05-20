// File: app/(portals)/[schoolId]/schooladmin/academics/classes/new/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, PlusCircle, UserPlus, AlertTriangle } from "lucide-react"; // Added AlertTriangle
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import ClassForm from "@/components/schooladmin/ClassForm"; // Adjust path if needed
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Function to fetch school details and teachers list for the form
async function getPageData(schoolId, currentUserIdFromSession) {
  try {
    // Fetch session inside getPageData to ensure it's fresh and has the role
    // Note: currentUserIdFromSession is already from a session, but re-fetching session here
    // can be a pattern if this function is called from places without a pre-fetched session.
    // For this page structure, using the passed currentUserIdFromSession directly is also fine.
    const session = await getServerSession(authOptions); 
    const requestingUserRole = session?.user?.role;
    const requestingUserId = session?.user?.id; // This is the definitive user ID from the current request's session

    // Ensure the passed currentUserIdFromSession matches the actual session user for consistency
    if (currentUserIdFromSession !== requestingUserId) {
        console.warn("Session user ID mismatch in getPageData.");
        // Handle as unauthorized or based on your security policy
        return { error: "ForbiddenSessionMismatch", school: null, teachers: [] };
    }

    let authorizedToAccess = false;

    if (requestingUserRole === 'SUPER_ADMIN') {
      authorizedToAccess = true;
    } else if (requestingUserRole === 'SCHOOL_ADMIN' && requestingUserId) {
      const assignment = await prisma.schoolAdmin.findFirst({
        where: { 
          userId: requestingUserId,
          schoolId: schoolId 
        }
      });
      authorizedToAccess = !!assignment;
    }

    if (!authorizedToAccess) {
      console.warn(`User ${requestingUserId || 'undefined'} (Role: ${requestingUserRole || 'undefined'}) not authorized for school ${schoolId} to add class.`);
      return { error: "Forbidden", school: null, teachers: [] };
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, currentAcademicYear: true }
    });

    if (!school) {
      console.warn(`School not found for ID: ${schoolId} in getPageData.`);
      return { error: "SchoolNotFound", school: null, teachers: [] };
    }

    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId: schoolId,
        user: { isActive: true } // Only active teachers
      },
      select: { 
        id: true, 
        user: { select: { firstName: true, lastName: true } } 
      },
      orderBy: [
        { user: { lastName: 'asc' } },
        { user: { firstName: 'asc' } },
      ]
    });
    return { school, teachers, error: null };

  } catch (error) {
    console.error("Failed to fetch data for new class page:", error);
    return { error: "DataFetchError", school: null, teachers: [] };
  }
}

export async function generateMetadata({ params }) {
  const { schoolId } = params;
  let schoolName = "Add Class"; // Default
  try {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true }
    });
    if (school) {
        schoolName = school.name;
    } else {
        return { title: "School Not Found | Sukuu - Add Class" };
    }
  } catch(e) {
    console.error("Error fetching school name for metadata (add class page): ", e);
    return { title: "Error | Sukuu - Add Class"};
  }
  
  return {
    title: `Add New Class - ${schoolName} | Sukuu`,
    description: `Create a new class, assign sections, and set homeroom teachers for ${schoolName}.`,
  };
}

export default async function AddNewClassPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/classes/new`);
  }
  // SuperAdmin check is handled within getPageData, but role check here is also good.
  if (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN") {
     redirect("/unauthorized?message=You do not have permission to access this page.");
  }

  // Pass the session.user.id to getPageData for authorization checks
  const { school, teachers, error } = await getPageData(schoolId, session.user.id); 

  if (error === "Forbidden" || error === "ForbiddenSessionMismatch") {
    redirect("/unauthorized?message=You are not authorized to add classes to this school.");
  }
  if (error === "SchoolNotFound" || !school) {
    notFound(); // Triggers Next.js not-found UI
  }
   if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/academics/classes`} passHref>
                <Button variant="outline" size="sm" className="mb-4">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Manage Classes
                </Button>
            </Link>
            <Card className="border-destructive bg-destructive/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-6 w-6" />
                        Error Loading Page Data
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive/90">
                        There was an issue retrieving necessary data (e.g., school details or teacher list). 
                        Please ensure the school exists and you have appropriate permissions.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Error detail: {error}. Please try again later or contact support.
                    </p>
                </CardContent>
            </Card>
        </div>
     );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/${schoolId}/schooladmin/academics/classes`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Manage Classes
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <PlusCircle className="h-8 w-8 text-primary" /> {/* Changed icon to PlusCircle for "Add" context */}
            Create New Class
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            For school: <span className="font-semibold text-primary">{school.name}</span>
          </p>
        </div>
      </div>
      
      <Card className="w-full shadow-md"> {/* Added shadow */}
        <CardHeader>
            <CardTitle>New Class Details</CardTitle>
            <CardDescription>
                Define the new class, its section (if any), academic year, and optionally assign a homeroom teacher.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <ClassForm 
                schoolId={schoolId} 
                teachersList={teachers || []} // Ensure teachersList is always an array
                currentSchoolAcademicYear={school.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`} 
                // No initialData prop means it's in "create" mode
            />
        </CardContent>
      </Card>
    </div>
  );
}