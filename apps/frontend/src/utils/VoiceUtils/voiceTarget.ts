// src/utils/VoiceTarget.ts
// -----------------------------------------------------------------------------
// 🎯 VoiceTarget — global controller for active text input binding
// -----------------------------------------------------------------------------
// • Routes speech-to-text into currently focused TextInput
// • Auto-clears on blur or navigation
// • Auto-releases input once a full phrase is spoken
// • Adds .lock() to freeze dictation when entering voice-command mode
// -----------------------------------------------------------------------------
import {VoiceMemory} from './VoiceMemory';

export const VoiceTarget = {
  currentSetter: null as ((text: string) => void) | null,
  currentName: '' as string,
  lastSetTime: 0,
  locked: false, // ⛔ prevents dictation during command mode

  set(setter: (text: string) => void, name?: string) {
    this.currentSetter = setter;
    this.currentName = name || '';
    this.lastSetTime = Date.now();
    this.locked = false;
    console.log('[VoiceTarget] 🎯 active input set →', this.currentName);
  },

  clear() {
    if (this.currentSetter) {
      console.log('[VoiceTarget] 🧹 cleared →', this.currentName);
    }
    this.currentSetter = null;
    this.currentName = '';
    this.lastSetTime = 0;
  },

  lock() {
    // called when entering navigation/command mode
    this.locked = true;
    this.currentSetter = null;
    this.currentName = '';
    this.lastSetTime = 0;
    console.log('[VoiceTarget] 🔒 locked (command mode)');
  },

  applyText(text: string) {
    // ⛔ Respect command lock
    if (this.locked) {
      // 🧠 Allow contextual follow-ups even when locked
      if (/what about|how about|and then|next|tomorrow/i.test(text)) {
        const lastIntent = VoiceMemory.get('lastIntent');
        if (lastIntent) {
          console.log(
            '🧠 Context reactivated for follow-up intent:',
            lastIntent,
          );
          this.locked = false; // temporarily unlock to route command
        } else {
          console.log('[VoiceTarget] ⛔ locked, ignoring (no context):', text);
          return;
        }
      } else {
        // 🧠 Contextual follow-up fallback (no active input)
        if (/what about|how about|and then|next|tomorrow/i.test(text)) {
          const lastIntent = VoiceMemory.get('lastIntent');
          if (lastIntent) {
            console.log(
              '🧠 Contextual follow-up detected:',
              text,
              '→ lastIntent:',
              lastIntent,
            );
            const {matchVoiceCommand} = require('./voiceCommandMap');
            matchVoiceCommand(text, () => {}); // triggers the proper action (e.g., tomorrow forecast)
            return;
          }
        }
        console.log('[VoiceTarget] (no active input) ignored:', text);
      }
    }

    const now = Date.now();

    if (this.currentSetter && now - this.lastSetTime < 15000) {
      this.currentSetter(text);
      console.log('[VoiceTarget] ✍️ applied →', this.currentName);

      if (text.trim().endsWith('.') || text.split(' ').length > 5) {
        console.log('[VoiceTarget] 🧹 auto-clear after commit');
        this.clear();
      }
    } else {
      if (this.currentSetter) {
        console.log('[VoiceTarget] ⚠️ stale input ignored →', this.currentName);
      } else {
        // 🧠 contextual rescue for follow-ups with no active setter
        if (/what about|how about|and then|next|tomorrow/i.test(text)) {
          const lastIntent = VoiceMemory.get('lastIntent');
          if (lastIntent) {
            console.log('🧠 Routing follow-up via VoiceMemory →', lastIntent);
            // forward text directly to your voice command router
            const {matchVoiceCommand} = require('./voiceCommandMap');
            matchVoiceCommand(text, () => {});
            return;
          }
        }
        console.log('[VoiceTarget] (no active input) ignored:', text);
      }
    }
  },
};

//////////////////////

// // src/utils/VoiceTarget.ts
// // -----------------------------------------------------------------------------
// // 🎯 VoiceTarget — global controller for active text input binding
// // -----------------------------------------------------------------------------
// // • Routes speech-to-text into currently focused TextInput
// // • Auto-clears on blur or navigation
// // • Auto-releases input once a full phrase is spoken
// // • Adds .lock() to freeze dictation when entering voice-command mode
// // -----------------------------------------------------------------------------

// export const VoiceTarget = {
//   currentSetter: null as ((text: string) => void) | null,
//   currentName: '' as string,
//   lastSetTime: 0,
//   locked: false, // ⛔ prevents dictation during command mode

//   set(setter: (text: string) => void, name?: string) {
//     this.currentSetter = setter;
//     this.currentName = name || '';
//     this.lastSetTime = Date.now();
//     this.locked = false;
//     console.log('[VoiceTarget] 🎯 active input set →', this.currentName);
//   },

//   clear() {
//     if (this.currentSetter) {
//       console.log('[VoiceTarget] 🧹 cleared →', this.currentName);
//     }
//     this.currentSetter = null;
//     this.currentName = '';
//     this.lastSetTime = 0;
//   },

//   lock() {
//     // called when entering navigation/command mode
//     this.locked = true;
//     this.currentSetter = null;
//     this.currentName = '';
//     this.lastSetTime = 0;
//     console.log('[VoiceTarget] 🔒 locked (command mode)');
//   },

//   applyText(text: string) {
//     if (this.locked) {
//       console.log('[VoiceTarget] ⛔ locked, ignoring:', text);
//       return;
//     }

//     const now = Date.now();
//     if (this.currentSetter && now - this.lastSetTime < 15000) {
//       this.currentSetter(text);
//       console.log('[VoiceTarget] ✍️ applied →', this.currentName);

//       if (text.trim().endsWith('.') || text.split(' ').length > 5) {
//         console.log('[VoiceTarget] 🧹 auto-clear after commit');
//         this.clear();
//       }
//     } else {
//       if (this.currentSetter) {
//         console.log('[VoiceTarget] ⚠️ stale input ignored →', this.currentName);
//       } else {
//         console.log('[VoiceTarget] (no active input) ignored:', text);
//       }
//     }
//   },
// };

////////////////////

// // src/utils/VoiceTarget.ts
// // -----------------------------------------------------------------------------
// // 🎯 VoiceTarget — global controller for active text input binding
// // -----------------------------------------------------------------------------
// // • Routes speech-to-text into currently focused TextInput
// // • Auto-clears on blur or navigation
// // • Auto-releases input once a full phrase is spoken
// // -----------------------------------------------------------------------------

// export const VoiceTarget = {
//   currentSetter: null as ((text: string) => void) | null,
//   currentName: '' as string,
//   lastSetTime: 0,

//   // Assign current active input
//   set(setter: (text: string) => void, name?: string) {
//     this.currentSetter = setter;
//     this.currentName = name || '';
//     this.lastSetTime = Date.now();
//     console.log('[VoiceTarget] 🎯 active input set →', this.currentName);
//   },

//   // Remove link (on blur or navigation)
//   clear() {
//     if (this.currentSetter) {
//       console.log('[VoiceTarget] 🧹 cleared →', this.currentName);
//     }
//     this.currentSetter = null;
//     this.currentName = '';
//     this.lastSetTime = 0;
//   },

//   // Inject text from speech
//   applyText(text: string) {
//     const now = Date.now();
//     if (this.currentSetter && now - this.lastSetTime < 15000) {
//       this.currentSetter(text);
//       console.log('[VoiceTarget] ✍️ applied →', this.currentName);

//       // 🧠 Auto-release input once speech feels complete
//       // (heuristic: end of sentence or >5 words)
//       if (text.trim().endsWith('.') || text.split(' ').length > 5) {
//         console.log('[VoiceTarget] 🧹 auto-clear after commit');
//         this.clear();
//       }
//     } else {
//       if (this.currentSetter) {
//         console.log('[VoiceTarget] ⚠️ stale input ignored →', this.currentName);
//       } else {
//         console.log('[VoiceTarget] (no active input) ignored:', text);
//       }
//     }
//   },
// };
