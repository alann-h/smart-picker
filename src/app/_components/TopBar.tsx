'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '~/trpc/react';
import {
  ClipboardList,
  Play,
  History,
  RefreshCcw,
  Menu,
  ChevronDown,
  HelpCircle,
  Newspaper,
  DollarSign,
  Shield,
  LayoutDashboard,
  Package,
  FileUp,
  Users,
  LogOut,
  MonitorSmartphone,
  X,
} from 'lucide-react';

interface TopBarProps {
  isPublic?: boolean;
}

// Simple dropdown hook
const useDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return { isOpen, setIsOpen, ref };
};

// Dropdown component
const Dropdown: React.FC<{
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ trigger, children, className = '' }) => {
  const { isOpen, setIsOpen, ref } = useDropdown();

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div className={`absolute top-full right-0 z-50 mt-2 w-64 rounded-lg bg-white shadow-xl border ${className}`}>
          {children}
        </div>
      )}
    </div>
  );
};

// Menu button component
const MenuButton: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  isDanger?: boolean;
}> = ({ onClick, icon, children, isDanger = false }) => {
  const colors = isDanger 
    ? 'text-red-600 hover:bg-red-50' 
    : 'text-gray-700 hover:bg-blue-50';
  
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors cursor-pointer ${colors}`}
    >
      <span className="text-gray-500">{icon}</span>
      {children}
    </button>
  );
};

// Admin menu
const AdminMenu: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => (
  <div className="py-1">
    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Admin</div>
    <MenuButton onClick={() => onNavigate('/orders-to-check')} icon={<ClipboardList size={18} />}>
      Orders to Check
    </MenuButton>
    <MenuButton onClick={() => onNavigate('/run')} icon={<Play size={18} />}>
      Manage Runs
    </MenuButton>
    <MenuButton onClick={() => onNavigate('/order-history')} icon={<History size={18} />}>
      Order History
    </MenuButton>
    <MenuButton onClick={() => onNavigate('/kyte-converter')} icon={<RefreshCcw size={18} />}>
      Kyte to QuickBooks
    </MenuButton>
  </div>
);

// User menu
const UserMenu: React.FC<{
  userName: string | null;
  userEmail: string | null;
  isAdmin: boolean;
  onNavigate: (path: string) => void;
}> = ({ userName, userEmail, isAdmin, onNavigate }) => (
  <div className="py-1">
    {/* User info */}
    <div className="border-b border-gray-200 px-4 py-3">
      <p className="text-sm font-semibold text-gray-900">{userName ?? 'User'}</p>
      <p className="text-sm text-gray-500">{userEmail ?? 'user@example.com'}</p>
    </div>

    {/* Navigation */}
    <MenuButton onClick={() => onNavigate('/dashboard')} icon={<LayoutDashboard size={18} />}>
      Dashboard
    </MenuButton>
    <MenuButton onClick={() => onNavigate('/settings/products')} icon={<Package size={18} />}>
      Products
    </MenuButton>
    
    {isAdmin && (
      <>
        <MenuButton onClick={() => onNavigate('/settings/upload')} icon={<FileUp size={18} />}>
          Upload Data
        </MenuButton>
        <MenuButton onClick={() => onNavigate('/settings/users')} icon={<Users size={18} />}>
          User Management
        </MenuButton>
      </>
    )}

    <hr className="my-1 border-gray-100" />
    
    <MenuButton onClick={() => onNavigate('/sessions')} icon={<MonitorSmartphone size={18} />}>
      Active Sessions
    </MenuButton>
    <MenuButton onClick={() => onNavigate('/logout')} icon={<LogOut size={18} />} isDanger>
      Logout
    </MenuButton>
  </div>
);

// Public menu
const PublicMenu: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => (
  <div className="py-1">
    <MenuButton onClick={() => onNavigate('/faq')} icon={<HelpCircle size={18} />}>
      FAQ
    </MenuButton>
    <MenuButton onClick={() => onNavigate('/blog')} icon={<Newspaper size={18} />}>
      Blog & Resources
    </MenuButton>
    <MenuButton onClick={() => onNavigate('/pricing')} icon={<DollarSign size={18} />}>
      Pricing
    </MenuButton>
    <MenuButton onClick={() => onNavigate('/privacy-policy')} icon={<Shield size={18} />}>
      Privacy Policy
    </MenuButton>
    <MenuButton onClick={() => onNavigate('/terms-of-service')} icon={<Shield size={18} />}>
      Terms of Service
    </MenuButton>
  </div>
);

// Logout confirmation dialog
const LogoutDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Logout from All Devices</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600">
            This will log you out from all devices. Are you sure?
          </p>
        </div>
        <div className="flex gap-3 border-t bg-gray-50 p-4">
          <button
            onClick={onConfirm}
            className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 cursor-pointer"
          >
            Logout All Devices
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Main TopBar component
const TopBar: React.FC<TopBarProps> = ({ isPublic = false }) => {
  const router = useRouter();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
  // Debug log
  console.log('TopBar rendering, isPublic:', isPublic);
  
  // Get user data
  const userStatusQuery = api.auth.getUserStatus.useQuery();
  const logoutMutation = api.auth.logout.useMutation();
  const logoutAllMutation = api.auth.logoutAllDevices.useMutation();

  const userStatus = userStatusQuery.data;
  const isAuthenticated = !!userStatus;
  const isAdmin = userStatus?.isAdmin ?? false;
  const userName = userStatus?.name ?? null;
  const userEmail = userStatus?.email ?? null;

  const handleNavigate = (path: string) => {
    if (path === '/logout') {
      void logoutMutation.mutateAsync().then(() => {
        router.push('/login');
      });
    } else if (path === '/logout-all') {
      setLogoutDialogOpen(true);
    } else if (path === '/sessions') {
      // TODO: Show sessions
      alert('Sessions feature coming soon!');
    } else {
      router.push(path);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAllMutation.mutateAsync();
      await logoutMutation.mutateAsync();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLogoutDialogOpen(false);
    }
  };

  return (
    <>
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between w-full">
            {/* Logo - Far Left */}
            <div 
              onClick={() => router.push(isPublic ? '/' : '/dashboard')}
              className="flex cursor-pointer items-center gap-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
                SP
              </div>
              <span className="hidden sm:block text-xl font-bold text-blue-600">Smart Picker</span>
            </div>

            {/* Navigation - Far Right */}
            <nav className="flex items-center gap-4">
              {isPublic ? (
                // Public navigation
                <>
                  <button
                    onClick={() => router.push('/about-us')}
                    className="text-sm font-medium text-gray-700 hover:text-blue-600 cursor-pointer"
                  >
                    About
                  </button>
                  
                  <Dropdown
                    trigger={
                      <button className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-blue-600 cursor-pointer">
                        Resources <ChevronDown size={16} />
                      </button>
                    }
                  >
                    <PublicMenu onNavigate={handleNavigate} />
                  </Dropdown>

                  <button
                    onClick={() => router.push('/login')}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
                  >
                    Login
                  </button>
                </>
              ) : (
                // Authenticated navigation
                <>
                  {/* Admin menu - desktop */}
                  {isAdmin && (
                    <div className="hidden md:block">
                      <Dropdown
                        trigger={
                          <button className="rounded-full p-2 text-gray-600 hover:bg-gray-100 cursor-pointer">
                            <Menu size={20} />
                          </button>
                        }
                      >
                        <AdminMenu onNavigate={handleNavigate} />
                      </Dropdown>
                    </div>
                  )}

                  {/* Admin menu - mobile */}
                  {isAdmin && (
                    <div className="md:hidden">
                      <Dropdown
                        trigger={
                          <button className="rounded-full p-2 text-gray-600 hover:bg-gray-100 cursor-pointer">
                            <Menu size={20} />
                          </button>
                        }
                      >
                        <AdminMenu onNavigate={handleNavigate} />
                      </Dropdown>
                    </div>
                  )}

                  {/* User menu */}
                  {isAuthenticated && (
                    <Dropdown
                      trigger={
                        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold cursor-pointer">
                          {userName ? userName.charAt(0).toUpperCase() : 'U'}
                        </button>
                      }
                    >
                      <UserMenu
                        userName={userName}
                        userEmail={userEmail}
                        isAdmin={isAdmin}
                        onNavigate={handleNavigate}
                      />
                    </Dropdown>
                  )}
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <LogoutDialog
        isOpen={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        onConfirm={handleLogoutAll}
      />
    </>
  );
};

export default TopBar;
