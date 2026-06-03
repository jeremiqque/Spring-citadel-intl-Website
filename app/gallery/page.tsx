import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import GalleryHero from "../components/gallery/GalleryHero";
import GalleryGrid from "../components/gallery/GalleryGrid";

export const metadata = {
  title: "Gallery — Spring Citadel International School",
};

export default function GalleryPage() {
  return (
    <main>
      <Navbar />
      <GalleryHero />
      <GalleryGrid />
      <Footer />
    </main>
  );
}
