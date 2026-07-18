import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Product Demo — The Calabash Studio",
  description: "Walkthrough of The Calabash Studio payment experience.",
};

const VIDEO_SRC = "/calabash-demo.mp4";

export default function DemoPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--calabash-beige)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--calabash-light-green) 45%, transparent), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, color-mix(in srgb, var(--calabash-orange) 12%, transparent), transparent)",
        }}
      />

      <main className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 flex flex-col items-center text-center sm:mb-10">
          <Image
            src="/calabash-logo.png"
            alt="The Calabash Studio"
            width={88}
            height={88}
            className="mb-4 rounded-full"
            priority
          />
          <p className="font-heading text-3xl font-semibold tracking-wide text-[var(--calabash-orange)] sm:text-4xl">
            CALABASH
          </p>
          <p className="font-heading text-base tracking-[0.25em] text-[var(--calabash-dark-green)] sm:text-lg">
            STUDIO
          </p>
          <h1 className="mt-5 font-heading text-2xl font-medium text-[var(--calabash-dark-green)] sm:text-3xl">
            Product demo
          </h1>
          <p className="dash-muted mt-2 max-w-md font-body text-sm sm:text-base">
            A short walkthrough of the payment experience.
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl bg-[var(--calabash-dark-green)] shadow-[0_24px_60px_-28px_rgba(18,73,64,0.55)] ring-1 ring-[var(--calabash-light-green)]/35">
          <video
            className="aspect-video w-full bg-black"
            controls
            playsInline
            preload="metadata"
          >
            <source src={VIDEO_SRC} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8">
          <a
            href={VIDEO_SRC}
            download="calabash-demo.mp4"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--calabash-orange)] px-5 py-2.5 font-body text-sm font-medium text-white transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--calabash-dark-green)]"
          >
            Download video
          </a>
          <p className="dash-muted font-body text-xs">
            Or open the file directly:{" "}
            <a
              href={VIDEO_SRC}
              className="underline decoration-[var(--calabash-light-green)] underline-offset-2 hover:text-[var(--calabash-dark-green)]"
            >
              calabash-demo.mp4
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
