interface StepItemProps {
  number: number;
  content: string;
}

export const StepItem = ({ number, content }: StepItemProps) => {
  return (
    <div className="step-item flex items-center gap-4">
      <div className="step-number w-12 h-12 flex items-center justify-center bg-[#ff6b6b] text-white text-xl font-bold rounded-full">
        {number}
      </div>
      <p className="step-content text-lg text-[#34495e] text-left">{content}</p>
    </div>
  );
};