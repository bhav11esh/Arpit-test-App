"use client";

import React from "react";
import { FeatureCard } from "./FeatureCard";

export const FeaturesSection = () => {
  const features = [
    {
      icon: "assets/services/features/pe.svg",
      title: "Personalized Experience",
      description: "Only 2 people per photographer for focused attention NO BYSTANDERS",
    },
    {
      icon: "assets/services/features/pt.svg",
      title: "Professional Team",
      description: "Dedicated assistant to help with poses and candid moments",
    },
    {
      icon: "assets/services/features/vt.svg",
      title: "Variety of Partnered Venues",
      description: "Themed shoots at gyms, cafés, pubs, restaurants, etc. All in walking distance with changing facilities",
    },
    {
      icon: "assets/services/features/ap.svg",
      title: "Affordable Pricing",
      description: "1 Theme: ₹600/700 for weekday/end\n5 Theme package: ₹2500/3000 for weekday/weekend",
    },
    {
      icon: "assets/services/features/wi.svg",
      title: "Wardrobe Included",
      description: "Thematic wardrobe provided for males (females can bring their own)",
    },
    {
      icon: "assets/services/features/qa.svg",
      title: "Quality Assurance",
      description: "We don't move to next theme until YOU confirm at least 2 great clicks in current theme",
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto bg-quaternary rounded-3xl p-12 md:p-16">
        <header className="flex flex-col md:flex-row gap-8 md:gap-16 mb-12">
          <div className="md:w-2/5">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              What makes us stand out from the crowd?
            </h2>
          </div>
          <div className="md:w-3/5">
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
              Here's why our scheduled shoot experience is perfect for you!
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;