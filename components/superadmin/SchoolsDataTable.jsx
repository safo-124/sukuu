// File: components/superadmin/SchoolsDataTable.jsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // For status
import { MoreHorizontal, Edit3, Trash2, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
// import { useState } from "react"; // For handling delete confirmation modal

// Helper to format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
};

export default function SchoolsDataTable({ schools }) {
  const router = useRouter();
  // const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // const [schoolToDelete, setSchoolToDelete] = useState(null);

  if (!schools || schools.length === 0) {
    return (
      <div className="text-center py-10 border rounded-md bg-card">
        <School className="mx-auto h-12 w-12 text-muted-foreground" />
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

  // Placeholder for delete action
  const handleDeleteSchool = async (schoolId, schoolName) => {
    // setSchoolToDelete({ id: schoolId, name: schoolName });
    // setShowDeleteConfirm(true);
    // For now, just a placeholder
    toast.info(`Delete action for ${schoolName} (ID: ${schoolId}) - To be implemented.`);
    // In a real app:
    // const confirmed = window.confirm(`Are you sure you want to delete ${schoolName}? This action cannot be undone.`);
    // if (confirmed) {
    //   const toastId = toast.loading(`Deleting ${schoolName}...`);
    //   try {
    //     const response = await fetch(`/api/superadmin/schools/${schoolId}`, { method: 'DELETE' });
    //     if (!response.ok) {
    //       const errorData = await response.json();
    //       throw new Error(errorData.error || "Failed to delete school.");
    //     }
    //     toast.success(`${schoolName} deleted successfully.`, { id: toastId });
    //     router.refresh(); // Refresh data on the page
    //   } catch (error) {
    //     toast.error(`Error deleting ${schoolName}: ${error.message}`, { id: toastId });
    //   }
    // }
  };


  return (
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
                       className={school.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"}>
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
                       <Link href={`/superadmin/schools/${school.id}/view`} className="cursor-pointer"> {/* Placeholder view link */}
                         <Eye className="mr-2 h-4 w-4" /> View Details
                       </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                       <Link href={`/superadmin/schools/${school.id}/edit`} className="cursor-pointer"> {/* Placeholder edit link */}
                         <Edit3 className="mr-2 h-4 w-4" /> Edit
                       </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onClick={() => handleDeleteSchool(school.id, school.name)}
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
      {/* Add Alert/ConfirmationDialog for delete action here */}
    </div>
  );
}