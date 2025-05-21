// File: app/(portals)/[schoolId]/schooladmin/academics/grading/settings/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Settings, PlusCircle, ChevronLeft, ListChecks, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
// We will need a client component for actions like delete or set active, for now, links only

async function getPageData(schoolId, userId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;
    if (!isSuperAdmin && userId) {
        const assignment = await prisma.schoolAdmin.findFirst({ where: { userId: userId, schoolId: schoolId }});
        authorizedSchoolAdmin = !!assignment;
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden" };

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true }
    });
    if (!school) return { error: "SchoolNotFound" };

    const gradeScales = await prisma.gradeScale.findMany({
        where: { schoolId: schoolId },
        orderBy: { name: 'asc' },
        include: { _count: { select: { entries: true } } }
    });
    return { schoolName: school.name, gradeScales, error: null };
  } catch (error) {
    console.error("Failed to fetch data for grading settings:", error);
    return { error: "DataFetchError" };
  }
}

export async function generateMetadata({ params }) {
  const pageData = await getPageData(params.schoolId, null);
  if (!pageData.schoolName) return { title: "Grading Settings | Sukuu" };
  return {
    title: `Grading Settings - ${pageData.schoolName} | Sukuu`,
  };
}

export default async function GradingSettingsPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/grading/settings`);
  }

  const { schoolName, gradeScales, error } = await getPageData(schoolId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized");
  if (error === "SchoolNotFound") notFound();
  // Handle DataFetchError if needed, or let table show empty state

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <Link href={`/${schoolId}/schooladmin/academics/grading`} passHref>
                <Button variant="outline" size="sm" className="mb-3 text-xs sm:text-sm">
                <ChevronLeft className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                Back to Grading Overview
                </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
                <Settings className="h-8 w-8 text-primary" />
                Grading Scales & Settings
            </h1>
            <p className="text-lg text-muted-foreground mt-1">
                Manage how grades are calculated and displayed for <span className="font-semibold text-primary">{schoolName || "this school"}</span>.
            </p>
        </div>
         <Link href={`/${schoolId}/schooladmin/academics/grading/scales/new`} passHref>
            <Button size="lg" className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-5 w-5" />
                Create New Grade Scale
            </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Defined Grade Scales</CardTitle>
            <CardDescription>List of grading scales configured for your school. Only one can be active at a time.</CardDescription>
        </CardHeader>
        <CardContent>
            {(!gradeScales || gradeScales.length === 0) && !error ? (
                <div className="text-center py-6">
                    <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">No grade scales defined yet.</p>
                    <Link href={`/${schoolId}/schooladmin/academics/grading/scales/new`} passHref className="mt-4 inline-block">
                        <Button><PlusCircle className="mr-2 h-4 w-4"/>Create Your First Grade Scale</Button>
                    </Link>
                </div>
            ) : error ? (
                 <p className="text-destructive">Could not load grade scales: {error}</p>
            ) : (
            <div className="border rounded-md overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Scale Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-center">Entries</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {gradeScales.map(scale => (
                            <TableRow key={scale.id}>
                                <TableCell className="font-medium">{scale.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{scale.description || "N/A"}</TableCell>
                                <TableCell className="text-center">{scale._count.entries}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={scale.isActive ? "default" : "outline"} className={scale.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}>
                                        {scale.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/${schoolId}/schooladmin/academics/grading/scales/${scale.id}/edit`} passHref>
                                        <Button variant="ghost" size="sm"><Edit className="h-4 w-4 mr-1"/>Edit</Button>
                                    </Link>
                                    {/* Delete button will require a client component for confirmation */}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            )}
        </CardContent>
      </Card>
      {/* More settings like GPA calculation rules, report card templates can be added here later */}
    </div>
  );
}