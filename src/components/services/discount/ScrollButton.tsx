"use client";

import * as React from "react";

interface ScrollButtonProps {
  direction: "left" | "right";
  onClick: () => void;
}

export const ScrollButton: React.FC<ScrollButtonProps> = ({
  direction,
  onClick,
}) => {
  const imgSrc =
    direction === "left"
      ? "assets/services/discount/leftarrow.svg"
      : "assets/services/discount/rightarrow.svg";

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center p-2 hover:opacity-80 transition-opacity"
      aria-label={`Scroll ${direction}`}
    >
      <img
        loading="lazy"
        src={imgSrc}
        className="object-contain shrink-0 aspect-square w-[39px]"
        alt={`Scroll ${direction} arrow`}
      />
    </button>
  );
};
