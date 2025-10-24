import React from 'react';
import {VoiceBus} from '../utils/VoiceBus';
import {MainCategory} from '@types/categoryTypes';

/**
 * 🎯 Registers voice commands that only apply to AiStylistSuggestions screen.
 */
export function useAiSuggestionVoiceCommands(
  fetchSuggestion: Function,
  navigate: Function,
) {
  React.useEffect(() => {
    const handleCommand = (cmd: string) => {
      const text = cmd.toLowerCase().trim();

      // 🔹 Fetch new AI suggestion
      if (
        text.includes('new suggestion') ||
        text.includes('refresh suggestion')
      ) {
        console.log('🎙️ Voice: new suggestion');
        fetchSuggestion('voice');
        return;
      }

      // 🔹 Go to wardrobe
      if (text.includes('show wardrobe gaps') || text.includes('wardrobe')) {
        console.log('🎙️ Voice: open wardrobe');
        navigate('Wardrobe');
        return;
      }

      // 🔹 Ask stylist
      if (text.includes('ask stylist') || text.includes('styling question')) {
        console.log('🎙️ Voice: open stylist chat');
        navigate('AiStylistChatScreen');
        return;
      }
    };

    VoiceBus.on('voiceCommand', handleCommand);
    return () => VoiceBus.off('voiceCommand', handleCommand);
  }, [fetchSuggestion, navigate]);
}

/**
 * 🏠 Registers voice commands that only apply to HomeScreen.
 * Handles modals, saved looks, and wardrobe access.
 */
export function useHomeVoiceCommands(
  setImageModalVisible: (v: boolean) => void,
  setSaveModalVisible: (v: boolean) => void,
  navigate: (screen: string, params?: any) => void,
) {
  React.useEffect(() => {
    const handleCommand = (cmd: string) => {
      const text = cmd.toLowerCase().trim();
      console.log('🎙️ [Voice] HomeScreen received:', text);

      // 🔹 “See All Saved Looks” modal
      if (
        text.includes('see all inspired looks') ||
        text.includes('show inpsired looks') ||
        text.includes('open inspired looks') ||
        text.includes('see inspired looks')
      ) {
        console.log('🎙️ Voice: opening AllSavedLooksModal');
        setImageModalVisible(true);
        return;
      }

      // 🔹 Add a new look
      if (
        text.includes('add look') ||
        text.includes('save look') ||
        text.includes('new look') ||
        text.includes('add outfit')
      ) {
        console.log('🎙️ Voice: opening SaveLookModal');
        setSaveModalVisible(true);
        return;
      }

      // 🔹 Navigate to wardrobe
      if (text.includes('wardrobe') || text.includes('closet')) {
        console.log('🎙️ Voice: navigating to Wardrobe');
        navigate('Wardrobe');
        return;
      }
    };

    VoiceBus.on('voiceCommand', handleCommand);
    return () => VoiceBus.off('voiceCommand', handleCommand);
  }, [setImageModalVisible, setSaveModalVisible, navigate]);
}

/**
 * 👕 Registers voice commands for ClosetScreen.
 * Handles filtering, sorting, and category changes.
 */
export function useClosetVoiceCommands(
  openSubmenu: (view: 'filter' | 'sort') => void,
  setMenuVisible: React.Dispatch<React.SetStateAction<boolean>>,
  setSelectedCategory: React.Dispatch<
    React.SetStateAction<'All' | MainCategory>
  >,
  setSortOption: React.Dispatch<
    React.SetStateAction<'az' | 'za' | 'favorites'>
  >,
) {
  React.useEffect(() => {
    const handleCommand = (cmd: string) => {
      const text = cmd.toLowerCase().trim();
      console.log('🎙️ [Voice] ClosetScreen received:', text);

      // 🔹 Category-specific filters first (so “filter tops” works)
      const categories: Record<string, MainCategory> = {
        tops: 'Tops',
        bottoms: 'Bottoms',
        outerwear: 'Outerwear',
        shoes: 'Shoes',
        accessories: 'Accessories',
        undergarments: 'Undergarments',
        activewear: 'Activewear',
        formalwear: 'Formalwear',
        loungewear: 'Loungewear',
        sleepwear: 'Sleepwear',
        swimwear: 'Swimwear',
        maternity: 'Maternity',
        unisex: 'Unisex',
        costumes: 'Costumes',
      };

      for (const [keyword, category] of Object.entries(categories)) {
        if (text.includes(keyword)) {
          console.log(`🎙️ Voice: filtering wardrobe for ${category}`);
          setSelectedCategory(category);
          return;
        }
      }

      // 🔹 Reset filter
      if (text.includes('show all') || text.includes('clear filter')) {
        console.log('🎙️ Voice: resetting filters');
        setSelectedCategory('All');
        return;
      }

      // 🔹 Open Filter menu (only if no specific category keyword was found)
      if (
        (text.includes('filter') ||
          text.includes('filters') ||
          text.includes('show only') ||
          text.includes('show me') ||
          text.includes('show') ||
          text.includes('filter wardrobe')) &&
        !Object.keys(categories).some(k => text.includes(k))
      ) {
        console.log('🎙️ Voice: opening Filter submenu');
        setMenuVisible(true);
        openSubmenu('filter');
        return;
      }

      // 🔹 Open Sort menu
      if (
        text.includes('sort') ||
        text.includes('sorting') ||
        text.includes('sort wardrobe')
      ) {
        console.log('🎙️ Voice: opening Sort submenu');
        setMenuVisible(true);
        openSubmenu('sort');
        return;
      }

      // 🔹 Sorting commands
      if (text.includes('sort by name a') || text.includes('a to z')) {
        console.log('🎙️ Voice: sorting A-Z');
        setSortOption('az');
        return;
      }

      if (text.includes('sort by name z') || text.includes('z to a')) {
        console.log('🎙️ Voice: sorting Z-A');
        setSortOption('za');
        return;
      }

      if (
        text.includes('sort by favorites') ||
        text.includes('favorites first')
      ) {
        console.log('🎙️ Voice: sorting by favorites');
        setSortOption('favorites');
        return;
      }
    };

    VoiceBus.on('voiceCommand', handleCommand);
    return () => VoiceBus.off('voiceCommand', handleCommand);
  }, [openSubmenu, setMenuVisible, setSelectedCategory, setSortOption]);
}

///////////////////

// import React from 'react';
// import {VoiceBus} from '../utils/VoiceBus';

// /**
//  * 🎯 Registers voice commands that only apply to AiStylistSuggestions screen.
//  */
// export function useAiSuggestionVoiceCommands(
//   fetchSuggestion: Function,
//   navigate: Function,
// ) {
//   React.useEffect(() => {
//     const handleCommand = (cmd: string) => {
//       const text = cmd.toLowerCase().trim();

//       // 🔹 Fetch new AI suggestion
//       if (
//         text.includes('new suggestion') ||
//         text.includes('refresh suggestion')
//       ) {
//         console.log('🎙️ Voice: new suggestion');
//         fetchSuggestion('voice');
//         return;
//       }

//       // 🔹 Go to wardrobe
//       if (text.includes('show wardrobe gaps') || text.includes('wardrobe')) {
//         console.log('🎙️ Voice: open wardrobe');
//         navigate('Wardrobe');
//         return;
//       }

//       // 🔹 Ask stylist
//       if (text.includes('ask stylist') || text.includes('styling question')) {
//         console.log('🎙️ Voice: open stylist chat');
//         navigate('AiStylistChatScreen');
//         return;
//       }
//     };

//     VoiceBus.on('voiceCommand', handleCommand);
//     return () => VoiceBus.off('voiceCommand', handleCommand);
//   }, [fetchSuggestion, navigate]);
// }

// /**
//  * 🏠 Registers voice commands that only apply to HomeScreen.
//  * Handles modals, saved looks, and wardrobe access.
//  */
// export function useHomeVoiceCommands(
//   setImageModalVisible: (v: boolean) => void,
//   setSaveModalVisible: (v: boolean) => void,
//   navigate: (screen: string, params?: any) => void,
// ) {
//   React.useEffect(() => {
//     const handleCommand = (cmd: string) => {
//       const text = cmd.toLowerCase().trim();
//       console.log('🎙️ [Voice] HomeScreen received:', text);

//       // 🔹 “See All Saved Looks” modal
//       if (
//         text.includes('see all inspired looks') ||
//         text.includes('show inpsired looks') ||
//         text.includes('open inspired looks') ||
//         text.includes('see inspired looks')
//       ) {
//         console.log('🎙️ Voice: opening AllSavedLooksModal');
//         setImageModalVisible(true);
//         return;
//       }

//       // 🔹 Add a new look
//       if (
//         text.includes('add look') ||
//         text.includes('save look') ||
//         text.includes('new look') ||
//         text.includes('add outfit')
//       ) {
//         console.log('🎙️ Voice: opening SaveLookModal');
//         setSaveModalVisible(true);
//         return;
//       }

//       // 🔹 Navigate to wardrobe
//       if (text.includes('wardrobe') || text.includes('closet')) {
//         console.log('🎙️ Voice: navigating to Wardrobe');
//         navigate('Wardrobe');
//         return;
//       }
//     };

//     VoiceBus.on('voiceCommand', handleCommand);
//     return () => VoiceBus.off('voiceCommand', handleCommand);
//   }, [setImageModalVisible, setSaveModalVisible, navigate]);
// }

///////////////////////

// import React from 'react';
// import {VoiceBus} from '../utils/VoiceBus';

// /**
//  * Registers voice commands that only apply to AiStylistSuggestions screen.
//  */
// export function useAiSuggestionVoiceCommands(
//   fetchSuggestion: Function,
//   navigate: Function,
// ) {
//   React.useEffect(() => {
//     const handleCommand = (cmd: string) => {
//       const text = cmd.toLowerCase().trim();

//       if (
//         text.includes('new suggestion') ||
//         text.includes('refresh suggestion')
//       ) {
//         console.log('🎙️ Voice: new suggestion');
//         fetchSuggestion('voice');
//         return;
//       }

//       if (text.includes('show wardrobe gaps') || text.includes('wardrobe')) {
//         console.log('🎙️ Voice: open wardrobe');
//         navigate('Wardrobe');
//         return;
//       }

//       if (text.includes('ask stylist') || text.includes('styling question')) {
//         console.log('🎙️ Voice: open stylist chat');
//         navigate('AiStylistChatScreen');
//         return;
//       }
//     };

//     VoiceBus.on('voiceCommand', handleCommand);
//     return () => {
//       VoiceBus.off('voiceCommand', handleCommand);
//     };
//   }, [fetchSuggestion, navigate]);
// }

/////////////////

// import React from 'react';
// import {VoiceBus} from '../utils/VoiceBus';

// /**
//  * Registers voice commands that only apply to AiStylistSuggestions screen.
//  */
// export function useAiSuggestionVoiceCommands(
//   fetchSuggestion: Function,
//   navigate: Function,
// ) {
//   React.useEffect(() => {
//     const handleCommand = (cmd: string) => {
//       const text = cmd.toLowerCase().trim();

//       if (
//         text.includes('new suggestion') ||
//         text.includes('refresh suggestion')
//       ) {
//         console.log('🎙️ Voice: new suggestion');
//         fetchSuggestion('voice');
//         return;
//       }

//       if (text.includes('show wardrobe gaps') || text.includes('wardrobe')) {
//         console.log('🎙️ Voice: open wardrobe');
//         navigate('Wardrobe');
//         return;
//       }

//       if (text.includes('ask stylist') || text.includes('styling question')) {
//         console.log('🎙️ Voice: open stylist chat');
//         navigate('AiStylistChatScreen');
//         return;
//       }
//     };

//     VoiceBus.on('voiceCommand', handleCommand);
//     return () => {
//       VoiceBus.off('voiceCommand', handleCommand);
//     };
//   }, [fetchSuggestion, navigate]);
// }
