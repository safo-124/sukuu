// File: app/school-admin-portal/page.jsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import SignOutButton from "@/components/auth/SignOutButton"; // Assuming you have this
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export const metadata = {
    title: "School Admin Portal | Sukuu",
};

export default async function SchoolAdminPortalPage() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN" /* Super admin might access for testing */) ) {
        redirect("/auth/signin?callbackUrl=/school-admin-portal");
    }

    // Later, this page would fetch the school(s) this admin is associated with
    // const schools = await getAdminSchools(session.user.id);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-muted/40">
            <div className="w-full max-w-2xl text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary mb-8">
                    <span className="text-4xl font-bold text-primary-foreground">SA</span>
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
                    School Admin Portal
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                    Welcome, {session.user.firstName || "Administrator"}! This area is under construction.
                </p>
                <p className="mb-4">
                    Your school-specific dashboard and management tools will be available here soon.
                </p>
                
                {/* Placeholder: In a real scenario, you'd list schools or go to a specific school dashboard */}
                {/* {schools && schools.length > 0 ? (
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">Your Schools:</h2>
                        {schools.map(school => <p key={school.id}>{school.name}</p>)}
                    </div>
                ) : (
                    <p>You are not yet assigned to any school.</p>
                )} */}

                <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                    <Link href="/" passHref>
                        <Button variant="outline" size="lg">Go to Homepage (Redirects)</Button>
                    </Link>
                    <SignOutButton className="w-full sm:w-auto h-11 px-8 text-base" />
                </div>
            </div>
        </div>
    );
}