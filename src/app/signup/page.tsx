'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserDocument } from '@/app/admin/actions';
import { toast } from 'sonner';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create user with Firebase Auth
      console.log("Step 1: Attempting to create user in Firebase Auth...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUserId = userCredential.user.uid;
      console.log(`Step 1 Success: User created in Auth with UID: ${newUserId}`);

      // Step 2: Call server action to create the document in Firestore
      console.log("Step 2: Attempting to call createUserDocument server action...");
      const documentResult = await createUserDocument(newUserId);

      if (!documentResult.success) {
        // If the document creation fails, throw its specific error
        throw new Error(documentResult.error || "Failed to create user document on the server.");
      }
      console.log("Step 2 Success: Server action reported document was created.");

      // Step 3: Success! Show message and redirect.
      toast.success("Welcome!", { description: "Your account has been created successfully." });
      router.push('/dashboard');

    } catch (err: any) {
      console.error("A critical error occurred during sign up:", err);
      // Provide user-friendly error messages
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak. Please use at least 6 characters.';
      } else if (err.message) {
        errorMessage = err.message;
      }
       setError(errorMessage);
       toast.error("Sign Up Failed", { description: errorMessage });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSignUp}>
          <CardHeader>
            <CardTitle className="text-2xl">Create an Account</CardTitle>
            <CardDescription>
              Enter your email below to create your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="underline">
                Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
