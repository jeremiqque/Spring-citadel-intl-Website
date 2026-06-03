import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MarqueeCTA from "../components/MarqueeCTA";
import CtaBand from "../components/about/CtaBand";
import AcademicsHeader from "../components/academics/AcademicsHeader";
import AcademicsMedia from "../components/academics/AcademicsMedia";
import OurClasses from "../components/academics/OurClasses";
import ComingSoon from "../components/academics/ComingSoon";

export const metadata = {
  title: "Academics — Spring Citadel International School",
};

export default function AcademicsPage() {
  return (
    <main>
      <Navbar />
      <AcademicsHeader />
      <AcademicsMedia />
      <OurClasses />
      <ComingSoon />
      <CtaBand />
      <MarqueeCTA />
      <Footer />
    </main>
  );
}
