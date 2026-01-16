import React from "react";
import { GalleryImage } from "./GalleryImage";
import { GalleryHeader } from "./GalleryHeader";

export const ImageGrid: React.FC = () => {
  return (
    <section className="image-grid-container max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="gallery-header mb-20 text-center">
        <GalleryHeader />
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {/* Row 1 */}
        <div className="gallery-image-wrapper col-span-1 md:col-span-2 lg:col-span-2">
          <GalleryImage
            src="assets/services/gallerysection/imagegrid/image.jpg"
            className="gallery-image rounded-2xl shadow-lg hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="gallery-image-wrapper col-span-1">
          <GalleryImage
            src="assets/services/gallerysection/imagegrid/image-6.jpg"
            className="gallery-image rounded-2xl shadow-lg hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="gallery-image-wrapper col-span-1">
          <GalleryImage
            src="assets/services/gallerysection/imagegrid/image-2.jpg"
            className="gallery-image rounded-2xl shadow-lg hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Row 2 */}
        <div className="gallery-image-wrapper col-span-1">
          <GalleryImage
            src="assets/services/gallerysection/imagegrid/image-4.jpg"
            className="gallery-image rounded-2xl shadow-lg hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="gallery-image-wrapper col-span-1 md:col-span-2 lg:col-span-2">
          <GalleryImage
            src="assets/services/gallerysection/imagegrid/image-3.jpg"
            className="gallery-image rounded-2xl shadow-lg hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="gallery-image-wrapper col-span-1">
          <GalleryImage
            src="assets/gallery/couplesection/couple-5.jpg"
            className="gallery-image rounded-2xl shadow-lg hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Row 3 */}
        <div className="gallery-image-wrapper col-span-1">
          <GalleryImage
            src="assets/services/gallerysection/imagegrid/image-1.jpg"
            className="gallery-image rounded-2xl shadow-lg hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>
    </section>
  );
};