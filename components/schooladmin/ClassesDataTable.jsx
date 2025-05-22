// File: components/schooladmin/ClassesDataTable.jsx
"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreHorizontal, Edit3, Trash2, Eye, UsersRound, PlusCircle, BookCopy as ClassesIcon, Loader2, ShieldAlert, Search, BookOpen
} from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function ClassesDataTable({ classes = [], schoolId }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const openDeleteDialog = useCallback((classItem) => {
    setItemToDelete({ 
        id: classItem.id, 
        name: `${classItem.name} ${classItem.section || ''}`.trim(), 
        type: 'class' 
    });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete || itemToDelete.type !== 'class') return;
    setIsProcessing(true);
    const toastId = toast.loading(`Deleting class "${itemToDelete.name}"...`);
    try {
      const response = await fetch(`/api/schooladmin/${schoolId}/academics/classes/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || `Failed to delete "${itemToDelete.name}".`, { id: toastId, duration: 5000 });
      } else {
        toast.success(result.message || `Class "${itemToDelete.name}" deleted successfully.`, { id: toastId });
        router.refresh();
      }
    } catch (error) {
      console.error("Delete class error:", error);
      toast.error(`An unexpected error occurred while deleting "${itemToDelete.name}".`, { id: toastId });
    } finally {
      setIsProcessing(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, schoolId, router]);
  
  const filteredClasses = useMemo(() => {
    if (!searchTerm.trim()) return classes;
    const lowerSearch = searchTerm.toLowerCase();
    return classes.filter(cls => 
        cls.name?.toLowerCase().includes(lowerSearch) ||
        cls.section?.toLowerCase().includes(lowerSearch) ||
        cls.academicYear?.toLowerCase().includes(lowerSearch) ||
        (cls.homeroomTeacher?.user && `${cls.homeroomTeacher.user.firstName} ${cls.homeroomTeacher.user.lastName}`.toLowerCase().includes(lowerSearch))
    );
  }, [classes, searchTerm]);

  if (!classes || classes.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg bg-card shadow">
        <ClassesIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="mt-2 text-xl font-semibold text-foreground">No Classes Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No classes have been created for this school or selected academic year yet.
        </p>
        <div className="mt-6">
          <Link href={`/${schoolId}/schooladmin/academics/classes/new`} passHref>
            <Button size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add First Class
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center py-4">
        <div className="relative w-full md:w-2/3 lg:w-1/2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search classes (Name, Section, Year, Teacher...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
      </div>

      {filteredClasses.length === 0 && searchTerm ? (
         <div className="text-center py-10 border rounded-lg bg-card shadow">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="mt-2 text-xl font-semibold text-foreground">No Classes Match Your Search</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try different keywords or clear the search.
            </p>
            <Button variant="outline" onClick={() => setSearchTerm("")} className="mt-4">Clear Search</Button>
          </div>
      ) : (
        <div className="border rounded-lg shadow-sm overflow-x-auto">
          {/* Ensure no whitespace text nodes are direct children of <Table> */}
          <Table className="min-w-[800px]">
            <TableCaption className="sr-only">A list of classes for school {schoolId}.</TableCaption>
            <TableHeader className="bg-muted/50 dark:bg-muted/30">
              <TableRow>
                <TableHead className="py-3 px-4">Class Name</TableHead>
                <TableHead className="py-3 px-4">Section</TableHead>
                <TableHead className="py-3 px-4">Academic Year</TableHead>
                <TableHead className="hidden md:table-cell py-3 px-4">Homeroom Teacher</TableHead>
                <TableHead className="hidden sm:table-cell py-3 px-4 text-center">Student Count</TableHead>
                <TableHead className="text-right py-3 px-4 w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.map((cls) => (
                <TableRow key={cls.id} className="hover:bg-muted/20 dark:hover:bg-muted/10">
                  <TableCell className="font-medium text-foreground py-3 px-4">{cls.name}</TableCell>
                  <TableCell className="text-muted-foreground py-3 px-4">{cls.section || "N/A"}</TableCell>
                  <TableCell className="text-muted-foreground py-3 px-4">{cls.academicYear}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground py-3 px-4">
                    {cls.homeroomTeacher?.user ? `${cls.homeroomTeacher.user.firstName} ${cls.homeroomTeacher.user.lastName}` : <span className="italic text-xs">N/A</span>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground py-3 px-4 text-center">
                    {cls._count?.currentStudents ?? 0}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle class menu for {cls.name} {cls.section || ""}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Class Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                           <Link href={`/${schoolId}/schooladmin/academics/classes/${cls.id}/view`} className="flex items-center w-full cursor-pointer">
                             <Eye className="mr-2 h-4 w-4" /> View Details
                           </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <Link href={`/${schoolId}/schooladmin/academics/classes/${cls.id}/edit`} className="flex items-center w-full cursor-pointer">
                             <BookOpen className="mr-2 h-4 w-4" /> Configure Class (Edit / Assign Subjects)
                           </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer flex items-center w-full"
                          onClick={() => openDeleteDialog(cls)}
                          disabled={isProcessing && itemToDelete?.id === cls.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Class
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {itemToDelete && itemToDelete.type === 'class' && (
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => { if (!open && !isProcessing) setItemToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="text-destructive"/>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the class
                <strong className="px-1 font-semibold text-foreground">{itemToDelete?.name}</strong>.
                Associated student enrollments and other related data might be affected or become orphaned depending on database rules.
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
                Yes, delete class
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}