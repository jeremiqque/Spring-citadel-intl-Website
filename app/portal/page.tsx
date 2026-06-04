import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { PillButton } from "../components/ui";

export const metadata = {
  title: "School Portal — Coming Soon | Spring Citadel International School",
};

export default function PortalPage() {
  return (
    <main>
      <Navbar />

      <section className="side-pad mb-[120px] pt-[100px]">
        <div className="mx-auto max-w-[1320px]">
          {/* Top row: message left, button right */}
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-[14px]">
                <span className="inline-block h-2 w-2 rounded-full bg-[#274ac2]" />
                School Portal
              </span>
              <p className="mt-6 max-w-[44ch] text-[18px] font-medium leading-relaxed opacity-80">
                We&apos;re building the Spring Citadel student &amp; parent
                portal — results, assignments and school updates, all in one
                place. It will be ready soon.
              </p>
            </div>
            <PillButton tone="solid-blue" arrow swap href="/" className="shrink-0 !px-7 !py-4">
              Back to home
            </PillButton>
          </div>

          {/* Massive full-width headline */}
          <h1 className="mt-16 w-full whitespace-nowrap text-left text-[11vw] font-bold leading-[0.9] tracking-tight text-[#274ac2]">
            COMING SOON
          </h1>
        </div>
      </section>

      <Footer />
    </main>
  );
}
