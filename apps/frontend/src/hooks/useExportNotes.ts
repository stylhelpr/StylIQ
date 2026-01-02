import {Share, Alert} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import type {SavedNote} from './useSavedNotes';

/**
 * Hook for exporting notes to Apple Notes via iOS Share Sheet.
 *
 * User taps share → selects Notes → taps Save.
 * App Store safe - uses standard iOS Share Sheet.
 */
export function useExportNotes() {
  const haptic = (type: 'impactLight' | 'impactMedium' | 'notificationSuccess') =>
    ReactNativeHapticFeedback.trigger(type, {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

  /**
   * Format a single note as plain text for sharing.
   */
  const formatNoteAsText = (note: SavedNote): string => {
    const parts: string[] = [];

    if (note.title) {
      parts.push(note.title);
      parts.push('');
    }

    if (note.content) {
      parts.push(note.content);
      parts.push('');
    }

    if (note.url) {
      parts.push(`Link: ${note.url}`);
      parts.push('');
    }

    if (note.tags && note.tags.length > 0) {
      parts.push(`Tags: ${note.tags.join(', ')}`);
      parts.push('');
    }

    const date = new Date(note.updated_at || note.created_at);
    parts.push(
      `Saved on ${date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}`,
    );
    parts.push('');
    parts.push('— Exported from StylIQ');

    return parts.join('\n');
  };

  /**
   * Format multiple notes for export.
   */
  const formatAllNotesAsText = (notes: SavedNote[]): string => {
    if (notes.length === 0) return '';

    const header = `StylIQ Notes Export\n${notes.length} note${notes.length === 1 ? '' : 's'}\nExported on ${new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })}\n\n${'─'.repeat(30)}\n\n`;

    const formattedNotes = notes.map((note, index) => {
      const noteText = formatNoteAsText(note).replace('— Exported from StylIQ', '');
      return `[${index + 1}/${notes.length}]\n${noteText}`;
    });

    return header + formattedNotes.join(`\n${'─'.repeat(30)}\n\n`) + '\n— Exported from StylIQ';
  };

  /**
   * Export a single note via Share Sheet.
   */
  const exportNote = async (note: SavedNote): Promise<boolean> => {
    haptic('impactLight');

    try {
      const textContent = formatNoteAsText(note);

      const result = await Share.share(
        {
          message: textContent,
          title: note.title || 'StylIQ Note',
        },
        {
          subject: note.title || 'StylIQ Note',
        },
      );

      if (result.action === Share.sharedAction) {
        haptic('notificationSuccess');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Export note error:', error);
      Alert.alert('Export Failed', 'Unable to export note. Please try again.');
      return false;
    }
  };

  /**
   * Export all notes via Share Sheet.
   */
  const exportAllNotes = async (notes: SavedNote[]): Promise<boolean> => {
    haptic('impactLight');

    if (notes.length === 0) {
      Alert.alert('No Notes', "You don't have any notes to export.");
      return false;
    }

    try {
      const textContent = formatAllNotesAsText(notes);

      const result = await Share.share(
        {
          message: textContent,
          title: `StylIQ Notes (${notes.length})`,
        },
        {
          subject: `StylIQ Notes Export - ${notes.length} notes`,
        },
      );

      if (result.action === Share.sharedAction) {
        haptic('notificationSuccess');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Export all notes error:', error);
      Alert.alert('Export Failed', 'Unable to export notes. Please try again.');
      return false;
    }
  };

  return {
    exportNote,
    exportAllNotes,
    formatNoteAsText,
    formatAllNotesAsText,
  };
}
