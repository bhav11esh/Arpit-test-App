import * as React from "react";

interface DiscountCardProps {
  title: string;
  description: string;
  price?: string;
  minWidth?: string;
  width?: string;
}

export const DiscountCard: React.FC<DiscountCardProps> = ({
  title,
  description,
  price,
  minWidth = "60",
  width = "246px",
}) => {
  return (
    <article
      className="p-5 bg-orange-50 rounded-xl"
      style={{ minWidth: `${minWidth}px`, width }}
    >
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-11 text-lg leading-7 max-md:mt-10">{description}</p>
      {price && (
        <p className="mt-11 text-2xl font-bold leading-none max-md:mt-10">
          {price}
        </p>
      )}
    </article>
  );
};
