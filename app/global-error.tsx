"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[var(--calabash-beige)] px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="font-heading text-2xl text-red-700">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            We&apos;ve been notified and are looking into it.
          </p>
        </div>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
