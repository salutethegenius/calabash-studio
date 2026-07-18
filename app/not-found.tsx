import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--calabash-beige)] px-4">
      <h1 className="font-heading text-3xl text-[var(--calabash-dark-green)]">
        Not found
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        This page or payment link does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm text-[var(--calabash-orange)] underline"
      >
        Go home
      </Link>
    </div>
  );
}
