"use client";

import React, { Suspense, useMemo, useState, useTransition } from 'react';
import {
  Receipt,
  Search,
  Zap,
  ChevronDown,
  ChevronUp,
  Building2,
  DollarSign,
  ChevronRight,
  Check,
  RefreshCw,
  Users,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from "~/trpc/react";
import Layout from "~/app/_components/Layout";
import { AvailableQuotesSkeleton, RunListSkeleton } from "~/app/_components/Skeletons";
import { useCustomers } from "~/hooks/useCustomers";
import { useRuns } from "~/hooks/useRuns";
import type { Customer } from "~/types/customer";
import type { QuoteSummary } from "~/types/quote";
import type { RunWithDetails } from "~/types/run";

// ====================================================================================
// Reusable Components
// ====================================================================================

const statusColors: Record<string, { bg: string; text: string; border?: string }> = {
  pending: { bg: 'bg-blue-100', text: 'text-blue-800' },
  checking: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  finalised: { bg: 'bg-green-100', text: 'text-green-800' },
  assigned: { bg: 'bg-sky-100', text: 'text-sky-800' },
  default: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

const StatusChip: React.FC<{ status: string; variant?: 'run' | 'quote' }> = ({ status, variant = 'run' }) => {
  const colorKey = variant === 'quote' && status === 'assigned' ? 'assigned' : status;
  const color = statusColors[colorKey] ?? statusColors.default;
  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${color?.bg} ${color?.text}`}>
      {status}
    </span>
  );
};

const InfoBox: React.FC<{ icon: React.ElementType, title: string, message: string }> = ({ icon: Icon, title, message }) => (
  <div className="text-center p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
    <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
    <h3 className="text-lg font-medium text-gray-800">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{message}</p>
  </div>
);

const DashboardRunItem: React.FC<{ run: RunWithDetails }> = ({ run }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const { quoteCount } = useMemo(() => ({ quoteCount: (run.quotes ?? []).length }), [run.quotes]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Run #{run.run_number ?? run.id.substring(0, 8)}
          </h3>
          <StatusChip status={run.status} variant="run" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600">{quoteCount} quotes</span>
          <button aria-label="expand run">
            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500 cursor-pointer" /> : <ChevronDown className="w-5 h-5 text-gray-500 cursor-pointer" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="overflow-hidden">
          <div className="border-t border-gray-200 p-4">
            <h4 className="text-md font-semibold text-gray-700 mb-3">Quotes in this Run</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quote ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {run.quotes
                    ?.sort((a, b) => a.priority - b.priority)
                    .map((quote) => (
                      <tr key={quote.quoteId} onClick={() => router.push(`/quote?id=${quote.quoteId}`)} className="hover:bg-gray-50 cursor-pointer transition-colors duration-150">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {quote.priority + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">#{quote.quoteNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusChip status={quote.orderStatus} variant="quote" /></td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{quote.customerName}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QuoteItem: React.FC<{ quote: QuoteSummary; onClick: () => void }> = ({ quote, onClick }) => {
  return (
    <div onClick={onClick} className="w-full bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md hover:border-blue-400 cursor-pointer transition-all duration-200 ease-in-out flex items-center justify-between">
      <div className="flex items-center">
        <div className="mr-4">
          <p className="text-sm font-semibold text-blue-600">#{quote.quoteNumber}</p>
        </div>
        <div>
          <p className="font-medium text-gray-800">{quote.customerName}</p>
          <p className="text-xs text-gray-500">Last Modified: {new Date(quote.lastModified).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <p className="font-semibold text-gray-800">${quote.totalAmount.toFixed(2)}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
};

// ====================================================================================
// Data-Fetching Components
// ====================================================================================

const ActiveRunsList: React.FC = () => {
  const { data: userStatus } = api.auth.getUserStatus.useQuery();
  const { companyRuns, isLoadingCompanyRuns, getCompanyRuns } = useRuns();

  // Fetch runs when component mounts
  React.useEffect(() => {
    if (userStatus?.companyId) {
      void getCompanyRuns(userStatus.companyId);
    }
  }, [userStatus?.companyId, getCompanyRuns]);

  const activeRuns = useMemo(() => {
    return (companyRuns as RunWithDetails[]).filter((run) => run.status !== 'finalised');
  }, [companyRuns]);

  if (isLoadingCompanyRuns) {
    return <RunListSkeleton />;
  }

  if (activeRuns.length === 0) return (
    <InfoBox icon={Zap} title="No active runs found" message="Create a new run to get started with order picking." />
  );

  return (
    <div className="space-y-3">
      {activeRuns.map((run: RunWithDetails) => (
        <div key={run.id}>
          <DashboardRunItem run={run} />
        </div>
      ))}
    </div>
  );
};

const QuoteList: React.FC<{ customer: Customer }> = ({ customer }) => {
  const router = useRouter();
  
  // Mock data for now - replace with actual API calls
  const mockQuotes: QuoteSummary[] = [
    {
      id: '1',
      quoteNumber: 'Q-001',
      customerName: customer.customer_name,
      totalAmount: 1250.00,
      lastModified: new Date().toISOString()
    }
  ];

  if (mockQuotes.length === 0) {
    return (
      <InfoBox icon={Receipt} title="No quotes found for this customer" message="Create a new quote to get started." />
    );
  }

  return (
    <div className="space-y-2">
      {mockQuotes.map((quote) => (
        <div key={quote.id}>
          <QuoteItem quote={quote} onClick={() => router.push(`/quote?id=${quote.id}`)} />
        </div>
      ))}
    </div>
  );
};

// ====================================================================================
// Main Dashboard Component
// ====================================================================================

export default function DashboardPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: userStatus, isLoading } = api.auth.getUserStatus.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { localCustomers } = useCustomers();

  const handleCustomerChange = (customer: Customer | null) => {
    startTransition(() => {
      setSelectedCustomer(customer);
    });
  };

  const filteredCustomers =
    query === ''
      ? localCustomers
      : localCustomers.filter((customer) =>
        customer.customer_name
          .toLowerCase()
          .replace(/\s+/g, '')
          .includes(query.toLowerCase().replace(/\s+/g, ''))
      );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!userStatus) {
    router.push("/login");
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50/50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Header Section */}
            <div>
              <div className="text-center sm:text-left">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                  Dashboard
                </h1>
                <p className="mt-3 text-lg text-gray-600">
                  Manage your picking runs and customer quotes.
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Zap className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Runs</dt>
                        <dd className="text-lg font-medium text-gray-900">3</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                        <dd className="text-lg font-medium text-gray-900">{localCustomers.length}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Quotes This Month</dt>
                        <dd className="text-lg font-medium text-gray-900">24</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Runs Section */}
            <div>
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="w-6 h-6 text-blue-600" />
                      <h2 className="text-xl font-semibold text-gray-800">
                        Active Picking Runs
                      </h2>
                    </div>
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </button>
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <Suspense fallback={<RunListSkeleton />}>
                    <ActiveRunsList />
                  </Suspense>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-gray-200" />

            {/* Quote Finder Section */}
            <div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center sm:text-left">
                  Quote Finder
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Customer Selection */}
                  <div className="md:col-span-1">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-800">Select Customer</h3>
                      </div>
                      <div className="relative">
                        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
                          <input
                            className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                            value={selectedCustomer?.customer_name ?? ''}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search customers..."
                          />
                          <button className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronDown className="h-5 w-5 text-gray-400 cursor-pointer" aria-hidden="true" />
                          </button>
                        </div>
                        {query && (
                          <div className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                            {filteredCustomers.length === 0 ? (
                              <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                Nothing found.
                              </div>
                            ) : (
                              filteredCustomers.map((customer) => (
                                <div
                                  key={customer.id}
                                  className="group relative cursor-pointer select-none py-2 pl-10 pr-4 text-gray-900 hover:bg-gray-100"
                                  onClick={() => handleCustomerChange(customer)}
                                >
                                  <span className="block truncate font-normal">
                                    {customer.customer_name}
                                  </span>
                                  {selectedCustomer?.id === customer.id && (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                      <Check className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quotes Display */}
                  <div className="md:col-span-2">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-h-[24rem]">
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <h3 className="text-lg font-semibold text-gray-800">
                            {selectedCustomer ? `Quotes for ${selectedCustomer.customer_name}` : 'Select a Customer'}
                          </h3>
                        </div>
                        
                        {isPending && (
                          <div className="w-full flex flex-col items-center justify-center pt-10">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-600 h-1.5 rounded-full animate-pulse"></div>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">Loading quotes...</p>
                          </div>
                        )}
                        
                        {!isPending && selectedCustomer ? (
                          <Suspense fallback={<AvailableQuotesSkeleton/>}>
                            <QuoteList customer={selectedCustomer} />
                          </Suspense>
                        ) : !isPending && !selectedCustomer ? (
                          <InfoBox icon={Search} title="No Customer Selected" message="Choose a customer from the dropdown to view their available quotes." />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
