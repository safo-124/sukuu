// File: components/schooladmin/StudentsDataTable.jsx
"use client";

import { useState, useMemo } from "react"; // Added useMemo
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreHorizontal, Edit3, Trash2, Eye, UsersRound, PlusCircle, Loader2, UserX, UserCheck, ShieldAlert, Search // Added Search icon
} from "lucide-react";

import { Input } from "@/components/ui/input"; // Import Input
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

// Helper to format date
const formatDate = (dateString, options = { year: 'numeric', month: 'short', day: 'numeric' }) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn("Invalid date string passed to formatDate:", dateString);
    return "Invalid Date";
  }
  return date.toLocaleDateString('en-US', options);
};

export default function StudentsDataTable({ students, schoolId }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(""); // State for search term
  const [studentToModify, setStudentToModify] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const openActionDialog = (student, action) => {
    setStudentToModify({ ...student, action });
  };

  const handleConfirmAction = async () => {
    if (!studentToModify) return;
    // ... (keep existing handleConfirmAction logic for delete/activate/deactivate) ...
    const { id, firstName, lastName, action } = studentToModify;
    const studentName = `${firstName} ${lastName}`;
    let apiEndpoint = `/api/schooladmin/${schoolId}/students/${id}`;
    let method = 'DELETE'; 
    let successMessage = `Student "${studentName}" ${action}d successfully.`;
    let loadingMessage = `${action === 'delete' ? 'Deleting' : action === 'deactivate' ? 'Deactivating' : 'Activating'} ${studentName}...`;
    let requestBody = {};

    if (action === 'deactivate' || action === 'activate') {
      method = 'PUT'; 
      requestBody = { isActive: action === 'activate' };
      // You'll need a PUT endpoint: /api/schooladmin/[schoolId]/students/[studentId]
      // that accepts { isActive: boolean } in its body.
      // For now, this part of the action won't fully work without that PUT endpoint.
      // If you only have DELETE, then only call this for action === 'delete'.
    }
    
    // For demo, we are only handling delete properly with backend.
    // Activate/Deactivate would need a PUT/PATCH to an API updating `isActive`
    if (action !== 'delete' && action !== 'activate' && action !== 'deactivate') {
        toast.info(`Action "${action}" not yet implemented for ${studentName}.`);
        setStudentToModify(null);
        return;
    }


    setIsProcessing(true);
    const toastId = toast.loading(loadingMessage);

    try {
      const response = await fetch(apiEndpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'DELETE' ? JSON.stringify(requestBody) : undefined,
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || `Failed to ${action} student.`, { id: toastId });
      } else {
        toast.success(result.message || successMessage, { id: toastId });
        router.refresh();
      }
    } catch (error) {
      console.error(`Error during student ${action}:`, error);
      toast.error(`An unexpected error occurred.`, { id: toastId });
    } finally {
      setIsProcessing(false);
      setStudentToModify(null);
    }
  };

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return students.filter((student) =>
      (student.firstName?.toLowerCase().includes(lowercasedSearchTerm)) ||
      (student.lastName?.toLowerCase().includes(lowercasedSearchTerm)) ||
      (student.studentIdNumber?.toLowerCase().includes(lowercasedSearchTerm)) ||
      (student.email?.toLowerCase().includes(lowercasedSearchTerm)) || // Assuming student might have an email directly or via user link
      (student.currentClass?.name?.toLowerCase().includes(lowercasedSearchTerm)) ||
      ((student.currentClass?.name + " " + (student.currentClass?.section || "")).trim().toLowerCase().includes(lowercasedSearchTerm))
    );
  }, [students, searchTerm]);


  if (!students || students.length === 0) { // This checks the original prop
    return (
      <div className="text-center py-10 border rounded-lg bg-card shadow">
        <UsersRound className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="mt-2 text-xl font-semibold text-foreground">No Students Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No students have been enrolled in this school yet.
        </p>
        <div className="mt-6">
          <Link href={`/${schoolId}/schooladmin/students/new`} passHref>
            <Button size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add First Student
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getDialogDescription = () => {
    // ... (keep existing getDialogDescription logic) ...
    if (!studentToModify) return "";
    const studentName = `${studentToModify.firstName} ${studentToModify.lastName}`;
    switch(studentToModify.action) {
      case 'delete':
        return `This action cannot be undone. This will permanently delete the student ${studentName} and all associated records.`;
      case 'deactivate':
        return `This will mark ${studentName} as inactive. They may not appear in active lists or be able to log in (if applicable).`;
      case 'activate':
        return `This will mark ${studentName} as active.`;
      default:
        return "Are you sure?";
    }
  };


  return (
    <>
      {/* Search Input */}
      <div className="flex items-center py-4">
        <div className="relative w-full md:w-1/2 lg:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search students (Name, ID, Class...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredStudents.length === 0 && searchTerm ? (
         <div className="text-center py-10 border rounded-lg bg-card shadow">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="mt-2 text-xl font-semibold text-foreground">No Students Match Your Search</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try different keywords or clear the search to see all students.
            </p>
            <Button variant="outline" onClick={() => setSearchTerm("")} className="mt-4">Clear Search</Button>
          </div>
      ) : (
        <div className="border rounded-lg shadow-sm overflow-x-auto">
            <Table>
            <TableCaption className="sr-only">A list of students in {schoolId}.</TableCaption>
            <TableHeader className="bg-muted/50 dark:bg-muted/30">
              <TableRow>
                <TableHead className="w-[50px] px-2 py-3">Avatar</TableHead>
                <TableHead className="min-w-[150px] py-3 px-4">Name</TableHead>
                <TableHead className="min-w-[120px] py-3 px-4">Student ID</TableHead>
                <TableHead className="hidden md:table-cell min-w-[150px] py-3 px-4">Class</TableHead>
                <TableHead className="hidden sm:table-cell min-w-[100px] py-3 px-4">Gender</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[150px] py-3 px-4">Enrolled On</TableHead>
                <TableHead className="min-w-[100px] py-3 px-4">Status</TableHead>
                <TableHead className="text-right min-w-[100px] py-3 px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} className="hover:bg-muted/20 dark:hover:bg-muted/10">
                  <TableCell className="px-2 py-2">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={student.profilePictureUrl || undefined} alt={`${student.firstName} ${student.lastName}`} />
                      <AvatarFallback>{student.firstName?.[0]}{student.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium text-foreground py-3 px-4">{student.lastName}, {student.firstName} {student.middleName || ''}</TableCell>
                  <TableCell className="text-muted-foreground py-3 px-4">{student.studentIdNumber}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground py-3 px-4">
                    {student.currentClass ? `${student.currentClass.name} ${student.currentClass.section || ''}`.trim() : "N/A"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground py-3 px-4">{student.gender || "N/A"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground py-3 px-4">{formatDate(student.enrollmentDate)}</TableCell>
                  <TableCell className="py-3 px-4">
                    <Badge variant={student.isActive ? "default" : "outline"}
                          className={ student.isActive 
                              ? "border-green-600/50 bg-green-500/10 text-green-700 dark:text-green-400 dark:border-green-500/40 dark:bg-green-500/10" 
                              : "border-slate-600/50 bg-slate-500/10 text-slate-700 dark:text-slate-400 dark:border-slate-500/40 dark:bg-slate-500/10"
                            }>
                      {student.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle student menu for {student.firstName} {student.lastName}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Student Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/${schoolId}/schooladmin/students/${student.id}/view`} className="flex items-center w-full cursor-pointer">
                            <Eye className="mr-2 h-4 w-4" /> View Full Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/${schoolId}/schooladmin/students/${student.id}/edit`} className="flex items-center w-full cursor-pointer">
                            <Edit3 className="mr-2 h-4 w-4" /> Edit Student Info
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {student.isActive ? (
                          <DropdownMenuItem
                            onClick={() => openActionDialog(student, 'deactivate')}
                            className="cursor-pointer flex items-center w-full text-orange-600 focus:text-orange-700 focus:bg-orange-500/10 dark:text-orange-500 dark:focus:text-orange-400"
                            disabled={isProcessing && studentToModify?.id === student.id && studentToModify.action === 'deactivate'}
                          >
                            <UserX className="mr-2 h-4 w-4" /> Deactivate Student
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => openActionDialog(student, 'activate')}
                            className="cursor-pointer flex items-center w-full text-green-600 focus:text-green-700 focus:bg-green-500/10 dark:text-green-500 dark:focus:text-green-400"
                            disabled={isProcessing && studentToModify?.id === student.id && studentToModify.action === 'activate'}
                          >
                            <UserCheck className="mr-2 h-4 w-4" /> Activate Student
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer flex items-center w-full"
                          onClick={() => openActionDialog(student, 'delete')}
                          disabled={isProcessing && studentToModify?.id === student.id && studentToModify.action === 'delete'}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Permanently Delete
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

      {/* Alert Dialog for Actions Confirmation */}
      {studentToModify && (
        <AlertDialog open={!!studentToModify} onOpenChange={(open) => { if (!open && !isProcessing) setStudentToModify(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldAlert className={
                    studentToModify.action === 'delete' ? "text-destructive" : 
                    studentToModify.action === 'deactivate' ? "text-orange-600 dark:text-orange-500" : 
                    "text-green-600 dark:text-green-500"} /> 
                Confirm {studentToModify.action.charAt(0).toUpperCase() + studentToModify.action.slice(1)} Action
              </AlertDialogTitle>
              <AlertDialogDescription>
                {getDialogDescription()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setStudentToModify(null)} disabled={isProcessing}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmAction}
                disabled={isProcessing}
                className={studentToModify.action === 'delete' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : 
                           studentToModify.action === 'deactivate' ? "bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700" :
                           "bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600" }
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Yes, {studentToModify.action} student
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}