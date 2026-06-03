import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MarqueeCTA from "../components/MarqueeCTA";
import AboutHeader from "../components/about/AboutHeader";
import AboutHero from "../components/about/AboutHero";
import MissionVision from "../components/about/MissionVision";
import CoreValues from "../components/about/CoreValues";
import Stakeholders from "../components/about/Stakeholders";
import CtaBand from "../components/about/CtaBand";

export const metadata = {
  title: "About us — Spring Citadel International School",
};

export default function AboutPage() {
  return (
    <main>
      <Navbar />
      <AboutHeader />
      <AboutHero />
      <MissionVision />
      <CoreValues />
      <Stakeholders />
      <CtaBand />
      <MarqueeCTA />
      <Footer />
    </main>
  );
}
