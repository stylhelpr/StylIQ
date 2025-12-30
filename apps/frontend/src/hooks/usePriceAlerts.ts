import {useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import axios from 'axios';
import {API_BASE_URL} from '../config/api';

const API_BASE = `${API_BASE_URL}/price-tracking`;

// Types
export type PriceAlert = {
  id: number;
  url: string;
  title: string;
  currentPrice: number;
  targetPrice?: number;
  brand?: string;
  source: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  priceHistory?: {id: number; price: number; recordedAt: string}[];
};

type CreateAlertData = {
  url: string;
  title: string;
  currentPrice: number;
  targetPrice?: number;
  brand?: string;
  source: string;
};

type UpdateAlertData = {
  targetPrice?: number;
  enabled?: boolean;
};

// Query keys factory for consistency
const priceAlertKeys = {
  all: ['price-alerts'] as const,
  list: (token: string) => [...priceAlertKeys.all, 'list', token] as const,
  history: (token: string, alertId: number) =>
    [...priceAlertKeys.all, 'history', token, alertId] as const,
};

export const usePriceAlerts = (token?: string) => {
  const queryClient = useQueryClient();

  // Main query for fetching alerts
  const alertsQuery = useQuery<PriceAlert[], Error>({
    queryKey: priceAlertKeys.list(token ?? ''),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/alerts`, {
        headers: {Authorization: `Bearer ${token}`},
      });
      return response.data;
    },
  });

  // Derived state - alerts array with empty fallback
  const alerts = alertsQuery.data ?? [];

  // Create alert mutation with optimistic updates
  const createAlertMutation = useMutation<
    PriceAlert,
    Error,
    CreateAlertData,
    {previousAlerts: PriceAlert[] | undefined}
  >({
    mutationFn: async data => {
      const response = await axios.post(`${API_BASE}/track`, data, {
        headers: {Authorization: `Bearer ${token}`},
      });
      return response.data;
    },
    onMutate: async newAlert => {
      await queryClient.cancelQueries({
        queryKey: priceAlertKeys.list(token ?? ''),
      });

      const previousAlerts = queryClient.getQueryData<PriceAlert[]>(
        priceAlertKeys.list(token ?? ''),
      );

      // Optimistic update - add temporary alert
      queryClient.setQueryData<PriceAlert[]>(
        priceAlertKeys.list(token ?? ''),
        old => {
          const tempAlert: PriceAlert = {
            id: Date.now(), // Temporary ID
            ...newAlert,
            enabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return [tempAlert, ...(old ?? [])];
        },
      );

      return {previousAlerts};
    },
    onError: (_err, _newAlert, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(
          priceAlertKeys.list(token ?? ''),
          context.previousAlerts,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: priceAlertKeys.list(token ?? ''),
      });
    },
  });

  // Update alert mutation with optimistic updates
  const updateAlertMutation = useMutation<
    PriceAlert,
    Error,
    {alertId: number; data: UpdateAlertData},
    {previousAlerts: PriceAlert[] | undefined}
  >({
    mutationFn: async ({alertId, data}) => {
      const response = await axios.put(`${API_BASE}/${alertId}`, data, {
        headers: {Authorization: `Bearer ${token}`},
      });
      return response.data;
    },
    onMutate: async ({alertId, data}) => {
      await queryClient.cancelQueries({
        queryKey: priceAlertKeys.list(token ?? ''),
      });

      const previousAlerts = queryClient.getQueryData<PriceAlert[]>(
        priceAlertKeys.list(token ?? ''),
      );

      queryClient.setQueryData<PriceAlert[]>(
        priceAlertKeys.list(token ?? ''),
        old =>
          old?.map(alert =>
            alert.id === alertId
              ? {...alert, ...data, updatedAt: new Date().toISOString()}
              : alert,
          ) ?? [],
      );

      return {previousAlerts};
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(
          priceAlertKeys.list(token ?? ''),
          context.previousAlerts,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: priceAlertKeys.list(token ?? ''),
      });
    },
  });

  // Update price mutation
  const updatePriceMutation = useMutation<
    PriceAlert,
    Error,
    {alertId: number; price: number},
    {previousAlerts: PriceAlert[] | undefined}
  >({
    mutationFn: async ({alertId, price}) => {
      const response = await axios.put(
        `${API_BASE}/${alertId}/price`,
        {price},
        {
          headers: {Authorization: `Bearer ${token}`},
        },
      );
      return response.data;
    },
    onMutate: async ({alertId, price}) => {
      await queryClient.cancelQueries({
        queryKey: priceAlertKeys.list(token ?? ''),
      });

      const previousAlerts = queryClient.getQueryData<PriceAlert[]>(
        priceAlertKeys.list(token ?? ''),
      );

      queryClient.setQueryData<PriceAlert[]>(
        priceAlertKeys.list(token ?? ''),
        old =>
          old?.map(alert =>
            alert.id === alertId
              ? {
                  ...alert,
                  currentPrice: price,
                  updatedAt: new Date().toISOString(),
                }
              : alert,
          ) ?? [],
      );

      return {previousAlerts};
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(
          priceAlertKeys.list(token ?? ''),
          context.previousAlerts,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: priceAlertKeys.list(token ?? ''),
      });
    },
  });

  // Delete alert mutation with optimistic updates
  const deleteAlertMutation = useMutation<
    void,
    Error,
    number,
    {previousAlerts: PriceAlert[] | undefined}
  >({
    mutationFn: async alertId => {
      await axios.delete(`${API_BASE}/${alertId}`, {
        headers: {Authorization: `Bearer ${token}`},
      });
    },
    onMutate: async alertId => {
      await queryClient.cancelQueries({
        queryKey: priceAlertKeys.list(token ?? ''),
      });

      const previousAlerts = queryClient.getQueryData<PriceAlert[]>(
        priceAlertKeys.list(token ?? ''),
      );

      queryClient.setQueryData<PriceAlert[]>(
        priceAlertKeys.list(token ?? ''),
        old => old?.filter(alert => alert.id !== alertId) ?? [],
      );

      return {previousAlerts};
    },
    onError: (_err, _alertId, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(
          priceAlertKeys.list(token ?? ''),
          context.previousAlerts,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: priceAlertKeys.list(token ?? ''),
      });
    },
  });

  // Computed functions using useMemo for stability
  const getAlertsBySource = useMemo(() => {
    return (source: string) =>
      alerts.filter(a => a.source === source && a.enabled);
  }, [alerts]);

  const getAlertsWithPriceDrop = useMemo(() => {
    return () =>
      alerts.filter(
        a =>
          a.enabled &&
          a.targetPrice &&
          a.currentPrice <= a.targetPrice &&
          a.priceHistory &&
          a.priceHistory.length > 1,
      );
  }, [alerts]);

  const getPriceChangePercent = useMemo(() => {
    return (alertId: number) => {
      const alert = alerts.find(a => a.id === alertId);
      if (!alert || !alert.priceHistory || alert.priceHistory.length < 2) {
        return null;
      }

      const oldest = alert.priceHistory[alert.priceHistory.length - 1];
      const newest = alert.priceHistory[0];

      const change = ((newest.price - oldest.price) / oldest.price) * 100;
      return Math.round(change * 10) / 10;
    };
  }, [alerts]);

  const hasActiveAlerts = useMemo(() => {
    return () => alerts.some(a => a.enabled && a.targetPrice);
  }, [alerts]);

  // Backward-compatible wrapper functions that accept token as first argument
  const fetchAlerts = async (_token: string) => {
    // Token is now passed via hook parameter, just refetch
    await alertsQuery.refetch();
  };

  const createAlert = async (_token: string, data: CreateAlertData) => {
    return createAlertMutation.mutateAsync(data);
  };

  const updatePriceAlert = async (
    _token: string,
    alertId: number,
    data: UpdateAlertData,
  ) => {
    return updateAlertMutation.mutateAsync({alertId, data});
  };

  const updatePrice = async (
    _token: string,
    alertId: number,
    price: number,
  ) => {
    return updatePriceMutation.mutateAsync({alertId, price});
  };

  const deleteAlert = async (_token: string, alertId: number) => {
    return deleteAlertMutation.mutateAsync(alertId);
  };

  // Price history query - separate hook for on-demand fetching
  const usePriceHistory = (alertId: number) => {
    return useQuery({
      queryKey: priceAlertKeys.history(token ?? '', alertId),
      enabled: !!token && !!alertId,
      queryFn: async () => {
        const response = await axios.get(`${API_BASE}/${alertId}/history`, {
          headers: {Authorization: `Bearer ${token}`},
        });
        return response.data;
      },
    });
  };

  // Backward-compatible getPriceHistory function
  const getPriceHistory = async (_token: string, alertId: number) => {
    const response = await axios.get(`${API_BASE}/${alertId}/history`, {
      headers: {Authorization: `Bearer ${token}`},
    });
    return response.data;
  };

  return {
    // State
    alerts,
    loading: alertsQuery.isLoading,
    error: alertsQuery.error?.message ?? null,

    // Actions (backward-compatible with token parameter)
    fetchAlerts,
    createAlert,
    updatePriceAlert,
    updatePrice,
    deleteAlert,
    getPriceHistory,

    // Computed
    getAlertsBySource,
    getAlertsWithPriceDrop,
    getPriceChangePercent,
    hasActiveAlerts,

    // Additional TanStack Query state for advanced usage
    isRefetching: alertsQuery.isRefetching,
    isCreating: createAlertMutation.isPending,
    isUpdating: updateAlertMutation.isPending,
    isDeleting: deleteAlertMutation.isPending,
    refetch: alertsQuery.refetch,
    usePriceHistory,
  };
};
