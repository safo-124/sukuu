// File: app/(portals)/[schoolId]/schooladmin/staff/teachers/[teacherId]/view/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronLeft, Edit, UserCircle, Mail, Phone, CalendarDays, Briefcase, BookOpen, Award, CheckCircle, XCircle, UserCog
} from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Helper to format date (can be moved to a utils file if used elsewhere)
const formatDate = (dateString, options = { year: 'numeric', month: 'long', day: 'numeric' }) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString(undefined, options);
};

// Function to fetch teacher data by their Teacher record ID
async function getTeacherDetails(teacherId, schoolId, currentUserId) {
  try {
    // Authorization check: Ensure current user is admin for this school or SuperAdmin
    const session = await getServerSession(authOptions); // Re-fetch for role, or trust passed userId for auth context
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;

    if (!isSuperAdmin && currentUserId) {
      const assignment = await prisma.schoolAdmin.findFirst({
        where: { userId: currentUserId, schoolId: schoolId },
      });
      authorizedSchoolAdmin = !!assignment;
    }

    if (!authorizedSchoolAdmin) {
      return { error: "Forbidden", teacher: null, schoolName: null };
    }

    const teacher = await prisma.teacher.findUnique({
      where: { 
        id: teacherId,
        schoolId: schoolId // Ensure teacher belongs to this school
      },
      include: {
        user: true, // Include all fields from the User model
        school: { select: { name: true } }, // Include school name for context
      },
    });

    if (!teacher) {
      return { error: "NotFound", teacher: null, schoolName: null };
    }
    
    return { error: null, teacher, schoolName: teacher.school.name };
  } catch (error) {
    console.error(`Failed to fetch teacher details for ID ${teacherId}:`, error);
    return { error: "DataFetchError", teacher: null, schoolName: null };
  }
}

export async function generateMetadata({ params }) {
  // A simpler fetch for metadata, or reuse getTeacherDetails carefully
  const teacherData = await getTeacherDetails(params.teacherId, params.schoolId, null); // Pass null for userId if just for metadata
  if (!teacherData.teacher || !teacherData.schoolName) {
    return { title: "Teacher Profile | Sukuu" };
  }
  return {
    title: `Teacher: ${teacherData.teacher.user.firstName} ${teacherData.teacher.user.lastName} - ${teacherData.schoolName} | Sukuu`,
    description: `Profile and details for teacher ${teacherData.teacher.user.firstName} ${teacherData.teacher.user.lastName}.`,
  };
}

// Helper component for displaying detail items
function DetailItem({ icon: Icon, label, value, isHtml = false, isBadge = false, badgeVariant = "secondary", fullWidthValue = false }) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === "")) return null;
  return (
    <div className={`grid grid-cols-1 ${fullWidthValue ? "" : "md:grid-cols-[180px_1fr]"} items-start py-3 gap-1 md:gap-4`}>
      <dt className="text-sm font-medium text-muted-foreground flex items-center">
        {Icon && <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />}
        {label}
      </dt>
      <dd className={`text-sm text-foreground break-words ${fullWidthValue ? "mt-1" : "md:mt-0"}`}>
        {isHtml ? <div dangerouslySetInnerHTML={{ __html: String(value) }} /> : 
         isBadge ? <Badge variant={badgeVariant} className={badgeVariant === "default" && value === "Active User" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : badgeVariant === "outline" && value === "Inactive User" ? "border-slate-600/50 bg-slate-500/10 text-slate-700 dark:text-slate-400 dark:border-slate-500/40 dark:bg-slate-500/10" : ""}>{String(value)}</Badge> : 
         String(value)}
      </dd>
    </div>
  );
}


export default async function ViewTeacherPage({ params }) {
  const { schoolId, teacherId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/staff/teachers/${teacherId}/view`);
  }

  const { error, teacher, schoolName } = await getTeacherDetails(teacherId, schoolId, session.user.id);

  if (error === "Forbidden") {
    redirect(`/unauthorized?message=You are not authorized to view this teacher's profile.`);
  }
  if (error === "NotFound" || !teacher) {
    notFound();
  }
  if (error === "DataFetchError") {
    return (
        <div className="p-6 space-y-4 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">Failed to Load Teacher Profile</h2>
            <p className="text-muted-foreground">There was an issue retrieving the teacher's details. Please try again later.</p>
            <Link href={`/${schoolId}/schooladmin/staff/teachers`} passHref>
                <Button variant="outline" className="mt-4">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Teachers List
                </Button>
            </Link>
        </div>
    );
  }

  const user = teacher.user; // For convenience

  return (
    <div className="space-y-6">
      {/* Page Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/${schoolId}/schooladmin/staff/teachers`} passHref>
            <Button variant="outline" size="sm" className="mb-3">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Teachers List
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary/50">
              <AvatarImage src={user.profilePicture || undefined} alt={`${user.firstName} ${user.lastName}`} />
              <AvatarFallback className="text-2xl">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-lg text-muted-foreground">
                Teacher Profile - <span className="font-medium text-foreground">{schoolName}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
          <Link href={`/${schoolId}/schooladmin/staff/teachers/${teacher.id}/edit`} passHref className="w-full sm:w-auto">
            <Button variant="default" className="w-full">
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </Link>
          {/* Activate/Deactivate/Delete buttons could be here or managed from table */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Teacher Information</CardTitle>
            <CardDescription>Detailed profile and professional information.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <DetailItem icon={UserCog} label="Role" value={user.role.replace("_", " ")} isBadge badgeVariant="outline" />
              <DetailItem icon={Mail} label="Email Address" value={user.email} />
              <DetailItem icon={Phone} label="Phone Number" value={user.phoneNumber || "N/A"} />
              <Separator className="my-1" />
              <DetailItem icon={Briefcase} label="Teacher ID" value={teacher.teacherIdNumber || "N/A"} />
              <DetailItem icon={CalendarDays} label="Date of Joining" value={formatDate(teacher.dateOfJoining)} />
              <DetailItem icon={Award} label="Specialization" value={teacher.specialization || "N/A"} />
              <Separator className="my-1" />
              <DetailItem icon={BookOpen} label="Qualifications" value={teacher.qualifications || "N/A"} fullWidthValue />
              <Separator className="my-1" />
              <DetailItem 
                  icon={user.isActive ? CheckCircle : XCircle} 
                  label="User Account Status" 
                  value={user.isActive ? "Active User" : "Inactive User"} 
                  isBadge 
                  badgeVariant={user.isActive ? "default" : "outline"} 
              />
              <Separator className="my-1" />
              <DetailItem icon={CalendarDays} label="Profile Created" value={formatDate(user.createdAt, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />
              <DetailItem icon={CalendarDays} label="Profile Last Updated" value={formatDate(user.updatedAt, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />
            </dl>
          </CardContent>
        </Card>
        
        <div className="lg:col-span-1 space-y-6">
          {/* Placeholder for Assigned Classes Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Assigned Classes</CardTitle>
              <CardDescription>Classes this teacher is associated with.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Class assignment details will be shown here.</p>
              {/* TODO: Fetch and display classes assigned to this teacher (homeroom or subject teacher) */}
            </CardContent>
          </Card>
          {/* Placeholder for Timetable Snippet Card */}
        </div>
      </div>
    </div>
  );
}