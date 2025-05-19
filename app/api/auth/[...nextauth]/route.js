// File: app/api/auth/[...nextauth]/route.js

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma"; // Ensure this path is correct for your shared Prisma client
                                 // (e.g., ../../../lib/prisma if not using path aliases or if alias points elsewhere)

// Make sure there is NO other "const prisma = new PrismaClient()" in this file.

export const authOptions = {
  adapter: PrismaAdapter(prisma), // Uses the imported prisma instance
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "john.doe@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials || !credentials.email || !credentials.password) {
          console.error("Authorize: Missing credentials");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            console.warn(`Authorize: No user found with email: ${credentials.email}`);
            return null;
          }

          if (!user.hashedPassword) {
            console.warn(`Authorize: User ${credentials.email} does not have a hashed password.`);
            return null;
          }
          
          const isPasswordCorrect = await bcrypt.compare(
            credentials.password,
            user.hashedPassword
          );

          if (isPasswordCorrect) {
            // Return the user object that NextAuth.js will use
            return {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              // Add any other user properties you want in the session/token
            };
          } else {
            console.warn(`Authorize: Password incorrect for user: ${credentials.email}`);
            return null;
          }
        } catch (error) {
          console.error("Authorize Error:", error);
          return null; // Return null on any error during authorization
        }
      },
    }),
    // You can add other providers here later (e.g., Google, GitHub)
    // Example:
    // import GoogleProvider from "next-auth/providers/google";
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // }),
  ],
  session: {
    strategy: "jwt", // Using JWT for session strategy is common
  },
  callbacks: {
    async jwt({ token, user, account, profile, isNewUser }) {
      // The 'user' object is only passed on initial sign-in or account linking.
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        // token.isActive = user.isActive; // Example: if you need isActive status in token
      }
      return token;
    },
    async session({ session, token, user }) {
      // The 'token' object contains the data from the 'jwt' callback.
      // The 'user' object in this callback refers to the session user, not the DB user directly after initial sign-in.
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        // session.user.isActive = token.isActive; // Example
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",       // Your custom sign-in page
    // signOut: '/auth/signout',  // Optional: custom sign-out page
    // error: '/auth/error',      // Optional: custom error page (e.g., for OAuth errors)
    // verifyRequest: '/auth/verify-request', // Optional: for email provider
    // newUser: '/auth/new-user' // Optional: redirect new OAuth users to a specific page
  },
  secret: process.env.AUTH_SECRET, // Essential for signing JWTs
  debug: process.env.NODE_ENV === "development", // Enables debug messages in development
  // events: { // Optional: for logging or custom actions on auth events
  //   async signIn(message) { console.log("Sign In Event:", message); },
  //   async signOut(message) { console.log("Sign Out Event:", message); },
  //   async createUser(message) { console.log("Create User Event:", message); },
  //   async updateUser(message) { console.log("Update User Event:", message); },
  //   async linkAccount(message) { console.log("Link Account Event:", message); },
  //   async session(message) { console.log("Session Event:", message); }
  // },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };