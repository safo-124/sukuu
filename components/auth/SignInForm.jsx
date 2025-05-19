// File: components/auth/SignInForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn, getCsrfToken } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react"; // Changed icon to LogIn

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
} from "@/components/ui/card";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

export default function SignInForm() {
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState(""); // Still good practice
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
    const fetchCsrfToken = async () => {
      try {
        const token = await getCsrfToken();
        if (token) setCsrfToken(token);
      } catch (e) {
        console.error("Error fetching CSRF token:", e);
      }
    };
    fetchCsrfToken();
  }, []);

  const onSubmit = async (values) => {
    setLoading(true);
    if (!csrfToken && process.env.NODE_ENV === 'production') {
        toast.error("Security validation failed. Please refresh.");
        setLoading(false);
        return;
    }
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: values.email,
        password: values.password,
      });
      if (result?.error) {
        toast.error(result.error === "CredentialsSignin" ? "Invalid email or password." : "Login failed.");
      } else if (result?.ok && !result.error) {
        toast.success("Signed in successfully! Redirecting...");
        const callbackUrl = searchParams.get("callbackUrl") || "/";
        router.push(callbackUrl);
        router.refresh();
      } else {
        toast.error("Login failed. An unexpected error occurred.");
      }
    } catch (err) {
      console.error("SignIn System Exception:", err);
      toast.error("A system error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md
                   bg-card/60 dark:bg-card/30  
                   backdrop-blur-lg 
                   border border-border/50 dark:border-border/30
                   rounded-xl
                   shadow-2xl
                   text-card-foreground 
                   ">
      <CardHeader className="space-y-2 text-center pt-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full 
                        bg-primary/80 dark:bg-primary/70 
                        text-primary-foreground 
                        border border-border/50 dark:border-border/30 backdrop-blur-sm mb-4">
          <LogIn className="h-8 w-8" /> {/* Changed Icon */}
        </div>
        <CardTitle className="text-3xl font-bold tracking-tight text-foreground"> {/* Use theme's foreground text */}
          Secure Login
        </CardTitle>
        <CardDescription className="text-muted-foreground"> {/* Use theme's muted text */}
          Access your Sukuu Management dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8 pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/90">Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="you@example.com" 
                      {...field} 
                      type="email" 
                      disabled={loading} 
                      className="h-12 text-base px-4 
                                 bg-background/50 dark:bg-background/30 
                                 border-border/70 dark:border-border/50 
                                 placeholder:text-muted-foreground 
                                 text-foreground
                                 focus-visible:ring-primary/80"
                    />
                  </FormControl>
                  <FormMessage /> {/* Uses themed destructive color by default */}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/90">Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      {...field} 
                      disabled={loading} 
                      placeholder="••••••••"
                      className="h-12 text-base px-4
                                 bg-background/50 dark:bg-background/30
                                 border-border/70 dark:border-border/50
                                 placeholder:text-muted-foreground
                                 text-foreground
                                 focus-visible:ring-primary/80"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold" // Primary button style from shadcn should be theme-aware
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In Securely"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}