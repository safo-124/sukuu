// File: app/(portals)/superadmin/schools/[schoolId]/admins/page.jsx
"use client"; // This page now needs client-side interactivity for delete

import { useState, useEffect } from "react"; // Added useState, useEffect
import Link from "next/link";
import { useParams, useRouter, notFound as useNotFound } from "next/navigation"; // Added useParams, useRouter
import { ChevronLeft, PlusCircle, UserCog, Users, Mail, CalendarDays, MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react"; // Use useSession for client-side auth check if needed
import { toast } from "sonner";

// import { getServerSession } from "next-auth/next"; // No longer using getServerSession directly here for main data
// import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Not directly used for main data
// import prisma from "@/lib/prisma"; // Data will be fetched client-side or passed if pre-fetched

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";


// Helper to format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};


export default function ManageSchoolAdminsPage() {
  const router = useRouter();
  const params = useParams(); // Get schoolId from URL client-side
  const { schoolId } = params;
  const { data: session, status: sessionStatus } = useSession(); // Client-side session

  const [schoolName, setSchoolName] = useState("");
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [adminToDelete, setAdminToDelete] = useState(null); // { schoolAdminId, userName }
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'loading') return; // Wait for session
    if (sessionStatus === 'unauthenticated' || (session && session.user.role !== 'SUPER_ADMIN')) {
      router.replace(`/auth/signin?callbackUrl=/superadmin/schools/${schoolId}/admins`);
      return;
    }

    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch school name separately or get it along with admins if API provides
        const schoolRes = await fetch(`/api/superadmin/schools/${schoolId}`);
        if (!schoolRes.ok) {
            if(schoolRes.status === 404) useNotFound(); // Trigger Next.js not found
            throw new Error(`Failed to fetch school details (${schoolRes.status})`);
        }
        const schoolData = await schoolRes.json();
        setSchoolName(schoolData.name);

        // Fetch admins for this school
        const adminsRes = await fetch(`/api/superadmin/schools/${schoolId}/admins`);
        if (!adminsRes.ok) throw new Error(`Failed to fetch administrators (${adminsRes.status})`);
        const adminData = await adminsRes.json();
        setAdmins(adminData || []);

      } catch (err) {
        console.error("Error fetching data for ManageSchoolAdminsPage:", err);
        setError(err.message);
        toast.error("Failed to load data: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (schoolId && sessionStatus === 'authenticated') {
      fetchData();
    }
  }, [schoolId, sessionStatus, session, router]); // Added session dependency

  const openDeleteDialog = (admin) => {
    setAdminToDelete({ schoolAdminId: admin.schoolAdminId, userName: `${admin.firstName} ${admin.lastName}`, schoolName });
  };

  const handleConfirmDelete = async () => {
    if (!adminToDelete) return;
    setIsDeleting(true);
    const toastId = toast.loading(`Removing ${adminToDelete.userName} from ${adminToDelete.schoolName}...`);

    try {
      const response = await fetch(`/api/superadmin/schools/${schoolId}/admins/${adminToDelete.schoolAdminId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to remove administrator.", { id: toastId });
      } else {
        toast.success(result.message || "Administrator removed successfully.", { id: toastId });
        // Refresh data by re-fetching
        const adminsRes = await fetch(`/api/superadmin/schools/${schoolId}/admins`);
        const adminData = await adminsRes.json();
        setAdmins(adminData || []);
        // router.refresh(); // Alternative: re-runs server components and data fetching on current route
      }
    } catch (err) {
      console.error("Delete admin error:", err);
      toast.error("An unexpected error occurred.", { id: toastId });
    } finally {
      setIsDeleting(false);
      setAdminToDelete(null);
    }
  };


  if (sessionStatus === 'loading' || (isLoading && !error) ) {
    return (
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <Skeleton className="h-8 w-1/4 mb-2" /> {/* Back button */}
        <Skeleton className="h-10 w-1/2 mb-1" /> {/* Title */}
        <Skeleton className="h-6 w-3/4 mb-6" /> {/* Description */}
        <Skeleton className="h-12 w-48 float-right" /> {/* Add admin button */}
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && admins.length === 0) { // Show error primarily if no data could be shown
     return (
      <div className="space-y-6 text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive">Failed to Load Data</h2>
        <p className="text-muted-foreground">{error}</p>
        <Link href={`/superadmin/schools/${schoolId}/view`} passHref>
            <Button variant="outline" className="mt-4">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to School Details
            </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/superadmin/schools/${schoolId}/view`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to {schoolName || "School"} Details
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Manage Admins: <span className="text-primary">{schoolName || "Loading..."}</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            View and assign school administrators for this institution.
          </p>
        </div>
        <Link href={`/superadmin/schools/${schoolId}/admins/new`} passHref>
          <Button size="lg" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New School Admin
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Current School Administrators ({admins.length})
          </CardTitle>
          <CardDescription>
            The following users have administrative access to {schoolName || "this school"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {admins.length > 0 ? (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    {/* <TableHead className="hidden md:table-cell">Date Added</TableHead> */}
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-right w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => ( // admin here is the mapped user object with schoolAdminId
                    <TableRow key={admin.schoolAdminId}>
                      <TableCell>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={admin.profilePicture || undefined} alt={admin.firstName} />
                          <AvatarFallback>
                            {admin.firstName?.[0] || ''}{admin.lastName?.[0] || ''}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
                        {admin.firstName} {admin.lastName}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      {/* <TableCell className="hidden md:table-cell">{formatDate(admin.createdAt)}</TableCell> // createdAt is of User, not SchoolAdmin link here */}
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={admin.isActive ? "default" : "destructive"}
                               className={admin.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}>
                          {admin.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle admin menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator/>
                            {/* Edit action could go here later */}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                              onClick={() => openDeleteDialog(admin)}
                              disabled={isDeleting && adminToDelete?.schoolAdminId === admin.schoolAdminId}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Remove Access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <UserCog className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                No administrators have been assigned to this school yet.
              </p>
              <Link href={`/superadmin/schools/${schoolId}/admins/new`} passHref className="mt-4 inline-block">
                <Button variant="secondary">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add First School Admin
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Dialog for Delete Confirmation */}
      {adminToDelete && (
        <AlertDialog open={!!adminToDelete} onOpenChange={(open) => { if (!open && !isDeleting) setAdminToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to remove this administrator?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove <strong className="px-1 font-semibold">{adminToDelete?.userName}</strong> as an administrator for <strong className="px-1 font-semibold">{adminToDelete?.schoolName}</strong>.
                Their user account will not be deleted. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAdminToDelete(null)} disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Yes, Remove Admin
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}