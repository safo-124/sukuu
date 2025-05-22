// File: components/schooladmin/ClassSubjectAssignmentManager.jsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusCircle, Edit3, Trash2, Loader2, Save, ShieldAlert, BookOpen, User } from "lucide-react";

// Import the new dialog-specific schemas
import { 
    addAssignmentDialogFormSchema, 
    editAssignmentDialogFormSchema 
} from "@/lib/validators/classSubjectAssignmentValidators"; // Adjust path
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ClassSubjectAssignmentManager({
  schoolId,
  classId,
  classAcademicYear,
  initialAssignments = [],
  availableSubjects = [],
  availableTeachers = []
}) {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentAssignmentToEdit, setCurrentAssignmentToEdit] = useState(null); 

  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const sortedAssignments = [...initialAssignments].sort((a, b) => 
        a.subject.name.localeCompare(b.subject.name)
    );
    setAssignments(sortedAssignments);
  }, [initialAssignments]);

  // Use a dynamic schema for the form based on mode
  const currentDialogFormSchema = currentAssignmentToEdit 
                               ? editAssignmentDialogFormSchema 
                               : addAssignmentDialogFormSchema;

  const getFormDefaults = useCallback((assignment) => {
    if (assignment) { // Editing
        return {
            subjectId: assignment.subjectId || "", // Should come from assignment for edit
            teacherId: assignment.teacherId || "",
        };
    }
    // Adding new
    return { subjectId: "", teacherId: "" };
  }, []);

  const form = useForm({
    resolver: zodResolver(currentDialogFormSchema), // Use the dialog-specific schema
    defaultValues: getFormDefaults(null),
    // mode: "onChange" // Add this for immediate validation feedback during debugging
  });
  
  // Log form errors for debugging
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
        console.log("Dialog Form Validation Errors:", form.formState.errors);
    }
  }, [form.formState.errors]);

  const handleOpenFormDialog = useCallback((assignment = null) => {
    console.log("handleOpenFormDialog called. Assignment:", assignment);
    setCurrentAssignmentToEdit(assignment);
    form.reset(getFormDefaults(assignment));
    console.log("Setting isFormDialogOpen to true");
    setIsFormDialogOpen(true);
  }, [form, getFormDefaults]);

  const processAssignmentForm = async (values) => {
    console.log("processAssignmentForm called with form values:", values); // Log 1
    setIsSaving(true);
    const actionVerb = currentAssignmentToEdit ? "Updating" : "Adding";
    const toastId = toast.loading(`${actionVerb} subject assignment...`);

    let payload;
    if (currentAssignmentToEdit) {
      // For PUT, API expects only teacherId in payload as per updateClassSubjectAssignmentSchema used in API
      payload = {
        teacherId: values.teacherId === "" ? null : values.teacherId,
      };
    } else {
      // For POST, API expects subjectId, teacherId (optional), academicYear (from context), classId (from context)
      payload = {
        subjectId: values.subjectId,
        teacherId: values.teacherId === "" ? null : values.teacherId,
        academicYear: classAcademicYear, // This comes from props for new assignments
      };
    }
    console.log("API Payload:", payload); // Log 2

    const apiEndpoint = currentAssignmentToEdit
      ? `/api/schooladmin/${schoolId}/academics/classes/${classId}/assignments/${currentAssignmentToEdit.id}`
      : `/api/schooladmin/${schoolId}/academics/classes/${classId}/assignments`;
    const httpMethod = currentAssignmentToEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      console.log("API Response:", result); // Log 3

      if (!response.ok) {
        toast.error(result.error || "Failed to save assignment.", { id: toastId, duration: 5000 });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in form.control._fields) {
              form.setError(field, { type: "server", message: messages.join(", ") });
            } else {
              toast.error(`Error: ${messages.join(", ")}`, {id: toastId, duration: 5000});
            }
          }
        }
      } else {
        toast.success(result.message || "Assignment saved successfully!", { id: toastId });
        setIsFormDialogOpen(false);
        setCurrentAssignmentToEdit(null);
        router.refresh();
      }
    } catch (error) {
      console.error("Assignment submission error:", error);
      toast.error("An unexpected error occurred.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirmation = (assignment) => { /* ... same as before ... */ 
    setAssignmentToDelete({ id: assignment.id, subjectName: assignment.subject.name });
  };
  const handleConfirmDeleteAssignment = async () => { /* ... same as before ... */ 
    if (!assignmentToDelete) return;
    setIsDeleting(true);
    const toastId = toast.loading(`Removing assignment "${assignmentToDelete.subjectName}"...`);
    try {
      const response = await fetch(`/api/schooladmin/${schoolId}/academics/classes/${classId}/assignments/${assignmentToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json(); 
      if (!response.ok) {
        toast.error(result.error || "Failed to remove assignment.", { id: toastId });
      } else {
        toast.success(result.message || "Assignment removed successfully.", { id: toastId });
        router.refresh();
      }
    } catch (err) {
      toast.error("An error occurred while removing the assignment.", { id: toastId });
    } finally {
      setIsDeleting(false);
      setAssignmentToDelete(null);
    }
  };

  // ... (rest of the component: table display, Dialog, AlertDialog JSX)
  // Ensure all FormField components have a <FormMessage /> child.
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenFormDialog(null)} size="sm" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Assign Subject to Class
        </Button>
      </div>

      {assignments.length === 0 ? ( /* ... empty state JSX same as before ... */ 
        <p className="text-sm text-muted-foreground text-center py-4 border rounded-md bg-muted/20 dark:bg-muted/10">
            No subjects have been assigned to this class for {classAcademicYear}.
        </p>
      ) : ( /* ... table JSX same as before ... */ 
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableCaption className="sr-only">Assigned subjects and teachers</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Subject</TableHead>
                <TableHead className="min-w-[200px]">Assigned Teacher</TableHead>
                <TableHead className="hidden sm:table-cell min-w-[150px]">Academic Year</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((asgn) => (
                <TableRow key={asgn.id}>
                  <TableCell className="font-medium">{asgn.subject.name} {asgn.subject.code ? `(${asgn.subject.code})` : ""}</TableCell>
                  <TableCell>
                    {asgn.teacher ? `${asgn.teacher.user.firstName} ${asgn.teacher.user.lastName}` : <span className="text-xs text-muted-foreground italic">Teacher Not Assigned</span>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{asgn.academicYear}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenFormDialog(asgn)} className="mr-1 h-8 w-8" title="Edit Teacher Assignment">
                      <Edit3 className="h-4 w-4" />
                      <span className="sr-only">Edit Assignment for {asgn.subject.name}</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteConfirmation(asgn)} className="text-destructive hover:text-destructive h-8 w-8" title="Remove Subject Assignment">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove Assignment for {asgn.subject.name}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog for Add/Edit Assignment Form */}
      <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
          if (isSaving) return; 
          setIsFormDialogOpen(open);
          if (!open) setCurrentAssignmentToEdit(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentAssignmentToEdit ? "Edit Teacher for Subject" : "Assign Subject to Class"}</DialogTitle>
            <DialogDescription>
              {currentAssignmentToEdit 
                ? `Change the assigned teacher for ${currentAssignmentToEdit.subject.name} in this class for ${currentAssignmentToEdit.academicYear}.`
                : `Select a subject and optionally assign a teacher for this class for the academic year ${classAcademicYear}.`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}> {/* Pass the form instance to ShadCN Form */}
            <form onSubmit={form.handleSubmit(processAssignmentForm)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject <span className="text-destructive">*</span></FormLabel>
                    <Select 
                        onValueChange={field.onChange} 
                        value={field.value} // react-hook-form provides value
                        disabled={isSaving || !!currentAssignmentToEdit || availableSubjects.length === 0}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {availableSubjects.length === 0 ? <SelectItem value="no-subjects-placeholder" disabled>No subjects available</SelectItem> :
                         availableSubjects.map(sub => (<SelectItem key={sub.id} value={sub.id}>{sub.name} {sub.code ? `(${sub.code})` : ""}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    {currentAssignmentToEdit && <FormDescription className="text-xs">Subject cannot be changed. To change, remove and re-add.</FormDescription>}
                    <FormMessage /> {/* Crucial for displaying Zod errors for this field */}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Teacher (Optional)</FormLabel>
                    <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""} // Ensures placeholder shows for null/undefined
                        disabled={isSaving || availableTeachers.length === 0}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a teacher (or leave unassigned)" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {availableTeachers.length === 0 ? <SelectItem value="no-teachers-placeholder" disabled>No teachers available</SelectItem> :
                         availableTeachers.map(teach => (<SelectItem key={teach.id} value={teach.id}>{teach.user.firstName} {teach.user.lastName}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Select placeholder to unassign current teacher.</FormDescription>
                    <FormMessage /> {/* Crucial for displaying Zod errors for this field */}
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {currentAssignmentToEdit ? "Save Teacher" : "Add Assignment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Delete Confirmation - same as before */}
      {assignmentToDelete && (
        <AlertDialog open={!!assignmentToDelete} onOpenChange={(open) => { if (!open && !isDeleting) setAssignmentToDelete(null);}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="text-destructive"/>Confirm Removal</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove the subject <strong className="px-1 font-semibold text-foreground">{assignmentToDelete.subjectName}</strong> from this class? This will unassign the teacher as well if one is linked.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAssignmentToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteAssignment} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Yes, Remove Assignment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}