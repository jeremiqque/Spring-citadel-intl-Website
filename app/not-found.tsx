import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { PillButton } from "./components/ui";

export const metadata = {
  title: "404 — Spring Citadel International School",
};

export default function NotFound() {
  return (
    <main>
      <Navbar />

      <section className="side-pad pt-[100px]">
        <div className="mx-auto max-w-[1320px]">
          {/* Top row: message left, button right */}
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <p className="max-w-[44ch] text-[18px] font-medium leading-relaxed opacity-80">
              Sorry, the content you&apos;re looking for doesn&apos;t exist.
              Either it was removed or the link is wrong.
            </p>
            <PillButton tone="solid-blue" arrow swap href="/" className="shrink-0 !px-7 !py-4">
              Back to home with a smile
            </PillButton>
          </div>

          {/* Massive full-width headline */}
          <h1 className="mt-16 w-full whitespace-nowrap text-left text-[15vw] font-bold leading-[0.9] tracking-tight text-[#274ac2]">
            ERROR 404
          </h1>
        </div>
      </section>

      <Footer />
    </main>
  );
}
