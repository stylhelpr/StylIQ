import { useCallback } from 'react';
import axios from 'axios';
import { usePriceAlertStore, PriceAlert } from '../../../../store/priceAlertStore';

const API_BASE = 'http://localhost:3001/api/price-tracking';

export const usePriceAlerts = () => {
  const {
    alerts,
    loading,
    error,
    setAlerts,
    addAlert,
    updateAlert,
    removeAlert,
    setLoading,
    setError,
    clearError,
    getAlertsBySource,
    getAlertsWithPriceDrop,
    getPriceChangePercent,
    hasActiveAlerts,
  } = usePriceAlertStore();

  const fetchAlerts = useCallback(async (token: string) => {
    setLoading(true);
    clearError();
    try {
      const response = await axios.get(`${API_BASE}/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch price alerts');
    } finally {
      setLoading(false);
    }
  }, [setAlerts, setLoading, setError, clearError]);

  const createAlert = useCallback(
    async (
      token: string,
      data: {
        url: string;
        title: string;
        currentPrice: number;
        targetPrice?: number;
        brand?: string;
        source: string;
      },
    ) => {
      clearError();
      try {
        const response = await axios.post(`${API_BASE}/track`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        addAlert(response.data);
        return response.data;
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to create price alert');
        throw err;
      }
    },
    [addAlert, setError, clearError],
  );

  const updatePriceAlert = useCallback(
    async (
      token: string,
      alertId: number,
      data: { targetPrice?: number; enabled?: boolean },
    ) => {
      clearError();
      try {
        const response = await axios.put(`${API_BASE}/${alertId}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        updateAlert(alertId, response.data);
        return response.data;
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to update price alert');
        throw err;
      }
    },
    [updateAlert, setError, clearError],
  );

  const updatePrice = useCallback(
    async (token: string, alertId: number, price: number) => {
      clearError();
      try {
        const response = await axios.put(`${API_BASE}/${alertId}/price`, { price }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        updateAlert(alertId, response.data);
        return response.data;
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to update price');
        throw err;
      }
    },
    [updateAlert, setError, clearError],
  );

  const deleteAlert = useCallback(
    async (token: string, alertId: number) => {
      clearError();
      try {
        await axios.delete(`${API_BASE}/${alertId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        removeAlert(alertId);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete price alert');
        throw err;
      }
    },
    [removeAlert, setError, clearError],
  );

  const getPriceHistory = useCallback(
    async (token: string, alertId: number) => {
      clearError();
      try {
        const response = await axios.get(`${API_BASE}/${alertId}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch price history');
        throw err;
      }
    },
    [setError, clearError],
  );

  return {
    // State
    alerts,
    loading,
    error,

    // Actions
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
  };
};
