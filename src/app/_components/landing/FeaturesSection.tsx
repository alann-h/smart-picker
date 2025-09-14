"use client";

import React from 'react';
import { Smartphone, CloudCog, ClipboardList } from 'lucide-react';
import AnimatedSection from './AnimatedSection';
import StaggerAnimation from './StaggerAnimation';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
  <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out flex flex-col items-center text-center h-full group hover:-translate-y-2">
    <div className="flex-shrink-0 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 rounded-full p-4 mb-6 group-hover:scale-110 transition-transform duration-300">
      {icon}
    </div>
    <div className="flex-grow">
      <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  </div>
);

const FeaturesSection: React.FC = () => (
  <section className="py-16 md:py-24 px-4 sm:px-8 bg-gradient-to-br from-gray-50 to-blue-50">
    <div className="max-w-screen-xl mx-auto">
      <AnimatedSection direction="scale" delay={0.1} duration={0.6}>
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            Why Choose <span className="text-blue-600">Smart Picker</span>?
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Built for modern businesses that need efficiency, accuracy, and simplicity
          </p>
        </div>
      </AnimatedSection>

      <StaggerAnimation staggerDelay={0.2} direction="up" duration={0.7}>
        {/* Responsive grid for feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Smartphone size={32} strokeWidth={2} />}
            title="Mobile-First Design"
            description="Scan barcodes and manage inventory directly from your smartphone or tablet. No more paper-based processes."
          />
          <FeatureCard
            icon={<CloudCog size={32} strokeWidth={2} />}
            title="Real-Time Sync"
            description="All your data syncs instantly across devices and integrates seamlessly with QuickBooks Online."
          />
          <FeatureCard
            icon={<ClipboardList size={32} strokeWidth={2} />}
            title="Run-Based System"
            description="Group orders into efficient 'runs' for pickers to prepare multiple orders simultaneously, maximizing warehouse productivity."
          />
        </div>
      </StaggerAnimation>
    </div>
  </section>
);

export default FeaturesSection;
