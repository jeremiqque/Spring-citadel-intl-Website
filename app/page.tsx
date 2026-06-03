import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import HeroImage from "./components/HeroImage";
import MissionBand from "./components/MissionBand";
import WhyChooseUs from "./components/WhyChooseUs";
import AboutUs from "./components/AboutUs";
import Academics from "./components/Academics";
import Gallery from "./components/Gallery";
import ClosingCTA from "./components/ClosingCTA";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <HeroImage />
      <MissionBand />
      <WhyChooseUs />
      <AboutUs />
      <Academics />
      <Gallery />
      <ClosingCTA />
      <Footer />
    </main>
  );
}
