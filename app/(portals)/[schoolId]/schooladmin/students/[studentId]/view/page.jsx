// File: app/(portals)/[schoolId]/schooladmin/students/[studentId]/view/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronLeft, Edit, UserCircle, CalendarDays, Users, MapPin, Droplet, ShieldAlert as MedicalIcon, Phone, BookOpen, UsersRound, Mail
} from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Helper to format date (can be moved to a utils file)
const formatDate = (dateString, options = { year: 'numeric', month: 'long', day: 'numeric' }) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString(undefined, options);
};

// Function to fetch student data by their ID, ensuring they belong to the school
async function getStudentDetails(studentId, schoolId, currentUserId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;

    if (!isSuperAdmin && currentUserId) {
      const assignment = await prisma.schoolAdmin.findFirst({
        where: { userId: currentUserId, schoolId: schoolId },
      });
      authorizedSchoolAdmin = !!assignment;
    }

    if (!authorizedSchoolAdmin) {
      return { error: "Forbidden", student: null, schoolName: null };
    }

    const student = await prisma.student.findUnique({
      where: { 
        id: studentId,
        schoolId: schoolId // Crucial check: student must belong to this school
      },
      include: {
        user: true, // If students can have linked user accounts
        school: { select: { name: true } },
        currentClass: { select: { name: true, section: true } },
        parents: { // Fetch linked parents
          include: {
            parent: { // From StudentParentLink, get Parent
              include: {
                user: true // From Parent, get User details
              }
            }
          }
        }
      },
    });

    if (!student) {
      return { error: "NotFound", student: null, schoolName: null };
    }
    
    return { error: null, student, schoolName: student.school.name };
  } catch (error) {
    console.error(`Failed to fetch student details for ID ${studentId}:`, error);
    return { error: "DataFetchError", student: null, schoolName: null };
  }
}

export async function generateMetadata({ params }) {
  const studentData = await getStudentDetails(params.studentId, params.schoolId, null); // userId null for metadata
  if (!studentData.student || !studentData.schoolName) {
    return { title: "Student Profile | Sukuu" };
  }
  const student = studentData.student;
  return {
    title: `Student: ${student.firstName} ${student.lastName} - ${studentData.schoolName} | Sukuu`,
    description: `Profile and details for student ${student.firstName} ${student.lastName}.`,
  };
}

// Helper component for displaying detail items (can be shared)
function DetailItem({ icon: Icon, label, value, isHtml = false, isBadge = false, badgeVariant = "secondary", fullWidthValue = false, children }) {
  if (!children && (value === null || value === undefined || (typeof value === 'string' && value.trim() === ""))) return null;
  return (
    <div className={`grid grid-cols-1 ${fullWidthValue ? "" : "sm:grid-cols-[180px_1fr]"} items-start py-3 gap-1 sm:gap-4`}>
      <dt className="text-sm font-medium text-muted-foreground flex items-center">
        {Icon && <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />}
        {label}
      </dt>
      <dd className={`text-sm text-foreground break-words ${fullWidthValue ? "mt-1" : "sm:mt-0"}`}>
        {children ? children :
         isHtml ? <div dangerouslySetInnerHTML={{ __html: String(value) }} /> : 
         isBadge ? <Badge variant={badgeVariant} className={badgeVariant === "default" && value === "Active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : badgeVariant === "destructive" && value === "Inactive" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : ""}>{String(value)}</Badge> : 
         String(value)}
      </dd>
    </div>
  );
}


export default async function ViewStudentPage({ params }) {
  const { schoolId, studentId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/students/${studentId}/view`);
  }

  const { error, student, schoolName } = await getStudentDetails(studentId, schoolId, session.user.id);

  if (error === "Forbidden") {
    redirect(`/unauthorized?message=You are not authorized to view this student's profile.`);
  }
  if (error === "NotFound" || !student) {
    notFound();
  }
  if (error === "DataFetchError") {
    return (
        <div className="p-6 space-y-4 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" /> {/* Ensure AlertTriangle is imported */}
            <h2 className="text-xl font-semibold text-destructive">Failed to Load Student Profile</h2>
            <p className="text-muted-foreground">There was an issue retrieving the student's details. Please try again later.</p>
            <Link href={`/${schoolId}/schooladmin/students`} passHref>
                <Button variant="outline" className="mt-4">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Students List
                </Button>
            </Link>
        </div>
    );
  }

  const fullName = `${student.firstName} ${student.middleName || ''} ${student.lastName}`.replace(/\s+/g, ' ').trim();

  return (
    <div className="space-y-6">
      {/* Page Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/${schoolId}/schooladmin/students`} passHref>
            <Button variant="outline" size="sm" className="mb-3">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Students List
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary/50">
              <AvatarImage src={student.profilePictureUrl || student.user?.profilePicture || undefined} alt={fullName} />
              <AvatarFallback className="text-2xl">
                {student.firstName?.[0]}{student.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {fullName}
              </h1>
              <p className="text-lg text-muted-foreground">
                Student Profile - <span className="font-medium text-foreground">{schoolName}</span>
              </p>
              <Badge variant={student.isActive ? "default" : "destructive"} className={`mt-1 ${student.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                {student.isActive ? "Active Student" : "Inactive Student"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
          <Link href={`/${schoolId}/schooladmin/students/${student.id}/edit`} passHref className="w-full sm:w-auto">
            <Button variant="default" className="w-full">
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </Link>
          {/* Future actions like "View Grades", "View Attendance" could go here */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details Card */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
            <CardDescription>Personal, academic, and contact details.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <DetailItem icon={UserCircle} label="Full Name" value={fullName} />
              <DetailItem icon={UsersRound} label="Student ID" value={student.studentIdNumber} />
              <DetailItem icon={CalendarDays} label="Date of Birth" value={formatDate(student.dateOfBirth)} />
              <DetailItem icon={Users} label="Gender" value={student.gender?.replace("_", " ") || "N/A"} />
              <Separator className="my-1" />
              <DetailItem icon={BookOpen} label="Current Class" value={student.currentClass ? `${student.currentClass.name} ${student.currentClass.section || ''}`.trim() : "Not Assigned"} />
              <DetailItem icon={CalendarDays} label="Enrollment Date" value={formatDate(student.enrollmentDate)} />
              {student.user?.email && <DetailItem icon={Mail} label="Linked User Email" value={student.user.email} />}
              <Separator className="my-1" />
              <DetailItem icon={MapPin} label="Address" value={[student.address, student.city, student.stateOrRegion, student.country, student.postalCode].filter(Boolean).join(', ') || "N/A"} fullWidthValue />
            </dl>
          </CardContent>
        </Card>

        {/* Emergency & Medical Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Emergency & Medical</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <DetailItem icon={Phone} label="Emergency Contact" value={`${student.emergencyContactName || "N/A"} (${student.emergencyContactPhone || "N/A"})`} />
                <DetailItem icon={Droplet} label="Blood Group" value={student.bloodGroup || "N/A"} />
                <DetailItem icon={MedicalIcon} label="Allergies" value={student.allergies || "None"} fullWidthValue />
                <DetailItem icon={MedicalIcon} label="Medical Notes" value={student.medicalNotes || "None"} fullWidthValue />
              </dl>
            </CardContent>
          </Card>

          {/* Parent/Guardian Information Card */}
          <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Parent(s) / Guardian(s)</CardTitle>
            </CardHeader>
            <CardContent>
                {student.parents && student.parents.length > 0 ? (
                    <ul className="space-y-3">
                        {student.parents.map(link => (
                            <li key={link.parent.id} className="text-sm border-b border-border pb-2 last:border-b-0 last:pb-0">
                                <p className="font-medium text-foreground">{link.parent.user.firstName} {link.parent.user.lastName} <Badge variant="outline" className="ml-2 text-xs">{link.relationshipToStudent}</Badge></p>
                                {link.parent.user.email && <p className="text-muted-foreground flex items-center gap-1.5"><Mail size={14}/> {link.parent.user.email}</p>}
                                {link.parent.user.phoneNumber && <p className="text-muted-foreground flex items-center gap-1.5"><Phone size={14}/> {link.parent.user.phoneNumber}</p>}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">No parent or guardian information linked.</p>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}