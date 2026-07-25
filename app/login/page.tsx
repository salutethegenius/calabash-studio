"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn.email({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(signInError.message || "Invalid email or password");
      return;
    }

    window.location.assign("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--calabash-beige)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/calabash-logo.png"
            alt="The Calabash Studio"
            width={120}
            height={120}
            className="mb-4 rounded-full"
            priority
          />
          <h1 className="font-heading text-3xl font-semibold tracking-wide text-[var(--calabash-orange)]">
            CALABASH
          </h1>
          <p className="font-heading text-lg tracking-[0.2em] text-[var(--calabash-dark-green)]">
            STUDIO
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-[var(--calabash-light-green)]/40 bg-white p-8 shadow-sm"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
