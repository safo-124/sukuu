// File: components/schooladmin/ClassForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PlusCircle, Save } from "lucide-react";

import { createClassSchema } from "@/lib/validators/classValidators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card"; // Assuming page provides Header


export default function ClassForm({ schoolId, initialData, teachersList = [], currentSchoolAcademicYear, onFormSubmit }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!initialData;

  const form = useForm({
    resolver: zodResolver(createClassSchema), // Use updateClassSchema for edits later
    defaultValues: initialData ? {
        ...initialData,
        section: initialData.section || "",
        homeroomTeacherId: initialData.homeroomTeacherId || "",
    } : {
      name: "",
      section: "",
      academicYear: currentSchoolAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      homeroomTeacherId: "",
    },
  });
  
  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        section: initialData.section || "",
        homeroomTeacherId: initialData.homeroomTeacherId || "",
      });
    } else {
        form.reset({
            name: "", section: "",
            academicYear: currentSchoolAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            homeroomTeacherId: "",
        });
    }
  }, [initialData, currentSchoolAcademicYear, form]);


  async function onSubmit(values) {
    setIsSubmitting(true);
    const actionVerb = isEditMode ? "Updating" : "Creating";
    const submissionToast = toast.loading(`${actionVerb} class...`);

    const payload = {
        ...values,
        section: values.section === "" ? null : values.section,
        homeroomTeacherId: values.homeroomTeacherId === "" ? null : values.homeroomTeacherId,
    };

    const apiEndpoint = isEditMode 
      ? `/api/schooladmin/${schoolId}/academics/classes/${initialData.id}` 
      : `/api/schooladmin/${schoolId}/academics/classes`;
    const httpMethod = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || `Failed to ${isEditMode ? 'update' : 'create'} class.`, { id: submissionToast });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            form.setError(field, { type: "server", message: messages.join(", ") });
          }
        }
      } else {
        toast.success(result.message || `Class ${isEditMode ? 'updated' : 'created'} successfully!`, { id: submissionToast });
        if (!isEditMode) form.reset();
        
        if (onFormSubmit) onFormSubmit(result.class);
        
        router.push(`/${schoolId}/schooladmin/academics/classes`);
        router.refresh();
      }
    } catch (error) {
      console.error("Class form submission error:", error);
      toast.error("An unexpected error occurred. Please try again.", { id: submissionToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Class Name <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input placeholder="e.g., Grade 1, Form 1, Class 6" {...field} disabled={isSubmitting} /></FormControl>
              <FormDescription>The main name of the class (e.g., "Primary 1", "JHS 2").</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="section" render={({ field }) => (
            <FormItem>
              <FormLabel>Section (Optional)</FormLabel>
              <FormControl><Input placeholder="e.g., A, B, Blue, Gold" {...field} disabled={isSubmitting} /></FormControl>
              <FormDescription>Optional section identifier (e.g., "A", "Green").</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="academicYear" render={({ field }) => (
          <FormItem>
            <FormLabel>Academic Year <span className="text-destructive">*</span></FormLabel>
            <FormControl><Input placeholder="e.g., 2024-2025" {...field} disabled={isSubmitting} /></FormControl>
            <FormDescription>Format: YYYY-YYYY (e.g., "2024-2025").</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="homeroomTeacherId" render={({ field }) => (
          <FormItem>
            <FormLabel>Homeroom Teacher (Optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ""} disabled={isSubmitting || teachersList.length === 0}>
              <FormControl><SelectTrigger><SelectValue placeholder="Assign a homeroom teacher" /></SelectTrigger></FormControl>
              <SelectContent>
                {teachersList.length === 0 && <SelectItem value="no_teachers" disabled>No teachers available</SelectItem>}
                {teachersList.map(teacher => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.user.firstName} {teacher.user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>Select a teacher to be the primary contact for this class.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting} size="lg" className="min-w-[160px]">
            {isSubmitting ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : (isEditMode ? <Save className="mr-2 h-5 w-5" /> : <PlusCircle className="mr-2 h-5 w-5" />)}
            {isEditMode ? "Save Changes" : "Create Class"}
          </Button>
        </div>
      </form>
    </Form>
  );
}