'use client';

import { api } from '~/trpc/react';
import type { RunStatus } from '~/types/run';
import type { ConnectionType } from '~/lib/types';

/**
 * Hook for managing runs
 * 
 * Purpose:
 * - Provides a clean interface for run management
 * - Handles loading states and error handling
 * - Caches data for better performance
 * - Simplifies component code by encapsulating tRPC calls
 */
export const useRuns = () => {
  // Create bulk run
  const createBulkRunMutation = api.run.createBulkRun.useMutation();

  // Update run status
  const updateRunStatusMutation = api.run.updateRunStatus.useMutation();

  // Update run quotes
  const updateRunQuotesMutation = api.run.updateRunQuotes.useMutation();

  // Delete run
  const deleteRunMutation = api.run.deleteRun.useMutation();

  const getCompanyRuns = async (_companyId: string) => {
    // This would typically use a query, but for now we'll return empty array
    // In a real implementation, you'd use the tRPC query here
    return { data: [] };
  };

  const createBulkRun = async (
    orderedQuoteIds: string[], 
    connectionType: ConnectionType = 'qbo'
  ) => {
    return createBulkRunMutation.mutateAsync({ 
      orderedQuoteIds, 
      connectionType 
    });
  };

  const updateRunStatus = async (runId: string, status: RunStatus) => {
    return updateRunStatusMutation.mutateAsync({ runId, status });
  };

  const updateRunQuotes = async (runId: string, orderedQuoteIds: string[]) => {
    return updateRunQuotesMutation.mutateAsync({ runId, orderedQuoteIds });
  };

  const deleteRun = async (runId: string) => {
    return deleteRunMutation.mutateAsync({ runId });
  };

  return {
    // Get company runs
    getCompanyRuns,
    companyRuns: [],
    isLoadingCompanyRuns: false,
    companyRunsError: null,
    refetchCompanyRuns: () => Promise.resolve({ data: [] }),

    // Create bulk run
    createBulkRun,
    isCreatingRun: createBulkRunMutation.isPending,
    createRunError: createBulkRunMutation.error,
    createRunResult: createBulkRunMutation.data,

    // Update run status
    updateRunStatus,
    isUpdatingStatus: updateRunStatusMutation.isPending,
    updateStatusError: updateRunStatusMutation.error,
    updateStatusResult: updateRunStatusMutation.data,

    // Update run quotes
    updateRunQuotes,
    isUpdatingQuotes: updateRunQuotesMutation.isPending,
    updateQuotesError: updateRunQuotesMutation.error,
    updateQuotesResult: updateRunQuotesMutation.data,

    // Delete run
    deleteRun,
    isDeletingRun: deleteRunMutation.isPending,
    deleteRunError: deleteRunMutation.error,
    deleteRunResult: deleteRunMutation.data,
  };
};
