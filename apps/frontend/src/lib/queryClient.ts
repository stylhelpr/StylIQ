import {QueryClient} from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prevent aggressive refetching that causes UI flashing
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Keep data fresh for 30 seconds by default
      staleTime: 30000,
      // Don't retry failed queries immediately
      retry: 1,
      retryDelay: 1000,
    },
  },
});
