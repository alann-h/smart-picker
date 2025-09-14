"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { ScanLine, Quote, Eye, EyeOff, Mail, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import Image from "next/image";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Placeholder Logo Component (for mobile view)
 */
const Logo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 p-2">
      <ScanLine className="h-6 w-6 text-white" />
    </div>
    <span className="text-2xl font-bold tracking-tight text-slate-900">
      Smart Picker
    </span>
  </div>
);

export default function LoginPage() {
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string; field?: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<{ email: string; name?: string } | null>(null);
  const [showSwitchAccount, setShowSwitchAccount] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [preFilledEmail, setPreFilledEmail] = useState("");
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginMutation = api.auth.login.useMutation();
  const getUserStatusQuery = api.auth.getUserStatus.useQuery();
  const requestPasswordResetMutation = api.auth.requestPasswordReset.useMutation();
  
  // Check for OAuth error from URL params
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError({ message: `OAuth Error: ${oauthError}` });
    }
  }, [searchParams]);

  // Check if user is already logged in
  useEffect(() => {
    if (getUserStatusQuery.data) {
      const hasRememberMe = localStorage.getItem('rememberMe') === 'true';
      if (hasRememberMe) {
        router.push('/dashboard');
      } else {
        setCurrentUser({
          email: getUserStatusQuery.data.email || 'Unknown User',
          name: getUserStatusQuery.data.name
        });
        setPreFilledEmail(getUserStatusQuery.data.email || '');
      }
    }
  }, [getUserStatusQuery.data, router]);

  const handleSwitchAccount = () => {
    setShowSwitchAccount(true);
    setCurrentUser(null);
    setPreFilledEmail('');
    localStorage.removeItem('rememberMe');
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
  };

  const handleResetPassword = async (email: string) => {
    try {
      await requestPasswordResetMutation.mutateAsync({ email });
      // You could add a toast notification here
      console.log('Password reset link sent! Check your email.');
      setShowForgotPassword(false);
    } catch (error) {
      console.error('Password reset error:', error);
      // You could add a toast notification here
      console.log('Failed to send password reset link. Please try again.');
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
  };

  const handleQuickBooksLogin = () => {
    setIsSubmitting(true);
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    }
    // The OAuth URI will be fetched by the SocialLoginButtons component
  };

  const handleXeroLogin = () => {
    setIsSubmitting(true);
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    }
    // The OAuth URI will be fetched by the SocialLoginButtons component
  };

  const handleCredentialLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await loginMutation.mutateAsync({
        email: data.email,
        password: data.password,
        rememberMe,
      });

      if (result.user.reAuthRequired) {
        setError({ message: 'Your QuickBooks connection has expired. Redirecting to reconnect...' });
        setTimeout(() => {
          handleQuickBooksLogin();
        }, 3000);
      } else {
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError({ message: err instanceof Error ? err.message : "Login failed" });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <>
      {/* New Split Screen Layout */}
      <div className="flex min-h-screen bg-white">
        
        {/* 1. Brand Panel (Visible on Desktop only) */}
        <div className="relative hidden w-0 flex-1 flex-col justify-end bg-blue-900 p-12 text-white md:flex lg:w-1/2">
          
          {/* Testimonial */}
          <div className="relative z-10">
            <Quote className="h-16 w-16 text-blue-700" />
            <p className="mt-4 text-3xl font-medium text-white">
              &ldquo;This tool cut our picking errors to zero and saved us 10 hours a week. A total game-changer for our entire warehouse operation.&rdquo;
            </p>
            <p className="mt-6 font-semibold text-blue-200">
              — Warehouse Manager, Golden Shore Products
            </p>
          </div>
        </div>

        {/* 2. Form Panel (Full width on Mobile, Half width on Desktop) */}
        <div className="flex w-full flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24">
          <main className="mx-auto w-full max-w-sm lg:w-96">
            
            {/* Logo (Visible on Mobile only) */}
            <div className="md:hidden">
              <Logo />
            </div>

            <div className="mt-8">
              {/* User Session Indicator */}
              {currentUser && !showSwitchAccount ? (
                <UserSessionIndicator
                  currentUser={currentUser}
                  onSwitchAccount={handleSwitchAccount}
                />
              ) : null}

              {/* Header Text */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  {showSwitchAccount ? 'Switch Account' : (currentUser ? 'Welcome Back!' : 'Welcome')}
                </h1>
                <p className="mt-2 text-lg text-slate-600">
                  {showSwitchAccount 
                    ? 'Sign in with different credentials' 
                    : currentUser 
                      ? 'Enter your password to continue' 
                      : 'Sign in to your account'
                  }
                </p>
              </div>

              {/* Login Form */}
              <LoginForm
                onSubmit={handleCredentialLogin}
                isSubmitting={isSubmitting}
                rememberMe={rememberMe}
                onRememberMeChange={setRememberMe}
                onForgotPassword={handleForgotPassword}
                preFilledEmail={preFilledEmail}
                showSwitchAccount={showSwitchAccount}
                error={error}
              />

              {/* Social Login Buttons */}
              <SocialLoginButtons
                onQuickBooksLogin={handleQuickBooksLogin}
                onXeroLogin={handleXeroLogin}
                isSubmitting={isSubmitting}
                rememberMe={rememberMe}
              />
            </div>
          </main>
        </div>
      </div>

      {/* Password Reset Modal */}
      <ForgotPasswordModal
        open={showForgotPassword}
        onClose={handleCloseForgotPassword}
        onSubmit={handleResetPassword}
        initialEmail={preFilledEmail}
      />
    </>
  );
}

// User Session Indicator Component
function UserSessionIndicator({ 
  currentUser, 
  onSwitchAccount 
}: { 
  currentUser: { email: string; name?: string };
  onSwitchAccount: () => void;
}) {
  return (
    <div className="mb-6 rounded-lg bg-blue-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-blue-900">
            Signed in as {currentUser.name ?? currentUser.email}
          </p>
          <p className="text-sm text-blue-700">{currentUser.email}</p>
        </div>
        <button
          onClick={onSwitchAccount}
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          Switch account
        </button>
      </div>
    </div>
  );
}

// Login Form Component
function LoginForm({
  onSubmit,
  isSubmitting,
  rememberMe,
  onRememberMeChange,
  onForgotPassword,
  preFilledEmail = '',
  showSwitchAccount = false,
  error,
}: {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isSubmitting: boolean;
  rememberMe: boolean;
  onRememberMeChange: (checked: boolean) => void;
  onForgotPassword: () => void;
  preFilledEmail?: string;
  showSwitchAccount?: boolean;
  error?: { message: string; code?: string; field?: string } | null;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: preFilledEmail,
      password: '',
    },
  });

  useEffect(() => {
    if (preFilledEmail) {
      setValue('email', preFilledEmail);
    }
  }, [preFilledEmail, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-6">
        {/* Global Error Display */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-600 bg-red-100 p-4">
            <AlertCircle
              className="h-5 w-5 flex-shrink-0 text-red-700"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-red-800">
              {error.message}
            </p>
          </div>
        )}

        {/* Email Input */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Email Address
          </label>
          <div className="relative mt-2">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              {...register('email')}
              id="email"
              type="email"
              autoComplete="email"
              autoFocus={!preFilledEmail}
              disabled={isSubmitting}
              className={`block w-full rounded-lg border-0 py-2.5 pl-10 text-gray-900 ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
                errors.email
                  ? 'ring-red-500 focus:ring-red-500'
                  : 'ring-gray-300 focus:ring-blue-600'
              }`}
            />
          </div>
          {errors.email && (
            <p className="mt-2 text-sm text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Password
          </label>
          <div className="relative mt-2">
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isSubmitting}
              className={`block w-full rounded-lg border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
                errors.password
                  ? 'ring-red-500 focus:ring-red-500'
                  : 'ring-gray-300 focus:ring-blue-600'
              }`}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
              >
                <span className="sr-only">
                  {showPassword ? 'Hide password' : 'Show password'}
                </span>
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          {errors.password && (
            <p className="mt-2 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Options Row: Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberMeChange(e.target.checked)}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-sm text-gray-700"
            >
              Remember me
            </label>
          </div>
          <button
            type="button"
            onClick={onForgotPassword}
            disabled={isSubmitting}
            className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!watch('password') || isSubmitting}
          className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:from-blue-600 hover:to-blue-400 hover:shadow-md hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:bg-none disabled:text-gray-500 disabled:transform-none disabled:shadow-none cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing In...
            </>
          ) : showSwitchAccount ? (
            'Switch Account'
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </form>
  );
}

// Social Login Buttons Component
function SocialLoginButtons({
  onQuickBooksLogin,
  onXeroLogin,
  isSubmitting,
  rememberMe,
}: {
  onQuickBooksLogin: () => void;
  onXeroLogin: () => void;
  isSubmitting: boolean;
  rememberMe: boolean;
}) {
  const { data: qboAuthUri } = api.oauth.getQBOAuthUri.useQuery({ rememberMe });
  const { data: xeroAuthUri } = api.oauth.getXeroAuthUri.useQuery({ rememberMe });

  // Base classes for the social login buttons to reduce repetition
  const baseButtonClasses =
    'group inline-flex w-full items-center justify-between rounded-lg border px-4 py-3 text-base font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none';

  const handleQuickBooksClick = () => {
    onQuickBooksLogin();
    if (qboAuthUri?.authUri) {
      window.location.href = qboAuthUri.authUri;
    }
  };

  const handleXeroClick = () => {
    onXeroLogin();
    if (xeroAuthUri?.authUri) {
      window.location.href = xeroAuthUri.authUri;
    }
  };

  return (
    <div className="space-y-4">
      {/* Divider */}
      <div className="my-6 flex items-center">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="mx-4 flex-shrink text-xs font-medium text-gray-500">
          OR CONTINUE WITH
        </span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* QuickBooks Login Button */}
      <button
        type="button"
        onClick={handleQuickBooksClick}
        disabled={isSubmitting || !qboAuthUri?.authUri}
        className={`${baseButtonClasses} border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:-translate-y-px focus-visible:ring-emerald-500 cursor-pointer`}
      >
        <div className="flex items-center">
          <Image
            src="/quickbooks-logo.svg"
            alt="QuickBooks"
            className="mr-3 h-6 w-6 object-contain"
            width={24}
            height={24}
          />
          Sign in with QuickBooks
        </div>
        <ArrowRight
          className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
          aria-hidden="true"
        />
      </button>

      {/* Xero Login Button */}
      <button
        type="button"
        onClick={handleXeroClick}
        disabled={isSubmitting || !xeroAuthUri?.authUri}
        className={`${baseButtonClasses} border-sky-500 text-sky-600 hover:bg-sky-50 hover:-translate-y-px focus-visible:ring-sky-500 cursor-pointer`}
      >
        <div className="flex items-center">
          <Image
            src="/xero-logo.svg"
            alt="Xero"
            className="mr-3 h-6 w-6 object-contain"
            width={24}
            height={24}
          />
          Sign in with Xero
        </div>
        <ArrowRight
          className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}


// Forgot Password Modal Component
function ForgotPasswordModal({
  open,
  onClose,
  onSubmit,
  initialEmail,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
  initialEmail: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
    }
  }, [open, initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(email);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">
            Reset your password
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 mb-1">
                Email address
              </label>
              <input
                id="reset-email"
                type="email"
                required
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-3 px-4"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? "Sending..." : "Send reset link"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
