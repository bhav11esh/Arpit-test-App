import React from "react";

interface DividerProps {
  className?: string; // Add className prop
}

export const Divider: React.FC<DividerProps> = ({ className }) => {
  return (
    <hr className={`mt-6 w-full border border-solid border-neutral-900 border-opacity-20 min-h-px max-md:max-w-full ${className}`} />
  );
};