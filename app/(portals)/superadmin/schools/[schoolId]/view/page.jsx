// File: app/(portals)/superadmin/schools/[schoolId]/view/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { 
    ChevronLeft, Edit, Trash2, Building, Mail, Phone, Globe, MapPin, 
    CalendarDays, Clock, Tag, DollarSign, CheckCircle, XCircle, Users as UsersIcon // Added UsersIcon
} from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Helper to format date (can be moved to a utils file if used elsewhere)
const formatDate = (dateString, options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) => {
  if (!dateString) return "N/A";
  // Ensure dateString is a valid date or Date object before calling toLocaleDateString
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString(undefined, options);
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
    return { title: "School Not Found | Sukuu" };
  }
  return {
    title: `View School: ${school.name} | Super Admin - Sukuu`,
    description: `Detailed information for ${school.name}.`,
  };
}

// Helper component for displaying detail items
function DetailItem({ icon: Icon, label, value, isHtml = false, isBadge = false, badgeVariant = "secondary" }) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === "")) return null; 
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-start py-3 gap-1 md:gap-4"> {/* Adjusted grid for better alignment */}
      <dt className="text-sm font-medium text-muted-foreground flex items-center">
        {Icon && <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />} {/* Added shrink-0 */}
        {label}
      </dt>
      <dd className="text-sm text-foreground break-words"> {/* Added break-words */}
        {isHtml ? <div dangerouslySetInnerHTML={{ __html: String(value) }} /> : 
         isBadge ? <Badge variant={badgeVariant} className={badgeVariant === "default" && value === "Active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : badgeVariant === "destructive" && value === "Inactive" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : ""}>{String(value)}</Badge> : 
         String(value)}
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
            <Button variant="outline" size="sm" className="mb-3"> {/* Increased margin-bottom */}
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Schools List
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-3"> {/* Increased gap */}
            <Building className="h-9 w-9 text-primary" /> {/* Slightly larger icon */}
            {school.name}
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Detailed information for this educational institution.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0"> {/* Actions alignment */}
          <Link href={`/superadmin/schools/${school.id}/admins`} passHref className="w-full sm:w-auto">
            <Button variant="outline" className="w-full">
              <UsersIcon className="mr-2 h-4 w-4" />
              Manage Admins
            </Button>
          </Link>
          <Link href={`/superadmin/schools/${school.id}/edit`} passHref className="w-full sm:w-auto">
            <Button variant="default" className="w-full">
              <Edit className="mr-2 h-4 w-4" />
              Edit School
            </Button>
          </Link>
          {/* Delete button - placeholder for now, will need confirmation
          <Button variant="destructive" size="sm" onClick={() => handleDeleteSchool(school.id)} className="w-full sm:w-auto">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button> */}
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>School Overview</CardTitle>
          <CardDescription>Core details, contact, and operational information.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border">
            {/* Using DetailItem component for consistent display */}
            <DetailItem icon={Mail} label="School Email" value={school.schoolEmail} />
            <DetailItem icon={Phone} label="Phone Number" value={school.phoneNumber || "N/A"} />
            <DetailItem 
              icon={Globe} 
              label="Website" 
              value={school.website ? `<a href="${school.website.startsWith('http') ? school.website : `https://${school.website}`}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${school.website}</a>` : "N/A"}
              isHtml={!!school.website}
            />
            {school.logoUrl && (
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-start py-3 gap-1 md:gap-4">
                <dt className="text-sm font-medium text-muted-foreground flex items-center">
                  <Building className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" /> Logo
                </dt>
                <dd className="mt-1 md:mt-0">
                  <img src={school.logoUrl} alt={`${school.name} Logo`} className="h-20 w-auto max-w-[200px] rounded border p-1 bg-muted object-contain" />
                </dd>
              </div>
            )}
            <Separator className="my-1" /> {/* Separators are useful if DetailItem doesn't have its own bottom border */}
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