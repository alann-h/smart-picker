'use client';

import React from 'react';
import TopBar from './TopBar';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  isPublic?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, isPublic = false }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar isPublic={isPublic} />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
