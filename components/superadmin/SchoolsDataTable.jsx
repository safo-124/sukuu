// File: components/superadmin/SchoolsDataTable.jsx
"use client";

import { useState } from "react"; // Added useState
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
import { MoreHorizontal, Edit3, Trash2, Eye, School as SchoolIcon, PlusCircle } from "lucide-react"; // Added SchoolIcon, PlusCircle
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
  AlertDialogTrigger, // We can trigger it programmatically too
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
};

export default function SchoolsDataTable({ schools }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState(null); // Stores { id: string, name: string }

  const openDeleteDialog = (school) => {
    setSchoolToDelete(school);
  };

  const performDelete = async () => {
    if (!schoolToDelete) return;
    setIsDeleting(true);
    const toastId = toast.loading(`Deleting school "${schoolToDelete.name}"...`);

    try {
      const response = await fetch(`/api/superadmin/schools/${schoolToDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to delete school.", { id: toastId });
      } else {
        toast.success(result.message || `School "${schoolToDelete.name}" deleted successfully.`, { id: toastId });
        router.refresh(); // Refresh the data on the current page
      }
    } catch (error) {
      console.error("Delete school error:", error);
      toast.error("An unexpected error occurred while deleting the school.", { id: toastId });
    } finally {
      setIsDeleting(false);
      setSchoolToDelete(null); // Close dialog / reset state
    }
  };

  if (!schools || schools.length === 0) {
    return (
      <div className="text-center py-10 border rounded-md bg-card">
        <SchoolIcon className="mx-auto h-12 w-12 text-muted-foreground" /> {/* Changed icon */}
        <h3 className="mt-2 text-xl font-semibold">No Schools Found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by registering your first school.
        </p>
        <div className="mt-6">
          <Link href="/superadmin/schools/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Register New School
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50 dark:bg-muted/30">
            <TableRow>
              <TableHead className="w-[250px]">School Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="hidden md:table-cell">Academic Year</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Created At</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.map((school) => (
              <TableRow key={school.id}>
                <TableCell className="font-medium">{school.name}</TableCell>
                <TableCell>{school.schoolEmail}</TableCell>
                <TableCell>{school.city || "N/A"}</TableCell>
                <TableCell>{school.country || "N/A"}</TableCell>
                <TableCell className="hidden md:table-cell">{school.currentAcademicYear}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant={school.isActive ? "default" : "destructive"}
                         className={school.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}>
                    {school.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{formatDate(school.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                         <Link href={`/superadmin/schools/${school.id}/view`} className="flex items-center w-full cursor-pointer">
                           <Eye className="mr-2 h-4 w-4" /> View Details
                         </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                         <Link href={`/superadmin/schools/${school.id}/edit`} className="flex items-center w-full cursor-pointer">
                           <Edit3 className="mr-2 h-4 w-4" /> Edit
                         </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                        onClick={() => openDeleteDialog({ id: school.id, name: school.name })}
                        disabled={isDeleting}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
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
      <AlertDialog open={!!schoolToDelete} onOpenChange={(open) => !open && setSchoolToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the school
              <strong className="px-1">{schoolToDelete?.name}</strong>
              and all its associated data (students, classes, teachers, etc., depending on cascade rules).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSchoolToDelete(null)} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={performDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yes, delete school
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}