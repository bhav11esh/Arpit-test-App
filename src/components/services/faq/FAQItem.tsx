"use client";

import { useState } from "react";
import PlusIcon from "./PlusIcon";
import { FAQItemType } from "./types";

interface FAQItemProps {
  item: FAQItemType;
}

const FAQItem = ({ item }: FAQItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article className="bg-orange-50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex justify-between items-center p-5 w-full text-left max-sm:p-4"
        aria-expanded={isExpanded}
      >
        <h3 className="text-lg font-semibold leading-8 text-neutral-900 w-[602px] max-md:w-[calc(100%_-_40px)] max-sm:text-base max-sm:leading-6">
          {item.question}
        </h3>
        <span className="flex justify-center items-center p-1 bg-neutral-900 h-[22px] rounded-[50px] w-[22px]">
          <PlusIcon />
        </span>
      </button>
      {isExpanded && (
        <div className="px-5 pb-5 max-sm:px-4 max-sm:pb-4 text-neutral-900 text-opacity-80">
          {Array.isArray(item.answer) ? (
            <ul className="list-disc pl-5 space-y-2">
              {item.answer.map((point, i) => (
                <li key={i} className="leading-relaxed">{point}</li>
              ))}
            </ul>
          ) : (
            <p>{item.answer}</p>
          )}
        </div>
      )}
    </article>
  );
};

export default FAQItem;