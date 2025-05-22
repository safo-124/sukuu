// File: app/(portals)/[schoolId]/schooladmin/academics/classes/[classId]/view/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronLeft, Edit, UsersRound, UserCircle, BookCopy as ClassIcon, CalendarDays, Tag, Home, ListChecks, AlertTriangle, Eye
} from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption
} from "@/components/ui/table";

const formatDate = (dateString, options = { year: 'numeric', month: 'long', day: 'numeric' }) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString(undefined, options);
};

async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

async function getClassDetails(classId, schoolId, currentUserId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(currentUserId, schoolId);

    if (!authorizedSchoolAdmin) {
      return { error: "Forbidden", classDetails: null, schoolName: null };
    }

    const classDetails = await prisma.class.findUnique({
      where: { 
        id: classId,
        schoolId: schoolId
      },
      include: {
        school: { select: { name: true } },
        homeroomTeacher: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        currentStudents: { 
          where: { isActive: true }, // <<< ONLY COUNT/LIST ACTIVE STUDENTS
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          take: 20, 
          select: { 
              id: true, firstName: true, lastName: true, studentIdNumber: true, 
              isActive: true, profilePictureUrl: true 
          },
        },
      },
    });

    if (!classDetails) {
      return { error: "NotFound", classDetails: null, schoolName: null };
    }
    
    // Add console.log here to inspect fetched data on server
    // console.log("[SERVER getClassDetails] Fetched classDetails:", JSON.stringify(classDetails, null, 2));

    return { error: null, classDetails, schoolName: classDetails.school.name };
  } catch (error) {
    console.error(`Failed to fetch class details for ID ${classId}:`, error);
    return { error: "DataFetchError", classDetails: null, schoolName: null };
  }
}

export async function generateMetadata({ params }) {
  const data = await getClassDetails(params.classId, params.schoolId, null);
  if (!data.classDetails || !data.schoolName) {
    return { title: "Class Details | Sukuu" };
  }
  const cls = data.classDetails;
  return {
    title: `Class: ${cls.name} ${cls.section || ''} - ${data.schoolName} | Sukuu`,
  };
}

// Helper DetailItem (ensure it's defined or imported)
function DetailItem({ icon: Icon, label, value, children, isBadge = false, badgeVariant = "secondary", fullWidthValue = false}) {
  if (!children && (value === null || value === undefined || (typeof value === 'string' && value.trim() === ""))) return null;
  return (
    <div className={`grid grid-cols-1 ${fullWidthValue ? "" : "sm:grid-cols-[180px_1fr]"} items-start py-3 gap-1 sm:gap-4`}>
      <dt className="text-sm font-medium text-muted-foreground flex items-center">
        {Icon && <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />}
        {label}
      </dt>
      <dd className={`text-sm text-foreground break-words ${fullWidthValue ? "mt-1" : "sm:mt-0"}`}>
        {children ? children : 
         isBadge ? <Badge variant={badgeVariant} className={badgeVariant === "default" && value === "Active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : badgeVariant === "destructive" && value === "Inactive" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : ""}>{String(value)}</Badge> : 
         String(value)}
      </dd>
    </div>
  );
}


export default async function ViewClassPage({ params }) {
  const { schoolId, classId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/classes/${classId}/view`);
  }

  const { error, classDetails, schoolName } = await getClassDetails(classId, schoolId, session.user.id);

  if (error === "Forbidden") redirect(`/unauthorized?message=You are not authorized to view this class.`);
  if (error === "NotFound" || !classDetails) notFound();
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">Failed to Load Class Details</h2>
            <p className="text-muted-foreground">There was an issue retrieving the class details. Please try again later.</p>
            <Link href={`/${schoolId}/schooladmin/academics/classes`} passHref>
                <Button variant="outline" className="mt-4"><ChevronLeft className="mr-2 h-4 w-4"/>Back to Classes List</Button>
            </Link>
        </div>
    );
  }

  const cls = classDetails;
  const enrolledStudents = cls.currentStudents || []; // Ensure it's an array

  const homeroomTeacherName = cls.homeroomTeacher ? `${cls.homeroomTeacher.user.firstName} ${cls.homeroomTeacher.user.lastName}` : "Not Assigned";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/${schoolId}/schooladmin/academics/classes`} passHref>
            <Button variant="outline" size="sm" className="mb-3"><ChevronLeft className="mr-2 h-4 w-4" />Back to Classes List</Button>
          </Link>
          <div className="flex items-center gap-3">
            <ClassIcon className="h-9 w-9 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{cls.name} {cls.section || ""}</h1>
              <p className="text-lg text-muted-foreground">Class Details - <span className="font-medium text-foreground">{schoolName}</span></p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-2 sm:pt-0">
          <Link href={`/${schoolId}/schooladmin/academics/classes/${cls.id}/edit`} passHref>
            <Button variant="default"><Edit className="mr-2 h-4 w-4" />Edit Class</Button>
          </Link>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader><CardTitle>Core Information</CardTitle></CardHeader>
        <CardContent>
          <dl className="divide-y divide-border">
            <DetailItem icon={Tag} label="Class Name" value={cls.name} />
            <DetailItem icon={Tag} label="Section" value={cls.section || "N/A"} />
            <DetailItem icon={CalendarDays} label="Academic Year" value={cls.academicYear} />
            <DetailItem icon={UserCircle} label="Homeroom Teacher">
              {cls.homeroomTeacher?.user?.id ? (<Link href={`/${schoolId}/schooladmin/staff/teachers/${cls.homeroomTeacher.id}/view`} className="text-primary hover:underline">{homeroomTeacherName}</Link>) : (homeroomTeacherName)}
            </DetailItem>
            <DetailItem icon={UsersRound} label="Active Enrolled Students" value={String(enrolledStudents.length)} />
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Active Enrolled Students ({enrolledStudents.length})</CardTitle>
          <CardDescription>List of active students currently in this class (showing up to 20).</CardDescription>
        </CardHeader>
        <CardContent>
          {enrolledStudents.length > 0 ? (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrolledStudents.map(student => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={student.profilePictureUrl || undefined} />
                          <AvatarFallback>{student.firstName?.[0]}{student.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                      <TableCell>{student.studentIdNumber}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/${schoolId}/schooladmin/students/${student.id}/view`} passHref>
                            <Button variant="ghost" size="sm"><Eye className="h-4 w-4 mr-1"/> View Profile</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active students are currently enrolled in this class.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}