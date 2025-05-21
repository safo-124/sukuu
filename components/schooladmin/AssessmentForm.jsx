// File: components/schooladmin/AssessmentForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PlusCircle, Save, CalendarIcon } from "lucide-react";
import { format } from 'date-fns/format';
import { TermPeriod } from "@prisma/client"; // Ensure this is correctly imported

import { createAssessmentSchema, updateAssessmentSchema } from "@/lib/validators/assessmentValidators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const termPeriodOptions = Object.values(TermPeriod);

export default function AssessmentForm({
  schoolId,
  initialData, // For edit mode
  classesList = [],
  subjectsList = [],
  currentSchoolAcademicYear,
  currentSchoolTerm,
  onFormSubmit
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!initialData;

  const currentZodSchema = isEditMode ? updateAssessmentSchema : createAssessmentSchema;

  const getFormDefaultValues = (data) => {
    const createDefaults = {
      name: "",
      classId: "", // Empty string will show placeholder
      subjectId: "", // Empty string will show placeholder
      academicYear: currentSchoolAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      term: currentSchoolTerm || "", // Empty string will show placeholder
      maxMarks: "",
      assessmentDate: format(new Date(), "yyyy-MM-dd"),
      description: "",
    };
    if (!data) return createDefaults;

    return { // Edit mode
        ...data,
        assessmentDate: data.assessmentDate ? format(new Date(data.assessmentDate), "yyyy-MM-dd") : "",
        maxMarks: data.maxMarks?.toString() || "",
        classId: data.classId || "",
        subjectId: data.subjectId || "",
        term: data.term || currentSchoolTerm || "", // Fallback to current school term if not set
        academicYear: data.academicYear || currentSchoolAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    };
  };

  const form = useForm({
    resolver: zodResolver(currentZodSchema),
    defaultValues: getFormDefaultValues(initialData),
  });

  useEffect(() => {
    form.reset(getFormDefaultValues(initialData));
  }, [initialData, currentSchoolAcademicYear, currentSchoolTerm, form]);

  async function onSubmit(values) {
    setIsSubmitting(true);
    const actionVerb = isEditMode ? "Updating" : "Defining";
    const submissionToast = toast.loading(`${actionVerb} assessment...`);

    const payload = {
      ...values,
      maxMarks: parseFloat(values.maxMarks),
      description: values.description === "" ? null : values.description,
      // Ensure select values that mean "no selection" are converted to null for API/Prisma
      classId: values.classId === "" ? null : values.classId,
      subjectId: values.subjectId === "" ? null : values.subjectId,
      term: values.term === "" ? null : values.term,
    };
     if (!payload.classId) { // Zod schema requires classId
        form.setError("classId", { type: "manual", message: "Class selection is required." });
        toast.error("Validation failed: Class selection is required.", { id: submissionToast });
        setIsSubmitting(false);
        return;
    }
    if (!payload.subjectId) { // Zod schema requires subjectId
        form.setError("subjectId", { type: "manual", message: "Subject selection is required." });
        toast.error("Validation failed: Subject selection is required.", { id: submissionToast });
        setIsSubmitting(false);
        return;
    }
    if (!payload.term && createAssessmentSchema.shape.term) { // Zod schema requires term
        form.setError("term", { type: "manual", message: "Term selection is required." });
        toast.error("Validation failed: Term selection is required.", { id: submissionToast });
        setIsSubmitting(false);
        return;
    }


    const apiEndpoint = isEditMode
      ? `/api/schooladmin/${schoolId}/academics/assessments/${initialData.id}`
      : `/api/schooladmin/${schoolId}/academics/assessments`;
    const httpMethod = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || `Failed to ${isEditMode ? 'update' : 'define'} assessment.`, { id: submissionToast });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in form.control._fields) {
              form.setError(field, { type: "server", message: messages.join(", ") });
            }
          }
        }
      } else {
        toast.success(result.message || `Assessment ${isEditMode ? 'updated' : 'defined'} successfully!`, { id: submissionToast });
        if (!isEditMode) form.reset(getFormDefaultValues(null));
        if (onFormSubmit) onFormSubmit(result.assessment);
        router.push(`/${schoolId}/schooladmin/academics/grading/assessments`);
        router.refresh();
      }
    } catch (error) {
      console.error("Assessment form submission error:", error);
      toast.error("An unexpected error occurred.", { id: submissionToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Assessment Name <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Mid-Term Maths Test, English Essay" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="classId" render={({ field }) => (
            <FormItem>
              <FormLabel>For Class <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isSubmitting || classesList.length === 0}>
                <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select a class" /></SelectTrigger></FormControl>
                <SelectContent>
                  {classesList.length === 0 ? (<SelectItem value="no-classes-placeholder" disabled>No classes available</SelectItem>) :
                   (classesList.map(cls => (<SelectItem key={cls.id} value={cls.id}>{cls.name} {cls.section || ""}</SelectItem>)))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="subjectId" render={({ field }) => (
            <FormItem>
              <FormLabel>For Subject <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isSubmitting || subjectsList.length === 0}>
                <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select a subject" /></SelectTrigger></FormControl>
                <SelectContent>
                  {subjectsList.length === 0 ? (<SelectItem value="no-subjects-placeholder" disabled>No subjects available</SelectItem>) :
                   (subjectsList.map(sub => (<SelectItem key={sub.id} value={sub.id}>{sub.name} {sub.code ? `(${sub.code})` : ""}</SelectItem>)))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="academicYear" render={({ field }) => (<FormItem><FormLabel>Academic Year <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., 2024-2025" {...field} disabled={isSubmitting} /></FormControl><FormDescription>Format:<Input placeholder="e.g., 2024-2025" {...field} disabled={isSubmitting} />YYYY-YYYY</FormDescription><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="term" render={({ field }) => (
            <FormItem>
              <FormLabel>Term / Semester <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isSubmitting}>
                <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select term" /></SelectTrigger></FormControl>
                <SelectContent>{termPeriodOptions.map(t => (<SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>))}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="maxMarks" render={({ field }) => (<FormItem><FormLabel>Maximum Marks <span className="text-destructive">*</span></FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 100 or 50.5" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="assessmentDate" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Assessment Date <span className="text-destructive">*</span></FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={"outline"} className={cn("h-10 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 1} toYear={new Date().getFullYear() + 1} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Brief details about the assessment, topics covered, etc." {...field} rows={3} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)} />
        
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting} size="lg" className="min-w-[200px]">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditMode ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />)}
            {isEditMode ? "Save Assessment Changes" : "Define Assessment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}