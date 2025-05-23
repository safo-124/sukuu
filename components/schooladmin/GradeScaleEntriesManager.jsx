// File: components/schooladmin/GradeScaleEntriesManager.jsx
"use client";

// ... (imports and other functions like useState, useEffect, useForm, handleOpenFormDialog etc.) ...
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusCircle, Edit3, Trash2, Loader2, Save, ShieldAlert } from "lucide-react";

import { gradeScaleEntrySchema } from "@/lib/validators/gradeScaleValidators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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


export default function GradeScaleEntriesManager({ schoolId, scaleId, initialEntries = [] }) {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentEntryToEdit, setCurrentEntryToEdit] = useState(null); 

  const [entryToDelete, setEntryToDelete] = useState(null); 
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);


  useEffect(() => {
    const sortedEntries = [...initialEntries].sort((a, b) => b.maxPercentage - a.minPercentage);
    setEntries(sortedEntries);
  }, [initialEntries]);

  const form = useForm({ /* ... same form setup ... */ 
    resolver: zodResolver(gradeScaleEntrySchema),
    defaultValues: { minPercentage: "", maxPercentage: "", gradeLetter: "", gradePoint: "", remark: "" },
  });

  const getFormDefaults = useCallback((entry) => { /* ... same as before ... */ 
    if (entry) {
      return {
        minPercentage: entry.minPercentage?.toString() || "",
        maxPercentage: entry.maxPercentage?.toString() || "",
        gradeLetter: entry.gradeLetter || "",
        gradePoint: entry.gradePoint?.toString() || "",
        remark: entry.remark || "",
      };
    }
    return { minPercentage: "", maxPercentage: "", gradeLetter: "", gradePoint: "", remark: "" };
  }, []);

  const handleOpenFormDialog = useCallback((entry = null) => { /* ... same as before ... */ 
    setCurrentEntryToEdit(entry);
    form.reset(getFormDefaults(entry));
    setIsFormDialogOpen(true);
  }, [form, getFormDefaults]);


  const processEntryForm = async (values) => {
    setIsSavingEntry(true);
    const actionVerb = currentEntryToEdit ? "Updating" : "Adding";
    const toastId = toast.loading(`${actionVerb} grade entry...`);

    const payload = { /* ... same payload prep ... */ 
      minPercentage: parseFloat(values.minPercentage),
      maxPercentage: parseFloat(values.maxPercentage),
      gradeLetter: values.gradeLetter,
      gradePoint: (values.gradePoint === "" || values.gradePoint === null || values.gradePoint === undefined) ? null : parseFloat(values.gradePoint),
      remark: values.remark === "" ? null : values.remark,
    };

    const apiEndpoint = currentEntryToEdit
      ? `/api/schooladmin/${schoolId}/academics/grading/scales/${scaleId}/entries/${currentEntryToEdit.id}`
      : `/api/schooladmin/${schoolId}/academics/grading/scales/${scaleId}/entries`;
    const httpMethod = currentEntryToEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiEndpoint, { /* ... fetch options ... */ 
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) { /* ... error handling same as before ... */ 
        toast.error(result.error || "Failed to save grade entry.", { id: toastId });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in form.control._fields) {
              form.setError(field, { type: "server", message: messages.join(", ") });
            } else {
              toast.error(messages.join(", "), { id: toastId, duration: 5000});
            }
          }
        }
      } else {
        toast.success(result.message || "Grade entry saved successfully!", { id: toastId });
        setIsFormDialogOpen(false);
        setCurrentEntryToEdit(null);
        // Instead of just router.refresh(), navigate to assessments page:
        router.push(`/${schoolId}/schooladmin/academics/grading/assessments`);
        // router.refresh(); // Parent page will refresh if needed.
      }
    } catch (error) { /* ... error handling same as before ... */ 
      console.error("Grade entry submission error:", error);
      toast.error("An unexpected error occurred.", { id: toastId });
    } finally {
      setIsSavingEntry(false);
    }
  };
  
  const handleConfirmDeleteEntry = async () => {
    if (!entryToDelete) return;
    setIsDeletingEntry(true);
    const toastId = toast.loading(`Deleting entry "${entryToDelete.gradeLetter}"...`);

    try {
      const response = await fetch(`/api/schooladmin/${schoolId}/academics/grading/scales/${scaleId}/entries/${entryToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok) { /* ... error handling same as before ... */ 
        toast.error(result.error || "Failed to delete entry.", { id: toastId });
      } else {
        toast.success(result.message || "Entry deleted successfully.", { id: toastId });
        // Instead of just router.refresh() or local state update:
        router.push(`/${schoolId}/schooladmin/academics/grading/assessments`);
        // setEntries(prev => prev.filter(e => e.id !== entryToDelete.id)); // Local update is fine if not redirecting
        // router.refresh(); 
      }
    } catch (error) { /* ... error handling same as before ... */ 
      console.error("Delete entry error:", error);
      toast.error("An unexpected error occurred.", { id: toastId });
    } finally {
      setIsDeletingEntry(false);
      setEntryToDelete(null);
    }
  };

  // ... (JSX for table, dialogs, etc. remains the same as the last complete version)
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenFormDialog(null)} size="sm" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Grade Entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 border rounded-md bg-muted/20 dark:bg-muted/10">
            No grade entries defined for this scale yet.
        </p>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableCaption className="sr-only">Grade scale entries</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center w-[100px]">Min %</TableHead>
                <TableHead className="text-center w-[100px]">Max %</TableHead>
                <TableHead className="w-[120px]">Grade Letter</TableHead>
                <TableHead className="text-center w-[120px]">Grade Point</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-center font-medium">{entry.minPercentage.toFixed(2)}%</TableCell>
                  <TableCell className="text-center font-medium">{entry.maxPercentage.toFixed(2)}%</TableCell>
                  <TableCell className="font-semibold">{entry.gradeLetter}</TableCell>
                  <TableCell className="text-center">{entry.gradePoint ?? "N/A"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate" title={entry.remark || ""}>{entry.remark || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenFormDialog(entry)} className="mr-1 h-8 w-8"><Edit3 className="h-4 w-4" /><span className="sr-only">Edit</span></Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteConfirmationDialog(entry)} className="text-destructive hover:text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isFormDialogOpen} onOpenChange={(open) => { if (!isSavingEntry) { setIsFormDialogOpen(open); if (!open) setCurrentEntryToEdit(null); }}}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{currentEntryToEdit ? "Edit Grade Entry" : "Add New Grade Entry"}</DialogTitle>
            <DialogDescription>{currentEntryToEdit ? "Modify details." : "Define a new grade range."}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(processEntryForm)} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="minPercentage" render={({ field }) => (<FormItem><FormLabel>Min % <span className="text-destructive">*</span></FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 90.00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="maxPercentage" render={({ field }) => (<FormItem><FormLabel>Max % <span className="text-destructive">*</span></FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 100.00" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="gradeLetter" render={({ field }) => (<FormItem><FormLabel>Grade Letter <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., A+" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="gradePoint" render={({ field }) => (<FormItem><FormLabel>Grade Point (Optional)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 4.0" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="remark" render={({ field }) => (<FormItem><FormLabel>Remark (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Excellent" {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="outline" disabled={isSavingEntry}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSavingEntry}>{isSavingEntry ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{currentEntryToEdit ? "Save Changes" : "Add Entry"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {entryToDelete && ( <AlertDialog open={!!entryToDelete} onOpenChange={(open) => {if (!isDeletingEntry) setEntryToDelete(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="text-destructive"/>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete grade entry: <strong className="px-1 font-semibold">{entryToDelete.gradeLetter}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setEntryToDelete(null)} disabled={isDeletingEntry}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteEntry} disabled={isDeletingEntry} className="bg-destructive hover:bg-destructive/90">{isDeletingEntry ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}Yes, delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
    </div>
  );
}