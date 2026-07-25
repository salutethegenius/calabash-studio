import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  unknown_order: "We could not find your payment session. Please try again or contact the studio.",
  no_credentials: "Payment provider credentials are not configured.",
  invalid_merchant: "Payment provider credentials are incomplete.",
  generic: "Something went wrong while starting your payment. Please try again or contact the studio.",
};

export default async function CngErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const message = MESSAGES[params.reason ?? "generic"] || MESSAGES.generic;

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
        <h1 className="font-heading text-2xl text-red-700">
          Payment error
        </h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-[var(--calabash-dark-green)] underline"
        >
          Done
        </Link>
      </div>
      <p className="mt-6 text-xs text-slate-500">
        Powered by KemisPay · Payments processed by Cash N&apos; Go
      </p>
    </div>
  );
}
