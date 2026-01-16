import React from "react";

interface BenefitPointProps {
  icon: string;
  title: string;
  description: string;
  className?: string; // Add className prop
}

export const BenefitPoint: React.FC<BenefitPointProps> = ({
  icon,
  title,
  description,
  className, // Destructure className
}) => {
  return (
    <div className={`flex flex-wrap gap-4 justify-center items-start w-full max-md:max-w-full ${className}`}>
      <img
        loading="lazy"
        src={icon}
        className="object-contain shrink-0 aspect-[0.65] w-[26px]"
        alt=""
      />
      <p className="flex-1 shrink basis-0 max-md:max-w-full">
        <strong className="font-bold text-[#181818]">{title}: </strong>
        {description}
      </p>
    </div>
  );
};