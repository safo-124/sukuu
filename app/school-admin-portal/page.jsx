// File: app/school-admin-portal/page.jsx
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut } from "lucide-react";
import SignOutButton from "@/components/auth/SignOutButton"; // Re-using the SignOutButton

export const metadata = {
    title: "School Admin Portal | Sukuu",
    description: "Access your school management dashboard.",
};

async function getAdminSchoolAssignments(userId) {
    if (!userId) return [];
    try {
        const assignments = await prisma.schoolAdmin.findMany({
            where: { userId: userId },
            include: {
                school: { // Include details of the school
                    select: {
                        id: true,
                        name: true,
                        isActive: true, // Good to know if the school itself is active
                    }
                }
            }
        });
        // Filter out assignments where the school might have been deactivated
        return assignments.filter(assignment => assignment.school && assignment.school.isActive);
    } catch (error) {
        console.error("Error fetching school admin assignments:", error);
        return []; // Return empty on error
    }
}

export default async function SchoolAdminPortalEntryPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/auth/signin?callbackUrl=/school-admin-portal");
    }

    // Allow SUPER_ADMIN to access for testing, but their primary dashboard is elsewhere
    if (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN") {
        redirect("/unauthorized"); // Or redirect to their appropriate portal
    }
    
    // If a SUPER_ADMIN lands here, maybe redirect them to their own dashboard
    if (session.user.role === "SUPER_ADMIN") {
        redirect("/superadmin/dashboard");
    }

    const assignments = await getAdminSchoolAssignments(session.user.id);

    if (assignments.length === 0) {
        // This School Admin is not assigned to any active school
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4 md:p-6">
                <Card className="w-full max-w-lg text-center shadow-lg">
                    <CardHeader>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
                            <AlertTriangle className="h-10 w-10 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl">No School Assignment</CardTitle>
                        <CardDescription>
                            You are not currently assigned as an administrator to any active school.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            Please contact the Super Administrator if you believe this is an error
                            or to request assignment to a school.
                        </p>
                        <div className="mt-6">
                           <SignOutButton variant="outline" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (assignments.length === 1) {
        // If admin to only one school, redirect to that school's admin dashboard
        const schoolId = assignments[0].school.id;
        redirect(`/${schoolId}/schooladmin/dashboard`);
    }

    // If admin to multiple schools (future enhancement: show a selection list)
    // For now, redirect to the first assigned school's dashboard
    // This part will need a proper UI if true multi-school adminship is common.
    if (assignments.length > 1) {
        console.log(`School Admin ${session.user.email} is assigned to multiple schools. Redirecting to the first one.`);
        const schoolId = assignments[0].school.id;
        // In a real multi-school scenario, you'd render a list here:
        // return <SchoolSelectionList schools={assignments.map(a => a.school)} />;
        redirect(`/${schoolId}/schooladmin/dashboard`);
    }

    // Fallback, should not be reached if logic above is correct
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Processing your school assignment...</p>
        </div>
    );
}