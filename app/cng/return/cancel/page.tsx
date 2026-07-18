import Image from "next/image";
import Link from "next/link";

export default function CngCancelPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--calabash-beige)] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <Image
          src="/calabash-logo.png"
          alt="The Calabash Studio"
          width={72}
          height={72}
          className="mx-auto mb-4 rounded-full"
        />
        <h1 className="font-heading text-2xl text-[var(--calabash-dark-green)]">
          Payment cancelled
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          No charge was made. You can close this window or return to your
          payment link to try again.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-[var(--calabash-dark-green)] underline"
        >
          Close
        </Link>
      </div>
      <p className="mt-6 text-xs text-slate-500">
        Powered by KemisPay · Payments processed by Cash N&apos; Go
      </p>
    </div>
  );
}
