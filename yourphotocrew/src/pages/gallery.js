import Footer from "@/components/Footer";
import GalleryPage from "@/components/gallery/GalleryPage";
import Navbar from "@/components/Navbar";
import WhatsAppButton from "@/components/WhatsAppButton";

const gallery = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <GalleryPage />
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default gallery;