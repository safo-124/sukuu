// File: components/auth/SignInForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn, getCsrfToken } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner"; // Import toast from sonner
import { Loader2 } from "lucide-react"; // For loading spinner in button

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  // CardFooter, // We can add this later if needed
} from "@/components/ui/card";
import Image from 'next/image'; // For a logo (optional)

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

export default function SignInForm() {
  // No direct error state needed in the component, toast will handle it.
  // const [error, setError] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState(""); // Still needed for potential direct POST, though signIn() handles it
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    // Fetch CSRF token, good practice although signIn client call often manages this flow.
    const fetchCsrfToken = async () => {
      try {
        const token = await getCsrfToken();
        if (token) setCsrfToken(token);
      } catch (e) {
        console.error("Error fetching CSRF token:", e);
        toast.error("Security token error. Please refresh.");
      }
    };
    fetchCsrfToken();
  }, []);

  const onSubmit = async (values) => {
    setLoading(true);
    // setError(""); // Replaced by toast

    // A basic check for CSRF token, though typically handled by signIn flow
    if (!csrfToken && process.env.NODE_ENV === 'production') { // More critical in prod
        toast.error("Security validation failed. Please refresh and try again.");
        setLoading(false);
        return;
    }

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: values.email,
        password: values.password,
        // No need to explicitly pass csrfToken here, signIn client-side handles its required flow.
      });

      if (result?.error) {
        toast.error(result.error === "CredentialsSignin" ? "Invalid email or password." : "Login failed. Please try again.");
        console.error("SignIn Error:", result.error, result.status);
      } else if (result?.ok && !result.error) {
        toast.success("Signed in successfully! Redirecting...");
        const callbackUrl = searchParams.get("callbackUrl") || "/";
        router.push(callbackUrl);
        router.refresh(); // Important to re-fetch server components and update session state visibility
      } else {
        toast.error("Login failed. An unexpected error occurred.");
      }
    } catch (err) {
      console.error("SignIn System Exception:", err);
      toast.error("A system error occurred during sign in. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl"> {/* Added shadow */}
      <CardHeader className="space-y-1 text-center"> {/* Centered header */}
        {/* Optional: Logo Placeholder */}
        {/* <Image src="/logo-placeholder.svg" alt="Sukuu Logo" width={80} height={80} className="mx-auto mb-4" /> */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary mb-4">
            <span className="text-3xl font-bold text-primary-foreground">S</span> {/* Simple initial logo */}
        </div>
        <CardTitle className="text-3xl font-bold tracking-tight">Welcome Back!</CardTitle>
        <CardDescription>
          Sign in to access your school management dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6"> {/* Increased space */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="you@example.com" 
                      {...field} 
                      type="email" 
                      disabled={loading} 
                      className="h-12 text-base px-4" // Larger input
                    />
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
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm font-medium">Password</FormLabel>
                    {/* <Link href="/auth/forgot-password" passHref>
                      <a className="text-xs text-primary hover:underline">Forgot password?</a>
                    </Link> */}
                  </div>
                  <FormControl>
                    <Input 
                      type="password" 
                      {...field} 
                      disabled={loading} 
                      placeholder="••••••••"
                      className="h-12 text-base px-4" // Larger input
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In Securely"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      {/* Example of a CardFooter if you want to add a sign-up link later
      <CardFooter className="flex flex-col items-center space-y-2 pt-6">
        <p className="text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="font-medium text-primary hover:underline">
            Register here
          </Link>
        </p>
      </CardFooter>
      */}
    </Card>
  );
}