// File: components/auth/SignInForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn, getCsrfToken } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"; // Added CardFooter

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
  // csrfToken: z.string().min(1, { message: "CSRF token is required." }), // Handled differently
});

export default function SignInForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      // csrfToken: "", // CSRF token will be fetched
    },
  });

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const token = await getCsrfToken();
        if (token) {
          setCsrfToken(token);
          // form.setValue("csrfToken", token); // Not setting in form, passed directly to signIn
        } else {
          setError("Could not retrieve CSRF token. Please refresh the page.");
        }
      } catch (e) {
        console.error("Error fetching CSRF token:", e);
        setError("Error initializing form. Please refresh the page.");
      }
    };
    fetchCsrfToken();
  }, []); // Removed form from dependencies

  const onSubmit = async (values) => {
    setLoading(true);
    setError("");

    if (!csrfToken) {
        setError("CSRF token is missing. Please refresh and try again.");
        setLoading(false);
        return;
    }

    try {
      const result = await signIn("credentials", {
        redirect: false, // Important: handle redirect manually
        email: values.email,
        password: values.password,
        // csrfToken: values.csrfToken, // This is needed for credentials provider POST
        // No need to pass csrfToken in the body if it's automatically handled by NextAuth for POSTs
        // However, for robust custom forms, ensuring it's available or explicitly passed can be good.
        // For signIn, it's usually handled via a hidden input or if the form POSTs to /api/auth/callback/credentials
        // When calling signIn() client-side like this, NextAuth.js handles CSRF for its own flow.
      });

      if (result?.error) {
        setError(result.error === "CredentialsSignin" ? "Invalid email or password." : "An unknown error occurred.");
        console.error("SignIn Error:", result.error);
      } else if (result?.ok && !result.error) {
        const callbackUrl = searchParams.get("callbackUrl") || "/";
        router.push(callbackUrl); // Redirect after successful sign-in
        router.refresh(); // Refresh server components
      } else {
         setError("Login failed. Please try again.");
      }
    } catch (err) {
      console.error("SignIn Exception:", err);
      setError("An unexpected error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription>
          Enter your email below to login to your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Hidden CSRF token field - NextAuth handles this for Credentials provider automatically
                if the form submission is a POST to the right endpoint. When using signIn client-side,
                it's part of the managed flow. If issues arise, this might be needed.
            <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
            */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="m@example.com" {...field} type="email" disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </Form>
      </CardContent>
      {/* Optional CardFooter for links like "Forgot password?"
      <CardFooter>
        <p className="text-xs text-center text-gray-500">
          No account? <a href="/auth/signup" className="font-semibold text-primary hover:underline">Sign up</a>
        </p>
      </CardFooter>
      */}
    </Card>
  );
}