// File: components/schooladmin/GradeScaleForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PlusCircle, Save } from "lucide-react";

import { gradeScaleSchema } from "@/lib/validators/gradeScaleValidators"; // Ensure this path is correct
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch"; // For isActive
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

export default function GradeScaleForm({ schoolId, initialData, onFormSubmit }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!initialData;

  // For GradeScale, create and update schemas are the same (gradeScaleSchema) for its own fields.
  // Entries are managed separately.
  const form = useForm({
    resolver: zodResolver(gradeScaleSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      isActive: false, // Default to inactive for new scales, admin can explicitly activate
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        description: initialData.description || "",
        isActive: typeof initialData.isActive === 'boolean' ? initialData.isActive : false,
      });
    } else {
      form.reset({ name: "", description: "", isActive: false });
    }
  }, [initialData, form]);

  async function onSubmit(values) {
    setIsSubmitting(true);
    const actionVerb = isEditMode ? "Updating" : "Creating";
    const submissionToast = toast.loading(`${actionVerb} grade scale...`);

    const payload = {
      ...values,
      description: values.description === "" ? null : values.description,
    };

    const apiEndpoint = isEditMode
      ? `/api/schooladmin/${schoolId}/academics/grading/scales/${initialData.id}`
      : `/api/schooladmin/${schoolId}/academics/grading/scales`;
    const httpMethod = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || `Failed to ${isEditMode ? 'update' : 'create'} grade scale.`, { id: submissionToast });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in form.control._fields) {
              form.setError(field, { type: "server", message: messages.join(", ") });
            }
          }
        }
      } else {
        toast.success(result.message || `Grade scale ${isEditMode ? 'updated' : 'created'} successfully!`, { id: submissionToast });
        
        if (onFormSubmit) {
          onFormSubmit(result.gradeScale);
        }
        
        if (!isEditMode && result.gradeScale?.id) {
          // On successful creation, redirect to the edit page for this new scale to add entries
          router.push(`/${schoolId}/schooladmin/academics/grading/scales/${result.gradeScale.id}/edit`);
        } else if (isEditMode) {
          router.refresh(); // Refresh current page if it's the edit page itself
        } else {
           router.push(`/${schoolId}/schooladmin/academics/grading/settings`); // Fallback redirect
        }
        // Form reset is handled by useEffect if initialData changes, or manually if needed
        if (!isEditMode) form.reset({ name: "", description: "", isActive: false });

      }
    } catch (error) {
      console.error("Grade scale form submission error:", error);
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
              <FormLabel>Scale Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="e.g., Standard K-12, University Scale" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormDescription>A unique name for this grading scale within the school.</FormDescription>
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
                  placeholder="Briefly describe this grading scale, its purpose, or where it's used."
                  {...field}
                  rows={3}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                <FormLabel className="text-base">Set as Active Scale</FormLabel>
                <FormDescription>
                    If checked, this scale will be the default for new reports. 
                    Activating this scale will deactivate any other currently active scale.
                </FormDescription>
                </div>
                <FormControl>
                <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                    aria-readonly={isSubmitting}
                />
                </FormControl>
            </FormItem>
            )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              isEditMode ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? "Save Scale Changes" : "Create Grade Scale"}
          </Button>
        </div>
      </form>
    </Form>
  );
}