import React from "react";

interface GalleryImageProps {
  src: string;
  className?: string;
}

export const GalleryImage: React.FC<GalleryImageProps> = ({
  src,
  className = "",
}) => {
  return (
    <div className="gallery-image-container overflow-hidden rounded-2xl">
      <img
        loading="lazy"
        src={src}
        className={`gallery-image object-cover w-full h-full ${className}`}
        alt="Gallery"
      />
    </div>
  );
};