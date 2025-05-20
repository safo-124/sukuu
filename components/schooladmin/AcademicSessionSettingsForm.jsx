// File: components/schooladmin/AcademicSessionSettingsForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { TermPeriod } from "@prisma/client"; // Ensure this is correctly imported if used directly

import { academicSessionSettingsSchema } from "@/lib/validators/schoolSettingsValidators"; // Adjust path
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

const termPeriodOptions = Object.values(TermPeriod);

export default function AcademicSessionSettingsForm({ schoolId, currentSettings }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(academicSessionSettingsSchema),
    defaultValues: {
      currentAcademicYear: currentSettings?.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      currentTerm: currentSettings?.currentTerm || "", // Use empty string for placeholder to show
    },
  });

  useEffect(() => {
    // Reset form when currentSettings prop changes
    if (currentSettings) {
      form.reset({
        currentAcademicYear: currentSettings.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        currentTerm: currentSettings.currentTerm || "", // Use empty string to ensure placeholder shows if null/undefined
      });
    }
  }, [currentSettings, form]);

  async function onSubmit(values) {
    setIsSubmitting(true);
    const submissionToast = toast.loading("Updating academic settings...");

    // If currentTerm is an empty string from the form (meaning "None" or placeholder was showing),
    // send null to the API. Zod schema for currentTerm is optional().nullable().
    const payload = {
        ...values,
        currentTerm: values.currentTerm === "" ? null : values.currentTerm,
    };

    try {
      const response = await fetch(`/api/schooladmin/${schoolId}/academic-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to update settings.", { id: submissionToast });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in form.control._fields) { // Check if field exists in form
              form.setError(field, { type: "server", message: messages.join(", ") });
            }
          }
        }
      } else {
        toast.success(result.message || "Academic settings updated!", { id: submissionToast });
        // Optionally update the form with new currentSettings if API returns them,
        // or router.refresh() will cause parent page to re-fetch.
        form.reset({ // Re-initialize form with successfully saved values
            currentAcademicYear: result.settings?.currentAcademicYear || values.currentAcademicYear,
            currentTerm: result.settings?.currentTerm || values.currentTerm,
        });
        router.refresh(); 
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("An unexpected error occurred.", { id: submissionToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
        <FormField
          control={form.control}
          name="currentAcademicYear"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Academic Year <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="e.g., 2024-2025" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormDescription>Set the primary academic year for operations (Format: YYYY-YYYY).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currentTerm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Term / Semester</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || ""} // This ensures placeholder shows if value is null/undefined
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select current term/semester (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* REMOVED: <SelectItem value=""><em>None (Clear Selection)</em></SelectItem> */}
                  {/* The placeholder above handles the "no selection" state. */}
                  {/* If you want an explicit "None" option that CAN BE SELECTED to clear the value: */}
                  {/* <SelectItem value="CLEAR_TERM_PLACEHOLDER_VALUE">-- No Term Set --</SelectItem> */}
                  {/* Then in onSubmit, if value is CLEAR_TERM_PLACEHOLDER_VALUE, set currentTerm to null. */}
                  {/* For now, not selecting or selecting the placeholder implies clearing. */}
                  {termPeriodOptions.map(term => (
                    <SelectItem key={term} value={term}>
                      {term.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Set the current term or semester within the academic year. Leave unselected if not applicable.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-start pt-2">
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </form>
    </Form>
  );
}