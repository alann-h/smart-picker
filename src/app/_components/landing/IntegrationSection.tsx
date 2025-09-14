"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AnimatedSection from './AnimatedSection';
import InteractiveButton from './InteractiveButton';

const IntegrationSection: React.FC = () => {
  return (
    <section className="bg-gradient-to-br from-blue-800 to-blue-500 py-16 md:py-24 px-4 sm:px-6 text-white">
      <div className="max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          
          {/* Left Column: Logos */}
          <div className="order-2 md:order-1">
            <AnimatedSection direction="scale" delay={0.1} duration={0.8}>
              <div className="flex justify-center items-center gap-6 sm:gap-8 flex-wrap">
                <div className="relative group">
                  <Image
                    src="/quickbooks-logo.svg"
                    alt="QuickBooks Integration"
                    width={180}
                    height={80}
                    className="max-w-[140px] sm:max-w-[180px] h-auto opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
                <div className="relative group">
                  <Image
                    src="/xero-logo.svg"
                    alt="Xero Integration"
                    width={180}
                    height={80}
                    className="max-w-[140px] sm:max-w-[180px] h-auto opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
              </div>
            </AnimatedSection>
          </div>

          {/* Right Column: Text Content & Button */}
          <div className="order-1 md:order-2 text-center md:text-left">
            <AnimatedSection direction="right" delay={0.2} duration={0.8}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4">
                Seamless Accounting Integration
              </h2>
              <p className="text-base sm:text-lg md:text-xl opacity-95 leading-relaxed mb-6">
                SmartPicker automatically syncs with both QuickBooks Online and Xero, keeping your inventory,
                orders, and financial data perfectly aligned. No more manual data entry or reconciliation.
              </p>
              <div className="mt-8">
                <InteractiveButton
                  href="/about-us"
                  animationType="glow"
                  intensity="medium"
                  variant="secondary"
                  className="bg-transparent border border-white/40 text-white font-bold text-lg rounded-lg px-8 py-3 hover:bg-white/10 hover:border-white focus:ring-white/50"
                >
                  Learn More
                </InteractiveButton>
              </div>
            </AnimatedSection>
          </div>

        </div>
      </div>
    </section>
  );
};

export default IntegrationSection;
