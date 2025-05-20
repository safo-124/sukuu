// File: components/superadmin/SchoolsDataTable.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Edit3,
  Trash2,
  Eye,
  School as SchoolIcon, // Renamed to avoid conflict if 'School' type is imported
  PlusCircle,
  Loader2, // For loading state in button
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
  // AlertDialogTrigger, // We'll trigger programmatically
} from "@/components/ui/alert-dialog";

// Robust helper to format date
const formatDate = (dateString, options = { year: 'numeric', month: 'short', day: 'numeric' }) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) { // Check if the date object is valid
    console.warn("Invalid date string passed to formatDate:", dateString);
    return "Invalid Date";
  }
  return date.toLocaleDateString('en-US', options); // Using 'en-US' for consistent formatting
};

export default function SchoolsDataTable({ schools }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState(null); // Stores { id: string, name: string }

  const openDeleteDialog = (school) => {
    setSchoolToDelete(school); // This will set the school object { id, name } and trigger the AlertDialog
  };

  const handleConfirmDelete = async () => {
    if (!schoolToDelete) return;

    setIsDeleting(true);
    const toastId = toast.loading(`Deleting school "${schoolToDelete.name}"...`);

    try {
      const response = await fetch(`/api/superadmin/schools/${schoolToDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json(); // Assuming API always returns JSON, even for errors

      if (!response.ok) {
        toast.error(result.error || `Failed to delete "${schoolToDelete.name}".`, { id: toastId });
      } else {
        toast.success(result.message || `School "${schoolToDelete.name}" deleted successfully.`, { id: toastId });
        router.refresh(); // Refresh the data on the current page to update the list
      }
    } catch (error) {
      console.error("Delete school error:", error);
      toast.error(`An unexpected error occurred while deleting "${schoolToDelete.name}".`, { id: toastId });
    } finally {
      setIsDeleting(false);
      setSchoolToDelete(null); // Close dialog / reset state
    }
  };

  if (!schools || schools.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg bg-card shadow">
        <SchoolIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="mt-2 text-xl font-semibold text-foreground">No Schools Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          It looks like no schools have been registered on the platform yet.
        </p>
        <div className="mt-6">
          <Link href="/superadmin/schools/new" passHref>
            <Button size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              Register First School
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg shadow-sm overflow-x-auto"> {/* Added overflow-x-auto for smaller screens */}
        <Table>
          <TableHeader className="bg-muted/50 dark:bg-muted/30">
            <TableRow>
              <TableHead className="min-w-[200px] sm:min-w-[250px]">School Name</TableHead>
              <TableHead className="min-w-[200px] sm:min-w-[250px]">Email</TableHead>
              <TableHead className="min-w-[120px]">City</TableHead>
              <TableHead className="min-w-[120px]">Country</TableHead>
              <TableHead className="hidden md:table-cell min-w-[150px]">Academic Year</TableHead>
              <TableHead className="hidden sm:table-cell min-w-[100px]">Status</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[150px]">Registered On</TableHead> {/* Changed from Created At */}
              <TableHead className="text-right min-w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.map((school) => (
              <TableRow key={school.id} className="hover:bg-muted/20 dark:hover:bg-muted/10">
                <TableCell className="font-medium text-foreground">{school.name}</TableCell>
                <TableCell className="text-muted-foreground">{school.schoolEmail}</TableCell>
                <TableCell className="text-muted-foreground">{school.city || "N/A"}</TableCell>
                <TableCell className="text-muted-foreground">{school.country || "N/A"}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{school.currentAcademicYear}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge 
                    variant={school.isActive ? "default" : "outline"} // Using outline for inactive for better theme adaptability
                    className={
                      school.isActive 
                        ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400 dark:border-green-400/40 dark:bg-green-400/10" 
                        : "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400 dark:border-red-400/40 dark:bg-red-400/10"
                    }
                  >
                    {school.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">{formatDate(school.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle school menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48"> {/* Added width */}
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                         <Link href={`/superadmin/schools/${school.id}/view`} className="flex items-center w-full cursor-pointer">
                           <Eye className="mr-2 h-4 w-4" /> View Details
                         </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                         <Link href={`/superadmin/schools/${school.id}/edit`} className="flex items-center w-full cursor-pointer">
                           <Edit3 className="mr-2 h-4 w-4" /> Edit School
                         </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                         <Link href={`/superadmin/schools/${school.id}/admins`} className="flex items-center w-full cursor-pointer">
                           <Users className="mr-2 h-4 w-4" /> Manage Admins
                         </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer flex items-center w-full"
                        onClick={() => openDeleteDialog({ id: school.id, name: school.name })}
                        disabled={isDeleting} // Disable while any delete is in progress
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete School
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Alert Dialog for Delete Confirmation */}
      {schoolToDelete && ( // Conditionally render AlertDialog to ensure content is available when open
        <AlertDialog open={!!schoolToDelete} onOpenChange={(open) => { if (!open) setSchoolToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the school
                <strong className="px-1 font-semibold text-foreground">{schoolToDelete?.name}</strong>. 
                All associated data (students, classes, staff, financial records, etc., depending on your database cascade rules) might also be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSchoolToDelete(null)} disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Yes, delete school
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}