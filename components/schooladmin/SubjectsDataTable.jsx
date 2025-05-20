// File: components/schooladmin/SubjectsDataTable.jsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreHorizontal, Edit3, Trash2, Eye, Tag as SubjectIcon, PlusCircle, Loader2, ShieldAlert, Search
} from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // If you plan to use badges for something (e.g., subject type)
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

export default function SubjectsDataTable({ subjects, schoolId }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [itemToDelete, setItemToDelete] = useState(null); // { id, name, type: 'subject' }
  const [isProcessing, setIsProcessing] = useState(false);

  const openDeleteDialog = (subject) => {
    setItemToDelete({ id: subject.id, name: subject.name, type: 'subject' });
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || itemToDelete.type !== 'subject') return;

    setIsProcessing(true);
    const toastId = toast.loading(`Deleting subject "${itemToDelete.name}"...`);

    try {
      // API endpoint for deleting a subject
      const response = await fetch(`/api/schooladmin/${schoolId}/academics/subjects/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || `Failed to delete "${itemToDelete.name}".`, { id: toastId });
      } else {
        toast.success(result.message || `Subject "${itemToDelete.name}" deleted successfully.`, { id: toastId });
        router.refresh();
      }
    } catch (error) {
      console.error("Delete subject error:", error);
      toast.error(`An unexpected error occurred.`, { id: toastId });
    } finally {
      setIsProcessing(false);
      setItemToDelete(null);
    }
  };

  const filteredSubjects = useMemo(() => {
    if (!searchTerm) return subjects;
    const lowerSearch = searchTerm.toLowerCase();
    return subjects.filter(subject =>
        subject.name?.toLowerCase().includes(lowerSearch) ||
        subject.code?.toLowerCase().includes(lowerSearch) ||
        subject.description?.toLowerCase().includes(lowerSearch)
    );
  }, [subjects, searchTerm]);

  if (!subjects || subjects.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg bg-card shadow">
        <SubjectIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="mt-2 text-xl font-semibold text-foreground">No Subjects Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No academic subjects have been created for this school yet.
        </p>
        <div className="mt-6">
          <Link href={`/${schoolId}/schooladmin/academics/subjects/new`} passHref>
            <Button size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add First Subject
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center py-4">
        <div className="relative w-full md:w-1/2 lg:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search subjects (Name, Code, Description...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredSubjects.length === 0 && searchTerm ? (
         <div className="text-center py-10 border rounded-lg bg-card shadow">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="mt-2 text-xl font-semibold text-foreground">No Subjects Match Your Search</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try different keywords or clear the search.
            </p>
            <Button variant="outline" onClick={() => setSearchTerm("")} className="mt-4">Clear Search</Button>
          </div>
      ) : (
        <div className="border rounded-lg shadow-sm overflow-x-auto">
          <Table>
            <TableCaption className="sr-only">A list of subjects for school {schoolId}.</TableCaption>
            <TableHeader className="bg-muted/50 dark:bg-muted/30">
              <TableRow>
                <TableHead className="min-w-[200px] py-3 px-4">Subject Name</TableHead>
                <TableHead className="min-w-[100px] py-3 px-4">Code</TableHead>
                <TableHead className="hidden md:table-cell min-w-[300px] py-3 px-4">Description</TableHead>
                <TableHead className="text-right min-w-[100px] py-3 px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.map((subject) => (
                <TableRow key={subject.id} className="hover:bg-muted/20 dark:hover:bg-muted/10">
                  <TableCell className="font-medium text-foreground py-3 px-4">{subject.name}</TableCell>
                  <TableCell className="text-muted-foreground py-3 px-4">{subject.code || "N/A"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground py-3 px-4 truncate max-w-xs">
                    {subject.description || "N/A"}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle subject menu for {subject.name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {/* View Details might not be needed if all info is in table, or simple view */}
                        {/* <DropdownMenuItem asChild>
                           <Link href={`/${schoolId}/schooladmin/academics/subjects/${subject.id}/view`} className="flex items-center w-full cursor-pointer">
                             <Eye className="mr-2 h-4 w-4" /> View Details
                           </Link>
                        </DropdownMenuItem> */}
                        <DropdownMenuItem asChild>
                           <Link href={`/${schoolId}/schooladmin/academics/subjects/${subject.id}/edit`} className="flex items-center w-full cursor-pointer">
                             <Edit3 className="mr-2 h-4 w-4" /> Edit Subject
                           </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer flex items-center w-full"
                          onClick={() => openDeleteDialog(subject)}
                          disabled={isProcessing && itemToDelete?.id === subject.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Subject
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

      {itemToDelete && itemToDelete.type === 'subject' && (
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => { if (!open && !isProcessing) setItemToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldAlert className="text-destructive"/>
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the subject
                <strong className="px-1 font-semibold text-foreground">{itemToDelete?.name}</strong>.
                If this subject is linked to any classes, timetable entries, or grade records, those links might be broken or cause issues depending on database setup.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)} disabled={isProcessing}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isProcessing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Yes, delete subject
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}