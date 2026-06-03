import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MarqueeCTA from "../components/MarqueeCTA";
import CtaBand from "../components/about/CtaBand";
import ContactSection from "../components/gallery/ContactSection";
import ContactHero from "../components/contact/ContactHero";
import MapSection from "../components/contact/MapSection";
import ProgrammesBand from "../components/contact/ProgrammesBand";
import Testimonials from "../components/contact/Testimonials";

export const metadata = {
  title: "Contact us — Spring Citadel International School",
};

export default function ContactPage() {
  return (
    <main>
      <Navbar />
      <ContactHero />
      <ContactSection subtitle="We're here to answer your questions, offer support, and guide you on your journey." />
      <MapSection />
      <ProgrammesBand />
      <Testimonials />
      <CtaBand />
      <MarqueeCTA />
      <Footer />
    </main>
  );
}
