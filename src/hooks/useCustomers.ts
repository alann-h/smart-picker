'use client';

import { api } from '~/trpc/react';
import type { ConnectionType } from '~/lib/types';
import type { Customer } from '~/types/customer';

/**
 * Hook for managing customers
 * 
 * Purpose:
 * - Provides a clean interface for customer management
 * - Handles loading states and error handling
 * - Caches data for better performance
 * - Simplifies component code by encapsulating tRPC calls
 */
export const useCustomers = () => {
  // Get local customers
  const localCustomersQuery = api.customer.getLocalCustomers.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get external customers
  const getExternalCustomersMutation = api.customer.getExternalCustomers.useMutation();

  // Save customers
  const saveCustomersMutation = api.customer.saveCustomers.useMutation();

  // Sync customers
  const syncCustomersMutation = api.customer.syncCustomers.useMutation();

  const getExternalCustomers = async (connectionType: ConnectionType = 'qbo'): Promise<Omit<Customer, 'company_id'>[]> => {
    return getExternalCustomersMutation.mutateAsync({ connectionType });
  };

  const saveCustomers = async (customers: Array<{ id: string; customer_name: string }>): Promise<{ success: boolean; count: number }> => {
    return saveCustomersMutation.mutateAsync({ customers });
  };

  const syncCustomers = async (connectionType: ConnectionType = 'qbo'): Promise<{ success: boolean; count: number; connectionType: ConnectionType }> => {
    return syncCustomersMutation.mutateAsync({ connectionType });
  };

  return {
    // Local customers
    localCustomers: localCustomersQuery.data ?? [],
    isLoadingLocal: localCustomersQuery.isLoading,
    localError: localCustomersQuery.error,
    refetchLocal: localCustomersQuery.refetch,

    // External customers
    getExternalCustomers,
    externalCustomers: getExternalCustomersMutation.data ?? [],
    isLoadingExternal: getExternalCustomersMutation.isPending,
    externalError: getExternalCustomersMutation.error,

    // Save customers
    saveCustomers,
    isSaving: saveCustomersMutation.isPending,
    saveError: saveCustomersMutation.error,

    // Sync customers
    syncCustomers,
    isSyncing: syncCustomersMutation.isPending,
    syncError: syncCustomersMutation.error,
    syncResult: syncCustomersMutation.data,
  };
};
