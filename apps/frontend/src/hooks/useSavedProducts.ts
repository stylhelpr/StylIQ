import {useMutation, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '../lib/apiClient';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface SavedProduct {
  id: string;
  product_id: string;
  title: string;
  brand?: string | null;
  price?: number | null;
  price_raw?: string | null;
  image_url: string;
  link: string;
  source?: string | null;
  category?: string | null;
  saved?: boolean;
  saved_at?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Unsave Product Mutation
// ─────────────────────────────────────────────────────────────

/**
 * Unsave a product from saved recommendations
 */
export function useUnsaveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      productId,
    }: {
      userId: string;
      productId: string;
    }) => {
      const res = await apiClient.post(`/discover/${userId}/unsave`, {
        product_id: productId,
      });
      return res.data;
    },
    onMutate: async ({userId, productId}) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({queryKey: ['saved-products', userId]});

      // Snapshot previous value
      const previousProducts = queryClient.getQueryData<SavedProduct[]>([
        'saved-products',
        userId,
      ]);

      // Optimistically remove from cache
      queryClient.setQueryData<SavedProduct[]>(
        ['saved-products', userId],
        old => old?.filter(p => p.product_id !== productId),
      );

      return {previousProducts, userId};
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousProducts) {
        queryClient.setQueryData(
          ['saved-products', variables.userId],
          context.previousProducts,
        );
      }
    },
  });
}
