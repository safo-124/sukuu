// File: components/schooladmin/SubjectForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PlusCircle, Save } from "lucide-react";

import { subjectSchema, updateSubjectSchema } from "@/lib/validators/subjectValidators"; // Assuming updateSubjectSchema also exists
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

export default function SubjectForm({ schoolId, initialData, onFormSubmit }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!initialData;

  const currentZodSchema = isEditMode ? updateSubjectSchema : subjectSchema;

  const form = useForm({
    resolver: zodResolver(currentZodSchema),
    defaultValues: initialData || {
      name: "",
      code: "",
      description: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
      form.reset({ name: "", code: "", description: "" });
    }
  }, [initialData, form]);

  async function onSubmit(values) {
    setIsSubmitting(true);
    const actionVerb = isEditMode ? "Updating" : "Creating";
    const submissionToast = toast.loading(`${actionVerb} subject...`);

    // Clean optional fields: if empty string, send undefined so Zod's .optional() works as expected
    // or null if your API/Prisma prefers null for empty optional text fields.
    const payload = {
      ...values,
      code: values.code === "" ? undefined : values.code,
      description: values.description === "" ? undefined : values.description,
    };

    const apiEndpoint = isEditMode
      ? `/api/schooladmin/${schoolId}/academics/subjects/${initialData.id}`
      : `/api/schooladmin/${schoolId}/academics/subjects`;
    const httpMethod = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || `Failed to ${isEditMode ? 'update' : 'create'} subject.`, { id: submissionToast });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in form.control._fields) {
              form.setError(field, { type: "server", message: messages.join(", ") });
            } else {
              console.warn(`API error for unmapped field "${field}" or general error`);
            }
          }
        }
      } else {
        toast.success(result.message || `Subject ${isEditMode ? 'updated' : 'created'} successfully!`, { id: submissionToast });
        if (!isEditMode) {
          form.reset({ name: "", code: "", description: "" }); // Reset for create mode
        }
        if (onFormSubmit) {
          onFormSubmit(result.subject);
        }
        router.push(`/${schoolId}/schooladmin/academics/subjects`);
        router.refresh();
      }
    } catch (error) {
      console.error("Subject form submission error:", error);
      toast.error("An unexpected error occurred. Please try again.", { id: submissionToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="e.g., Mathematics, English Language" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormDescription>The official name of the subject.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject Code (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., MATH101, ENG-01" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormDescription>A unique code for the subject, if applicable.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide a brief description of the subject, its objectives, or content overview."
                  {...field}
                  rows={4}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting} size="lg" className="min-w-[180px]">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              isEditMode ? <Save className="mr-2 h-5 w-5" /> : <PlusCircle className="mr-2 h-5 w-5" />
            )}
            {isEditMode ? "Save Subject Changes" : "Create Subject"}
          </Button>
        </div>
      </form>
    </Form>
  );
}