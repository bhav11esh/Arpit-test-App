import React from "react";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
}) => {
  return (
    <article className="flex-1 min-w-[260px] max-w-[320px] p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ease-in-out">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-orange-100 rounded-lg">
          <img
            loading="lazy"
            src={icon}
            className="w-8 h-8 object-contain"
            alt={title}
          />
        </div>
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
      </div>
      <p className="mt-4 text-gray-600 leading-relaxed">
        {description.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            <br />
          </React.Fragment>
        ))}
      </p>
    </article>
  );
};