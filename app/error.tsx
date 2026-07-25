"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--calabash-beige)] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="font-heading text-2xl text-red-700">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          We&apos;ve been notified and are looking into it.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-[var(--calabash-orange)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-105"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
