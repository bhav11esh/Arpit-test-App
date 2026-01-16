import React from "react";

export const GalleryHeader: React.FC = () => {
  return (
    <section className="gallery-header text-center">
      <h2 className="text-4xl font-extrabold text-[#2c3e50] mb-4">
        Get a Glimpse of Our Work
      </h2>
      <p className="text-xl text-[#34495e] max-w-2xl mx-auto">
        Think photoshoots are only for models or influencers? Think again.
        Here's why stepping in front of the camera could be one of the best
        things you do for yourself.
      </p>
    </section>
  );
};