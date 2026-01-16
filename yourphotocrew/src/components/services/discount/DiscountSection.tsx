"use client";

import * as React from "react";
import { ScrollButton } from "./ScrollButton";
import { DiscountCard } from "./DiscountCard";

export const DiscountSection: React.FC = () => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = direction === "left" ? -300 : 300;
    scrollContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="flex flex-wrap gap-5">
      <ScrollButton direction="left" onClick={() => handleScroll("left")} />

      <div className="flex-auto max-md:max-w-full">
        <div className="flex gap-5 max-md:flex-col">
          <div className="w-[84%] max-md:ml-0 max-md:w-full">
            <div
              ref={scrollContainerRef}
              className="flex gap-3.5 self-stretch my-auto mr-0 text-black min-h-[266px] overflow-x-auto scrollbar-hide max-md:mt-5 max-md:max-w-full"
            >
              <DiscountCard
                title="Discount and Offers"
                description="Quis pariatur excepteur in sit proident ex cillum anim qui."
                width="246px"
              />

              <DiscountCard
                title="📹 BTS Discount"
                description="Let us post your BTS content and get any 2 themes at a discounted rate"
                price="₹700 for 2 themes"
                width="284px"
              />

              <DiscountCard
                title="Pre-booking Discount"
                description="Let us post your BTS content and get any 2 themes at a discounted rate"
                price="₹500/theme"
                width="284px"
              />

              <DiscountCard
                title="BTS Discount"
                description="Let us post your BTS content and get any 2 themes at a discounted rate"
                price="₹700"
                width="283px"
              />

              <DiscountCard
                title="BTS Discount"
                description="Let us post your BTS content and get any 2 themes at a discounted rate"
                price="₹700"
                width="283px"
              />
            </div>
          </div>

          <div className="ml-5 w-[16%] max-md:ml-0 max-md:w-full">
            <div className="flex overflow-hidden flex-col justify-center items-end px-16 py-32 w-full max-md:px-5 max-md:py-24">
              <ScrollButton
                direction="right"
                onClick={() => handleScroll("right")}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DiscountSection;
