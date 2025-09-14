"use client";

import React from 'react';
import AnimatedSection from './AnimatedSection';
import InteractiveButton from './InteractiveButton';

const PricingTeaser: React.FC = () => {
  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          <AnimatedSection direction="up" delay={0.1} duration={0.6}>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Transparent Pricing That Works for You
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              See how Smart Picker compares to leading warehouse management solutions. 
              No hidden fees, no surprises - just honest pricing.
            </p>
          </AnimatedSection>

          <AnimatedSection direction="scale" delay={0.2} duration={0.8}>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 mb-8 shadow-lg border border-blue-100">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-left">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    Smart Picker
                  </h3>
                  <p className="text-4xl font-bold text-blue-600 mb-2">
                    $0
                  </p>
                  <p className="text-slate-600 mb-4">
                    Free during testing phase
                  </p>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                      Unlimited users & orders
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                      QuickBooks & Xero integration
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                      No setup fees or contracts
                    </li>
                  </ul>
                </div>
                
                <div className="text-center md:text-right">
                  <p className="text-sm text-slate-500 mb-4">
                    Competitors charge $299-$1,049+ AUD/month
                  </p>
                  <InteractiveButton
                    href="/pricing"
                    animationType="bounce"
                    intensity="medium"
                    variant="primary"
                    className="shadow-lg"
                  >
                    View Full Comparison
                  </InteractiveButton>
                </div>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.4} duration={0.6}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <InteractiveButton
                href="/login"
                animationType="scale"
                intensity="strong"
                variant="primary"
                className="shadow-lg"
              >
                Get Started Free
              </InteractiveButton>
              <InteractiveButton
                href="/pricing"
                animationType="glow"
                intensity="medium"
                variant="secondary"
                className="border border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                See Pricing Details
              </InteractiveButton>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
};

export default PricingTeaser;
