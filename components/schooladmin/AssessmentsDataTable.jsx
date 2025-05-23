// File: components/schooladmin/AssessmentsDataTable.jsx
"use client";

import React, { useState, useMemo, useCallback } from "react"; // Added React import
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreHorizontal, Edit3, Trash2, Eye, ListPlus as AssessmentsIcon, PlusCircle, Search, FileSignature, ShieldAlert, Users // Added Users icon
} from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge"; // Not used here for now
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

// Helper to format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function AssessmentsDataTable({ assessments = [], schoolId }) { // Default assessments to empty array
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const openDeleteDialog = useCallback((assessment) => { /* ... same as before ... */ 
    setItemToDelete({ id: assessment.id, name: assessment.name, type: 'assessment' });
  }, []);

  const handleConfirmDelete = useCallback(async () => { /* ... same as before ... */ 
    if (!itemToDelete || itemToDelete.type !== 'assessment') return;
    setIsProcessing(true);
    const toastId = toast.loading(`Deleting assessment "${itemToDelete.name}"...`);
    try {
      const response = await fetch(`/api/schooladmin/${schoolId}/academics/grading/assessments/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || `Failed to delete "${itemToDelete.name}".`, { id: toastId });
      } else {
        toast.success(result.message || `Assessment "${itemToDelete.name}" deleted successfully.`, { id: toastId });
        router.refresh();
      }
    } catch (error) {
      console.error("Delete assessment error:", error);
      toast.error(`An unexpected error occurred.`, { id: toastId });
    } finally {
      setIsProcessing(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, schoolId, router]);
  
  const filteredAssessments = useMemo(() => { /* ... same as before ... */ 
    if (!searchTerm.trim()) return assessments;
    const lowerSearch = searchTerm.toLowerCase();
    return assessments.filter(assessment =>
        assessment.name?.toLowerCase().includes(lowerSearch) ||
        assessment.class?.name?.toLowerCase().includes(lowerSearch) ||
        assessment.subject?.name?.toLowerCase().includes(lowerSearch) ||
        assessment.academicYear?.includes(lowerSearch) ||
        assessment.term?.toLowerCase().includes(lowerSearch)
    );
  }, [assessments, searchTerm]);

  if (!assessments || assessments.length === 0) { /* ... empty state JSX same as before ... */ 
    return (
      <div className="text-center py-10 border rounded-lg bg-card shadow">
        <AssessmentsIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="mt-2 text-xl font-semibold text-foreground">No Assessments Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No assessments have been defined for this school yet.
        </p>
        <div className="mt-6">
          <Link href={`/${schoolId}/schooladmin/academics/grading/assessments/new`} passHref>
            <Button size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              Define First Assessment
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ... Search Input JSX same as before ... */}
      <div className="flex items-center py-4">
        <div className="relative w-full md:w-1/2 lg:w-2/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search assessments (Name, Class, Subject, Year, Term...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
      </div>

      {filteredAssessments.length === 0 && searchTerm ? ( /* ... "No results" JSX same as before ... */ 
         <div className="text-center py-10 border rounded-lg bg-card shadow">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="mt-2 text-xl font-semibold text-foreground">No Assessments Match Your Search</h3>
            <p className="mt-2 text-sm text-muted-foreground">Try different keywords or clear the search.</p>
            <Button variant="outline" onClick={() => setSearchTerm("")} className="mt-4">Clear Search</Button>
          </div>
      ) : (
        <div className="border rounded-lg shadow-sm overflow-x-auto">
          <Table className="min-w-[900px]"> {/* Adjusted min-width for new column */}
            <TableCaption className="sr-only">A list of defined assessments.</TableCaption>
            <TableHeader className="bg-muted/50 dark:bg-muted/30">
              <TableRow>
                <TableHead className="py-3 px-4 min-w-[200px]">Assessment Name</TableHead>
                <TableHead className="py-3 px-4 min-w-[150px]">Class</TableHead>
                <TableHead className="py-3 px-4 min-w-[150px]">Subject</TableHead>
                <TableHead className="py-3 px-4 hidden sm:table-cell min-w-[120px]">Term</TableHead>
                <TableHead className="py-3 px-4 hidden md:table-cell min-w-[120px]">Acad. Year</TableHead>
                <TableHead className="py-3 px-4 hidden lg:table-cell text-right min-w-[100px]">Max Marks</TableHead>
                {/* NEW COLUMN for Grading Progress */}
                <TableHead className="py-3 px-4 text-center min-w-[150px]">Grading Progress</TableHead>
                <TableHead className="py-3 px-4 hidden lg:table-cell min-w-[120px]">Date</TableHead>
                <TableHead className="py-3 px-4 text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssessments.map((assessment) => {
                const totalStudentsInClass = assessment.class?._count?.currentStudents ?? 0;
                const marksEnteredCount = assessment._count?.studentMarks ?? 0;
                return (
                  <TableRow key={assessment.id} className="hover:bg-muted/20 dark:hover:bg-muted/10">
                    <TableCell className="font-medium text-foreground py-3 px-4">{assessment.name}</TableCell>
                    <TableCell className="text-muted-foreground py-3 px-4">{assessment.class?.name || 'N/A'} {assessment.class?.section || ""}</TableCell>
                    <TableCell className="text-muted-foreground py-3 px-4">{assessment.subject?.name || 'N/A'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground py-3 px-4">{assessment.term.replace("_", " ")}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground py-3 px-4">{assessment.academicYear}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground py-3 px-4 text-right">{assessment.maxMarks}</TableCell>
                    {/* Displaying Grading Progress */}
                    <TableCell className="text-muted-foreground py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs">
                          {marksEnteredCount} / {totalStudentsInClass} Marked
                        </span>
                        {totalStudentsInClass > 0 && (
                            <div className="w-20 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                                <div 
                                    className="h-full bg-primary" 
                                    style={{ width: `${(marksEnteredCount / totalStudentsInClass) * 100}%` }}
                                />
                            </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground py-3 px-4">{formatDate(assessment.assessmentDate)}</TableCell>
                    <TableCell className="text-right py-3 px-4">
                      {/* ... (DropdownMenu with actions remains the same) ... */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu for {assessment.name}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/${schoolId}/schooladmin/academics/grading/marks-entry/${assessment.id}`} className="flex items-center w-full cursor-pointer">
                              <FileSignature className="mr-2 h-4 w-4" /> Enter/View Marks
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/${schoolId}/schooladmin/academics/grading/assessments/${assessment.id}/edit`} className="flex items-center w-full cursor-pointer">
                              <Edit3 className="mr-2 h-4 w-4" /> Edit Assessment
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer flex items-center w-full"
                            onClick={() => openDeleteDialog(assessment)}
                            disabled={isProcessing && itemToDelete?.id === assessment.id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Assessment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ... (AlertDialog for Delete Confirmation remains the same) ... */}
      {itemToDelete && itemToDelete.type === 'assessment' && (
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => { if (!open && !isProcessing) setItemToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="text-destructive"/>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the assessment
                <strong className="px-1 font-semibold text-foreground">{itemToDelete?.name}</strong>
                and all associated student marks.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)} disabled={isProcessing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isProcessing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Yes, delete assessment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}