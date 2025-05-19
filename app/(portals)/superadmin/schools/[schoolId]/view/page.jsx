// File: app/(portals)/superadmin/schools/[schoolId]/view/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Edit, Trash2, Building, Mail, Phone, Globe, MapPin, CalendarDays, Clock, Tag, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator"; // For visual separation

// Helper to format date (can be moved to a utils file)
const formatDate = (dateString, options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// Function to fetch school data by ID (Server-side)
async function getSchoolById(schoolId) {
  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      // Optionally include related data if needed for view, e.g., createdBySuperAdmin details
      // include: {
      //   createdBySuperAdmin: { include: { user: true } }
      // }
    });
    return school;
  } catch (error) {
    console.error("Failed to fetch school for viewing:", error);
    return null;
  }
}

// Dynamic metadata
export async function generateMetadata({ params }) {
  const school = await getSchoolById(params.schoolId);
  if (!school) {
    return { title: "School Not Found" };
  }
  return {
    title: `View School: ${school.name} | Super Admin - Sukuu`,
    description: `Detailed information for ${school.name}.`,
  };
}

// Helper component for displaying detail items
function DetailItem({ icon: Icon, label, value, isBadge = false, badgeVariant = "secondary" }) {
  if (value === null || value === undefined || value === "") return null; // Don't render if value is not set (for optional fields)
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-2">
      <dt className="w-full sm:w-1/3 md:w-1/4 text-sm font-medium text-muted-foreground flex items-center">
        <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
        {label}
      </dt>
      <dd className="w-full sm:w-2/3 md:w-3/4 mt-1 sm:mt-0 text-sm text-foreground">
        {isBadge ? <Badge variant={badgeVariant}>{String(value)}</Badge> : String(value)}
      </dd>
    </div>
  );
}


export default async function ViewSchoolPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
    redirect(`/auth/signin?callbackUrl=/superadmin/schools/${schoolId}/view`);
  }

  const school = await getSchoolById(schoolId);

  if (!school) {
    notFound();
  }

  const fullAddress = [
    school.address,
    school.city,
    school.stateOrRegion,
    school.postalCode,
    school.country,
  ].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      {/* Page Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href="/superadmin/schools" passHref>
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Schools List
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <Building className="h-8 w-8 text-primary" />
            {school.name}
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Detailed information for the institution.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/superadmin/schools/${school.id}/edit`} passHref>
            <Button variant="default" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit School
            </Button>
          </Link>
          {/* Delete button - placeholder for now, will need confirmation */}
          {/* <Button variant="destructive" size="sm" onClick={() => handleDeleteSchool(school.id)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button> */}
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>School Information</CardTitle>
          <CardDescription>Core details and contact information.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border">
            <DetailItem icon={Mail} label="School Email" value={school.schoolEmail} />
            <DetailItem icon={Phone} label="Phone Number" value={school.phoneNumber} />
            <DetailItem icon={Globe} label="Website" value={school.website ? <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{school.website}</a> : "N/A"} />
            {school.logoUrl && (
              <div className="flex flex-col sm:flex-row py-3">
                <dt className="w-full sm:w-1/3 md:w-1/4 text-sm font-medium text-muted-foreground flex items-center">
                  <Building className="mr-2 h-4 w-4 text-muted-foreground" /> Logo
                </dt>
                <dd className="w-full sm:w-2/3 md:w-3/4 mt-1 sm:mt-0">
                  <img src={school.logoUrl} alt={`${school.name} Logo`} className="h-16 w-auto max-w-xs rounded border p-1 bg-muted" />
                </dd>
              </div>
            )}
            <Separator className="my-1" />
            <DetailItem icon={MapPin} label="Full Address" value={fullAddress || "N/A"} />
            <Separator className="my-1" />
            <DetailItem icon={CalendarDays} label="Academic Year" value={school.currentAcademicYear} />
            <DetailItem icon={Tag} label="Current Term" value={school.currentTerm?.replace("_", " ") || "N/A"} />
            <DetailItem icon={DollarSign} label="Currency" value={school.currency} />
            <DetailItem icon={Clock} label="Timezone" value={school.timezone} />
            <Separator className="my-1" />
            <DetailItem 
                icon={school.isActive ? CheckCircle : XCircle} 
                label="Status" 
                value={school.isActive ? "Active" : "Inactive"} 
                isBadge 
                badgeVariant={school.isActive ? "default" : "destructive"} 
            />
            <Separator className="my-1" />
            <DetailItem icon={CalendarDays} label="Date Registered" value={formatDate(school.createdAt)} />
            <DetailItem icon={CalendarDays} label="Last Updated" value={formatDate(school.updatedAt)} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}