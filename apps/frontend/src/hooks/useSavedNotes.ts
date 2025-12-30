import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '../lib/apiClient';

const BASE = '/saved-notes';

export interface SavedNote {
  id: string;
  user_id: string;
  url?: string;
  title?: string;
  content?: string;
  tags?: string[];
  image_url?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

// Get all notes for a user
export function useSavedNotes(userId: string) {
  return useQuery<SavedNote[], Error>({
    queryKey: ['saved-notes', userId],
    queryFn: async () => {
      const res = await apiClient.get(`${BASE}/${userId}`);
      return res.data;
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  });
}

// Create a new note
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      url,
      title,
      content,
      tags,
      image_url,
    }: {
      userId: string;
      url?: string;
      title?: string;
      content?: string;
      tags?: string[];
      image_url?: string;
    }) => {
      const res = await apiClient.post(BASE, {
        user_id: userId,
        url,
        title,
        content,
        tags,
        image_url,
      });
      return res.data as SavedNote;
    },
    onSuccess: (newNote) => {
      // Optimistically add the new note to the cache
      queryClient.setQueryData<SavedNote[]>(
        ['saved-notes', newNote.user_id],
        (old) => (old ? [newNote, ...old] : [newNote]),
      );
    },
  });
}

// Update an existing note
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      userId,
      url,
      title,
      content,
      tags,
      image_url,
      color,
    }: {
      noteId: string;
      userId: string;
      url?: string;
      title?: string;
      content?: string;
      tags?: string[];
      image_url?: string;
      color?: string | null;
    }) => {
      const res = await apiClient.put(`${BASE}/${noteId}`, {
        url,
        title,
        content,
        tags,
        image_url,
        color,
      });
      return res.data as SavedNote;
    },
    onMutate: async (variables) => {
      const {noteId, userId, color, ...updates} = variables;
      // Cancel outgoing refetches
      await queryClient.cancelQueries({queryKey: ['saved-notes', userId]});

      // Snapshot previous value
      const previousNotes = queryClient.getQueryData<SavedNote[]>([
        'saved-notes',
        userId,
      ]);

      // Optimistically update the cache
      queryClient.setQueryData<SavedNote[]>(['saved-notes', userId], (old) =>
        old?.map((note) =>
          note.id === noteId
            ? {
                ...note,
                ...updates,
                color: color === null ? undefined : color,
                updated_at: new Date().toISOString(),
              }
            : note,
        ),
      );

      return {previousNotes, userId};
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(
          ['saved-notes', variables.userId],
          context.previousNotes,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      // Refetch after error or success
      queryClient.invalidateQueries({queryKey: ['saved-notes', variables.userId]});
    },
  });
}

// Delete a note
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({noteId, userId}: {noteId: string; userId: string}) => {
      await apiClient.delete(`${BASE}/${noteId}`);
      return {noteId, userId};
    },
    onMutate: async ({noteId, userId}) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({queryKey: ['saved-notes', userId]});

      // Snapshot previous value
      const previousNotes = queryClient.getQueryData<SavedNote[]>([
        'saved-notes',
        userId,
      ]);

      // Optimistically remove from cache
      queryClient.setQueryData<SavedNote[]>(['saved-notes', userId], (old) =>
        old?.filter((note) => note.id !== noteId),
      );

      return {previousNotes};
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(
          ['saved-notes', variables.userId],
          context.previousNotes,
        );
      }
    },
  });
}
