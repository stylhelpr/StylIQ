/* eslint-disable react-native/no-inline-styles */
import React, {useMemo, useRef, useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  PermissionsAndroid,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import dayjs from 'dayjs';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {API_BASE_URL} from '../config/api';
import {useVoiceControl} from '../hooks/useVoiceControl';
import {DeviceEventEmitter} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {sendHandoff} from '../utils/handoffMailbox';

type Role = 'user' | 'assistant' | 'system';

type Message = {
  id: string;
  role: Role;
  text: string;
  createdAt: number;
};

type Props = {navigate: (screen: string, params?: any) => void};

const HANDOFF_EVENT = 'outfit.handoff';
const HANDOFF_KEY = 'handoff.outfit';

const SUGGESTIONS_DEFAULT = [
  'Build a smart-casual look for 75°F',
  'What should I wear to a gallery opening?',
  'Make 3 outfit ideas from my polos + loafers',
  'Refine that last look for “business creative”',
];

export default function AiStylistChatScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const insets = useSafeAreaInsets();

  /** Styles */
  function makeStyles() {
    const {theme} = useAppTheme();

    return StyleSheet.create({
      safeArea: {
        backgroundColor: theme.colors.surface,
        flex: 1,
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 2,
        paddingBottom: 8,
        color: theme.colors.foreground,
        marginTop: -38,
      },
      ctaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 34,
        borderRadius: 10,
        backgroundColor: theme.colors.button1,
        marginLeft: 6,
        maxWidth: 280,
        marginTop: 8,
      },
      ctaText: {
        color: theme.colors.foreground,
        fontSize: 13,
        fontWeight: '700',
      },
      headerLeft: {flexDirection: 'row', alignItems: 'center'},
      presenceDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
      },
      headerRight: {flexDirection: 'row', alignItems: 'center', gap: 4},
      iconButton: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: theme.colors.surface,
      },
      messagesWrap: {
        flex: 1,
        minHeight: 120,
      },
      listContent: {
        paddingHorizontal: 12,
        paddingBottom: 6,
        gap: 10,
      },
      typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginHorizontal: 12,
        marginBottom: 8,
        borderRadius: 14,
        backgroundColor: 'rgb(48, 48, 48)',
        borderWidth: tokens.borderWidth.hairline,
        borderColor: theme.colors.surfaceBorder,
        gap: 8,
      },
      typingText: {color: theme.colors.surface, fontSize: 13},
      suggestionRow: {
        paddingVertical: 6,
      },
      suggestionContent: {paddingHorizontal: 12, columnGap: 8},
      suggestionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 15,
        borderRadius: 14,
        backgroundColor: theme.colors.surface,
        color: theme.colors.foreground,
        borderWidth: tokens.borderWidth.hairline,
        borderColor: 'rgb(48, 48, 48)',
        maxWidth: 260,
        gap: 6,
        marginRight: 8,
      },
      suggestionText: {
        color: theme.colors.foreground,
        fontSize: 14,
        fontWeight: '600',
      },
      inputBarWrap: {
        paddingHorizontal: 10,
        paddingBottom: Platform.OS === 'ios' ? 8 : 10,
        paddingTop: 18,
        marginBottom: 4,
      },
      inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderWidth: tokens.borderWidth.hairline,
        borderColor: theme.colors.surfaceBorder,
        backgroundColor: theme.colors.surface3,
        borderRadius: 20,
        paddingHorizontal: 8,
      },
      leftIcon: {
        width: 30,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
      },
      rightIcon: {
        width: 30,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
      },
      input: {
        flex: 1,
        minHeight: 35,
        maxHeight: 140,
        color: theme.colors.foreground,
        paddingHorizontal: 8,
        paddingTop: 7,
        paddingBottom: 6,
        fontSize: 16,
      },
      sendButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
        backgroundColor: theme.colors.surface,
      },
    });
  }

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'seed-1',
      role: 'assistant',
      text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(SUGGESTIONS_DEFAULT);

  const inputRef = useRef<TextInput | null>(null);

  // 🎙️ Voice state
  const [isHolding, setIsHolding] = useState(false);
  const {speech, isRecording, startListening, stopListening} =
    useVoiceControl();

  const scrollRef = useRef<ScrollView | null>(null);
  const themed = useMemo(() => makeStyles(theme), [theme]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({animated: true});
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ensure we keep content visible when keyboard opens
  useEffect(() => {
    const sub1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
    const sub2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [scrollToBottom]);

  // mic permission / AVAudioSession prep (same flow as SearchScreen)
  async function prepareAudio() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('🎙️ Mic permission denied');
        return false;
      }
    } else {
      try {
        const AV = require('react-native').NativeModules.AVAudioSession;
        if (AV?.setCategory) {
          await AV.setCategory('PlayAndRecord');
          await AV.setActive(true);
        }
      } catch (e) {
        console.warn('AudioSession error', e);
      }
    }
    return true;
  }

  // feed speech into input (same as SearchScreen)
  useEffect(() => {
    if (typeof speech === 'string') {
      setInput(speech);
    }
  }, [speech]);

  // ✅ mic press handlers (works inside AppleTouchFeedback)
  const handleMicPressIn = useCallback(async () => {
    const ok = await prepareAudio();
    if (!ok) return;
    setIsHolding(true);
    startListening();
  }, [startListening]);

  const handleMicPressOut = useCallback(() => {
    setIsHolding(false);
    stopListening();
  }, [stopListening]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    // 🔹 Clear immediately (state + native)
    setInput('');
    inputRef.current?.clear();

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      createdAt: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    Keyboard.dismiss();

    try {
      const historyForApi = [...messages, userMsg];
      const assistant = await callAiChatAPI(historyForApi, userMsg);

      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: assistant.text,
        createdAt: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);

      setSuggestions(
        assistant.suggestions?.length
          ? assistant.suggestions
          : rotate(suggestions),
      );
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: "Hmm, I couldn't reach the styling service. Want me to try again?",
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, messages, suggestions]);

  const handleSuggestion = useCallback((s: string) => setInput(s), []);

  // ──────────────────────────────────────────────────────────────
  // New: derive last actionable prompt and hand-off to Outfit screen
  // ──────────────────────────────────────────────────────────────
  const lastActionablePrompt = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === 'user' && m.text.trim()) return m.text.trim();
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === 'assistant' && m.text.trim()) return m.text.trim();
    }
    return input.trim();
  }, [messages, input]);

  const sendToOutfit = useCallback((prompt: string) => {
    const clean = (prompt || '').trim();
    if (!clean) return;
    const payload = {seedPrompt: clean, autogenerate: true, ts: Date.now()};
    console.log('➡️ handoff -> outfit', payload);
    sendHandoff(payload);
    requestAnimationFrame(() => navigate('Outfit'));
  }, []);

  // Only enable after the AI has replied to the most recent user message
  const canSendToOutfit = useMemo(() => {
    const lastUser = [...messages]
      .reverse()
      .find(m => m.role === 'user' && m.text.trim());
    if (!lastUser) return false;
    const hasAssistantAfterUser = messages.some(
      m =>
        m.role === 'assistant' &&
        m.text.trim() &&
        m.createdAt > lastUser.createdAt,
    );
    return hasAssistantAfterUser;
  }, [messages]);

  // Use the latest assistant reply that came AFTER the user's most recent message
  const assistantPrompt = useMemo(() => {
    const lastUser = [...messages]
      .reverse()
      .find(m => m.role === 'user' && m.text.trim());
    if (!lastUser) return '';

    let lastAssistantAfterUser: Message | null = null;
    for (const m of messages) {
      if (
        m.role === 'assistant' &&
        m.text.trim() &&
        m.createdAt > lastUser.createdAt
      ) {
        lastAssistantAfterUser = m; // keep the latest one after the user
      }
    }
    return lastAssistantAfterUser?.text.trim() ?? '';
  }, [messages]);

  // const sendToOutfitSafe = useCallback(() => {
  //   if (!canSendToOutfit) return; // hard guard
  //   const prompt = lastActionablePrompt?.trim();
  //   if (!prompt) return; // secondary guard
  //   sendToOutfit(prompt);
  // }, [canSendToOutfit, lastActionablePrompt, sendToOutfit]);

  const sendToOutfitSafe = useCallback(() => {
    if (!canSendToOutfit) return; // belt
    if (!assistantPrompt) return; // suspenders
    sendToOutfit(assistantPrompt); // ✅ send the AI’s response
  }, [canSendToOutfit, assistantPrompt, sendToOutfit]);

  return (
    <SafeAreaView
      style={[globalStyles.screen]}
      edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={themed.header}>
        <View style={themed.headerLeft}>
          <View
            style={[
              themed.presenceDot,
              {backgroundColor: theme.colors.success},
            ]}
          />
          <Text style={globalStyles.header}>AI Stylist Chat</Text>
        </View>
        <View style={themed.headerRight}>
          <AppleTouchFeedback type="light">
            <TouchableOpacity
              style={themed.iconButton}
              onPress={scrollToBottom}>
              <MaterialIcons
                name="refresh"
                size={22}
                color={theme.colors.foreground}
              />
            </TouchableOpacity>
          </AppleTouchFeedback>
        </View>
      </View>

      {/* Whole content avoids keyboard */}
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{paddingBottom: 100}} // enough space for input
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
          {/* Messages */}
          <View style={themed.messagesWrap}>
            <TouchableWithoutFeedback
              onPress={Keyboard.dismiss}
              accessible={false}>
              <View style={{flex: 1}}>
                <ScrollView
                  ref={scrollRef}
                  contentContainerStyle={[
                    themed.listContent,
                    {paddingBottom: 16},
                  ]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={
                    Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                  }
                  onContentSizeChange={scrollToBottom}
                  scrollEnabled={!isHolding}>
                  {messages.map(m => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>

          {/* Typing */}
          {isTyping && (
            <Animatable.View
              animation="fadeInUp"
              duration={220}
              style={themed.typingContainer}>
              <TypingDots />
              <Text style={themed.typingText}>Stylist is thinking…</Text>
            </Animatable.View>
          )}
        </ScrollView>

        {/* Send to Outfit */}
        <View
          pointerEvents={canSendToOutfit ? 'auto' : 'none'}
          style={{justifyContent: 'center', alignItems: 'center'}}>
          <AppleTouchFeedback type="impactLight">
            <TouchableOpacity
              style={[
                globalStyles.buttonPrimary,
                {opacity: canSendToOutfit ? 1 : 0.4},
                {width: 240},
              ]}
              onPress={sendToOutfitSafe}
              disabled={!canSendToOutfit}
              accessibilityLabel="Create an outfit from this prompt"
              accessibilityHint="Opens Style Me and builds an outfit from the AI’s latest response">
              <Text style={globalStyles.buttonPrimaryText}>
                Create Outfit From Prompt
              </Text>
            </TouchableOpacity>
          </AppleTouchFeedback>
        </View>

        {/* Input bar */}
        <View style={themed.inputBarWrap}>
          <View style={themed.inputBar}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder="Ask for a look… event, vibe, weather"
              placeholderTextColor={'#9c9c9cff'}
              style={themed.input}
              multiline
              onFocus={() => setTimeout(scrollToBottom, 50)}
              onSubmitEditing={send}
              returnKeyType="send"
              blurOnSubmit={false}
              keyboardAppearance="dark"
            />

            {/* 🎙️ Mic = hold-to-speak */}
            <AppleTouchFeedback type="light">
              <TouchableOpacity
                style={themed.rightIcon}
                onPressIn={handleMicPressIn}
                onPressOut={handleMicPressOut}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <MaterialIcons
                  name={isRecording ? 'mic' : 'mic-none'}
                  size={22}
                  color={
                    isRecording
                      ? theme.colors.primary
                      : theme.colors.foreground2
                  }
                />
              </TouchableOpacity>
            </AppleTouchFeedback>

            <AppleTouchFeedback type="impactLight">
              <TouchableOpacity
                onPress={send}
                disabled={!input.trim() || isTyping}
                style={[
                  themed.sendButton,
                  {opacity: !input.trim() || isTyping ? 0.4 : 1},
                ]}>
                {isTyping ? (
                  <ActivityIndicator />
                ) : (
                  <MaterialIcons name="arrow-upward" size={22} color="#fff" />
                )}
              </TouchableOpacity>
            </AppleTouchFeedback>
          </View>
        </View>
        {/* Removed iOS InputAccessoryView (Done bar) */}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Bubble */
function MessageBubble({message}: {message: Message}) {
  const {theme} = useAppTheme();
  const isUser = message.role === 'user';
  const bubble = isUser
    ? stylesUserBubble(theme)
    : stylesAssistantBubble(theme);

  return (
    <Animatable.View
      animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
      duration={220}
      easing="ease-out-cubic"
      style={[bubble.row]}>
      <View style={bubble.bubble}>
        <Text style={bubble.text}>{message.text}</Text>
        <Text style={bubble.time}>
          {dayjs(message.createdAt).format('h:mm A')}
        </Text>
      </View>
    </Animatable.View>
  );
}

/** Typing dots */
function TypingDots() {
  const dot = {width: 6, height: 6, borderRadius: 3, marginHorizontal: 3};
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
      }}>
      <Animatable.View
        animation="pulse"
        iterationCount="infinite"
        easing="ease-in-out"
        duration={900}
        style={[dot, {backgroundColor: 'rgb(48, 48, 48)'}]}
      />
      <Animatable.View
        delay={150}
        animation="pulse"
        iterationCount="infinite"
        easing="ease-in-out"
        duration={900}
        style={[dot, {backgroundColor: 'rgb(48, 48, 48)'}]}
      />
      <Animatable.View
        delay={300}
        animation="pulse"
        iterationCount="infinite"
        easing="ease-in-out"
        duration={900}
        style={[dot, {backgroundColor: 'rgb(48, 48, 48)'}]}
      />
    </View>
  );
}

/** API call — align to your NestJS route */
async function callAiChatAPI(
  history: Message[],
  latest: Message,
): Promise<{text: string; suggestions?: string[]}> {
  const payload = {
    messages: [...history, latest].map(m => ({
      role: m.role,
      content: m.text,
    })),
  };
  const res = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Bad response');
  const data = await res.json();
  return {
    text: data.reply ?? 'Styled response unavailable.',
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : undefined,
  };
}

/** Utils */
function rotate<T>(arr: T[]): T[] {
  if (arr.length < 2) return;
  const [head, ...rest] = arr;
  return [...rest, head];
}

function stylesUserBubble(theme: any) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      gap: 8,
      marginVertical: 2,
    },
    bubble: {
      maxWidth: '78%',
      backgroundColor: 'rgba(0, 119, 255, 1)',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 16,
      marginRight: 8,
    },
    text: {
      color: theme.colors.foreground,
      fontSize: 16,
      lineHeight: 22,
    },
    time: {
      color: theme.colors.foreground3,
      fontSize: 11,
      marginTop: 4,
      textAlign: 'right',
    },
    avatarWrap: {width: 30, height: 30},
    userInitials: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userInitialsText: {fontSize: 10, color: theme.colors.foreground},
  });
}

function stylesAssistantBubble(theme: any) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      gap: 8,
      marginVertical: 6,
    },
    avatarWrap: {width: 30, height: 30},
    avatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.surface,
    },
    bubble: {
      maxWidth: '82%',
      backgroundColor: 'rgba(39, 39, 39, 1)',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceborder,
      marginLeft: 8,
    },
    text: {
      color: theme.colors.foreground,
      fontSize: 16,
      lineHeight: 22,
    },
    time: {
      color: 'white',
      fontSize: 11,
      marginTop: 4,
      textAlign: 'right',
    },
  });
}

/////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useMemo, useRef, useState, useEffect, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {DeviceEventEmitter} from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {sendHandoff} from '../utils/handoffMailbox';

// type Role = 'user' | 'assistant' | 'system';

// type Message = {
//   id: string;
//   role: Role;
//   text: string;
//   createdAt: number;
// };

// type Props = {navigate: (screen: string, params?: any) => void};

// const HANDOFF_EVENT = 'outfit.handoff';
// const HANDOFF_KEY = 'handoff.outfit';

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();

//   const [messages, setMessages] = useState<Message[]>(() => [
//     {
//       id: 'seed-1',
//       role: 'assistant',
//       text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//       createdAt: Date.now(),
//     },
//   ]);
//   const [input, setInput] = useState('');
//   const [isTyping, setIsTyping] = useState(false);
//   const [suggestions, setSuggestions] = useState<string[]>(SUGGESTIONS_DEFAULT);

//   const inputRef = useRef<TextInput | null>(null);

//   // 🎙️ Voice state
//   const [isHolding, setIsHolding] = useState(false);
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   const scrollRef = useRef<ScrollView | null>(null);
//   const themed = useMemo(() => makeStyles(theme), [theme]);

//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() => {
//       scrollRef.current?.scrollToEnd({animated: true});
//     });
//   }, []);

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages, scrollToBottom]);

//   // ensure we keep content visible when keyboard opens
//   useEffect(() => {
//     const sub1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const sub2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       sub1.remove();
//       sub2.remove();
//     };
//   }, [scrollToBottom]);

//   // mic permission / AVAudioSession prep (same flow as SearchScreen)
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   // feed speech into input (same as SearchScreen)
//   useEffect(() => {
//     if (typeof speech === 'string') {
//       setInput(speech);
//     }
//   }, [speech]);

//   // ✅ mic press handlers (works inside AppleTouchFeedback)
//   const handleMicPressIn = useCallback(async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     setIsHolding(true);
//     startListening();
//   }, [startListening]);

//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//   }, [stopListening]);

//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;

//     // 🔹 Clear immediately (state + native)
//     setInput('');
//     inputRef.current?.clear();

//     const userMsg: Message = {
//       id: `u-${Date.now()}`,
//       role: 'user',
//       text: trimmed,
//       createdAt: Date.now(),
//     };

//     setMessages(prev => [...prev, userMsg]);
//     setIsTyping(true);
//     Keyboard.dismiss();

//     try {
//       const historyForApi = [...messages, userMsg];
//       const assistant = await callAiChatAPI(historyForApi, userMsg);

//       const aiMsg: Message = {
//         id: `a-${Date.now()}`,
//         role: 'assistant',
//         text: assistant.text,
//         createdAt: Date.now(),
//       };
//       setMessages(prev => [...prev, aiMsg]);

//       setSuggestions(
//         assistant.suggestions?.length
//           ? assistant.suggestions
//           : rotate(suggestions),
//       );
//     } catch {
//       setMessages(prev => [
//         ...prev,
//         {
//           id: `a-${Date.now()}`,
//           role: 'assistant',
//           text: "Hmm, I couldn't reach the styling service. Want me to try again?",
//           createdAt: Date.now(),
//         },
//       ]);
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages, suggestions]);

//   const handleSuggestion = useCallback((s: string) => setInput(s), []);

//   // ──────────────────────────────────────────────────────────────
//   // New: derive last actionable prompt and hand-off to Outfit screen
//   // ──────────────────────────────────────────────────────────────
//   const lastActionablePrompt = useMemo(() => {
//     for (let i = messages.length - 1; i >= 0; i--) {
//       const m = messages[i];
//       if (m.role === 'user' && m.text.trim()) return m.text.trim();
//     }
//     for (let i = messages.length - 1; i >= 0; i--) {
//       const m = messages[i];
//       if (m.role === 'assistant' && m.text.trim()) return m.text.trim();
//     }
//     return input.trim();
//   }, [messages, input]);

//   const sendToOutfit = useCallback((prompt: string) => {
//     const clean = (prompt || '').trim();
//     if (!clean) return;
//     const payload = {seedPrompt: clean, autogenerate: true, ts: Date.now()};
//     console.log('➡️ handoff -> outfit', payload);
//     sendHandoff(payload);
//     requestAnimationFrame(() => navigate('Outfit'));
//   }, []);

//   // Only enable after the AI has replied to the most recent user message
//   const canSendToOutfit = useMemo(() => {
//     const lastUser = [...messages]
//       .reverse()
//       .find(m => m.role === 'user' && m.text.trim());
//     if (!lastUser) return false;
//     const hasAssistantAfterUser = messages.some(
//       m =>
//         m.role === 'assistant' &&
//         m.text.trim() &&
//         m.createdAt > lastUser.createdAt,
//     );
//     return hasAssistantAfterUser;
//   }, [messages]);

//   // Use the latest assistant reply that came AFTER the user's most recent message
//   const assistantPrompt = useMemo(() => {
//     const lastUser = [...messages]
//       .reverse()
//       .find(m => m.role === 'user' && m.text.trim());
//     if (!lastUser) return '';

//     let lastAssistantAfterUser: Message | null = null;
//     for (const m of messages) {
//       if (
//         m.role === 'assistant' &&
//         m.text.trim() &&
//         m.createdAt > lastUser.createdAt
//       ) {
//         lastAssistantAfterUser = m; // keep the latest one after the user
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   // const sendToOutfitSafe = useCallback(() => {
//   //   if (!canSendToOutfit) return; // hard guard
//   //   const prompt = lastActionablePrompt?.trim();
//   //   if (!prompt) return; // secondary guard
//   //   sendToOutfit(prompt);
//   // }, [canSendToOutfit, lastActionablePrompt, sendToOutfit]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return; // belt
//     if (!assistantPrompt) return; // suspenders
//     sendToOutfit(assistantPrompt); // ✅ send the AI’s response
//   }, [canSendToOutfit, assistantPrompt, sendToOutfit]);

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       {/* Header */}
//       <View style={themed.header}>
//         <View style={themed.headerLeft}>
//           <View
//             style={[
//               themed.presenceDot,
//               {backgroundColor: theme.colors.success},
//             ]}
//           />
//           <Text style={themed.headerTitle}>AI Stylist Chat</Text>
//         </View>
//         <View style={themed.headerRight}>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={themed.iconButton}
//               onPress={scrollToBottom}>
//               <MaterialIcons
//                 name="refresh"
//                 size={22}
//                 color={theme.colors.primary}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {/* Whole content avoids keyboard */}
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         <ScrollView
//           ref={scrollRef}
//           contentContainerStyle={{paddingBottom: 100}} // enough space for input
//           showsVerticalScrollIndicator={false}
//           keyboardShouldPersistTaps="handled"
//           keyboardDismissMode="interactive">
//           {/* Messages */}
//           <View style={themed.messagesWrap}>
//             <TouchableWithoutFeedback
//               onPress={Keyboard.dismiss}
//               accessible={false}>
//               <View style={{flex: 1}}>
//                 <ScrollView
//                   ref={scrollRef}
//                   contentContainerStyle={[
//                     themed.listContent,
//                     {paddingBottom: 16},
//                   ]}
//                   showsVerticalScrollIndicator={false}
//                   keyboardShouldPersistTaps="handled"
//                   keyboardDismissMode={
//                     Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//                   }
//                   onContentSizeChange={scrollToBottom}
//                   scrollEnabled={!isHolding}>
//                   {messages.map(m => (
//                     <MessageBubble key={m.id} message={m} />
//                   ))}
//                 </ScrollView>
//               </View>
//             </TouchableWithoutFeedback>
//           </View>

//           {/* Typing */}
//           {isTyping && (
//             <Animatable.View
//               animation="fadeInUp"
//               duration={220}
//               style={themed.typingContainer}>
//               <TypingDots />
//               <Text style={themed.typingText}>Stylist is thinking…</Text>
//             </Animatable.View>
//           )}
//         </ScrollView>

//         {/* Suggestions */}
//         {/* <Animatable.View
//           animation="fadeInUp"
//           delay={60}
//           style={themed.suggestionRow}>
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={themed.suggestionContent}
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             {suggestions.map((item, idx) => (
//               <AppleTouchFeedback key={idx} type="light">
//                 <TouchableOpacity
//                   onPress={() => handleSuggestion(item)}
//                   style={themed.suggestionChip}>

//                   <Text style={themed.suggestionText}>{item}</Text>
//                 </TouchableOpacity>
//               </AppleTouchFeedback>
//             ))}
//           </ScrollView>
//         </Animatable.View> */}

//         {/* Send to Outfit */}
//         <View
//           pointerEvents={canSendToOutfit ? 'auto' : 'none'}
//           style={{justifyContent: 'center', alignItems: 'center'}}>
//           <AppleTouchFeedback type="impactLight">
//             <TouchableOpacity
//               style={[themed.ctaPill, {opacity: canSendToOutfit ? 1 : 0.4}]}
//               onPress={sendToOutfitSafe}
//               disabled={!canSendToOutfit}
//               accessibilityLabel="Create an outfit from this prompt"
//               accessibilityHint="Opens Style Me and builds an outfit from the AI’s latest response">
//               <MaterialIcons
//                 name="checkroom"
//                 size={20}
//                 color="#fff"
//                 style={{marginRight: 6}}
//               />
//               <Text style={themed.ctaText}>Create Outfit From Prompt</Text>
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>

//         {/* Input bar */}
//         <View style={themed.inputBarWrap}>
//           <View style={themed.inputBar}>
//             <TextInput
//               ref={inputRef}
//               value={input}
//               onChangeText={setInput}
//               placeholder="Ask for a look… event, vibe, weather"
//               placeholderTextColor={'#9c9c9cff'}
//               style={themed.input}
//               multiline
//               onFocus={() => setTimeout(scrollToBottom, 50)}
//               onSubmitEditing={send}
//               returnKeyType="send"
//               blurOnSubmit={false}
//               keyboardAppearance="dark"
//             />

//             {/* 🎙️ Mic = hold-to-speak */}
//             <AppleTouchFeedback type="light">
//               <TouchableOpacity
//                 style={themed.rightIcon}
//                 onPressIn={handleMicPressIn}
//                 onPressOut={handleMicPressOut}
//                 hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//                 <MaterialIcons
//                   name={isRecording ? 'mic' : 'mic-none'}
//                   size={22}
//                   color={
//                     isRecording
//                       ? theme.colors.primary
//                       : theme.colors.foreground2
//                   }
//                 />
//               </TouchableOpacity>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback type="impactLight">
//               <TouchableOpacity
//                 onPress={send}
//                 disabled={!input.trim() || isTyping}
//                 style={[
//                   themed.sendButton,
//                   {opacity: !input.trim() || isTyping ? 0.4 : 1},
//                 ]}>
//                 {isTyping ? (
//                   <ActivityIndicator />
//                 ) : (
//                   <MaterialIcons name="arrow-upward" size={22} color="#fff" />
//                 )}
//               </TouchableOpacity>
//             </AppleTouchFeedback>
//           </View>
//         </View>
//         {/* Removed iOS InputAccessoryView (Done bar) */}
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /** Bubble */
// function MessageBubble({message}: {message: Message}) {
//   const {theme} = useAppTheme();
//   const isUser = message.role === 'user';
//   const bubble = isUser
//     ? stylesUserBubble(theme)
//     : stylesAssistantBubble(theme);

//   return (
//     <Animatable.View
//       animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//       duration={220}
//       easing="ease-out-cubic"
//       style={[bubble.row]}>
//       <View style={bubble.bubble}>
//         <Text style={bubble.text}>{message.text}</Text>
//         <Text style={bubble.time}>
//           {dayjs(message.createdAt).format('h:mm A')}
//         </Text>
//       </View>
//     </Animatable.View>
//   );
// }

// /** Typing dots */
// function TypingDots() {
//   const dot = {width: 6, height: 6, borderRadius: 3, marginHorizontal: 3};
//   return (
//     <View
//       style={{
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 8,
//       }}>
//       <Animatable.View
//         animation="pulse"
//         iterationCount="infinite"
//         easing="ease-in-out"
//         duration={900}
//         style={[dot, {backgroundColor: 'rgb(48, 48, 48)'}]}
//       />
//       <Animatable.View
//         delay={150}
//         animation="pulse"
//         iterationCount="infinite"
//         easing="ease-in-out"
//         duration={900}
//         style={[dot, {backgroundColor: 'rgb(48, 48, 48)'}]}
//       />
//       <Animatable.View
//         delay={300}
//         animation="pulse"
//         iterationCount="infinite"
//         easing="ease-in-out"
//         duration={900}
//         style={[dot, {backgroundColor: 'rgb(48, 48, 48)'}]}
//       />
//     </View>
//   );
// }

// /** API call — align to your NestJS route */
// async function callAiChatAPI(
//   history: Message[],
//   latest: Message,
// ): Promise<{text: string; suggestions?: string[]}> {
//   const payload = {
//     messages: [...history, latest].map(m => ({
//       role: m.role,
//       content: m.text,
//     })),
//   };
//   const res = await fetch(`${API_BASE_URL}/ai/chat`, {
//     method: 'POST',
//     headers: {'Content-Type': 'application/json'},
//     body: JSON.stringify(payload),
//   });
//   if (!res.ok) throw new Error('Bad response');
//   const data = await res.json();
//   return {
//     text: data.reply ?? 'Styled response unavailable.',
//     suggestions: Array.isArray(data.suggestions) ? data.suggestions : undefined,
//   };
// }

// /** Utils */
// function rotate<T>(arr: T[]): T[] {
//   if (arr.length < 2) return;
//   const [head, ...rest] = arr;
//   return [...rest, head];
// }

// /** Styles */
// function makeStyles(theme: any) {
//   return StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.appBackground,
//       flex: 1,
//     },
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 2,
//       paddingBottom: 8,
//       color: 'white',
//     },
//     ctaPill: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingHorizontal: 12,
//       height: 34,
//       borderRadius: 10,
//       backgroundColor: 'rgba(85, 0, 255, 1)',
//       marginLeft: 6,
//       maxWidth: 280,
//       marginTop: 8,
//     },
//     ctaText: {
//       color: theme.colors.primary,
//       fontSize: 13,
//       fontWeight: '700',
//     },
//     headerLeft: {flexDirection: 'row', alignItems: 'center'},
//     presenceDot: {
//       width: 8,
//       height: 8,
//       borderRadius: 4,
//       marginRight: 8,
//     },
//     headerTitle: {
//       fontSize: 18,
//       fontWeight: '700',
//       color: 'white',
//       letterSpacing: 0.2,
//     },
//     headerRight: {flexDirection: 'row', alignItems: 'center', gap: 4},
//     iconButton: {
//       padding: 8,
//       borderRadius: 10,
//       backgroundColor: 'rgb(48, 48, 48)',
//     },
//     messagesWrap: {
//       flex: 1,
//       minHeight: 120,
//     },
//     listContent: {
//       paddingHorizontal: 12,
//       paddingBottom: 6,
//       gap: 10,
//     },
//     typingContainer: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       marginHorizontal: 12,
//       marginBottom: 8,
//       borderRadius: 14,
//       backgroundColor: 'rgb(48, 48, 48)',
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: 'rgb(48, 48, 48)',
//       gap: 8,
//     },
//     typingText: {color: 'white', fontSize: 13},
//     suggestionRow: {
//       paddingVertical: 6,
//     },
//     suggestionContent: {paddingHorizontal: 12, columnGap: 8},
//     suggestionChip: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingHorizontal: 15,
//       paddingVertical: 15,
//       borderRadius: 14,
//       backgroundColor: 'rgba(33, 33, 33, 1)',
//       color: 'rgba(255, 255, 255, 1)',
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: 'rgb(48, 48, 48)',
//       maxWidth: 260,
//       gap: 6,
//       marginRight: 8,
//     },
//     suggestionText: {
//       color: 'rgba(255, 255, 255, 1)',
//       fontSize: 14,
//       fontWeight: '600',
//     },
//     inputBarWrap: {
//       paddingHorizontal: 10,
//       paddingBottom: Platform.OS === 'ios' ? 8 : 10,
//       paddingTop: 18,
//       marginBottom: 4,
//     },
//     inputBar: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       borderWidth: 1,
//       borderColor: 'rgba(65, 65, 65, 1)',
//       backgroundColor: 'rgba(35, 35, 35, 1)',
//       borderRadius: 20,
//       paddingHorizontal: 8,
//     },
//     leftIcon: {
//       width: 30,
//       height: 36,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginRight: 4,
//     },
//     rightIcon: {
//       width: 30,
//       height: 32,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginLeft: 4,
//     },
//     input: {
//       flex: 1,
//       minHeight: 35,
//       maxHeight: 140,
//       color: 'white',
//       paddingHorizontal: 8,
//       paddingTop: 7,
//       paddingBottom: 6,
//       fontSize: 16,
//     },
//     sendButton: {
//       width: 34,
//       height: 34,
//       borderRadius: 17,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginLeft: 6,
//       backgroundColor: 'rgb(48, 48, 48)',
//     },
//   });
// }

// function stylesUserBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-end',
//       gap: 8,
//       marginVertical: 2,
//     },
//     bubble: {
//       maxWidth: '78%',
//       backgroundColor: 'rgba(0, 119, 255, 1)',
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 16,
//       marginRight: 8,
//     },
//     text: {
//       color: '#fff',
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: 'rgba(255, 255, 255, 1)',
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//     avatarWrap: {width: 30, height: 30},
//     userInitials: {
//       width: 30,
//       height: 30,
//       borderRadius: 15,
//       backgroundColor: 'rgb(48, 48, 48)',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     userInitialsText: {fontSize: 10, color: 'white'},
//   });
// }

// function stylesAssistantBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: 6,
//     },
//     avatarWrap: {width: 30, height: 30},
//     avatar: {
//       width: 30,
//       height: 30,
//       borderRadius: 15,
//       backgroundColor: 'rgb(48, 48, 48)',
//     },
//     bubble: {
//       maxWidth: '82%',
//       backgroundColor: 'rgba(39, 39, 39, 1)',
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 16,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: 'rgb(48, 48, 48)',
//       marginLeft: 8,
//     },
//     text: {
//       color: 'white',
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: 'white',
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }
