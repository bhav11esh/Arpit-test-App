"use client";

interface ActionButtonProps {
  text: string;
  onClick?: () => void;
}

export const ActionButton = ({ text, onClick }: ActionButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="action-button bg-[#ff6b6b] text-white px-8 py-3 rounded-full text-lg font-semibold hover:scale-105 transition-all duration-300 shadow-lg flex items-center gap-2"
    >
      {text}
      <img
        loading="lazy"
        src="assets/services/gettingstarted/rightbookshootarrow.svg"
        className="w-6 h-6"
        alt=""
      />
    </button>
  );
};