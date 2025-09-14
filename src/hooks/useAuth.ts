'use client';

import { api } from '~/trpc/react';

export const useAuth = () => {
  const userStatusQuery = api.auth.getUserStatus.useQuery();
  const logoutMutation = api.auth.logout.useMutation();

  const userStatus = userStatusQuery.data;
  const isLoading = userStatusQuery.isLoading;

  const isAuthenticated = !!userStatus;
  const isAdmin = userStatus?.isAdmin ?? false;
  const userName = userStatus?.name ?? null;
  const userEmail = userStatus?.email ?? null;

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return {
    userStatus,
    isLoading,
    isAuthenticated,
    isAdmin,
    userName,
    userEmail,
    logout,
  };
};
