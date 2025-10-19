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
  ActivityIndicator,
  PermissionsAndroid,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
  Image,
  Alert,
  Modal,
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
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {TooltipBubble} from '../components/ToolTip/ToolTip1';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useUUID} from '../context/UUIDContext';
import {useResponsive} from '../hooks/useResponsive'; // ✅ shared adaptive hook
import {Linking} from 'react-native';
import ReaderModal from '../components/FashionFeed/ReaderModal';
import Tts from 'react-native-tts';
import {WebView} from 'react-native-webview';

// --- Base64 polyfill for Hermes ---
import {Buffer} from 'buffer';
global.btoa =
  global.btoa ||
  function (str) {
    return Buffer.from(str, 'binary').toString('base64');
  };
global.atob =
  global.atob ||
  function (b64) {
    return Buffer.from(b64, 'base64').toString('binary');
  };

type Role = 'user' | 'assistant' | 'system';
// type Message = {id: string; role: Role; text: string; createdAt: number};
type Props = {navigate: (screen: string, params?: any) => void};

type Message = {
  id: string;
  role: Role;
  text: string;
  createdAt: number;
  images?: {imageUrl: string; title?: string; sourceLink?: string}[];
  links?: {label: string; url: string}[];
};

const SUGGESTIONS_DEFAULT = [
  'Build a smart-casual look for 75°F',
  'What should I wear to a gallery opening?',
  'Make 3 outfit ideas from my polos + loafers',
  'Refine that last look for “business creative”',
];

const h = (
  type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

export default function AiStylistChatScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const insets = useSafeAreaInsets();
  const {isTablet, isPhone, width} = useResponsive();

  // ✅ Derive Apple-like breakpoints locally
  const isLargePhone = isPhone && width >= 390; // iPhone Pro Max, Plus, etc.
  const isSmallPhone = isPhone && width < 360; // SE or mini-style

  const userId = useUUID();
  const [profilePicture, setProfilePicture] = useState<string>('');

  /** 🌐 State */
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
  const [isHolding, setIsHolding] = useState(false);

  const [webModalVisible, setWebModalVisible] = useState(false);
  const [webUrl, setWebUrl] = useState<string | null>(null);

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [ttsUrl, setTtsUrl] = useState<string | null>(null); // ✅ add this line

  /** 🎙️ Voice */
  const {speech, isRecording, startListening, stopListening} =
    useVoiceControl();
  useEffect(() => {
    if (typeof speech === 'string') setInput(speech);
  }, [speech]);

  /** 📜 Scroll-to-bottom helper */
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({animated: true}),
    );
  }, []);
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // const speakResponse = async (text: string) => {
  //   if (!text?.trim()) return;
  //   try {
  //     await Tts.stop();
  //     await Tts.setDefaultLanguage('en-US');

  //     // pick one of the installed voices; Alloy-like are usually enhanced Siri voices
  //     const voices = await Tts.voices();
  //     const alloyLike = voices.find(
  //       v =>
  //         v.name.toLowerCase().includes('samantha') ||
  //         v.name.toLowerCase().includes('en-us') ||
  //         v.name.toLowerCase().includes('enhanced'),
  //     );
  //     if (alloyLike) await Tts.setDefaultVoice(alloyLike.id);

  //     await Tts.setDefaultRate(0.46);
  //     await Tts.setDefaultPitch(1.0);

  //     console.log('[Voice Playback] speaking with', alloyLike?.name);
  //     await Tts.speak(text);
  //   } catch (err) {
  //     console.warn('[Voice Playback] Failed to speak:', err);
  //   }
  // };

  // const speakResponse = async (text: string) => {
  //   if (!text?.trim()) return;
  //   try {
  //     const url = `${API_BASE_URL}/ai/tts?text=${encodeURIComponent(text)}`;
  //     const html = `
  //     <html>
  //       <body style="margin:0;background:black;">
  //         <audio id="a" autoplay playsinline>
  //           <source src="${url}" type="audio/mpeg" />
  //         </audio>
  //         <script>
  //           const a=document.getElementById('a');
  //           a.play()
  //             .then(()=>window.ReactNativeWebView.postMessage('playing'))
  //             .catch(()=>setTimeout(()=>a.play().catch(()=>{}),1000));
  //         </script>
  //       </body>
  //     </html>
  //   `;
  //     setTtsUrl(html); // store raw HTML instead of base64
  //   } catch (err) {
  //     console.warn('[Voice Playback] Failed Alloy playback:', err);
  //   }
  // };

  const speakResponse = async (text: string) => {
    if (!text?.trim()) return;
    try {
      const encoded = encodeURIComponent(text);
      const streamUrl = `${API_BASE_URL}/ai/tts?text=${encoded}`;

      // ✅ HTML directly streams & plays as chunks arrive
      const html = `
      <html>
        <body style="margin:0;padding:0;background:black;">
          <audio id="tts" autoplay playsinline>
            <source src="${streamUrl}" type="audio/mpeg" />
          </audio>
          <script>
            const audio = document.getElementById('tts');
            audio.volume = 1.0;
            audio.onplaying = () => window.ReactNativeWebView.postMessage('playing');
            audio.onerror = (e) => window.ReactNativeWebView.postMessage('error:' + e.message);
            // 🔁 Retry logic in case autoplay is blocked
            const tryPlay = () => {
              audio.play().catch(() => setTimeout(tryPlay, 500));
            };
            tryPlay();
          </script>
        </body>
      </html>
    `;

      // Store full HTML doc (not data URI) to trigger live playback
      setTtsUrl(html);
    } catch (err) {
      console.warn('❌ [Voice Playback] Failed Alloy playback:', err);
    }
  };

  /** 🔗 Helper to call your AI chat endpoint with user_id */
  async function callAiChatAPI(
    historyForApi: Message[],
    userMsg: Message,
    userId: string,
  ) {
    console.log('🧠 Sending to AI Chat API', {
      userId,
      messageCount: historyForApi.length,
    });

    const res = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        user_id: userId || 'anonymous', // ✅ guarantees not null
        messages: historyForApi.map(m => ({
          role: m.role,
          content: m.text,
        })),
      }),
    });

    if (!res.ok) {
      console.error('❌ Chat API failed', res.status);
      throw new Error('Chat API failed');
    }

    const json = await res.json();
    return {
      text: json.reply,
      images: json.images ?? [],
      links: json.links ?? [],
    };
  }

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
    const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
    return () => {
      s1.remove();
      s2.remove();
    };
  }, [scrollToBottom]);

  /** 👤 Load profile image */
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const cached = await AsyncStorage.getItem(`profile_picture:${userId}`);
      if (cached) {
        setProfilePicture(
          `${cached}${cached.includes('?') ? '&' : '?'}v=${Date.now()}`,
        );
      }
    })();
  }, [userId]);

  /** 💾 Persist chat thread */
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(`chat_thread:${userId}`);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        if (parsed?.length) setMessages(parsed);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (messages?.length) {
      AsyncStorage.setItem(`chat_thread:${userId}`, JSON.stringify(messages));
    }
  }, [messages, userId]);

  /** 🎙️ Mic logic */
  async function prepareAudio() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
    }
    return true;
  }
  const handleMicPressIn = useCallback(async () => {
    if (!(await prepareAudio())) return;
    setIsHolding(true);
    h('impactLight');
    startListening();
  }, [startListening]);
  const handleMicPressOut = useCallback(() => {
    setIsHolding(false);
    stopListening();
    h('selection');
  }, [stopListening]);

  /** 📤 Send message (with fashion filter) */
  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const fashionKeywords = [
      'outfit',
      'style',
      'wardrobe',
      'stores',
      'clothing',
      'clothes',
      'dress',
      'trends',
      'weather',
      'event',
      'occasion',
      'formal',
      'casual',
      'smart casual',
      'blazer',
      'pants',
      'shirt',
      'jacket',
      'accessory',
      'color',
      'shoes',
      'season',
      'vibe',
      'wear',
      'look',
      'fit',
      'layer',
      'capsule',
      'pair',
      'match',
      'coordinate',
      'dress code',
    ];
    const lower = trimmed.toLowerCase();
    const hasFashionKeyword = fashionKeywords.some(kw => lower.includes(kw));
    const commonPhrases = [
      'what should i wear',
      'how should i dress',
      'what goes with',
      'how to style',
      'how do i style',
      'make me an outfit',
      'build an outfit',
      'suggest an outfit',
      'style me',
      'pair with',
      'does this match',
    ];
    const hasCommonPhrase = commonPhrases.some(p => lower.includes(p));
    const isFashionRelated = hasFashionKeyword || hasCommonPhrase;

    if (!isFashionRelated) {
      Alert.alert(
        'Styling Questions Only ✨',
        "I'm your personal stylist — I can only help with outfits, clothing advice, or fashion-related questions.",
      );
      return;
    }

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
    h('impactLight');

    try {
      const historyForApi = [...messages, userMsg];
      const assistant = await callAiChatAPI(historyForApi, userMsg, userId);
      // const aiMsg: Message = {
      //   id: `a-${Date.now()}`,
      //   role: 'assistant',
      //   text: assistant.text,
      //   createdAt: Date.now(),
      //   images: assistant.images ?? [], // ✅ keep images
      //   links: assistant.links ?? [], // ✅ keep links
      // };
      // 🧹 scrub common disclaimers before display
      const cleanText = assistant.text
        .replace(/I can(’|'|)t display images? directly[^.]*\.\s*/i, '')
        .replace(
          /I can help you (visualize|search) (them|for them)[^.]*\.\s*/i,
          '',
        )
        .replace(/Here'?s how to (find|get) (them|images)[^.]*\.\s*/i, '')
        .replace(/```json[\s\S]*?```/g, '') // hide raw json blocks
        .trim();

      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: cleanText || 'Here are some ideas:',
        createdAt: Date.now(),
        images: assistant.images ?? [],
        links: assistant.links ?? [],
      };

      setMessages(prev => [...prev, aiMsg]);
      h('selection');
      // 🗣️ Speak it aloud
      speakResponse(aiMsg.text);
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
      h('notificationError');
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, messages]);
  /** ✅ Button state logic */
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
        lastAssistantAfterUser = m;
      }
    }
    return lastAssistantAfterUser?.text.trim() ?? '';
  }, [messages]);

  const sendToOutfitSafe = useCallback(() => {
    if (!canSendToOutfit) return;
    if (!assistantPrompt) return;
    h('impactMedium');
    const payload = {
      seedPrompt: assistantPrompt,
      autogenerate: true,
      ts: Date.now(),
    };
    navigate('Outfit', payload);
  }, [assistantPrompt, canSendToOutfit, navigate]);

  /** 📊 Render chat message bubbles with Apple-style scaling */
  const renderMessage = (m: Message, idx: number) => {
    const isUser = m.role === 'user';
    const bubble = isUser
      ? stylesUserBubble(theme, isLargePhone, isTablet)
      : stylesAssistantBubble(theme, isLargePhone, isTablet);

    const translateX = scrollY.interpolate({
      inputRange: [0, 400],
      outputRange: [0, isUser ? -6 : 6],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View key={m.id} style={{transform: [{translateX}]}}>
        <Animatable.View
          animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
          duration={420}
          delay={idx * 90}
          easing="ease-out-cubic"
          style={[
            bubble.row,
            {
              marginVertical: isTablet ? 14 : 10,
              transform: [{scale: 0.98}],
            },
          ]}>
          {/* 🤖 Assistant icon */}
          {!isUser && (
            <View
              style={{
                width: isTablet ? 44 : 36,
                height: isTablet ? 44 : 36,
                borderRadius: 22,
                backgroundColor: theme.colors.button1,
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'flex-end',
                marginRight: 6,
                borderWidth: 1,
                borderColor: theme.colors.surfaceBorder,
              }}>
              <MaterialIcons
                name="smart-toy"
                size={isTablet ? 28 : 22}
                color={theme.colors.buttonText1}
              />
            </View>
          )}

          {/* 💬 Bubble */}
          <Animatable.View
            animation="zoomIn"
            delay={idx * 90 + 80}
            duration={420}
            easing="ease-out-cubic"
            style={bubble.bubble}>
            <Text style={bubble.text}>{m.text}</Text>
            <Text style={bubble.time}>
              {dayjs(m.createdAt).format('h:mm A')}
            </Text>

            {/* 🖼️ Visual inspo images */}
            {(m.images?.length ?? 0) > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{marginTop: 8}}>
                {m.images?.map((img, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      h('impactLight');
                      if (img.sourceLink) {
                        setWebUrl(img.sourceLink);
                        setWebModalVisible(true);
                      } else {
                        setImageUri(img.imageUrl);
                        setImageModalVisible(true);
                      }
                    }}
                    style={{
                      marginRight: 8,
                      borderRadius: 12,
                      overflow: 'hidden',
                      borderWidth: tokens.borderWidth.hairline,
                      borderColor: theme.colors.surfaceBorder,
                    }}>
                    <Image
                      source={{uri: img.imageUrl}}
                      style={{width: 140, height: 160}}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* 🔗 Optional product / shop links */}
            {(m.links?.length ?? 0) > 0 && (
              <View style={{marginTop: 8}}>
                {m.links?.map((l, i) => (
                  <Text
                    key={i}
                    onPress={() => {
                      h('impactLight');
                      setWebUrl(l.url);
                      setWebModalVisible(true);
                    }}
                    style={{
                      color: theme.colors.primary,
                      textDecorationLine: 'underline',
                      fontSize: 15,
                      marginVertical: 2,
                    }}>
                    {l.label}
                  </Text>
                ))}
              </View>
            )}
          </Animatable.View>

          {/* 👤 User avatar */}
          {isUser && (
            <View
              style={{
                width: isTablet ? 44 : 38,
                height: isTablet ? 44 : 38,
                borderRadius: 50,
                overflow: 'hidden',
                backgroundColor: theme.colors.background,
                alignSelf: 'flex-end',
              }}>
              {profilePicture ? (
                <Image
                  source={{uri: profilePicture}}
                  style={{width: '100%', height: '100%'}}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons
                  name="person"
                  size={isTablet ? 28 : 22}
                  color={theme.colors.foreground2}
                  style={{alignSelf: 'center', marginTop: 6}}
                />
              )}
            </View>
          )}
        </Animatable.View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView
      style={[globalStyles.screen]}
      edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
        {/* 🧠 Header */}
        {/* <View style={stylesHeader(theme, isTablet).header}>
          <View style={stylesHeader(theme, isTablet).headerLeft}>
            <View
              style={[
                stylesHeader(theme, isTablet).presenceDot,
                {backgroundColor: theme.colors.success},
              ]}
            />
            <Text
              style={[
                globalStyles.header,
                {fontSize: isTablet ? 38 : isLargePhone ? 36 : 34},
              ]}>
              AI Stylist Chat
            </Text>
          </View>
          <AppleTouchFeedback type="light">
            <TouchableOpacity
              style={stylesHeader(theme, isTablet).iconButton}
              onPress={() => {
                h('impactLight');
                Alert.alert(
                  'Clear Chat?',
                  'This will erase your current conversation with the stylist.',
                  [
                    {text: 'Cancel', style: 'cancel'},
                    {
                      text: 'Clear Chat',
                      style: 'destructive',
                      onPress: async () => {
                        await AsyncStorage.removeItem(`chat_thread:${userId}`);
                        setMessages([
                          {
                            id: 'seed-1',
                            role: 'assistant',
                            text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
                            createdAt: Date.now(),
                          },
                        ]);
                        scrollToBottom();
                      },
                    },
                  ],
                );
              }}>
              <MaterialIcons
                name="delete"
                size={isTablet ? 28 : 22}
                color={theme.colors.foreground}
              />
            </TouchableOpacity>
          </AppleTouchFeedback>
        </View> */}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 18,

            // ✅ no double inset — pull header higher for large iPhones
            marginTop:
              Platform.OS === 'ios'
                ? insets.top > 44
                  ? -34 // ✅ lift up on large-notch phones (iPhone 14-16 Pro / Pro Max)
                  : -4 // ✅ small phones like SE / Mini
                : 0,

            paddingBottom: 8,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.surfaceBorder,
          }}>
          {/* Left: Status dot + Title */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexShrink: 1,
              minWidth: 0,
            }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 5,
                backgroundColor: theme.colors.success,
                marginRight: 6,
              }}
            />
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                globalStyles.header,
                {
                  fontSize: width < 360 ? 26 : width < 400 ? 30 : 34,
                  flexShrink: 1,
                  color: theme.colors.foreground,
                },
              ]}>
              AI Stylist Chat
            </Text>
          </View>

          {/* Right: Delete icon */}
          <TouchableOpacity
            onPress={() => {
              h('impactLight');
              Alert.alert(
                'Chat Options',
                'Choose how you’d like to reset your stylist chat.',
                [
                  {text: 'Cancel', style: 'cancel'},

                  // 🧠 Soft Reset — keeps long-term stylist memory
                  {
                    text: 'Start New Chat',
                    onPress: async () => {
                      try {
                        // 🔥 Call your backend soft reset endpoint
                        await fetch(
                          `${API_BASE_URL}/ai/chat/soft-reset/${userId}`,
                          {
                            method: 'DELETE',
                          },
                        );

                        // 🧹 Also clear local thread cache
                        await AsyncStorage.removeItem(`chat_thread:${userId}`);

                        setMessages([
                          {
                            id: 'seed-1',
                            role: 'assistant',
                            text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
                            createdAt: Date.now(),
                          },
                        ]);

                        h('impactLight');
                        scrollToBottom();
                        Alert.alert(
                          'New chat started ✨',
                          'Your stylist still remembers your preferences.',
                        );
                      } catch (err) {
                        console.error('❌ Failed soft reset:', err);
                        Alert.alert('Error', 'Could not start new chat.');
                      }
                    },
                  },
                ],
              );
            }}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            style={{
              padding: 6,
              borderRadius: 10,
              backgroundColor: theme.colors.surface,
            }}>
            <MaterialIcons
              name="autorenew" // ♻️ better icon for "New Chat"
              size={22}
              color={theme.colors.foreground}
            />
          </TouchableOpacity>
        </View>

        {/* 💬 Main Scroll */}
        <View style={{flex: 1}}>
          <Animated.ScrollView
            ref={scrollRef}
            onScroll={Animated.event(
              [{nativeEvent: {contentOffset: {y: scrollY}}}],
              {useNativeDriver: true},
            )}
            scrollEventThrottle={16}
            contentContainerStyle={{paddingBottom: 100}}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }>
            <View
              style={{
                paddingHorizontal: isTablet ? 20 : 12,
                paddingBottom: 20,
              }}>
              {messages.map((m, i) => renderMessage(m, i))}
            </View>

            {/* 🫧 Typing indicator */}
            {isTyping && (
              <Animatable.View
                animation="fadeInUp"
                duration={300}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: isTablet ? 18 : 14,
                  paddingVertical: 10,
                  marginHorizontal: isTablet ? 18 : 12,
                  marginBottom: 8,
                  borderRadius: 14,
                }}>
                <TypingDots />
                <Text
                  style={{
                    color: theme.colors.foreground,
                    fontSize: isTablet ? 15 : 13,
                  }}>
                  Stylist is thinking…
                </Text>
              </Animatable.View>
            )}
          </Animated.ScrollView>
          {/* 📥 Adaptive Animated Input Bar */}
          <AnimatedInputBar
            input={input}
            setInput={setInput}
            onSend={send}
            isTyping={isTyping}
            inputRef={inputRef}
            onMicPressIn={handleMicPressIn}
            onMicPressOut={handleMicPressOut}
            isRecording={isRecording}
            isLargePhone={isLargePhone}
            isTablet={isTablet}
          />
        </View>
      </KeyboardAvoidingView>
      {webUrl && (
        <ReaderModal
          visible={webModalVisible}
          url={webUrl}
          title="Shop & Style"
          onClose={() => {
            h('impactLight');
            setWebModalVisible(false);
            setWebUrl(null);
          }}
        />
      )}
      {ttsUrl && (
        <WebView
          originWhitelist={['*']}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          javaScriptEnabled
          onMessage={event => {
            const msg = event.nativeEvent.data;
            if (msg === 'playing') {
              console.log('🔊 Streaming TTS started');
              setTimeout(() => setTtsUrl(null), 10000);
            } else if (msg.startsWith('error:')) {
              console.error('🎙️ TTS WebView error:', msg);
              setTtsUrl(null);
            }
          }}
          source={{html: ttsUrl}}
          style={{width: 0, height: 0, opacity: 0}}
        />
      )}
    </SafeAreaView>
  );
}

/** 📥 Animated Input Bar — Apple-style adaptive */
export function AnimatedInputBar({
  input,
  setInput,
  onSend,
  isTyping,
  inputRef,
  onMicPressIn,
  onMicPressOut,
  isRecording,
  isLargePhone,
  isTablet,
}: any) {
  const {theme} = useAppTheme();

  // Define a height state at the top of AnimatedInputBar
  const [inputHeight, setInputHeight] = useState(42);

  // ✅ full stop + cancel helper
  const stopListeningCompletely = async () => {
    try {
      const Voice = require('@react-native-voice/voice').default;
      await Voice.stop();
      await Voice.cancel();
    } catch (e) {
      console.warn('🎤 Failed to fully stop voice:', e);
    }
  };

  // ✅ unified reset logic
  const resetField = async () => {
    await stopListeningCompletely();
    setInput('');
    inputRef?.current?.clear?.();
  };

  return (
    <Animatable.View
      animation="fadeInUp"
      duration={600}
      delay={200}
      style={{
        paddingHorizontal: isTablet ? 18 : 10,
        paddingBottom: isTablet ? 24 : 16,
        backgroundColor: 'transparent',
      }}>
      {/* <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          borderWidth: tokens.borderWidth.xl,
          borderColor: theme.colors.surfaceBorder,
          backgroundColor: theme.colors.surface3,
          borderRadius: 22,
          paddingHorizontal: 10,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 5,
          shadowOffset: {width: 0, height: 2},
        }}> */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          borderWidth: tokens.borderWidth.xl,
          borderColor: theme.colors.surfaceBorder,
          backgroundColor: theme.colors.surface3,
          borderRadius: 22,
          paddingLeft: 10,
          paddingRight: 6,
          paddingVertical: 4,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 3,
          shadowOffset: {width: 0, height: 1},
        }}>
        {/* <TextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          placeholder="Ask for a look… event, vibe, weather"
          placeholderTextColor={'#9c9c9cff'}
          multiline
          scrollEnabled={false}
          keyboardAppearance="dark"
          returnKeyType="send"
          blurOnSubmit={false}
          style={{
            flex: 1,
            color: theme.colors.foreground,
            paddingHorizontal: 8,
            paddingTop: isTablet ? 14 : 10,
            paddingBottom: isTablet ? 14 : 10,
            fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
            textAlignVertical: 'top',
            minHeight: 42,
          }}
        /> */}

        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          placeholder="Ask for a look… event, vibe, weather"
          placeholderTextColor={'#9c9c9cff'}
          multiline
          onContentSizeChange={e =>
            setInputHeight(Math.min(e.nativeEvent.contentSize.height, 120))
          }
          numberOfLines={1} // ✅ keeps placeholder single-line
          ellipsizeMode="tail" // ✅ truncates long placeholder instead of wrapping
          keyboardAppearance="dark"
          returnKeyType="send"
          blurOnSubmit={false}
          // style={{
          //   flex: 1,
          //   color: theme.colors.foreground,
          //   fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
          //   paddingVertical: 6,
          //   paddingHorizontal: 8,
          //   minHeight: 42,
          //   maxHeight: 120,
          //   height: inputHeight,
          //   textAlignVertical: 'top',
          //   includeFontPadding: false,
          // }}
          style={{
            flex: 1,
            color: theme.colors.foreground,
            fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
            paddingTop: 15, // ✅ slightly more than before
            paddingBottom: 8,
            paddingHorizontal: 8,
            minHeight: 42,
            maxHeight: 120,
            height: inputHeight,
            textAlignVertical: 'top', // ✅ ensures text sticks to top, not center
            includeFontPadding: false, // ✅ removes Android baseline clipping
            lineHeight: 22, // ✅ keeps vertical rhythm clean
          }}
        />

        {/* ❌ Clear Button */}
        {input.length > 0 && (
          <TouchableOpacity
            onPress={resetField}
            style={{
              width: isTablet ? 40 : 32,
              height: isTablet ? 40 : 32,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcons
              name="close"
              size={isTablet ? 24 : 22}
              color={theme.colors.foreground2}
            />
          </TouchableOpacity>
        )}

        {/* 🎙️ Mic */}
        <TouchableOpacity
          onPressIn={onMicPressIn}
          onPressOut={onMicPressOut}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          style={{
            width: isTablet ? 48 : 38,
            height: isTablet ? 50 : 42,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{scale: isRecording ? 1.15 : 1}],
          }}>
          <MaterialIcons
            name={isRecording ? 'mic' : 'mic-none'}
            size={isTablet ? 28 : 24}
            color={
              isRecording ? theme.colors.primary : theme.colors.foreground2
            }
          />
        </TouchableOpacity>

        {/* 📤 Send Button */}
        <TouchableOpacity
          onPress={async () => {
            await stopListeningCompletely(); // ✅ stop voice first
            onSend(); // ✅ send message
            await resetField(); // ✅ clear input after sending
          }}
          disabled={!input.trim() || isTyping}
          style={{
            width: isTablet ? 48 : 38,
            height: isTablet ? 50 : 42,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !input.trim() || isTyping ? 0.4 : 1,
          }}>
          {isTyping ? (
            <ActivityIndicator />
          ) : (
            <View
              style={{
                width: isTablet ? 40 : 34,
                height: isTablet ? 40 : 34,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 6,
                marginBottom: 2,
                backgroundColor: theme.colors.surface,
              }}>
              <MaterialIcons
                name="arrow-upward"
                size={isTablet ? 26 : 24}
                color={theme.colors.foreground}
              />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </Animatable.View>
  );
}

////////////////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
//   Image,
//   Alert,
//   Modal,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {useResponsive} from '../hooks/useResponsive'; // ✅ shared adaptive hook
// import {Linking} from 'react-native';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import Tts from 'react-native-tts';
// import {WebView} from 'react-native-webview';

// // --- Base64 polyfill for Hermes ---
// import {Buffer} from 'buffer';
// global.btoa =
//   global.btoa ||
//   function (str) {
//     return Buffer.from(str, 'binary').toString('base64');
//   };
// global.atob =
//   global.atob ||
//   function (b64) {
//     return Buffer.from(b64, 'base64').toString('binary');
//   };

// type Role = 'user' | 'assistant' | 'system';
// // type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// type Message = {
//   id: string;
//   role: Role;
//   text: string;
//   createdAt: number;
//   images?: {imageUrl: string; title?: string; sourceLink?: string}[];
//   links?: {label: string; url: string}[];
// };

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();
//   const {isTablet, isPhone, width} = useResponsive();

//   // ✅ Derive Apple-like breakpoints locally
//   const isLargePhone = isPhone && width >= 390; // iPhone Pro Max, Plus, etc.
//   const isSmallPhone = isPhone && width < 360; // SE or mini-style

//   const userId = useUUID();
//   const [profilePicture, setProfilePicture] = useState<string>('');

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);

//   const [webModalVisible, setWebModalVisible] = useState(false);
//   const [webUrl, setWebUrl] = useState<string | null>(null);

//   const [imageModalVisible, setImageModalVisible] = useState(false);
//   const [imageUri, setImageUri] = useState<string | null>(null);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   const [ttsUrl, setTtsUrl] = useState<string | null>(null); // ✅ add this line

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();
//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   // const speakResponse = async (text: string) => {
//   //   if (!text?.trim()) return;
//   //   try {
//   //     await Tts.stop();
//   //     await Tts.setDefaultLanguage('en-US');

//   //     // pick one of the installed voices; Alloy-like are usually enhanced Siri voices
//   //     const voices = await Tts.voices();
//   //     const alloyLike = voices.find(
//   //       v =>
//   //         v.name.toLowerCase().includes('samantha') ||
//   //         v.name.toLowerCase().includes('en-us') ||
//   //         v.name.toLowerCase().includes('enhanced'),
//   //     );
//   //     if (alloyLike) await Tts.setDefaultVoice(alloyLike.id);

//   //     await Tts.setDefaultRate(0.46);
//   //     await Tts.setDefaultPitch(1.0);

//   //     console.log('[Voice Playback] speaking with', alloyLike?.name);
//   //     await Tts.speak(text);
//   //   } catch (err) {
//   //     console.warn('[Voice Playback] Failed to speak:', err);
//   //   }
//   // };

//   const speakResponse = async (text: string) => {
//     if (!text?.trim()) return;
//     try {
//       const url = `${API_BASE_URL}/ai/tts?text=${encodeURIComponent(text)}`;
//       const html = `
//       <html>
//         <body style="margin:0;background:black;">
//           <audio id="a" autoplay playsinline>
//             <source src="${url}" type="audio/mpeg" />
//           </audio>
//           <script>
//             const a=document.getElementById('a');
//             a.play()
//               .then(()=>window.ReactNativeWebView.postMessage('playing'))
//               .catch(()=>setTimeout(()=>a.play().catch(()=>{}),1000));
//           </script>
//         </body>
//       </html>
//     `;
//       setTtsUrl(html); // store raw HTML instead of base64
//     } catch (err) {
//       console.warn('[Voice Playback] Failed Alloy playback:', err);
//     }
//   };

//   /** 🔗 Helper to call your AI chat endpoint with user_id */
//   async function callAiChatAPI(
//     historyForApi: Message[],
//     userMsg: Message,
//     userId: string,
//   ) {
//     console.log('🧠 Sending to AI Chat API', {
//       userId,
//       messageCount: historyForApi.length,
//     });

//     const res = await fetch(`${API_BASE_URL}/ai/chat`, {
//       method: 'POST',
//       headers: {'Content-Type': 'application/json'},
//       body: JSON.stringify({
//         user_id: userId || 'anonymous', // ✅ guarantees not null
//         messages: historyForApi.map(m => ({
//           role: m.role,
//           content: m.text,
//         })),
//       }),
//     });

//     if (!res.ok) {
//       console.error('❌ Chat API failed', res.status);
//       throw new Error('Chat API failed');
//     }

//     const json = await res.json();
//     return {
//       text: json.reply,
//       images: json.images ?? [],
//       links: json.links ?? [],
//     };
//   }

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   /** 👤 Load profile image */
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(`profile_picture:${userId}`);
//       if (cached) {
//         setProfilePicture(
//           `${cached}${cached.includes('?') ? '&' : '?'}v=${Date.now()}`,
//         );
//       }
//     })();
//   }, [userId]);

//   /** 💾 Persist chat thread */
//   useEffect(() => {
//     (async () => {
//       const saved = await AsyncStorage.getItem(`chat_thread:${userId}`);
//       if (saved) {
//         const parsed: Message[] = JSON.parse(saved);
//         if (parsed?.length) setMessages(parsed);
//       }
//     })();
//   }, [userId]);

//   useEffect(() => {
//     if (messages?.length) {
//       AsyncStorage.setItem(`chat_thread:${userId}`, JSON.stringify(messages));
//     }
//   }, [messages, userId]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   /** 📤 Send message (with fashion filter) */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;

//     const fashionKeywords = [
//       'outfit',
//       'style',
//       'wardrobe',
//       'stores',
//       'clothing',
//       'clothes',
//       'dress',
//       'trends',
//       'weather',
//       'event',
//       'occasion',
//       'formal',
//       'casual',
//       'smart casual',
//       'blazer',
//       'pants',
//       'shirt',
//       'jacket',
//       'accessory',
//       'color',
//       'shoes',
//       'season',
//       'vibe',
//       'wear',
//       'look',
//       'fit',
//       'layer',
//       'capsule',
//       'pair',
//       'match',
//       'coordinate',
//       'dress code',
//     ];
//     const lower = trimmed.toLowerCase();
//     const hasFashionKeyword = fashionKeywords.some(kw => lower.includes(kw));
//     const commonPhrases = [
//       'what should i wear',
//       'how should i dress',
//       'what goes with',
//       'how to style',
//       'how do i style',
//       'make me an outfit',
//       'build an outfit',
//       'suggest an outfit',
//       'style me',
//       'pair with',
//       'does this match',
//     ];
//     const hasCommonPhrase = commonPhrases.some(p => lower.includes(p));
//     const isFashionRelated = hasFashionKeyword || hasCommonPhrase;

//     if (!isFashionRelated) {
//       Alert.alert(
//         'Styling Questions Only ✨',
//         "I'm your personal stylist — I can only help with outfits, clothing advice, or fashion-related questions.",
//       );
//       return;
//     }

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
//     h('impactLight');

//     try {
//       const historyForApi = [...messages, userMsg];
//       const assistant = await callAiChatAPI(historyForApi, userMsg, userId);
//       // const aiMsg: Message = {
//       //   id: `a-${Date.now()}`,
//       //   role: 'assistant',
//       //   text: assistant.text,
//       //   createdAt: Date.now(),
//       //   images: assistant.images ?? [], // ✅ keep images
//       //   links: assistant.links ?? [], // ✅ keep links
//       // };
//       // 🧹 scrub common disclaimers before display
//       const cleanText = assistant.text
//         .replace(/I can(’|'|)t display images? directly[^.]*\.\s*/i, '')
//         .replace(
//           /I can help you (visualize|search) (them|for them)[^.]*\.\s*/i,
//           '',
//         )
//         .replace(/Here'?s how to (find|get) (them|images)[^.]*\.\s*/i, '')
//         .replace(/```json[\s\S]*?```/g, '') // hide raw json blocks
//         .trim();

//       const aiMsg: Message = {
//         id: `a-${Date.now()}`,
//         role: 'assistant',
//         text: cleanText || 'Here are some ideas:',
//         createdAt: Date.now(),
//         images: assistant.images ?? [],
//         links: assistant.links ?? [],
//       };

//       setMessages(prev => [...prev, aiMsg]);
//       h('selection');
//       // 🗣️ Speak it aloud
//       speakResponse(aiMsg.text);
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);
//   /** ✅ Button state logic */
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

//   /** 📊 Render chat message bubbles with Apple-style scaling */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme, isLargePhone, isTablet)
//       : stylesAssistantBubble(theme, isLargePhone, isTablet);

//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View key={m.id} style={{transform: [{translateX}]}}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[
//             bubble.row,
//             {
//               marginVertical: isTablet ? 14 : 10,
//               transform: [{scale: 0.98}],
//             },
//           ]}>
//           {/* 🤖 Assistant icon */}
//           {!isUser && (
//             <View
//               style={{
//                 width: isTablet ? 44 : 36,
//                 height: isTablet ? 44 : 36,
//                 borderRadius: 22,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 alignSelf: 'flex-end',
//                 marginRight: 6,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <MaterialIcons
//                 name="smart-toy"
//                 size={isTablet ? 28 : 22}
//                 color={theme.colors.buttonText1}
//               />
//             </View>
//           )}

//           {/* 💬 Bubble */}
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>

//             {/* 🖼️ Visual inspo images */}
//             {(m.images?.length ?? 0) > 0 && (
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 style={{marginTop: 8}}>
//                 {m.images?.map((img, i) => (
//                   <TouchableOpacity
//                     key={i}
//                     onPress={() => {
//                       h('impactLight');
//                       if (img.sourceLink) {
//                         setWebUrl(img.sourceLink);
//                         setWebModalVisible(true);
//                       } else {
//                         setImageUri(img.imageUrl);
//                         setImageModalVisible(true);
//                       }
//                     }}
//                     style={{
//                       marginRight: 8,
//                       borderRadius: 12,
//                       overflow: 'hidden',
//                       borderWidth: tokens.borderWidth.hairline,
//                       borderColor: theme.colors.surfaceBorder,
//                     }}>
//                     <Image
//                       source={{uri: img.imageUrl}}
//                       style={{width: 140, height: 160}}
//                       resizeMode="cover"
//                     />
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             )}

//             {/* 🔗 Optional product / shop links */}
//             {(m.links?.length ?? 0) > 0 && (
//               <View style={{marginTop: 8}}>
//                 {m.links?.map((l, i) => (
//                   <Text
//                     key={i}
//                     onPress={() => {
//                       h('impactLight');
//                       setWebUrl(l.url);
//                       setWebModalVisible(true);
//                     }}
//                     style={{
//                       color: theme.colors.primary,
//                       textDecorationLine: 'underline',
//                       fontSize: 15,
//                       marginVertical: 2,
//                     }}>
//                     {l.label}
//                   </Text>
//                 ))}
//               </View>
//             )}
//           </Animatable.View>

//           {/* 👤 User avatar */}
//           {isUser && (
//             <View
//               style={{
//                 width: isTablet ? 44 : 38,
//                 height: isTablet ? 44 : 38,
//                 borderRadius: 50,
//                 overflow: 'hidden',
//                 backgroundColor: theme.colors.background,
//                 alignSelf: 'flex-end',
//               }}>
//               {profilePicture ? (
//                 <Image
//                   source={{uri: profilePicture}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <MaterialIcons
//                   name="person"
//                   size={isTablet ? 28 : 22}
//                   color={theme.colors.foreground2}
//                   style={{alignSelf: 'center', marginTop: 6}}
//                 />
//               )}
//             </View>
//           )}
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         {/* <View style={stylesHeader(theme, isTablet).header}>
//           <View style={stylesHeader(theme, isTablet).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme, isTablet).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text
//               style={[
//                 globalStyles.header,
//                 {fontSize: isTablet ? 38 : isLargePhone ? 36 : 34},
//               ]}>
//               AI Stylist Chat
//             </Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme, isTablet).iconButton}
//               onPress={() => {
//                 h('impactLight');
//                 Alert.alert(
//                   'Clear Chat?',
//                   'This will erase your current conversation with the stylist.',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Clear Chat',
//                       style: 'destructive',
//                       onPress: async () => {
//                         await AsyncStorage.removeItem(`chat_thread:${userId}`);
//                         setMessages([
//                           {
//                             id: 'seed-1',
//                             role: 'assistant',
//                             text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//                             createdAt: Date.now(),
//                           },
//                         ]);
//                         scrollToBottom();
//                       },
//                     },
//                   ],
//                 );
//               }}>
//               <MaterialIcons
//                 name="delete"
//                 size={isTablet ? 28 : 22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View> */}

//         <View
//           style={{
//             flexDirection: 'row',
//             alignItems: 'center',
//             justifyContent: 'space-between',
//             paddingHorizontal: 18,

//             // ✅ no double inset — pull header higher for large iPhones
//             marginTop:
//               Platform.OS === 'ios'
//                 ? insets.top > 44
//                   ? -34 // ✅ lift up on large-notch phones (iPhone 14-16 Pro / Pro Max)
//                   : -4 // ✅ small phones like SE / Mini
//                 : 0,

//             paddingBottom: 8,
//             borderBottomWidth: StyleSheet.hairlineWidth,
//             borderBottomColor: theme.colors.surfaceBorder,
//           }}>
//           {/* Left: Status dot + Title */}
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               flexShrink: 1,
//               minWidth: 0,
//             }}>
//             <View
//               style={{
//                 width: 8,
//                 height: 8,
//                 borderRadius: 5,
//                 backgroundColor: theme.colors.success,
//                 marginRight: 6,
//               }}
//             />
//             <Text
//               numberOfLines={1}
//               ellipsizeMode="tail"
//               style={[
//                 globalStyles.header,
//                 {
//                   fontSize: width < 360 ? 26 : width < 400 ? 30 : 34,
//                   flexShrink: 1,
//                   color: theme.colors.foreground,
//                 },
//               ]}>
//               AI Stylist Chat
//             </Text>
//           </View>

//           {/* Right: Delete icon */}
//           <TouchableOpacity
//             onPress={() => {
//               h('impactLight');
//               Alert.alert(
//                 'Chat Options',
//                 'Choose how you’d like to reset your stylist chat.',
//                 [
//                   {text: 'Cancel', style: 'cancel'},

//                   // 🧠 Soft Reset — keeps long-term stylist memory
//                   {
//                     text: 'Start New Chat',
//                     onPress: async () => {
//                       try {
//                         // 🔥 Call your backend soft reset endpoint
//                         await fetch(
//                           `${API_BASE_URL}/ai/chat/soft-reset/${userId}`,
//                           {
//                             method: 'DELETE',
//                           },
//                         );

//                         // 🧹 Also clear local thread cache
//                         await AsyncStorage.removeItem(`chat_thread:${userId}`);

//                         setMessages([
//                           {
//                             id: 'seed-1',
//                             role: 'assistant',
//                             text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//                             createdAt: Date.now(),
//                           },
//                         ]);

//                         h('impactLight');
//                         scrollToBottom();
//                         Alert.alert(
//                           'New chat started ✨',
//                           'Your stylist still remembers your preferences.',
//                         );
//                       } catch (err) {
//                         console.error('❌ Failed soft reset:', err);
//                         Alert.alert('Error', 'Could not start new chat.');
//                       }
//                     },
//                   },
//                 ],
//               );
//             }}
//             hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
//             style={{
//               padding: 6,
//               borderRadius: 10,
//               backgroundColor: theme.colors.surface,
//             }}>
//             <MaterialIcons
//               name="autorenew" // ♻️ better icon for "New Chat"
//               size={22}
//               color={theme.colors.foreground}
//             />
//           </TouchableOpacity>
//         </View>

//         {/* 💬 Main Scroll */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             <View
//               style={{
//                 paddingHorizontal: isTablet ? 20 : 12,
//                 paddingBottom: 20,
//               }}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: isTablet ? 18 : 14,
//                   paddingVertical: 10,
//                   marginHorizontal: isTablet ? 18 : 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                 }}>
//                 <TypingDots />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontSize: isTablet ? 15 : 13,
//                   }}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}
//           </Animated.ScrollView>
//           {/* 📥 Adaptive Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//             isLargePhone={isLargePhone}
//             isTablet={isTablet}
//           />
//         </View>
//       </KeyboardAvoidingView>
//       {webUrl && (
//         <ReaderModal
//           visible={webModalVisible}
//           url={webUrl}
//           title="Shop & Style"
//           onClose={() => {
//             h('impactLight');
//             setWebModalVisible(false);
//             setWebUrl(null);
//           }}
//         />
//       )}
//       {ttsUrl && (
//         <WebView
//           originWhitelist={['*']}
//           mediaPlaybackRequiresUserAction={false}
//           allowsInlineMediaPlayback
//           javaScriptEnabled
//           onMessage={event => {
//             if (event.nativeEvent.data === 'playing') {
//               console.log('🔊 Alloy TTS started');
//               setTimeout(() => setTtsUrl(null), 8000);
//             }
//           }}
//           source={{html: ttsUrl}} // 👈 not data:text/
//           style={{width: 0, height: 0, opacity: 0}}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

// /** 📥 Animated Input Bar — Apple-style adaptive */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
//   isLargePhone,
//   isTablet,
// }: any) {
//   const {theme} = useAppTheme();

//   // Define a height state at the top of AnimatedInputBar
//   const [inputHeight, setInputHeight] = useState(42);

//   // ✅ full stop + cancel helper
//   const stopListeningCompletely = async () => {
//     try {
//       const Voice = require('@react-native-voice/voice').default;
//       await Voice.stop();
//       await Voice.cancel();
//     } catch (e) {
//       console.warn('🎤 Failed to fully stop voice:', e);
//     }
//   };

//   // ✅ unified reset logic
//   const resetField = async () => {
//     await stopListeningCompletely();
//     setInput('');
//     inputRef?.current?.clear?.();
//   };

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: isTablet ? 18 : 10,
//         paddingBottom: isTablet ? 24 : 16,
//         backgroundColor: 'transparent',
//       }}>
//       {/* <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 22,
//           paddingHorizontal: 10,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}> */}
//       <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 22,
//           paddingLeft: 10,
//           paddingRight: 6,
//           paddingVertical: 4,
//           shadowColor: '#000',
//           shadowOpacity: 0.06,
//           shadowRadius: 3,
//           shadowOffset: {width: 0, height: 1},
//         }}>
//         {/* <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           multiline
//           scrollEnabled={false}
//           keyboardAppearance="dark"
//           returnKeyType="send"
//           blurOnSubmit={false}
//           style={{
//             flex: 1,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: isTablet ? 14 : 10,
//             paddingBottom: isTablet ? 14 : 10,
//             fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//             textAlignVertical: 'top',
//             minHeight: 42,
//           }}
//         /> */}

//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           multiline
//           onContentSizeChange={e =>
//             setInputHeight(Math.min(e.nativeEvent.contentSize.height, 120))
//           }
//           numberOfLines={1} // ✅ keeps placeholder single-line
//           ellipsizeMode="tail" // ✅ truncates long placeholder instead of wrapping
//           keyboardAppearance="dark"
//           returnKeyType="send"
//           blurOnSubmit={false}
//           // style={{
//           //   flex: 1,
//           //   color: theme.colors.foreground,
//           //   fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//           //   paddingVertical: 6,
//           //   paddingHorizontal: 8,
//           //   minHeight: 42,
//           //   maxHeight: 120,
//           //   height: inputHeight,
//           //   textAlignVertical: 'top',
//           //   includeFontPadding: false,
//           // }}
//           style={{
//             flex: 1,
//             color: theme.colors.foreground,
//             fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//             paddingTop: 15, // ✅ slightly more than before
//             paddingBottom: 8,
//             paddingHorizontal: 8,
//             minHeight: 42,
//             maxHeight: 120,
//             height: inputHeight,
//             textAlignVertical: 'top', // ✅ ensures text sticks to top, not center
//             includeFontPadding: false, // ✅ removes Android baseline clipping
//             lineHeight: 22, // ✅ keeps vertical rhythm clean
//           }}
//         />

//         {/* ❌ Clear Button */}
//         {input.length > 0 && (
//           <TouchableOpacity
//             onPress={resetField}
//             style={{
//               width: isTablet ? 40 : 32,
//               height: isTablet ? 40 : 32,
//               alignItems: 'center',
//               justifyContent: 'center',
//             }}>
//             <MaterialIcons
//               name="close"
//               size={isTablet ? 24 : 22}
//               color={theme.colors.foreground2}
//             />
//           </TouchableOpacity>
//         )}

//         {/* 🎙️ Mic */}
//         <TouchableOpacity
//           onPressIn={onMicPressIn}
//           onPressOut={onMicPressOut}
//           hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
//           style={{
//             width: isTablet ? 48 : 38,
//             height: isTablet ? 50 : 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <MaterialIcons
//             name={isRecording ? 'mic' : 'mic-none'}
//             size={isTablet ? 28 : 24}
//             color={
//               isRecording ? theme.colors.primary : theme.colors.foreground2
//             }
//           />
//         </TouchableOpacity>

//         {/* 📤 Send Button */}
//         <TouchableOpacity
//           onPress={async () => {
//             await stopListeningCompletely(); // ✅ stop voice first
//             onSend(); // ✅ send message
//             await resetField(); // ✅ clear input after sending
//           }}
//           disabled={!input.trim() || isTyping}
//           style={{
//             width: isTablet ? 48 : 38,
//             height: isTablet ? 50 : 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           {isTyping ? (
//             <ActivityIndicator />
//           ) : (
//             <View
//               style={{
//                 width: isTablet ? 40 : 34,
//                 height: isTablet ? 40 : 34,
//                 borderRadius: 20,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginLeft: 6,
//                 marginBottom: 2,
//                 backgroundColor: theme.colors.surface,
//               }}>
//               <MaterialIcons
//                 name="arrow-upward"
//                 size={isTablet ? 26 : 24}
//                 color={theme.colors.foreground}
//               />
//             </View>
//           )}
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// }

///////////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
//   Image,
//   Alert,
//   Modal,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {useResponsive} from '../hooks/useResponsive'; // ✅ shared adaptive hook
// import {Linking} from 'react-native';
// import ReaderModal from '../components/FashionFeed/ReaderModal';

// type Role = 'user' | 'assistant' | 'system';
// // type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// type Message = {
//   id: string;
//   role: Role;
//   text: string;
//   createdAt: number;
//   images?: {imageUrl: string; title?: string; sourceLink?: string}[];
//   links?: {label: string; url: string}[];
// };

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();
//   const {isTablet, isPhone, width} = useResponsive();

//   // ✅ Derive Apple-like breakpoints locally
//   const isLargePhone = isPhone && width >= 390; // iPhone Pro Max, Plus, etc.
//   const isSmallPhone = isPhone && width < 360; // SE or mini-style

//   const userId = useUUID();
//   const [profilePicture, setProfilePicture] = useState<string>('');

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);

//   const [webModalVisible, setWebModalVisible] = useState(false);
//   const [webUrl, setWebUrl] = useState<string | null>(null);

//   const [imageModalVisible, setImageModalVisible] = useState(false);
//   const [imageUri, setImageUri] = useState<string | null>(null);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();
//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   /** 🔗 Helper to call your AI chat endpoint with user_id */
//   async function callAiChatAPI(
//     historyForApi: Message[],
//     userMsg: Message,
//     userId: string,
//   ) {
//     console.log('🧠 Sending to AI Chat API', {
//       userId,
//       messageCount: historyForApi.length,
//     });

//     const res = await fetch(`${API_BASE_URL}/ai/chat`, {
//       method: 'POST',
//       headers: {'Content-Type': 'application/json'},
//       body: JSON.stringify({
//         user_id: userId || 'anonymous', // ✅ guarantees not null
//         messages: historyForApi.map(m => ({
//           role: m.role,
//           content: m.text,
//         })),
//       }),
//     });

//     if (!res.ok) {
//       console.error('❌ Chat API failed', res.status);
//       throw new Error('Chat API failed');
//     }

//     const json = await res.json();
//     return {
//       text: json.reply,
//       images: json.images ?? [],
//       links: json.links ?? [],
//     };
//   }

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   /** 👤 Load profile image */
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(`profile_picture:${userId}`);
//       if (cached) {
//         setProfilePicture(
//           `${cached}${cached.includes('?') ? '&' : '?'}v=${Date.now()}`,
//         );
//       }
//     })();
//   }, [userId]);

//   /** 💾 Persist chat thread */
//   useEffect(() => {
//     (async () => {
//       const saved = await AsyncStorage.getItem(`chat_thread:${userId}`);
//       if (saved) {
//         const parsed: Message[] = JSON.parse(saved);
//         if (parsed?.length) setMessages(parsed);
//       }
//     })();
//   }, [userId]);

//   useEffect(() => {
//     if (messages?.length) {
//       AsyncStorage.setItem(`chat_thread:${userId}`, JSON.stringify(messages));
//     }
//   }, [messages, userId]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   /** 📤 Send message (with fashion filter) */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;

//     const fashionKeywords = [
//       'outfit',
//       'style',
//       'wardrobe',
//       'stores',
//       'clothing',
//       'clothes',
//       'dress',
//       'trends',
//       'weather',
//       'event',
//       'occasion',
//       'formal',
//       'casual',
//       'smart casual',
//       'blazer',
//       'pants',
//       'shirt',
//       'jacket',
//       'accessory',
//       'color',
//       'shoes',
//       'season',
//       'vibe',
//       'wear',
//       'look',
//       'fit',
//       'layer',
//       'capsule',
//       'pair',
//       'match',
//       'coordinate',
//       'dress code',
//     ];
//     const lower = trimmed.toLowerCase();
//     const hasFashionKeyword = fashionKeywords.some(kw => lower.includes(kw));
//     const commonPhrases = [
//       'what should i wear',
//       'how should i dress',
//       'what goes with',
//       'how to style',
//       'how do i style',
//       'make me an outfit',
//       'build an outfit',
//       'suggest an outfit',
//       'style me',
//       'pair with',
//       'does this match',
//     ];
//     const hasCommonPhrase = commonPhrases.some(p => lower.includes(p));
//     const isFashionRelated = hasFashionKeyword || hasCommonPhrase;

//     if (!isFashionRelated) {
//       Alert.alert(
//         'Styling Questions Only ✨',
//         "I'm your personal stylist — I can only help with outfits, clothing advice, or fashion-related questions.",
//       );
//       return;
//     }

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
//     h('impactLight');

//     try {
//       const historyForApi = [...messages, userMsg];
//       const assistant = await callAiChatAPI(historyForApi, userMsg, userId);
//       // const aiMsg: Message = {
//       //   id: `a-${Date.now()}`,
//       //   role: 'assistant',
//       //   text: assistant.text,
//       //   createdAt: Date.now(),
//       //   images: assistant.images ?? [], // ✅ keep images
//       //   links: assistant.links ?? [], // ✅ keep links
//       // };
//       // 🧹 scrub common disclaimers before display
//       const cleanText = assistant.text
//         .replace(/I can(’|'|)t display images? directly[^.]*\.\s*/i, '')
//         .replace(
//           /I can help you (visualize|search) (them|for them)[^.]*\.\s*/i,
//           '',
//         )
//         .replace(/Here'?s how to (find|get) (them|images)[^.]*\.\s*/i, '')
//         .replace(/```json[\s\S]*?```/g, '') // hide raw json blocks
//         .trim();

//       const aiMsg: Message = {
//         id: `a-${Date.now()}`,
//         role: 'assistant',
//         text: cleanText || 'Here are some ideas:',
//         createdAt: Date.now(),
//         images: assistant.images ?? [],
//         links: assistant.links ?? [],
//       };

//       setMessages(prev => [...prev, aiMsg]);
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);
//   /** ✅ Button state logic */
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

//   /** 📊 Render chat message bubbles with Apple-style scaling */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme, isLargePhone, isTablet)
//       : stylesAssistantBubble(theme, isLargePhone, isTablet);

//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View key={m.id} style={{transform: [{translateX}]}}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[
//             bubble.row,
//             {
//               marginVertical: isTablet ? 14 : 10,
//               transform: [{scale: 0.98}],
//             },
//           ]}>
//           {/* 🤖 Assistant icon */}
//           {!isUser && (
//             <View
//               style={{
//                 width: isTablet ? 44 : 36,
//                 height: isTablet ? 44 : 36,
//                 borderRadius: 22,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 alignSelf: 'flex-end',
//                 marginRight: 6,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <MaterialIcons
//                 name="smart-toy"
//                 size={isTablet ? 28 : 22}
//                 color={theme.colors.buttonText1}
//               />
//             </View>
//           )}

//           {/* 💬 Bubble */}
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>

//             {/* 🖼️ Visual inspo images */}
//             {(m.images?.length ?? 0) > 0 && (
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 style={{marginTop: 8}}>
//                 {m.images?.map((img, i) => (
//                   <TouchableOpacity
//                     key={i}
//                     onPress={() => {
//                       h('impactLight');
//                       if (img.sourceLink) {
//                         setWebUrl(img.sourceLink);
//                         setWebModalVisible(true);
//                       } else {
//                         setImageUri(img.imageUrl);
//                         setImageModalVisible(true);
//                       }
//                     }}
//                     style={{
//                       marginRight: 8,
//                       borderRadius: 12,
//                       overflow: 'hidden',
//                       borderWidth: tokens.borderWidth.hairline,
//                       borderColor: theme.colors.surfaceBorder,
//                     }}>
//                     <Image
//                       source={{uri: img.imageUrl}}
//                       style={{width: 140, height: 160}}
//                       resizeMode="cover"
//                     />
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             )}

//             {/* 🔗 Optional product / shop links */}
//             {(m.links?.length ?? 0) > 0 && (
//               <View style={{marginTop: 8}}>
//                 {m.links?.map((l, i) => (
//                   <Text
//                     key={i}
//                     onPress={() => {
//                       h('impactLight');
//                       setWebUrl(l.url);
//                       setWebModalVisible(true);
//                     }}
//                     style={{
//                       color: theme.colors.primary,
//                       textDecorationLine: 'underline',
//                       fontSize: 15,
//                       marginVertical: 2,
//                     }}>
//                     {l.label}
//                   </Text>
//                 ))}
//               </View>
//             )}
//           </Animatable.View>

//           {/* 👤 User avatar */}
//           {isUser && (
//             <View
//               style={{
//                 width: isTablet ? 44 : 38,
//                 height: isTablet ? 44 : 38,
//                 borderRadius: 50,
//                 overflow: 'hidden',
//                 backgroundColor: theme.colors.background,
//                 alignSelf: 'flex-end',
//               }}>
//               {profilePicture ? (
//                 <Image
//                   source={{uri: profilePicture}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <MaterialIcons
//                   name="person"
//                   size={isTablet ? 28 : 22}
//                   color={theme.colors.foreground2}
//                   style={{alignSelf: 'center', marginTop: 6}}
//                 />
//               )}
//             </View>
//           )}
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         {/* <View style={stylesHeader(theme, isTablet).header}>
//           <View style={stylesHeader(theme, isTablet).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme, isTablet).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text
//               style={[
//                 globalStyles.header,
//                 {fontSize: isTablet ? 38 : isLargePhone ? 36 : 34},
//               ]}>
//               AI Stylist Chat
//             </Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme, isTablet).iconButton}
//               onPress={() => {
//                 h('impactLight');
//                 Alert.alert(
//                   'Clear Chat?',
//                   'This will erase your current conversation with the stylist.',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Clear Chat',
//                       style: 'destructive',
//                       onPress: async () => {
//                         await AsyncStorage.removeItem(`chat_thread:${userId}`);
//                         setMessages([
//                           {
//                             id: 'seed-1',
//                             role: 'assistant',
//                             text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//                             createdAt: Date.now(),
//                           },
//                         ]);
//                         scrollToBottom();
//                       },
//                     },
//                   ],
//                 );
//               }}>
//               <MaterialIcons
//                 name="delete"
//                 size={isTablet ? 28 : 22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View> */}

//         <View
//           style={{
//             flexDirection: 'row',
//             alignItems: 'center',
//             justifyContent: 'space-between',
//             paddingHorizontal: 18,

//             // ✅ no double inset — pull header higher for large iPhones
//             marginTop:
//               Platform.OS === 'ios'
//                 ? insets.top > 44
//                   ? -34 // ✅ lift up on large-notch phones (iPhone 14-16 Pro / Pro Max)
//                   : -4 // ✅ small phones like SE / Mini
//                 : 0,

//             paddingBottom: 8,
//             borderBottomWidth: StyleSheet.hairlineWidth,
//             borderBottomColor: theme.colors.surfaceBorder,
//           }}>
//           {/* Left: Status dot + Title */}
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               flexShrink: 1,
//               minWidth: 0,
//             }}>
//             <View
//               style={{
//                 width: 8,
//                 height: 8,
//                 borderRadius: 5,
//                 backgroundColor: theme.colors.success,
//                 marginRight: 6,
//               }}
//             />
//             <Text
//               numberOfLines={1}
//               ellipsizeMode="tail"
//               style={[
//                 globalStyles.header,
//                 {
//                   fontSize: width < 360 ? 26 : width < 400 ? 30 : 34,
//                   flexShrink: 1,
//                   color: theme.colors.foreground,
//                 },
//               ]}>
//               AI Stylist Chat
//             </Text>
//           </View>

//           {/* Right: Delete icon */}
//           <TouchableOpacity
//             onPress={() => {
//               h('impactLight');
//               Alert.alert(
//                 'Chat Options',
//                 'Choose how you’d like to reset your stylist chat.',
//                 [
//                   {text: 'Cancel', style: 'cancel'},

//                   // 🧠 Soft Reset — keeps long-term stylist memory
//                   {
//                     text: 'Start New Chat',
//                     onPress: async () => {
//                       try {
//                         // 🔥 Call your backend soft reset endpoint
//                         await fetch(
//                           `${API_BASE_URL}/ai/chat/soft-reset/${userId}`,
//                           {
//                             method: 'DELETE',
//                           },
//                         );

//                         // 🧹 Also clear local thread cache
//                         await AsyncStorage.removeItem(`chat_thread:${userId}`);

//                         setMessages([
//                           {
//                             id: 'seed-1',
//                             role: 'assistant',
//                             text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//                             createdAt: Date.now(),
//                           },
//                         ]);

//                         h('impactLight');
//                         scrollToBottom();
//                         Alert.alert(
//                           'New chat started ✨',
//                           'Your stylist still remembers your preferences.',
//                         );
//                       } catch (err) {
//                         console.error('❌ Failed soft reset:', err);
//                         Alert.alert('Error', 'Could not start new chat.');
//                       }
//                     },
//                   },
//                 ],
//               );
//             }}
//             hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
//             style={{
//               padding: 6,
//               borderRadius: 10,
//               backgroundColor: theme.colors.surface,
//             }}>
//             <MaterialIcons
//               name="autorenew" // ♻️ better icon for "New Chat"
//               size={22}
//               color={theme.colors.foreground}
//             />
//           </TouchableOpacity>
//         </View>

//         {/* 💬 Main Scroll */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             <View
//               style={{
//                 paddingHorizontal: isTablet ? 20 : 12,
//                 paddingBottom: 20,
//               }}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: isTablet ? 18 : 14,
//                   paddingVertical: 10,
//                   marginHorizontal: isTablet ? 18 : 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                 }}>
//                 <TypingDots />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontSize: isTablet ? 15 : 13,
//                   }}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}
//           </Animated.ScrollView>
//           {/* 📥 Adaptive Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//             isLargePhone={isLargePhone}
//             isTablet={isTablet}
//           />
//         </View>
//       </KeyboardAvoidingView>
//       {webUrl && (
//         <ReaderModal
//           visible={webModalVisible}
//           url={webUrl}
//           title="Shop & Style"
//           onClose={() => {
//             h('impactLight');
//             setWebModalVisible(false);
//             setWebUrl(null);
//           }}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

// /** 📥 Animated Input Bar — Apple-style adaptive */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
//   isLargePhone,
//   isTablet,
// }: any) {
//   const {theme} = useAppTheme();

//   // Define a height state at the top of AnimatedInputBar
//   const [inputHeight, setInputHeight] = useState(42);

//   // ✅ full stop + cancel helper
//   const stopListeningCompletely = async () => {
//     try {
//       const Voice = require('@react-native-voice/voice').default;
//       await Voice.stop();
//       await Voice.cancel();
//     } catch (e) {
//       console.warn('🎤 Failed to fully stop voice:', e);
//     }
//   };

//   // ✅ unified reset logic
//   const resetField = async () => {
//     await stopListeningCompletely();
//     setInput('');
//     inputRef?.current?.clear?.();
//   };

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: isTablet ? 18 : 10,
//         paddingBottom: isTablet ? 24 : 16,
//         backgroundColor: 'transparent',
//       }}>
//       {/* <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 22,
//           paddingHorizontal: 10,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}> */}
//       <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 22,
//           paddingLeft: 10,
//           paddingRight: 6,
//           paddingVertical: 4,
//           shadowColor: '#000',
//           shadowOpacity: 0.06,
//           shadowRadius: 3,
//           shadowOffset: {width: 0, height: 1},
//         }}>
//         {/* <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           multiline
//           scrollEnabled={false}
//           keyboardAppearance="dark"
//           returnKeyType="send"
//           blurOnSubmit={false}
//           style={{
//             flex: 1,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: isTablet ? 14 : 10,
//             paddingBottom: isTablet ? 14 : 10,
//             fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//             textAlignVertical: 'top',
//             minHeight: 42,
//           }}
//         /> */}

//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           multiline
//           onContentSizeChange={e =>
//             setInputHeight(Math.min(e.nativeEvent.contentSize.height, 120))
//           }
//           numberOfLines={1} // ✅ keeps placeholder single-line
//           ellipsizeMode="tail" // ✅ truncates long placeholder instead of wrapping
//           keyboardAppearance="dark"
//           returnKeyType="send"
//           blurOnSubmit={false}
//           // style={{
//           //   flex: 1,
//           //   color: theme.colors.foreground,
//           //   fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//           //   paddingVertical: 6,
//           //   paddingHorizontal: 8,
//           //   minHeight: 42,
//           //   maxHeight: 120,
//           //   height: inputHeight,
//           //   textAlignVertical: 'top',
//           //   includeFontPadding: false,
//           // }}
//           style={{
//             flex: 1,
//             color: theme.colors.foreground,
//             fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//             paddingTop: 15, // ✅ slightly more than before
//             paddingBottom: 8,
//             paddingHorizontal: 8,
//             minHeight: 42,
//             maxHeight: 120,
//             height: inputHeight,
//             textAlignVertical: 'top', // ✅ ensures text sticks to top, not center
//             includeFontPadding: false, // ✅ removes Android baseline clipping
//             lineHeight: 22, // ✅ keeps vertical rhythm clean
//           }}
//         />

//         {/* ❌ Clear Button */}
//         {input.length > 0 && (
//           <TouchableOpacity
//             onPress={resetField}
//             style={{
//               width: isTablet ? 40 : 32,
//               height: isTablet ? 40 : 32,
//               alignItems: 'center',
//               justifyContent: 'center',
//             }}>
//             <MaterialIcons
//               name="close"
//               size={isTablet ? 24 : 22}
//               color={theme.colors.foreground2}
//             />
//           </TouchableOpacity>
//         )}

//         {/* 🎙️ Mic */}
//         <TouchableOpacity
//           onPressIn={onMicPressIn}
//           onPressOut={onMicPressOut}
//           hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
//           style={{
//             width: isTablet ? 48 : 38,
//             height: isTablet ? 50 : 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <MaterialIcons
//             name={isRecording ? 'mic' : 'mic-none'}
//             size={isTablet ? 28 : 24}
//             color={
//               isRecording ? theme.colors.primary : theme.colors.foreground2
//             }
//           />
//         </TouchableOpacity>

//         {/* 📤 Send Button */}
//         <TouchableOpacity
//           onPress={async () => {
//             await stopListeningCompletely(); // ✅ stop voice first
//             onSend(); // ✅ send message
//             await resetField(); // ✅ clear input after sending
//           }}
//           disabled={!input.trim() || isTyping}
//           style={{
//             width: isTablet ? 48 : 38,
//             height: isTablet ? 50 : 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           {isTyping ? (
//             <ActivityIndicator />
//           ) : (
//             <View
//               style={{
//                 width: isTablet ? 40 : 34,
//                 height: isTablet ? 40 : 34,
//                 borderRadius: 20,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginLeft: 6,
//                 marginBottom: 2,
//                 backgroundColor: theme.colors.surface,
//               }}>
//               <MaterialIcons
//                 name="arrow-upward"
//                 size={isTablet ? 26 : 24}
//                 color={theme.colors.foreground}
//               />
//             </View>
//           )}
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// }

//////////////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
//   Image,
//   Alert,
//   Modal,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {useResponsive} from '../hooks/useResponsive'; // ✅ shared adaptive hook
// import {Linking} from 'react-native';
// import ReaderModal from '../components/FashionFeed/ReaderModal';

// type Role = 'user' | 'assistant' | 'system';
// // type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// type Message = {
//   id: string;
//   role: Role;
//   text: string;
//   createdAt: number;
//   images?: {imageUrl: string; title?: string; sourceLink?: string}[];
//   links?: {label: string; url: string}[];
// };

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();
//   const {isTablet, isPhone, width} = useResponsive();

//   // ✅ Derive Apple-like breakpoints locally
//   const isLargePhone = isPhone && width >= 390; // iPhone Pro Max, Plus, etc.
//   const isSmallPhone = isPhone && width < 360; // SE or mini-style

//   const userId = useUUID();
//   const [profilePicture, setProfilePicture] = useState<string>('');

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);

//   const [webModalVisible, setWebModalVisible] = useState(false);
//   const [webUrl, setWebUrl] = useState<string | null>(null);

//   const [imageModalVisible, setImageModalVisible] = useState(false);
//   const [imageUri, setImageUri] = useState<string | null>(null);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();
//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   /** 👤 Load profile image */
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(`profile_picture:${userId}`);
//       if (cached) {
//         setProfilePicture(
//           `${cached}${cached.includes('?') ? '&' : '?'}v=${Date.now()}`,
//         );
//       }
//     })();
//   }, [userId]);

//   /** 💾 Persist chat thread */
//   useEffect(() => {
//     (async () => {
//       const saved = await AsyncStorage.getItem(`chat_thread:${userId}`);
//       if (saved) {
//         const parsed: Message[] = JSON.parse(saved);
//         if (parsed?.length) setMessages(parsed);
//       }
//     })();
//   }, [userId]);

//   useEffect(() => {
//     if (messages?.length) {
//       AsyncStorage.setItem(`chat_thread:${userId}`, JSON.stringify(messages));
//     }
//   }, [messages, userId]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   /** 📤 Send message (with fashion filter) */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;

//     const fashionKeywords = [
//       'outfit',
//       'style',
//       'wardrobe',
//       'stores',
//       'clothing',
//       'clothes',
//       'dress',
//       'trends',
//       'weather',
//       'event',
//       'occasion',
//       'formal',
//       'casual',
//       'smart casual',
//       'blazer',
//       'pants',
//       'shirt',
//       'jacket',
//       'accessory',
//       'color',
//       'shoes',
//       'season',
//       'vibe',
//       'wear',
//       'look',
//       'fit',
//       'layer',
//       'capsule',
//       'pair',
//       'match',
//       'coordinate',
//       'dress code',
//     ];
//     const lower = trimmed.toLowerCase();
//     const hasFashionKeyword = fashionKeywords.some(kw => lower.includes(kw));
//     const commonPhrases = [
//       'what should i wear',
//       'how should i dress',
//       'what goes with',
//       'how to style',
//       'how do i style',
//       'make me an outfit',
//       'build an outfit',
//       'suggest an outfit',
//       'style me',
//       'pair with',
//       'does this match',
//     ];
//     const hasCommonPhrase = commonPhrases.some(p => lower.includes(p));
//     const isFashionRelated = hasFashionKeyword || hasCommonPhrase;

//     if (!isFashionRelated) {
//       Alert.alert(
//         'Styling Questions Only ✨',
//         "I'm your personal stylist — I can only help with outfits, clothing advice, or fashion-related questions.",
//       );
//       return;
//     }

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
//     h('impactLight');

//     try {
//       const historyForApi = [...messages, userMsg];
//       const assistant = await callAiChatAPI(historyForApi, userMsg);
//       // const aiMsg: Message = {
//       //   id: `a-${Date.now()}`,
//       //   role: 'assistant',
//       //   text: assistant.text,
//       //   createdAt: Date.now(),
//       //   images: assistant.images ?? [], // ✅ keep images
//       //   links: assistant.links ?? [], // ✅ keep links
//       // };
//       // 🧹 scrub common disclaimers before display
//       const cleanText = assistant.text
//         .replace(/I can(’|'|)t display images? directly[^.]*\.\s*/i, '')
//         .replace(
//           /I can help you (visualize|search) (them|for them)[^.]*\.\s*/i,
//           '',
//         )
//         .replace(/Here'?s how to (find|get) (them|images)[^.]*\.\s*/i, '')
//         .replace(/```json[\s\S]*?```/g, '') // hide raw json blocks
//         .trim();

//       const aiMsg: Message = {
//         id: `a-${Date.now()}`,
//         role: 'assistant',
//         text: cleanText || 'Here are some ideas:',
//         createdAt: Date.now(),
//         images: assistant.images ?? [],
//         links: assistant.links ?? [],
//       };

//       setMessages(prev => [...prev, aiMsg]);
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);
//   /** ✅ Button state logic */
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

//   /** 📊 Render chat message bubbles with Apple-style scaling */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme, isLargePhone, isTablet)
//       : stylesAssistantBubble(theme, isLargePhone, isTablet);

//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View key={m.id} style={{transform: [{translateX}]}}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[
//             bubble.row,
//             {
//               marginVertical: isTablet ? 14 : 10,
//               transform: [{scale: 0.98}],
//             },
//           ]}>
//           {/* 🤖 Assistant icon */}
//           {!isUser && (
//             <View
//               style={{
//                 width: isTablet ? 44 : 36,
//                 height: isTablet ? 44 : 36,
//                 borderRadius: 22,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 alignSelf: 'flex-end',
//                 marginRight: 6,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <MaterialIcons
//                 name="smart-toy"
//                 size={isTablet ? 28 : 22}
//                 color={theme.colors.buttonText1}
//               />
//             </View>
//           )}

//           {/* 💬 Bubble */}
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>

//             {/* 🖼️ Visual inspo images */}
//             {(m.images?.length ?? 0) > 0 && (
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 style={{marginTop: 8}}>
//                 {m.images?.map((img, i) => (
//                   <TouchableOpacity
//                     key={i}
//                     onPress={() => {
//                       h('impactLight');
//                       if (img.sourceLink) {
//                         setWebUrl(img.sourceLink);
//                         setWebModalVisible(true);
//                       } else {
//                         setImageUri(img.imageUrl);
//                         setImageModalVisible(true);
//                       }
//                     }}
//                     style={{
//                       marginRight: 8,
//                       borderRadius: 12,
//                       overflow: 'hidden',
//                       borderWidth: tokens.borderWidth.hairline,
//                       borderColor: theme.colors.surfaceBorder,
//                     }}>
//                     <Image
//                       source={{uri: img.imageUrl}}
//                       style={{width: 140, height: 160}}
//                       resizeMode="cover"
//                     />
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             )}

//             {/* 🔗 Optional product / shop links */}
//             {(m.links?.length ?? 0) > 0 && (
//               <View style={{marginTop: 8}}>
//                 {m.links?.map((l, i) => (
//                   <Text
//                     key={i}
//                     onPress={() => {
//                       h('impactLight');
//                       setWebUrl(l.url);
//                       setWebModalVisible(true);
//                     }}
//                     style={{
//                       color: theme.colors.primary,
//                       textDecorationLine: 'underline',
//                       fontSize: 15,
//                       marginVertical: 2,
//                     }}>
//                     {l.label}
//                   </Text>
//                 ))}
//               </View>
//             )}
//           </Animatable.View>

//           {/* 👤 User avatar */}
//           {isUser && (
//             <View
//               style={{
//                 width: isTablet ? 44 : 38,
//                 height: isTablet ? 44 : 38,
//                 borderRadius: 50,
//                 overflow: 'hidden',
//                 backgroundColor: theme.colors.background,
//                 alignSelf: 'flex-end',
//               }}>
//               {profilePicture ? (
//                 <Image
//                   source={{uri: profilePicture}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <MaterialIcons
//                   name="person"
//                   size={isTablet ? 28 : 22}
//                   color={theme.colors.foreground2}
//                   style={{alignSelf: 'center', marginTop: 6}}
//                 />
//               )}
//             </View>
//           )}
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         {/* <View style={stylesHeader(theme, isTablet).header}>
//           <View style={stylesHeader(theme, isTablet).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme, isTablet).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text
//               style={[
//                 globalStyles.header,
//                 {fontSize: isTablet ? 38 : isLargePhone ? 36 : 34},
//               ]}>
//               AI Stylist Chat
//             </Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme, isTablet).iconButton}
//               onPress={() => {
//                 h('impactLight');
//                 Alert.alert(
//                   'Clear Chat?',
//                   'This will erase your current conversation with the stylist.',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Clear Chat',
//                       style: 'destructive',
//                       onPress: async () => {
//                         await AsyncStorage.removeItem(`chat_thread:${userId}`);
//                         setMessages([
//                           {
//                             id: 'seed-1',
//                             role: 'assistant',
//                             text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//                             createdAt: Date.now(),
//                           },
//                         ]);
//                         scrollToBottom();
//                       },
//                     },
//                   ],
//                 );
//               }}>
//               <MaterialIcons
//                 name="delete"
//                 size={isTablet ? 28 : 22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View> */}

//         <View
//           style={{
//             flexDirection: 'row',
//             alignItems: 'center',
//             justifyContent: 'space-between',
//             paddingHorizontal: 18,

//             // ✅ no double inset — pull header higher for large iPhones
//             marginTop:
//               Platform.OS === 'ios'
//                 ? insets.top > 44
//                   ? -34 // ✅ lift up on large-notch phones (iPhone 14-16 Pro / Pro Max)
//                   : -4 // ✅ small phones like SE / Mini
//                 : 0,

//             paddingBottom: 8,
//             borderBottomWidth: StyleSheet.hairlineWidth,
//             borderBottomColor: theme.colors.surfaceBorder,
//           }}>
//           {/* Left: Status dot + Title */}
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               flexShrink: 1,
//               minWidth: 0,
//             }}>
//             <View
//               style={{
//                 width: 8,
//                 height: 8,
//                 borderRadius: 5,
//                 backgroundColor: theme.colors.success,
//                 marginRight: 6,
//               }}
//             />
//             <Text
//               numberOfLines={1}
//               ellipsizeMode="tail"
//               style={[
//                 globalStyles.header,
//                 {
//                   fontSize: width < 360 ? 26 : width < 400 ? 30 : 34,
//                   flexShrink: 1,
//                   color: theme.colors.foreground,
//                 },
//               ]}>
//               AI Stylist Chat
//             </Text>
//           </View>

//           {/* Right: Delete icon */}
//           <TouchableOpacity
//             onPress={() => {
//               h('impactLight');
//               Alert.alert(
//                 'Clear Chat?',
//                 'This will erase your current conversation with the stylist.',
//                 [
//                   {text: 'Cancel', style: 'cancel'},
//                   {
//                     text: 'Clear Chat',
//                     style: 'destructive',
//                     onPress: async () => {
//                       await AsyncStorage.removeItem(`chat_thread:${userId}`);
//                       setMessages([
//                         {
//                           id: 'seed-1',
//                           role: 'assistant',
//                           text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//                           createdAt: Date.now(),
//                         },
//                       ]);
//                       scrollToBottom();
//                     },
//                   },
//                 ],
//               );
//             }}
//             hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
//             style={{
//               padding: 6,
//               borderRadius: 10,
//               backgroundColor: theme.colors.surface,
//             }}>
//             <MaterialIcons
//               name="delete"
//               size={22}
//               color={theme.colors.foreground}
//             />
//           </TouchableOpacity>
//         </View>

//         {/* 💬 Main Scroll */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             <View
//               style={{
//                 paddingHorizontal: isTablet ? 20 : 12,
//                 paddingBottom: 20,
//               }}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: isTablet ? 18 : 14,
//                   paddingVertical: 10,
//                   marginHorizontal: isTablet ? 18 : 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                 }}>
//                 <TypingDots />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontSize: isTablet ? 15 : 13,
//                   }}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}
//           </Animated.ScrollView>
//           {/* 📥 Adaptive Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//             isLargePhone={isLargePhone}
//             isTablet={isTablet}
//           />
//         </View>
//       </KeyboardAvoidingView>
//       {webUrl && (
//         <ReaderModal
//           visible={webModalVisible}
//           url={webUrl}
//           title="Shop & Style"
//           onClose={() => {
//             h('impactLight');
//             setWebModalVisible(false);
//             setWebUrl(null);
//           }}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

// /** 📥 Animated Input Bar — Apple-style adaptive */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
//   isLargePhone,
//   isTablet,
// }: any) {
//   const {theme} = useAppTheme();

//   // Define a height state at the top of AnimatedInputBar
//   const [inputHeight, setInputHeight] = useState(42);

//   // ✅ full stop + cancel helper
//   const stopListeningCompletely = async () => {
//     try {
//       const Voice = require('@react-native-voice/voice').default;
//       await Voice.stop();
//       await Voice.cancel();
//     } catch (e) {
//       console.warn('🎤 Failed to fully stop voice:', e);
//     }
//   };

//   // ✅ unified reset logic
//   const resetField = async () => {
//     await stopListeningCompletely();
//     setInput('');
//     inputRef?.current?.clear?.();
//   };

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: isTablet ? 18 : 10,
//         paddingBottom: isTablet ? 24 : 16,
//         backgroundColor: 'transparent',
//       }}>
//       {/* <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 22,
//           paddingHorizontal: 10,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}> */}
//       <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 22,
//           paddingLeft: 10,
//           paddingRight: 6,
//           paddingVertical: 4,
//           shadowColor: '#000',
//           shadowOpacity: 0.06,
//           shadowRadius: 3,
//           shadowOffset: {width: 0, height: 1},
//         }}>
//         {/* <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           multiline
//           scrollEnabled={false}
//           keyboardAppearance="dark"
//           returnKeyType="send"
//           blurOnSubmit={false}
//           style={{
//             flex: 1,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: isTablet ? 14 : 10,
//             paddingBottom: isTablet ? 14 : 10,
//             fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//             textAlignVertical: 'top',
//             minHeight: 42,
//           }}
//         /> */}

//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           multiline
//           onContentSizeChange={e =>
//             setInputHeight(Math.min(e.nativeEvent.contentSize.height, 120))
//           }
//           numberOfLines={1} // ✅ keeps placeholder single-line
//           ellipsizeMode="tail" // ✅ truncates long placeholder instead of wrapping
//           keyboardAppearance="dark"
//           returnKeyType="send"
//           blurOnSubmit={false}
//           // style={{
//           //   flex: 1,
//           //   color: theme.colors.foreground,
//           //   fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//           //   paddingVertical: 6,
//           //   paddingHorizontal: 8,
//           //   minHeight: 42,
//           //   maxHeight: 120,
//           //   height: inputHeight,
//           //   textAlignVertical: 'top',
//           //   includeFontPadding: false,
//           // }}
//           style={{
//             flex: 1,
//             color: theme.colors.foreground,
//             fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//             paddingTop: 15, // ✅ slightly more than before
//             paddingBottom: 8,
//             paddingHorizontal: 8,
//             minHeight: 42,
//             maxHeight: 120,
//             height: inputHeight,
//             textAlignVertical: 'top', // ✅ ensures text sticks to top, not center
//             includeFontPadding: false, // ✅ removes Android baseline clipping
//             lineHeight: 22, // ✅ keeps vertical rhythm clean
//           }}
//         />

//         {/* ❌ Clear Button */}
//         {input.length > 0 && (
//           <TouchableOpacity
//             onPress={resetField}
//             style={{
//               width: isTablet ? 40 : 32,
//               height: isTablet ? 40 : 32,
//               alignItems: 'center',
//               justifyContent: 'center',
//             }}>
//             <MaterialIcons
//               name="close"
//               size={isTablet ? 24 : 22}
//               color={theme.colors.foreground2}
//             />
//           </TouchableOpacity>
//         )}

//         {/* 🎙️ Mic */}
//         <TouchableOpacity
//           onPressIn={onMicPressIn}
//           onPressOut={onMicPressOut}
//           hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
//           style={{
//             width: isTablet ? 48 : 38,
//             height: isTablet ? 50 : 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <MaterialIcons
//             name={isRecording ? 'mic' : 'mic-none'}
//             size={isTablet ? 28 : 24}
//             color={
//               isRecording ? theme.colors.primary : theme.colors.foreground2
//             }
//           />
//         </TouchableOpacity>

//         {/* 📤 Send Button */}
//         <TouchableOpacity
//           onPress={async () => {
//             await stopListeningCompletely(); // ✅ stop voice first
//             onSend(); // ✅ send message
//             await resetField(); // ✅ clear input after sending
//           }}
//           disabled={!input.trim() || isTyping}
//           style={{
//             width: isTablet ? 48 : 38,
//             height: isTablet ? 50 : 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           {isTyping ? (
//             <ActivityIndicator />
//           ) : (
//             <View
//               style={{
//                 width: isTablet ? 40 : 34,
//                 height: isTablet ? 40 : 34,
//                 borderRadius: 20,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginLeft: 6,
//                 marginBottom: 2,
//                 backgroundColor: theme.colors.surface,
//               }}>
//               <MaterialIcons
//                 name="arrow-upward"
//                 size={isTablet ? 26 : 24}
//                 color={theme.colors.foreground}
//               />
//             </View>
//           )}
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// }

///////////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
//   Image,
//   Alert,
//   Modal,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {useResponsive} from '../hooks/useResponsive'; // ✅ shared adaptive hook
// import {Linking} from 'react-native';
// import ReaderModal from '../components/FashionFeed/ReaderModal';

// type Role = 'user' | 'assistant' | 'system';
// // type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// type Message = {
//   id: string;
//   role: Role;
//   text: string;
//   createdAt: number;
//   images?: {imageUrl: string; title?: string; sourceLink?: string}[];
//   links?: {label: string; url: string}[];
// };

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();
//   const {isTablet, isPhone, width} = useResponsive();

//   // ✅ Derive Apple-like breakpoints locally
//   const isLargePhone = isPhone && width >= 390; // iPhone Pro Max, Plus, etc.
//   const isSmallPhone = isPhone && width < 360; // SE or mini-style

//   const userId = useUUID();
//   const [profilePicture, setProfilePicture] = useState<string>('');

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);

//   const [webModalVisible, setWebModalVisible] = useState(false);
//   const [webUrl, setWebUrl] = useState<string | null>(null);

//   const [imageModalVisible, setImageModalVisible] = useState(false);
//   const [imageUri, setImageUri] = useState<string | null>(null);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();
//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   /** 👤 Load profile image */
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(`profile_picture:${userId}`);
//       if (cached) {
//         setProfilePicture(
//           `${cached}${cached.includes('?') ? '&' : '?'}v=${Date.now()}`,
//         );
//       }
//     })();
//   }, [userId]);

//   /** 💾 Persist chat thread */
//   useEffect(() => {
//     (async () => {
//       const saved = await AsyncStorage.getItem(`chat_thread:${userId}`);
//       if (saved) {
//         const parsed: Message[] = JSON.parse(saved);
//         if (parsed?.length) setMessages(parsed);
//       }
//     })();
//   }, [userId]);

//   useEffect(() => {
//     if (messages?.length) {
//       AsyncStorage.setItem(`chat_thread:${userId}`, JSON.stringify(messages));
//     }
//   }, [messages, userId]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   /** 📤 Send message (with fashion filter) */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;

//     const fashionKeywords = [
//       'outfit',
//       'style',
//       'wardrobe',
//       'stores',
//       'clothing',
//       'clothes',
//       'dress',
//       'trends',
//       'weather',
//       'event',
//       'occasion',
//       'formal',
//       'casual',
//       'smart casual',
//       'blazer',
//       'pants',
//       'shirt',
//       'jacket',
//       'accessory',
//       'color',
//       'shoes',
//       'season',
//       'vibe',
//       'wear',
//       'look',
//       'fit',
//       'layer',
//       'capsule',
//       'pair',
//       'match',
//       'coordinate',
//       'dress code',
//     ];
//     const lower = trimmed.toLowerCase();
//     const hasFashionKeyword = fashionKeywords.some(kw => lower.includes(kw));
//     const commonPhrases = [
//       'what should i wear',
//       'how should i dress',
//       'what goes with',
//       'how to style',
//       'how do i style',
//       'make me an outfit',
//       'build an outfit',
//       'suggest an outfit',
//       'style me',
//       'pair with',
//       'does this match',
//     ];
//     const hasCommonPhrase = commonPhrases.some(p => lower.includes(p));
//     const isFashionRelated = hasFashionKeyword || hasCommonPhrase;

//     if (!isFashionRelated) {
//       Alert.alert(
//         'Styling Questions Only ✨',
//         "I'm your personal stylist — I can only help with outfits, clothing advice, or fashion-related questions.",
//       );
//       return;
//     }

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
//     h('impactLight');

//     try {
//       const historyForApi = [...messages, userMsg];
//       const assistant = await callAiChatAPI(historyForApi, userMsg);
//       // const aiMsg: Message = {
//       //   id: `a-${Date.now()}`,
//       //   role: 'assistant',
//       //   text: assistant.text,
//       //   createdAt: Date.now(),
//       //   images: assistant.images ?? [], // ✅ keep images
//       //   links: assistant.links ?? [], // ✅ keep links
//       // };
//       // 🧹 scrub common disclaimers before display
//       const cleanText = assistant.text
//         .replace(/I can(’|'|)t display images? directly[^.]*\.\s*/i, '')
//         .replace(
//           /I can help you (visualize|search) (them|for them)[^.]*\.\s*/i,
//           '',
//         )
//         .replace(/Here'?s how to (find|get) (them|images)[^.]*\.\s*/i, '')
//         .replace(/```json[\s\S]*?```/g, '') // hide raw json blocks
//         .trim();

//       const aiMsg: Message = {
//         id: `a-${Date.now()}`,
//         role: 'assistant',
//         text: cleanText || 'Here are some ideas:',
//         createdAt: Date.now(),
//         images: assistant.images ?? [],
//         links: assistant.links ?? [],
//       };

//       setMessages(prev => [...prev, aiMsg]);
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);
//   /** ✅ Button state logic */
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

//   /** 📊 Render chat message bubbles with Apple-style scaling */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme, isLargePhone, isTablet)
//       : stylesAssistantBubble(theme, isLargePhone, isTablet);

//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View key={m.id} style={{transform: [{translateX}]}}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[
//             bubble.row,
//             {
//               marginVertical: isTablet ? 14 : 10,
//               transform: [{scale: 0.98}],
//             },
//           ]}>
//           {/* 🤖 Assistant icon */}
//           {!isUser && (
//             <View
//               style={{
//                 width: isTablet ? 44 : 36,
//                 height: isTablet ? 44 : 36,
//                 borderRadius: 22,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 alignSelf: 'flex-end',
//                 marginRight: 6,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <MaterialIcons
//                 name="smart-toy"
//                 size={isTablet ? 28 : 22}
//                 color={theme.colors.buttonText1}
//               />
//             </View>
//           )}

//           {/* 💬 Bubble */}
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>

//             {/* 🖼️ Visual inspo images */}
//             {(m.images?.length ?? 0) > 0 && (
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 style={{marginTop: 8}}>
//                 {m.images?.map((img, i) => (
//                   <TouchableOpacity
//                     key={i}
//                     onPress={() => {
//                       h('impactLight');
//                       if (img.sourceLink) {
//                         setWebUrl(img.sourceLink);
//                         setWebModalVisible(true);
//                       } else {
//                         setImageUri(img.imageUrl);
//                         setImageModalVisible(true);
//                       }
//                     }}
//                     style={{
//                       marginRight: 8,
//                       borderRadius: 12,
//                       overflow: 'hidden',
//                       borderWidth: tokens.borderWidth.hairline,
//                       borderColor: theme.colors.surfaceBorder,
//                     }}>
//                     <Image
//                       source={{uri: img.imageUrl}}
//                       style={{width: 140, height: 160}}
//                       resizeMode="cover"
//                     />
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             )}

//             {/* 🔗 Optional product / shop links */}
//             {(m.links?.length ?? 0) > 0 && (
//               <View style={{marginTop: 8}}>
//                 {m.links?.map((l, i) => (
//                   <Text
//                     key={i}
//                     onPress={() => {
//                       h('impactLight');
//                       setWebUrl(l.url);
//                       setWebModalVisible(true);
//                     }}
//                     style={{
//                       color: theme.colors.primary,
//                       textDecorationLine: 'underline',
//                       fontSize: 15,
//                       marginVertical: 2,
//                     }}>
//                     {l.label}
//                   </Text>
//                 ))}
//               </View>
//             )}
//           </Animatable.View>

//           {/* 👤 User avatar */}
//           {isUser && (
//             <View
//               style={{
//                 width: isTablet ? 44 : 38,
//                 height: isTablet ? 44 : 38,
//                 borderRadius: 50,
//                 overflow: 'hidden',
//                 backgroundColor: theme.colors.background,
//                 alignSelf: 'flex-end',
//               }}>
//               {profilePicture ? (
//                 <Image
//                   source={{uri: profilePicture}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <MaterialIcons
//                   name="person"
//                   size={isTablet ? 28 : 22}
//                   color={theme.colors.foreground2}
//                   style={{alignSelf: 'center', marginTop: 6}}
//                 />
//               )}
//             </View>
//           )}
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         <View style={stylesHeader(theme, isTablet).header}>
//           <View style={stylesHeader(theme, isTablet).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme, isTablet).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text
//               style={[
//                 globalStyles.header,
//                 {fontSize: isTablet ? 38 : isLargePhone ? 36 : 34},
//               ]}>
//               AI Stylist Chat
//             </Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme, isTablet).iconButton}
//               onPress={() => {
//                 h('impactLight');
//                 Alert.alert(
//                   'Clear Chat?',
//                   'This will erase your current conversation with the stylist.',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Clear Chat',
//                       style: 'destructive',
//                       onPress: async () => {
//                         await AsyncStorage.removeItem(`chat_thread:${userId}`);
//                         setMessages([
//                           {
//                             id: 'seed-1',
//                             role: 'assistant',
//                             text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//                             createdAt: Date.now(),
//                           },
//                         ]);
//                         scrollToBottom();
//                       },
//                     },
//                   ],
//                 );
//               }}>
//               <MaterialIcons
//                 name="delete"
//                 size={isTablet ? 28 : 22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>

//         {/* 💬 Main Scroll */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             <View
//               style={{
//                 paddingHorizontal: isTablet ? 20 : 12,
//                 paddingBottom: 20,
//               }}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: isTablet ? 18 : 14,
//                   paddingVertical: 10,
//                   marginHorizontal: isTablet ? 18 : 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                 }}>
//                 <TypingDots />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontSize: isTablet ? 15 : 13,
//                   }}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}
//           </Animated.ScrollView>
//           {/* 📥 Adaptive Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//             isLargePhone={isLargePhone}
//             isTablet={isTablet}
//           />
//         </View>
//       </KeyboardAvoidingView>
//       {webUrl && (
//         <ReaderModal
//           visible={webModalVisible}
//           url={webUrl}
//           title="Shop & Style"
//           onClose={() => {
//             h('impactLight');
//             setWebModalVisible(false);
//             setWebUrl(null);
//           }}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

// /** 📥 Animated Input Bar — Apple-style adaptive */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
//   isLargePhone,
//   isTablet,
// }: any) {
//   const {theme} = useAppTheme();

//   // ✅ full stop + cancel helper
//   const stopListeningCompletely = async () => {
//     try {
//       const Voice = require('@react-native-voice/voice').default;
//       await Voice.stop();
//       await Voice.cancel();
//     } catch (e) {
//       console.warn('🎤 Failed to fully stop voice:', e);
//     }
//   };

//   // ✅ unified reset logic
//   const resetField = async () => {
//     await stopListeningCompletely();
//     setInput('');
//     inputRef?.current?.clear?.();
//   };

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: isTablet ? 18 : 10,
//         paddingBottom: isTablet ? 24 : 16,
//         backgroundColor: 'transparent',
//       }}>
//       <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 22,
//           paddingHorizontal: 10,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}>
//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           multiline
//           scrollEnabled={false}
//           keyboardAppearance="dark"
//           returnKeyType="send"
//           blurOnSubmit={false}
//           style={{
//             flex: 1,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: isTablet ? 14 : 10,
//             paddingBottom: isTablet ? 14 : 10,
//             fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//             textAlignVertical: 'top',
//             minHeight: 42,
//           }}
//         />

//         {/* ❌ Clear Button */}
//         {input.length > 0 && (
//           <TouchableOpacity
//             onPress={resetField}
//             style={{
//               width: isTablet ? 40 : 32,
//               height: isTablet ? 40 : 32,
//               alignItems: 'center',
//               justifyContent: 'center',
//             }}>
//             <MaterialIcons
//               name="close"
//               size={isTablet ? 24 : 22}
//               color={theme.colors.foreground2}
//             />
//           </TouchableOpacity>
//         )}

//         {/* 🎙️ Mic */}
//         <TouchableOpacity
//           onPressIn={onMicPressIn}
//           onPressOut={onMicPressOut}
//           hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
//           style={{
//             width: isTablet ? 48 : 38,
//             height: isTablet ? 50 : 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <MaterialIcons
//             name={isRecording ? 'mic' : 'mic-none'}
//             size={isTablet ? 28 : 24}
//             color={
//               isRecording ? theme.colors.primary : theme.colors.foreground2
//             }
//           />
//         </TouchableOpacity>

//         {/* 📤 Send Button */}
//         <TouchableOpacity
//           onPress={async () => {
//             await stopListeningCompletely(); // ✅ stop voice first
//             onSend(); // ✅ send message
//             await resetField(); // ✅ clear input after sending
//           }}
//           disabled={!input.trim() || isTyping}
//           style={{
//             width: isTablet ? 48 : 38,
//             height: isTablet ? 50 : 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           {isTyping ? (
//             <ActivityIndicator />
//           ) : (
//             <View
//               style={{
//                 width: isTablet ? 40 : 34,
//                 height: isTablet ? 40 : 34,
//                 borderRadius: 20,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginLeft: 6,
//                 marginBottom: 2,
//                 backgroundColor: theme.colors.surface,
//               }}>
//               <MaterialIcons
//                 name="arrow-upward"
//                 size={isTablet ? 26 : 24}
//                 color={theme.colors.foreground}
//               />
//             </View>
//           )}
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// }

////////////////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
//   Image,
//   Alert,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {useResponsive} from '../hooks/useResponsive'; // ✅ shared adaptive hook
// import {Linking} from 'react-native';

// type Role = 'user' | 'assistant' | 'system';
// // type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// type Message = {
//   id: string;
//   role: Role;
//   text: string;
//   createdAt: number;
//   images?: {imageUrl: string; title?: string; sourceLink?: string}[];
//   links?: {label: string; url: string}[];
// };

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();
//   const {isTablet, isPhone, width} = useResponsive();

//   // ✅ Derive Apple-like breakpoints locally
//   const isLargePhone = isPhone && width >= 390; // iPhone Pro Max, Plus, etc.
//   const isSmallPhone = isPhone && width < 360; // SE or mini-style

//   const userId = useUUID();
//   const [profilePicture, setProfilePicture] = useState<string>('');

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();
//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   /** 👤 Load profile image */
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(`profile_picture:${userId}`);
//       if (cached) {
//         setProfilePicture(
//           `${cached}${cached.includes('?') ? '&' : '?'}v=${Date.now()}`,
//         );
//       }
//     })();
//   }, [userId]);

//   /** 💾 Persist chat thread */
//   useEffect(() => {
//     (async () => {
//       const saved = await AsyncStorage.getItem(`chat_thread:${userId}`);
//       if (saved) {
//         const parsed: Message[] = JSON.parse(saved);
//         if (parsed?.length) setMessages(parsed);
//       }
//     })();
//   }, [userId]);

//   useEffect(() => {
//     if (messages?.length) {
//       AsyncStorage.setItem(`chat_thread:${userId}`, JSON.stringify(messages));
//     }
//   }, [messages, userId]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   /** 📤 Send message (with fashion filter) */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;

//     const fashionKeywords = [
//       'outfit',
//       'style',
//       'wardrobe',
//       'stores',
//       'clothing',
//       'clothes',
//       'dress',
//       'trends',
//       'weather',
//       'event',
//       'occasion',
//       'formal',
//       'casual',
//       'smart casual',
//       'blazer',
//       'pants',
//       'shirt',
//       'jacket',
//       'accessory',
//       'color',
//       'shoes',
//       'season',
//       'vibe',
//       'wear',
//       'look',
//       'fit',
//       'layer',
//       'capsule',
//       'pair',
//       'match',
//       'coordinate',
//       'dress code',
//     ];
//     const lower = trimmed.toLowerCase();
//     const hasFashionKeyword = fashionKeywords.some(kw => lower.includes(kw));
//     const commonPhrases = [
//       'what should i wear',
//       'how should i dress',
//       'what goes with',
//       'how to style',
//       'how do i style',
//       'make me an outfit',
//       'build an outfit',
//       'suggest an outfit',
//       'style me',
//       'pair with',
//       'does this match',
//     ];
//     const hasCommonPhrase = commonPhrases.some(p => lower.includes(p));
//     const isFashionRelated = hasFashionKeyword || hasCommonPhrase;

//     if (!isFashionRelated) {
//       Alert.alert(
//         'Styling Questions Only ✨',
//         "I'm your personal stylist — I can only help with outfits, clothing advice, or fashion-related questions.",
//       );
//       return;
//     }

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
//     h('impactLight');

//     try {
//       const historyForApi = [...messages, userMsg];
//       const assistant = await callAiChatAPI(historyForApi, userMsg);
//       const aiMsg: Message = {
//         id: `a-${Date.now()}`,
//         role: 'assistant',
//         text: assistant.text,
//         createdAt: Date.now(),
//         images: assistant.images ?? [], // ✅ keep images
//         links: assistant.links ?? [], // ✅ keep links
//       };
//       setMessages(prev => [...prev, aiMsg]);
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);
//   /** ✅ Button state logic */
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

//   /** 📊 Render chat message bubbles with Apple-style scaling */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme, isLargePhone, isTablet)
//       : stylesAssistantBubble(theme, isLargePhone, isTablet);

//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View key={m.id} style={{transform: [{translateX}]}}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[
//             bubble.row,
//             {
//               marginVertical: isTablet ? 14 : 10,
//               transform: [{scale: 0.98}],
//             },
//           ]}>
//           {/* 🤖 Assistant icon */}
//           {!isUser && (
//             <View
//               style={{
//                 width: isTablet ? 44 : 36,
//                 height: isTablet ? 44 : 36,
//                 borderRadius: 22,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 alignSelf: 'flex-end',
//                 marginRight: 6,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <MaterialIcons
//                 name="smart-toy"
//                 size={isTablet ? 28 : 22}
//                 color={theme.colors.buttonText1}
//               />
//             </View>
//           )}

//           {/* 💬 Bubble */}
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>

//             {/* 🖼️ Visual inspo images */}
//             {(m.images?.length ?? 0) > 0 && (
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 style={{marginTop: 8}}>
//                 {m.images?.map((img, i) => (
//                   <TouchableOpacity
//                     key={i}
//                     onPress={() =>
//                       img.sourceLink && Linking.openURL(img.sourceLink)
//                     }
//                     style={{
//                       marginRight: 8,
//                       borderRadius: 12,
//                       overflow: 'hidden',
//                       borderWidth: tokens.borderWidth.hairline,
//                       borderColor: theme.colors.surfaceBorder,
//                     }}>
//                     <Image
//                       source={{uri: img.imageUrl}}
//                       style={{width: 140, height: 160}}
//                       resizeMode="cover"
//                     />
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             )}

//             {/* 🔗 Optional product / shop links */}
//             {(m.links?.length ?? 0) > 0 && (
//               <View style={{marginTop: 8}}>
//                 {m.links?.map((l, i) => (
//                   <Text
//                     key={i}
//                     onPress={() => Linking.openURL(l.url)}
//                     style={{
//                       color: theme.colors.primary,
//                       textDecorationLine: 'underline',
//                       fontSize: 15,
//                       marginVertical: 2,
//                     }}>
//                     {l.label}
//                   </Text>
//                 ))}
//               </View>
//             )}
//           </Animatable.View>

//           {/* 👤 User avatar */}
//           {isUser && (
//             <View
//               style={{
//                 width: isTablet ? 44 : 38,
//                 height: isTablet ? 44 : 38,
//                 borderRadius: 50,
//                 overflow: 'hidden',
//                 backgroundColor: theme.colors.background,
//                 alignSelf: 'flex-end',
//               }}>
//               {profilePicture ? (
//                 <Image
//                   source={{uri: profilePicture}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <MaterialIcons
//                   name="person"
//                   size={isTablet ? 28 : 22}
//                   color={theme.colors.foreground2}
//                   style={{alignSelf: 'center', marginTop: 6}}
//                 />
//               )}
//             </View>
//           )}
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         <View style={stylesHeader(theme, isTablet).header}>
//           <View style={stylesHeader(theme, isTablet).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme, isTablet).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text
//               style={[
//                 globalStyles.header,
//                 {fontSize: isTablet ? 38 : isLargePhone ? 36 : 34},
//               ]}>
//               AI Stylist Chat
//             </Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme, isTablet).iconButton}
//               onPress={() => {
//                 h('impactLight');
//                 Alert.alert(
//                   'Clear Chat?',
//                   'This will erase your current conversation with the stylist.',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Clear Chat',
//                       style: 'destructive',
//                       onPress: async () => {
//                         await AsyncStorage.removeItem(`chat_thread:${userId}`);
//                         setMessages([
//                           {
//                             id: 'seed-1',
//                             role: 'assistant',
//                             text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//                             createdAt: Date.now(),
//                           },
//                         ]);
//                         scrollToBottom();
//                       },
//                     },
//                   ],
//                 );
//               }}>
//               <MaterialIcons
//                 name="delete"
//                 size={isTablet ? 28 : 22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>

//         {/* 💬 Main Scroll */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             <View
//               style={{
//                 paddingHorizontal: isTablet ? 20 : 12,
//                 paddingBottom: 20,
//               }}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: isTablet ? 18 : 14,
//                   paddingVertical: 10,
//                   marginHorizontal: isTablet ? 18 : 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                 }}>
//                 <TypingDots />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontSize: isTablet ? 15 : 13,
//                   }}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}
//           </Animated.ScrollView>
//           {/* 📥 Adaptive Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//             isLargePhone={isLargePhone}
//             isTablet={isTablet}
//           />
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /** 📥 Animated Input Bar — Apple-style adaptive */
// /** 📥 Animated Input Bar */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
//   isLargePhone,
//   isTablet,
// }: any) {
//   const {theme} = useAppTheme();

//   // ✅ full stop + cancel helper
//   const stopListeningCompletely = async () => {
//     try {
//       const Voice = require('@react-native-voice/voice').default;
//       await Voice.stop();
//       await Voice.cancel();
//     } catch (e) {
//       console.warn('🎤 Failed to fully stop voice:', e);
//     }
//   };

//   // ✅ unified reset logic
//   const resetField = async () => {
//     await stopListeningCompletely();
//     setInput('');
//     inputRef?.current?.clear?.();
//   };

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: isTablet ? 18 : 10,
//         paddingBottom: isTablet ? 24 : 16,
//         backgroundColor: 'transparent',
//       }}>
//       <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 22,
//           paddingHorizontal: 10,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}>
//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           multiline
//           scrollEnabled={false}
//           keyboardAppearance="dark"
//           returnKeyType="send"
//           blurOnSubmit={false}
//           style={{
//             flex: 1,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: isTablet ? 14 : 10,
//             paddingBottom: isTablet ? 14 : 10,
//             fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//             textAlignVertical: 'top',
//             minHeight: 42,
//           }}
//         />

//         {/* ❌ Clear Button */}
//         {input.length > 0 && (
//           <TouchableOpacity
//             onPress={resetField}
//             style={{
//               width: isTablet ? 40 : 32,
//               height: isTablet ? 40 : 32,
//               alignItems: 'center',
//               justifyContent: 'center',
//             }}>
//             <MaterialIcons
//               name="close"
//               size={isTablet ? 24 : 22}
//               color={theme.colors.foreground2}
//             />
//           </TouchableOpacity>
//         )}

//         {/* 🎙️ Mic */}
//         <TouchableOpacity
//           onPressIn={onMicPressIn}
//           onPressOut={onMicPressOut}
//           hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
//           style={{
//             width: isTablet ? 48 : 38,
//             height: isTablet ? 50 : 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <MaterialIcons
//             name={isRecording ? 'mic' : 'mic-none'}
//             size={isTablet ? 28 : 24}
//             color={
//               isRecording ? theme.colors.primary : theme.colors.foreground2
//             }
//           />
//         </TouchableOpacity>

//         {/* 📤 Send Button */}
//         <TouchableOpacity
//           onPress={async () => {
//             await stopListeningCompletely(); // ✅ stop voice first
//             onSend(); // ✅ send message
//             await resetField(); // ✅ clear input after sending
//           }}
//           disabled={!input.trim() || isTyping}
//           style={{
//             width: isTablet ? 48 : 38,
//             height: isTablet ? 50 : 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           {isTyping ? (
//             <ActivityIndicator />
//           ) : (
//             <View
//               style={{
//                 width: isTablet ? 40 : 34,
//                 height: isTablet ? 40 : 34,
//                 borderRadius: 20,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginLeft: 6,
//                 marginBottom: 2,
//                 backgroundColor: theme.colors.surface,
//               }}>
//               <MaterialIcons
//                 name="arrow-upward"
//                 size={isTablet ? 26 : 24}
//                 color={theme.colors.foreground}
//               />
//             </View>
//           )}
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// }

/** 🧠 API Call */
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

/** 🧠 API Call */
async function callAiChatAPI(
  history: Message[],
  latest: Message,
): Promise<{text: string; images?: any[]; links?: any[]}> {
  const payload = {
    messages: [...history, latest].map(m => ({
      role: m.role,
      content: m.text,
    })),
  };
  console.log('📡 calling:', `${API_BASE_URL}/ai/chat`);

  const res = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Bad response');
  const data = await res.json();

  // ✅ handle fallback shapes
  return {
    text: data.reply ?? 'Styled response unavailable.',
    images: Array.isArray(data.images) ? data.images : undefined,
    links: Array.isArray(data.links) ? data.links : undefined,
  };
}

// /** Typing dots */
function TypingDots() {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
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
        style={[dot, {backgroundColor: theme.colors.buttonText1}]}
      />
      <Animatable.View
        delay={150}
        animation="pulse"
        iterationCount="infinite"
        easing="ease-in-out"
        duration={900}
        style={[dot, {backgroundColor: theme.colors.buttonText1}]}
      />
      <Animatable.View
        delay={300}
        animation="pulse"
        iterationCount="infinite"
        easing="ease-in-out"
        duration={900}
        style={[dot, {backgroundColor: theme.colors.buttonText1}]}
      />
    </View>
  );
}

/** 🎨 Apple-style adaptive styles */
function stylesHeader(theme: any, isTablet: boolean) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isTablet ? 24 : 16,
      paddingTop: 2,
      paddingBottom: 8,
      marginTop: -38,
    },
    headerLeft: {flexDirection: 'row', alignItems: 'center'},
    presenceDot: {
      width: isTablet ? 10 : 8,
      height: isTablet ? 10 : 8,
      borderRadius: 5,
      marginRight: 8,
    },
    iconButton: {
      padding: isTablet ? 12 : 8,
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
    },
  });
}

function stylesUserBubble(
  theme: any,
  isLargePhone: boolean,
  isTablet: boolean,
) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      gap: 8,
      marginVertical: isTablet ? 16 : isLargePhone ? 14 : 12,
    },
    bubble: {
      maxWidth: '78%',
      backgroundColor: theme.colors.button1,
      paddingHorizontal: isTablet ? 20 : 16,
      paddingVertical: isTablet ? 14 : 12,
      borderTopLeftRadius: 22,
      borderBottomRightRadius: 6,
      borderBottomLeftRadius: 22,
      borderTopRightRadius: 22,
      marginRight: 8,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
    },
    text: {
      color: theme.colors.foreground,
      fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
      lineHeight: isTablet ? 24 : 22,
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    time: {
      color: theme.colors.foreground,
      fontSize: isTablet ? 12 : 11,
      marginTop: 4,
      textAlign: 'right',
    },
  });
}

function stylesAssistantBubble(
  theme: any,
  isLargePhone: boolean,
  isTablet: boolean,
) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      gap: 8,
      marginVertical: isTablet ? 14 : 10,
    },
    bubble: {
      maxWidth: '82%',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.surfaceBorder,
      borderWidth: tokens.borderWidth.hairline,
      paddingHorizontal: isTablet ? 20 : 16,
      paddingVertical: isTablet ? 14 : 12,
      borderTopLeftRadius: 22,
      borderBottomRightRadius: 22,
      borderBottomLeftRadius: 6,
      borderTopRightRadius: 22,
      marginRight: 8,
    },
    text: {
      color: theme.colors.foreground,
      fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
      lineHeight: isTablet ? 24 : 22,
    },
    time: {
      color: theme.colors.foreground,
      fontSize: isTablet ? 12 : 11,
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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
//   Image,
//   Alert,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {useResponsive} from '../hooks/useResponsive'; // ✅ shared adaptive hook

// type Role = 'user' | 'assistant' | 'system';
// type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();
//   const {isTablet, isPhone, width} = useResponsive();

//   // ✅ Derive Apple-like breakpoints locally
//   const isLargePhone = isPhone && width >= 390; // iPhone Pro Max, Plus, etc.
//   const isSmallPhone = isPhone && width < 360; // SE or mini-style

//   const userId = useUUID();
//   const [profilePicture, setProfilePicture] = useState<string>('');

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();
//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   /** 👤 Load profile image */
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(`profile_picture:${userId}`);
//       if (cached) {
//         setProfilePicture(
//           `${cached}${cached.includes('?') ? '&' : '?'}v=${Date.now()}`,
//         );
//       }
//     })();
//   }, [userId]);

//   /** 💾 Persist chat thread */
//   useEffect(() => {
//     (async () => {
//       const saved = await AsyncStorage.getItem(`chat_thread:${userId}`);
//       if (saved) {
//         const parsed: Message[] = JSON.parse(saved);
//         if (parsed?.length) setMessages(parsed);
//       }
//     })();
//   }, [userId]);

//   useEffect(() => {
//     if (messages?.length) {
//       AsyncStorage.setItem(`chat_thread:${userId}`, JSON.stringify(messages));
//     }
//   }, [messages, userId]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   /** 📤 Send message (with fashion filter) */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;

//     const fashionKeywords = [
//       'outfit',
//       'style',
//       'wardrobe',
//       'stores',
//       'clothing',
//       'clothes',
//       'dress',
//       'trends',
//       'weather',
//       'event',
//       'occasion',
//       'formal',
//       'casual',
//       'smart casual',
//       'blazer',
//       'pants',
//       'shirt',
//       'jacket',
//       'accessory',
//       'color',
//       'shoes',
//       'season',
//       'vibe',
//       'wear',
//       'look',
//       'fit',
//       'layer',
//       'capsule',
//       'pair',
//       'match',
//       'coordinate',
//       'dress code',
//     ];
//     const lower = trimmed.toLowerCase();
//     const hasFashionKeyword = fashionKeywords.some(kw => lower.includes(kw));
//     const commonPhrases = [
//       'what should i wear',
//       'how should i dress',
//       'what goes with',
//       'how to style',
//       'how do i style',
//       'make me an outfit',
//       'build an outfit',
//       'suggest an outfit',
//       'style me',
//       'pair with',
//       'does this match',
//     ];
//     const hasCommonPhrase = commonPhrases.some(p => lower.includes(p));
//     const isFashionRelated = hasFashionKeyword || hasCommonPhrase;

//     if (!isFashionRelated) {
//       Alert.alert(
//         'Styling Questions Only ✨',
//         "I'm your personal stylist — I can only help with outfits, clothing advice, or fashion-related questions.",
//       );
//       return;
//     }

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
//     h('impactLight');

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
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);
//   /** ✅ Button state logic */
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

//   /** 📊 Render chat message bubbles with Apple-style scaling */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme, isLargePhone, isTablet)
//       : stylesAssistantBubble(theme, isLargePhone, isTablet);

//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View key={m.id} style={{transform: [{translateX}]}}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[
//             bubble.row,
//             {
//               marginVertical: isTablet ? 14 : 10,
//               transform: [{scale: 0.98}],
//             },
//           ]}>
//           {/* 🤖 Assistant icon */}
//           {!isUser && (
//             <View
//               style={{
//                 width: isTablet ? 44 : 36,
//                 height: isTablet ? 44 : 36,
//                 borderRadius: 22,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 alignSelf: 'flex-end',
//                 marginRight: 6,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <MaterialIcons
//                 name="smart-toy"
//                 size={isTablet ? 28 : 22}
//                 color={theme.colors.buttonText1}
//               />
//             </View>
//           )}

//           {/* 💬 Bubble */}
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>
//           </Animatable.View>

//           {/* 👤 User avatar */}
//           {isUser && (
//             <View
//               style={{
//                 width: isTablet ? 44 : 38,
//                 height: isTablet ? 44 : 38,
//                 borderRadius: 50,
//                 overflow: 'hidden',
//                 backgroundColor: theme.colors.background,
//                 alignSelf: 'flex-end',
//               }}>
//               {profilePicture ? (
//                 <Image
//                   source={{uri: profilePicture}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <MaterialIcons
//                   name="person"
//                   size={isTablet ? 28 : 22}
//                   color={theme.colors.foreground2}
//                   style={{alignSelf: 'center', marginTop: 6}}
//                 />
//               )}
//             </View>
//           )}
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         <View style={stylesHeader(theme, isTablet).header}>
//           <View style={stylesHeader(theme, isTablet).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme, isTablet).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text
//               style={[
//                 globalStyles.header,
//                 {fontSize: isTablet ? 38 : isLargePhone ? 36 : 34},
//               ]}>
//               AI Stylist Chat
//             </Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme, isTablet).iconButton}
//               onPress={() => {
//                 h('impactLight');
//                 Alert.alert(
//                   'Clear Chat?',
//                   'This will erase your current conversation with the stylist.',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Clear Chat',
//                       style: 'destructive',
//                       onPress: async () => {
//                         await AsyncStorage.removeItem(`chat_thread:${userId}`);
//                         setMessages([
//                           {
//                             id: 'seed-1',
//                             role: 'assistant',
//                             text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//                             createdAt: Date.now(),
//                           },
//                         ]);
//                         scrollToBottom();
//                       },
//                     },
//                   ],
//                 );
//               }}>
//               <MaterialIcons
//                 name="delete"
//                 size={isTablet ? 28 : 22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>

//         {/* 💬 Main Scroll */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             <View
//               style={{
//                 paddingHorizontal: isTablet ? 20 : 12,
//                 paddingBottom: 20,
//               }}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: isTablet ? 18 : 14,
//                   paddingVertical: 10,
//                   marginHorizontal: isTablet ? 18 : 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                 }}>
//                 <TypingDots />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontSize: isTablet ? 15 : 13,
//                   }}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}
//           </Animated.ScrollView>
//           {/* 📥 Adaptive Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//             isLargePhone={isLargePhone}
//             isTablet={isTablet}
//           />
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /** 📥 Animated Input Bar — Apple-style adaptive */
// /** 📥 Animated Input Bar */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
//   isLargePhone,
//   isTablet,
// }: any) {
//   const {theme} = useAppTheme();

//   // ✅ full stop + cancel helper
//   const stopListeningCompletely = async () => {
//     try {
//       const Voice = require('@react-native-voice/voice').default;
//       await Voice.stop();
//       await Voice.cancel();
//     } catch (e) {
//       console.warn('🎤 Failed to fully stop voice:', e);
//     }
//   };

//   // ✅ unified reset logic
//   const resetField = async () => {
//     await stopListeningCompletely();
//     setInput('');
//     inputRef?.current?.clear?.();
//   };

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: isTablet ? 18 : 10,
//         paddingBottom: isTablet ? 24 : 16,
//         backgroundColor: 'transparent',
//       }}>
//       <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 22,
//           paddingHorizontal: 10,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}>
//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           multiline
//           scrollEnabled={false}
//           keyboardAppearance="dark"
//           returnKeyType="send"
//           blurOnSubmit={false}
//           style={{
//             flex: 1,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: isTablet ? 14 : 10,
//             paddingBottom: isTablet ? 14 : 10,
//             fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//             textAlignVertical: 'top',
//             minHeight: 42,
//           }}
//         />

//         {/* ❌ Clear Button */}
//         {input.length > 0 && (
//           <TouchableOpacity
//             onPress={resetField}
//             style={{
//               width: isTablet ? 40 : 32,
//               height: isTablet ? 40 : 32,
//               alignItems: 'center',
//               justifyContent: 'center',
//             }}>
//             <MaterialIcons
//               name="close"
//               size={isTablet ? 24 : 22}
//               color={theme.colors.foreground2}
//             />
//           </TouchableOpacity>
//         )}

//         {/* 🎙️ Mic */}
//         <TouchableOpacity
//           onPressIn={onMicPressIn}
//           onPressOut={onMicPressOut}
//           hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
//           style={{
//             width: isTablet ? 48 : 38,
//             height: isTablet ? 50 : 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <MaterialIcons
//             name={isRecording ? 'mic' : 'mic-none'}
//             size={isTablet ? 28 : 24}
//             color={
//               isRecording ? theme.colors.primary : theme.colors.foreground2
//             }
//           />
//         </TouchableOpacity>

//         {/* 📤 Send Button */}
//         <TouchableOpacity
//           onPress={async () => {
//             await stopListeningCompletely(); // ✅ stop voice first
//             onSend(); // ✅ send message
//             await resetField(); // ✅ clear input after sending
//           }}
//           disabled={!input.trim() || isTyping}
//           style={{
//             width: isTablet ? 48 : 38,
//             height: isTablet ? 50 : 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           {isTyping ? (
//             <ActivityIndicator />
//           ) : (
//             <View
//               style={{
//                 width: isTablet ? 40 : 34,
//                 height: isTablet ? 40 : 34,
//                 borderRadius: 20,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginLeft: 6,
//                 marginBottom: 2,
//                 backgroundColor: theme.colors.surface,
//               }}>
//               <MaterialIcons
//                 name="arrow-upward"
//                 size={isTablet ? 26 : 24}
//                 color={theme.colors.foreground}
//               />
//             </View>
//           )}
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// }

// /** 🧠 API Call */
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

// // /** Typing dots */
// function TypingDots() {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
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
//         style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//       />
//       <Animatable.View
//         delay={150}
//         animation="pulse"
//         iterationCount="infinite"
//         easing="ease-in-out"
//         duration={900}
//         style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//       />
//       <Animatable.View
//         delay={300}
//         animation="pulse"
//         iterationCount="infinite"
//         easing="ease-in-out"
//         duration={900}
//         style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//       />
//     </View>
//   );
// }

// /** 🎨 Apple-style adaptive styles */
// function stylesHeader(theme: any, isTablet: boolean) {
//   return StyleSheet.create({
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: isTablet ? 24 : 16,
//       paddingTop: 2,
//       paddingBottom: 8,
//       marginTop: -38,
//     },
//     headerLeft: {flexDirection: 'row', alignItems: 'center'},
//     presenceDot: {
//       width: isTablet ? 10 : 8,
//       height: isTablet ? 10 : 8,
//       borderRadius: 5,
//       marginRight: 8,
//     },
//     iconButton: {
//       padding: isTablet ? 12 : 8,
//       borderRadius: 10,
//       backgroundColor: theme.colors.surface,
//     },
//   });
// }

// function stylesUserBubble(
//   theme: any,
//   isLargePhone: boolean,
//   isTablet: boolean,
// ) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-end',
//       gap: 8,
//       marginVertical: isTablet ? 16 : isLargePhone ? 14 : 12,
//     },
//     bubble: {
//       maxWidth: '78%',
//       backgroundColor: theme.colors.button1,
//       paddingHorizontal: isTablet ? 20 : 16,
//       paddingVertical: isTablet ? 14 : 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 6,
//       borderBottomLeftRadius: 22,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//       lineHeight: isTablet ? 24 : 22,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: isTablet ? 12 : 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

// function stylesAssistantBubble(
//   theme: any,
//   isLargePhone: boolean,
//   isTablet: boolean,
// ) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: isTablet ? 14 : 10,
//     },
//     bubble: {
//       maxWidth: '82%',
//       backgroundColor: theme.colors.surface,
//       borderColor: theme.colors.surfaceBorder,
//       borderWidth: tokens.borderWidth.hairline,
//       paddingHorizontal: isTablet ? 20 : 16,
//       paddingVertical: isTablet ? 14 : 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 22,
//       borderBottomLeftRadius: 6,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//       lineHeight: isTablet ? 24 : 22,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: isTablet ? 12 : 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

//////////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
//   Image,
//   Alert,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {useResponsive} from '../hooks/useResponsive'; // ✅ shared adaptive hook

// type Role = 'user' | 'assistant' | 'system';
// type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();
//   const {isTablet, isPhone, width} = useResponsive();

//   // ✅ Derive Apple-like breakpoints locally
//   const isLargePhone = isPhone && width >= 390; // iPhone Pro Max, Plus, etc.
//   const isSmallPhone = isPhone && width < 360; // SE or mini-style

//   const userId = useUUID();
//   const [profilePicture, setProfilePicture] = useState<string>('');

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();
//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   /** 👤 Load profile image */
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(`profile_picture:${userId}`);
//       if (cached) {
//         setProfilePicture(
//           `${cached}${cached.includes('?') ? '&' : '?'}v=${Date.now()}`,
//         );
//       }
//     })();
//   }, [userId]);

//   /** 💾 Persist chat thread */
//   useEffect(() => {
//     (async () => {
//       const saved = await AsyncStorage.getItem(`chat_thread:${userId}`);
//       if (saved) {
//         const parsed: Message[] = JSON.parse(saved);
//         if (parsed?.length) setMessages(parsed);
//       }
//     })();
//   }, [userId]);

//   useEffect(() => {
//     if (messages?.length) {
//       AsyncStorage.setItem(`chat_thread:${userId}`, JSON.stringify(messages));
//     }
//   }, [messages, userId]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   /** 📤 Send message (with fashion filter) */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;

//     const fashionKeywords = [
//       'outfit',
//       'style',
//       'wardrobe',
//       'stores',
//       'clothing',
//       'clothes',
//       'dress',
//       'trends',
//       'weather',
//       'event',
//       'occasion',
//       'formal',
//       'casual',
//       'smart casual',
//       'blazer',
//       'pants',
//       'shirt',
//       'jacket',
//       'accessory',
//       'color',
//       'shoes',
//       'season',
//       'vibe',
//       'wear',
//       'look',
//       'fit',
//       'layer',
//       'capsule',
//       'pair',
//       'match',
//       'coordinate',
//       'dress code',
//     ];
//     const lower = trimmed.toLowerCase();
//     const hasFashionKeyword = fashionKeywords.some(kw => lower.includes(kw));
//     const commonPhrases = [
//       'what should i wear',
//       'how should i dress',
//       'what goes with',
//       'how to style',
//       'how do i style',
//       'make me an outfit',
//       'build an outfit',
//       'suggest an outfit',
//       'style me',
//       'pair with',
//       'does this match',
//     ];
//     const hasCommonPhrase = commonPhrases.some(p => lower.includes(p));
//     const isFashionRelated = hasFashionKeyword || hasCommonPhrase;

//     if (!isFashionRelated) {
//       Alert.alert(
//         'Styling Questions Only ✨',
//         "I'm your personal stylist — I can only help with outfits, clothing advice, or fashion-related questions.",
//       );
//       return;
//     }

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
//     h('impactLight');

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
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);
//   /** ✅ Button state logic */
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

//   /** 📊 Render chat message bubbles with Apple-style scaling */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme, isLargePhone, isTablet)
//       : stylesAssistantBubble(theme, isLargePhone, isTablet);

//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View key={m.id} style={{transform: [{translateX}]}}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[
//             bubble.row,
//             {
//               marginVertical: isTablet ? 14 : 10,
//               transform: [{scale: 0.98}],
//             },
//           ]}>
//           {/* 🤖 Assistant icon */}
//           {!isUser && (
//             <View
//               style={{
//                 width: isTablet ? 44 : 36,
//                 height: isTablet ? 44 : 36,
//                 borderRadius: 22,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 alignSelf: 'flex-end',
//                 marginRight: 6,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <MaterialIcons
//                 name="smart-toy"
//                 size={isTablet ? 28 : 22}
//                 color={theme.colors.buttonText1}
//               />
//             </View>
//           )}

//           {/* 💬 Bubble */}
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>
//           </Animatable.View>

//           {/* 👤 User avatar */}
//           {isUser && (
//             <View
//               style={{
//                 width: isTablet ? 44 : 38,
//                 height: isTablet ? 44 : 38,
//                 borderRadius: 50,
//                 overflow: 'hidden',
//                 backgroundColor: theme.colors.background,
//                 alignSelf: 'flex-end',
//               }}>
//               {profilePicture ? (
//                 <Image
//                   source={{uri: profilePicture}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <MaterialIcons
//                   name="person"
//                   size={isTablet ? 28 : 22}
//                   color={theme.colors.foreground2}
//                   style={{alignSelf: 'center', marginTop: 6}}
//                 />
//               )}
//             </View>
//           )}
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         <View style={stylesHeader(theme, isTablet).header}>
//           <View style={stylesHeader(theme, isTablet).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme, isTablet).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text
//               style={[
//                 globalStyles.header,
//                 {fontSize: isTablet ? 38 : isLargePhone ? 36 : 34},
//               ]}>
//               AI Stylist Chat
//             </Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme, isTablet).iconButton}
//               onPress={() => {
//                 h('impactLight');
//                 Alert.alert(
//                   'Clear Chat?',
//                   'This will erase your current conversation with the stylist.',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Clear Chat',
//                       style: 'destructive',
//                       onPress: async () => {
//                         await AsyncStorage.removeItem(`chat_thread:${userId}`);
//                         setMessages([
//                           {
//                             id: 'seed-1',
//                             role: 'assistant',
//                             text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//                             createdAt: Date.now(),
//                           },
//                         ]);
//                         scrollToBottom();
//                       },
//                     },
//                   ],
//                 );
//               }}>
//               <MaterialIcons
//                 name="delete"
//                 size={isTablet ? 28 : 22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>

//         {/* 💬 Main Scroll */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             <View
//               style={{
//                 paddingHorizontal: isTablet ? 20 : 12,
//                 paddingBottom: 20,
//               }}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: isTablet ? 18 : 14,
//                   paddingVertical: 10,
//                   marginHorizontal: isTablet ? 18 : 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                 }}>
//                 <TypingDots />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontSize: isTablet ? 15 : 13,
//                   }}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}
//           </Animated.ScrollView>
//           {/* 📥 Adaptive Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//             isLargePhone={isLargePhone}
//             isTablet={isTablet}
//           />
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /** 📥 Animated Input Bar — Apple-style adaptive */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
//   isLargePhone,
//   isTablet,
// }: any) {
//   const {theme} = useAppTheme();

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: isTablet ? 18 : 10,
//         paddingBottom: isTablet ? 24 : 16,
//         backgroundColor: 'transparent',
//       }}>
//       <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 22,
//           paddingHorizontal: 10,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}>
//         {/* 📝 Input */}
//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           multiline
//           scrollEnabled={false}
//           keyboardAppearance="dark"
//           returnKeyType="send"
//           blurOnSubmit={false}
//           style={{
//             flex: 1,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: isTablet ? 14 : 10,
//             paddingBottom: isTablet ? 14 : 10,
//             fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//             textAlignVertical: 'top',
//             minHeight: 42,
//           }}
//         />

//         {/* 🎙️ Mic */}
//         <TouchableOpacity
//           onPressIn={onMicPressIn}
//           onPressOut={onMicPressOut}
//           hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
//           style={{
//             width: isTablet ? 48 : 38,
//             height: isTablet ? 50 : 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <MaterialIcons
//             name={isRecording ? 'mic' : 'mic-none'}
//             size={isTablet ? 28 : 24}
//             color={
//               isRecording ? theme.colors.primary : theme.colors.foreground2
//             }
//           />
//         </TouchableOpacity>

//         {/* 📤 Send */}
//         <TouchableOpacity
//           onPress={onSend}
//           disabled={!input.trim() || isTyping}
//           style={{
//             width: isTablet ? 48 : 38,
//             height: isTablet ? 50 : 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           {isTyping ? (
//             <ActivityIndicator />
//           ) : (
//             <View
//               style={{
//                 width: isTablet ? 40 : 34,
//                 height: isTablet ? 40 : 34,
//                 borderRadius: 20,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginLeft: 6,
//                 marginBottom: 2,
//                 backgroundColor: theme.colors.surface,
//               }}>
//               <MaterialIcons
//                 name="arrow-upward"
//                 size={isTablet ? 26 : 24}
//                 color={theme.colors.foreground}
//               />
//             </View>
//           )}
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// }

// /** 🧠 API Call */
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

// // /** Typing dots */
// function TypingDots() {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
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
//         style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//       />
//       <Animatable.View
//         delay={150}
//         animation="pulse"
//         iterationCount="infinite"
//         easing="ease-in-out"
//         duration={900}
//         style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//       />
//       <Animatable.View
//         delay={300}
//         animation="pulse"
//         iterationCount="infinite"
//         easing="ease-in-out"
//         duration={900}
//         style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//       />
//     </View>
//   );
// }

// /** 🎨 Apple-style adaptive styles */
// function stylesHeader(theme: any, isTablet: boolean) {
//   return StyleSheet.create({
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: isTablet ? 24 : 16,
//       paddingTop: 2,
//       paddingBottom: 8,
//       marginTop: -38,
//     },
//     headerLeft: {flexDirection: 'row', alignItems: 'center'},
//     presenceDot: {
//       width: isTablet ? 10 : 8,
//       height: isTablet ? 10 : 8,
//       borderRadius: 5,
//       marginRight: 8,
//     },
//     iconButton: {
//       padding: isTablet ? 12 : 8,
//       borderRadius: 10,
//       backgroundColor: theme.colors.surface,
//     },
//   });
// }

// function stylesUserBubble(
//   theme: any,
//   isLargePhone: boolean,
//   isTablet: boolean,
// ) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-end',
//       gap: 8,
//       marginVertical: isTablet ? 16 : isLargePhone ? 14 : 12,
//     },
//     bubble: {
//       maxWidth: '78%',
//       backgroundColor: theme.colors.button1,
//       paddingHorizontal: isTablet ? 20 : 16,
//       paddingVertical: isTablet ? 14 : 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 6,
//       borderBottomLeftRadius: 22,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//       lineHeight: isTablet ? 24 : 22,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: isTablet ? 12 : 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

// function stylesAssistantBubble(
//   theme: any,
//   isLargePhone: boolean,
//   isTablet: boolean,
// ) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: isTablet ? 14 : 10,
//     },
//     bubble: {
//       maxWidth: '82%',
//       backgroundColor: theme.colors.surface,
//       borderColor: theme.colors.surfaceBorder,
//       borderWidth: tokens.borderWidth.hairline,
//       paddingHorizontal: isTablet ? 20 : 16,
//       paddingVertical: isTablet ? 14 : 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 22,
//       borderBottomLeftRadius: 6,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: isTablet ? 18 : isLargePhone ? 17 : 16,
//       lineHeight: isTablet ? 24 : 22,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: isTablet ? 12 : 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

///////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
//   Image,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {Alert} from 'react-native';

// type Role = 'user' | 'assistant' | 'system';
// type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();

//   const userId = useUUID();
//   const [profilePicture, setProfilePicture] = useState<string>('');

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(`profile_picture:${userId}`);
//       if (cached) {
//         setProfilePicture(
//           `${cached}${cached.includes('?') ? '&' : '?'}v=${Date.now()}`,
//         ); // bust cache so updates show immediately
//       }
//     })();
//   }, [userId]);

//   /** 💾 Persist chat thread */
//   useEffect(() => {
//     (async () => {
//       const saved = await AsyncStorage.getItem(`chat_thread:${userId}`);
//       if (saved) {
//         const parsed: Message[] = JSON.parse(saved);
//         if (parsed?.length) setMessages(parsed);
//       }
//     })();
//   }, [userId]);

//   useEffect(() => {
//     if (messages?.length) {
//       AsyncStorage.setItem(`chat_thread:${userId}`, JSON.stringify(messages));
//     }
//   }, [messages, userId]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   // /** 📤 Send message */
//   // const send = useCallback(async () => {
//   //   const trimmed = input.trim();
//   //   if (!trimmed || isTyping) return;
//   //   setInput('');
//   //   inputRef.current?.clear();
//   //   const userMsg: Message = {
//   //     id: `u-${Date.now()}`,
//   //     role: 'user',
//   //     text: trimmed,
//   //     createdAt: Date.now(),
//   //   };
//   //   setMessages(prev => [...prev, userMsg]);
//   //   setIsTyping(true);
//   //   Keyboard.dismiss();
//   //   h('impactLight');

//   //   try {
//   //     const historyForApi = [...messages, userMsg];
//   //     const assistant = await callAiChatAPI(historyForApi, userMsg);
//   //     const aiMsg: Message = {
//   //       id: `a-${Date.now()}`,
//   //       role: 'assistant',
//   //       text: assistant.text,
//   //       createdAt: Date.now(),
//   //     };
//   //     setMessages(prev => [...prev, aiMsg]);
//   //     h('selection');
//   //   } catch {
//   //     setMessages(prev => [
//   //       ...prev,
//   //       {
//   //         id: `a-${Date.now()}`,
//   //         role: 'assistant',
//   //         text: "Hmm, I couldn't reach the styling service. Want me to try again?",
//   //         createdAt: Date.now(),
//   //       },
//   //     ]);
//   //     h('notificationError');
//   //   } finally {
//   //     setIsTyping(false);
//   //   }
//   // }, [input, isTyping, messages]);

//   /** 📤 Send message */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;

//     // 🧠 STEP 1: Block anything unrelated to fashion before sending
//     const fashionKeywords = [
//       'outfit',
//       'style',
//       'wardrobe',
//       'stores',
//       'clothing',
//       'clothes',
//       'dress',
//       'trends',
//       'weather',
//       'event',
//       'occasion',
//       'formal',
//       'casual',
//       'smart casual',
//       'blazer',
//       'pants',
//       'shirt',
//       'jacket',
//       'accessory',
//       'color',
//       'shoes',
//       'season',
//       'vibe',
//       'wear', // ✅ catches “what should I wear”
//       'look', // ✅ catches “create a look” or “build a look”
//       'fit', // ✅ covers “does this fit”
//       'layer', // ✅ layering questions
//       'capsule', // ✅ capsule wardrobe
//       'pair', // ✅ “what pairs with…”
//       'match', // ✅ “does this match…”
//       'coordinate', // ✅ “coordinate these items”
//       'dress code', // ✅ “dress code for…”
//     ];

//     const lower = trimmed.toLowerCase();

//     // ✅ 1. Check for obvious fashion terms
//     const hasFashionKeyword = fashionKeywords.some(kw => lower.includes(kw));

//     // ✅ 2. Check for common fashion-related question patterns
//     const commonPhrases = [
//       'what should i wear',
//       'how should i dress',
//       'what goes with',
//       'how to style',
//       'how do i style',
//       'make me an outfit',
//       'build an outfit',
//       'suggest an outfit',
//       'style me',
//       'pair with',
//       'does this match',
//     ];
//     const hasCommonPhrase = commonPhrases.some(p => lower.includes(p));

//     // ✅ Final decision
//     const isFashionRelated = hasFashionKeyword || hasCommonPhrase;

//     if (!isFashionRelated) {
//       Alert.alert(
//         'Styling Questions Only ✨',
//         "I'm your personal stylist — I can only help with outfits, clothing advice, or fashion-related questions. Try asking about what to wear, how to style something, or how to dress for an event.",
//       );
//       return;
//     }

//     // 🧵 Continue normal chat flow
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
//     h('impactLight');

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
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);

//   /** ✅ Original button logic */
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

//   /** 📊 Render bubbles */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme)
//       : stylesAssistantBubble(theme);

//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View key={m.id} style={{transform: [{translateX}]}}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[
//             bubble.row,
//             // ADD MORE VERTICAL SPACE BETWEEN BUBBLES
//             {marginVertical: 10, transform: [{scale: 0.98}]},
//           ]}>
//           {/* 🤖 Chatbot icon for assistant messages */}
//           {!isUser && (
//             <View
//               style={{
//                 width: 36,
//                 height: 36,
//                 borderRadius: 19,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 alignSelf: 'flex-end',
//                 marginRight: 6,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <MaterialIcons
//                 name="smart-toy"
//                 size={22}
//                 color={theme.colors.buttonText1}
//                 style={{transform: [{scale: 1.05}]}}
//               />
//             </View>
//           )}

//           {/* 💬 Message bubble */}
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>
//           </Animatable.View>

//           {/* 👤 User profile image for user messages */}
//           {isUser && (
//             <View
//               style={{
//                 width: 38,
//                 height: 38,
//                 borderRadius: 50,
//                 overflow: 'hidden',
//                 backgroundColor: theme.colors.background,
//                 alignSelf: 'flex-end',
//               }}>
//               {profilePicture ? (
//                 <Image
//                   source={{uri: profilePicture}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <MaterialIcons
//                   name="person"
//                   size={22}
//                   color={theme.colors.foreground2}
//                   style={{alignSelf: 'center', marginTop: 6}}
//                 />
//               )}
//             </View>
//           )}
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         <View style={stylesHeader(theme).header}>
//           <View style={stylesHeader(theme).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text style={globalStyles.header}>AI Stylist Chat</Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme).iconButton}
//               onPress={() => {
//                 h('impactLight');
//                 Alert.alert(
//                   'Clear Chat?',
//                   'This will erase your current conversation with the stylist.',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Clear Chat',
//                       style: 'destructive',
//                       onPress: async () => {
//                         await AsyncStorage.removeItem(`chat_thread:${userId}`);
//                         setMessages([
//                           {
//                             id: 'seed-1',
//                             role: 'assistant',
//                             text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//                             createdAt: Date.now(),
//                           },
//                         ]);
//                         scrollToBottom();
//                       },
//                     },
//                   ],
//                 );
//               }}>
//               <MaterialIcons
//                 name="delete"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>

//         {/* 💬 Main Scrollable Content */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             {/* 📩 All Messages */}
//             <View style={{paddingHorizontal: 12, paddingBottom: 20}}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing Indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: 14,
//                   paddingVertical: 10,
//                   marginHorizontal: 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                   // backgroundColor: theme.colors.surface3,
//                 }}>
//                 <TypingDots />
//                 <Text style={{color: theme.colors.foreground, fontSize: 13}}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}
//           </Animated.ScrollView>

//           {/* ✅ Original disabled CTA behavior */}
//           {/* <View
//             pointerEvents={canSendToOutfit ? 'auto' : 'none'}
//             style={{
//               justifyContent: 'center',
//               alignItems: 'center',
//               marginBottom: 12,
//               flexDirection: 'row',
//               marginLeft: 30,
//             }}>
//             <AppleTouchFeedback type="impactLight">
//               <TouchableOpacity
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {opacity: canSendToOutfit ? 1 : 0.4},
//                   {width: 240},
//                 ]}
//                 onPress={sendToOutfitSafe}
//                 disabled={!canSendToOutfit}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   Create Outfit From Prompt
//                 </Text>
//               </TouchableOpacity>
//             </AppleTouchFeedback>

//             <TooltipBubble
//               message="This button is only if you want to use this specific prompt to create your outfit."
//               position="top"
//             />
//           </View> */}

//           {/* 📥 Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//           />
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /** 🫧 Typing Dots */
// function TypingDots() {
//   const {theme} = useAppTheme();
//   const dot = {width: 6, height: 6, borderRadius: 3, marginHorizontal: 3};
//   return (
//     <View
//       style={{
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 8,
//       }}>
//       {[0, 150, 300].map(delay => (
//         <Animatable.View
//           key={delay}
//           delay={delay}
//           animation="pulse"
//           iterationCount="infinite"
//           easing="ease-in-out"
//           duration={900}
//           style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//         />
//       ))}
//     </View>
//   );
// }

// /** 👗 Create Outfit CTA (kept but unused) */
// export function CreateOutfitCTA({
//   visible,
//   onPress,
// }: {
//   visible: boolean;
//   onPress: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   if (!visible) return null;
//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       easing="ease-out-cubic"
//       useNativeDriver
//       style={{
//         justifyContent: 'center',
//         alignItems: 'center',
//         paddingVertical: 20,
//         transform: [{translateY: 10}],
//       }}>
//       <AppleTouchFeedback type="impactLight">
//         <TouchableOpacity
//           onPress={onPress}
//           style={[
//             globalStyles.buttonPrimary,
//             {
//               width: 240,
//               opacity: 1,
//               shadowColor: '#000',
//               shadowOpacity: 0.15,
//               shadowRadius: 8,
//               shadowOffset: {width: 0, height: 4},
//             },
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>
//             Create Outfit From Prompt
//           </Text>
//         </TouchableOpacity>
//       </AppleTouchFeedback>
//     </Animatable.View>
//   );
// }

// /** 📥 Animated Input Bar — iMessage-style (no internal scroll, keeps growing) */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
// }: any) {
//   const {theme} = useAppTheme();

//   // iMessage feel: no max cap, keep growing
//   const MIN_HEIGHT = 40;
//   const [inputHeight, setInputHeight] = React.useState(MIN_HEIGHT);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: 10,
//         paddingBottom: 16,
//         backgroundColor: 'transparent',
//       }}>
//       <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 20,
//           paddingHorizontal: 8,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}>
//         {/* 📝 Input (auto-grows forever, no ScrollView) */}
//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           multiline
//           scrollEnabled={false} // never scroll internally
//           keyboardAppearance="dark"
//           returnKeyType="send"
//           blurOnSubmit={false}
//           style={{
//             flex: 1,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: 10,
//             paddingBottom: 10,
//             fontSize: 16,
//             textAlignVertical: 'top',
//             flexGrow: 1, // ✅ allow it to grow naturally
//             flexShrink: 1, // ✅ prevent mic/send push-out
//             minHeight: 40, // ✅ sensible base height
//           }}
//         />

//         {/* 🎙️ Mic */}
//         <TouchableOpacity
//           onPressIn={onMicPressIn}
//           onPressOut={onMicPressOut}
//           hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <MaterialIcons
//             name={isRecording ? 'mic' : 'mic-none'}
//             size={24}
//             color={
//               isRecording ? theme.colors.primary : theme.colors.foreground2
//             }
//           />
//         </TouchableOpacity>

//         {/* 📤 Send */}
//         <TouchableOpacity
//           onPress={onSend}
//           disabled={!input.trim() || isTyping}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           {isTyping ? (
//             <ActivityIndicator />
//           ) : (
//             <View
//               style={{
//                 width: 34,
//                 height: 34,
//                 borderRadius: 17,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginLeft: 6,
//                 marginBottom: 2,
//                 backgroundColor: theme.colors.surface,
//               }}>
//               <MaterialIcons
//                 name="arrow-upward"
//                 size={24}
//                 color={theme.colors.foreground}
//               />
//             </View>
//           )}
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// }

// /** 🧠 API Call */
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

// /** 🎨 Styles */
// function stylesHeader(theme: any) {
//   return StyleSheet.create({
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 2,
//       paddingBottom: 8,
//       marginTop: -38,
//     },
//     headerLeft: {flexDirection: 'row', alignItems: 'center'},
//     presenceDot: {width: 8, height: 8, borderRadius: 4, marginRight: 8},
//     iconButton: {
//       padding: 8,
//       borderRadius: 10,
//       backgroundColor: theme.colors.surface,
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
//       marginVertical: 14,
//     },
//     bubble: {
//       maxWidth: '78%',
//       backgroundColor: theme.colors.button1,
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 6,
//       borderBottomLeftRadius: 22,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//       borderWidth: tokens.borderWidth.hairline,
//       position: 'relative',
//       borderColor: theme.colors.surfaceBorder,
//     },
//     tail: {
//       position: 'absolute',
//       right: -6,
//       bottom: 0,
//       width: 14,
//       height: 14,
//       backgroundColor: 'rgba(0, 122, 255, 1)',
//       transform: [{rotate: '45deg'}],
//       borderBottomRightRadius: 4,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

// function stylesAssistantBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: 8,
//     },
//     bubble: {
//       maxWidth: '82%',
//       backgroundColor: theme.colors.surface,
//       borderColor: theme.colors.surfaceBorder,
//       borderWidth: tokens.borderWidth.hairline,
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 22,
//       borderBottomLeftRadius: 6,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

/////////////////////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
//   Image,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {Alert} from 'react-native';

// type Role = 'user' | 'assistant' | 'system';
// type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();

//   const userId = useUUID();
//   const [profilePicture, setProfilePicture] = useState<string>('');

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(`profile_picture:${userId}`);
//       if (cached) {
//         setProfilePicture(
//           `${cached}${cached.includes('?') ? '&' : '?'}v=${Date.now()}`,
//         ); // bust cache so updates show immediately
//       }
//     })();
//   }, [userId]);

//   /** 💾 Persist chat thread */
//   useEffect(() => {
//     (async () => {
//       const saved = await AsyncStorage.getItem(`chat_thread:${userId}`);
//       if (saved) {
//         const parsed: Message[] = JSON.parse(saved);
//         if (parsed?.length) setMessages(parsed);
//       }
//     })();
//   }, [userId]);

//   useEffect(() => {
//     if (messages?.length) {
//       AsyncStorage.setItem(`chat_thread:${userId}`, JSON.stringify(messages));
//     }
//   }, [messages, userId]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   // /** 📤 Send message */
//   // const send = useCallback(async () => {
//   //   const trimmed = input.trim();
//   //   if (!trimmed || isTyping) return;
//   //   setInput('');
//   //   inputRef.current?.clear();
//   //   const userMsg: Message = {
//   //     id: `u-${Date.now()}`,
//   //     role: 'user',
//   //     text: trimmed,
//   //     createdAt: Date.now(),
//   //   };
//   //   setMessages(prev => [...prev, userMsg]);
//   //   setIsTyping(true);
//   //   Keyboard.dismiss();
//   //   h('impactLight');

//   //   try {
//   //     const historyForApi = [...messages, userMsg];
//   //     const assistant = await callAiChatAPI(historyForApi, userMsg);
//   //     const aiMsg: Message = {
//   //       id: `a-${Date.now()}`,
//   //       role: 'assistant',
//   //       text: assistant.text,
//   //       createdAt: Date.now(),
//   //     };
//   //     setMessages(prev => [...prev, aiMsg]);
//   //     h('selection');
//   //   } catch {
//   //     setMessages(prev => [
//   //       ...prev,
//   //       {
//   //         id: `a-${Date.now()}`,
//   //         role: 'assistant',
//   //         text: "Hmm, I couldn't reach the styling service. Want me to try again?",
//   //         createdAt: Date.now(),
//   //       },
//   //     ]);
//   //     h('notificationError');
//   //   } finally {
//   //     setIsTyping(false);
//   //   }
//   // }, [input, isTyping, messages]);

//   /** 📤 Send message */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;

//     // 🧠 STEP 1: Block anything unrelated to fashion before sending
//     const fashionKeywords = [
//       'outfit',
//       'style',
//       'wardrobe',
//       'stores',
//       'clothing',
//       'clothes',
//       'dress',
//       'trends',
//       'weather',
//       'event',
//       'occasion',
//       'formal',
//       'casual',
//       'smart casual',
//       'blazer',
//       'pants',
//       'shirt',
//       'jacket',
//       'accessory',
//       'color',
//       'shoes',
//       'season',
//       'vibe',
//       'wear', // ✅ catches “what should I wear”
//       'look', // ✅ catches “create a look” or “build a look”
//       'fit', // ✅ covers “does this fit”
//       'layer', // ✅ layering questions
//       'capsule', // ✅ capsule wardrobe
//       'pair', // ✅ “what pairs with…”
//       'match', // ✅ “does this match…”
//       'coordinate', // ✅ “coordinate these items”
//       'dress code', // ✅ “dress code for…”
//     ];

//     const lower = trimmed.toLowerCase();

//     // ✅ 1. Check for obvious fashion terms
//     const hasFashionKeyword = fashionKeywords.some(kw => lower.includes(kw));

//     // ✅ 2. Check for common fashion-related question patterns
//     const commonPhrases = [
//       'what should i wear',
//       'how should i dress',
//       'what goes with',
//       'how to style',
//       'how do i style',
//       'make me an outfit',
//       'build an outfit',
//       'suggest an outfit',
//       'style me',
//       'pair with',
//       'does this match',
//     ];
//     const hasCommonPhrase = commonPhrases.some(p => lower.includes(p));

//     // ✅ Final decision
//     const isFashionRelated = hasFashionKeyword || hasCommonPhrase;

//     if (!isFashionRelated) {
//       Alert.alert(
//         'Styling Questions Only ✨',
//         "I'm your personal stylist — I can only help with outfits, clothing advice, or fashion-related questions. Try asking about what to wear, how to style something, or how to dress for an event.",
//       );
//       return;
//     }

//     // 🧵 Continue normal chat flow
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
//     h('impactLight');

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
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);

//   /** ✅ Original button logic */
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

//   /** 📊 Render bubbles */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme)
//       : stylesAssistantBubble(theme);

//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View key={m.id} style={{transform: [{translateX}]}}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[
//             bubble.row,
//             // ADD MORE VERTICAL SPACE BETWEEN BUBBLES
//             {marginVertical: 10, transform: [{scale: 0.98}]},
//           ]}>
//           {/* 🤖 Chatbot icon for assistant messages */}
//           {!isUser && (
//             <View
//               style={{
//                 width: 36,
//                 height: 36,
//                 borderRadius: 19,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 alignSelf: 'flex-end',
//                 marginRight: 6,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <MaterialIcons
//                 name="smart-toy"
//                 size={22}
//                 color={theme.colors.buttonText1}
//                 style={{transform: [{scale: 1.05}]}}
//               />
//             </View>
//           )}

//           {/* 💬 Message bubble */}
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>
//           </Animatable.View>

//           {/* 👤 User profile image for user messages */}
//           {isUser && (
//             <View
//               style={{
//                 width: 38,
//                 height: 38,
//                 borderRadius: 50,
//                 overflow: 'hidden',
//                 backgroundColor: theme.colors.background,
//                 alignSelf: 'flex-end',
//               }}>
//               {profilePicture ? (
//                 <Image
//                   source={{uri: profilePicture}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <MaterialIcons
//                   name="person"
//                   size={22}
//                   color={theme.colors.foreground2}
//                   style={{alignSelf: 'center', marginTop: 6}}
//                 />
//               )}
//             </View>
//           )}
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         <View style={stylesHeader(theme).header}>
//           <View style={stylesHeader(theme).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text style={globalStyles.header}>AI Stylist Chat</Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme).iconButton}
//               onPress={() => {
//                 h('impactLight');
//                 Alert.alert(
//                   'Clear Chat?',
//                   'This will erase your current conversation with the stylist.',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Clear Chat',
//                       style: 'destructive',
//                       onPress: async () => {
//                         await AsyncStorage.removeItem(`chat_thread:${userId}`);
//                         setMessages([
//                           {
//                             id: 'seed-1',
//                             role: 'assistant',
//                             text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//                             createdAt: Date.now(),
//                           },
//                         ]);
//                         scrollToBottom();
//                       },
//                     },
//                   ],
//                 );
//               }}>
//               <MaterialIcons
//                 name="delete"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>

//         {/* 💬 Main Scrollable Content */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             {/* 📩 All Messages */}
//             <View style={{paddingHorizontal: 12, paddingBottom: 20}}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing Indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: 14,
//                   paddingVertical: 10,
//                   marginHorizontal: 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                   // backgroundColor: theme.colors.surface3,
//                 }}>
//                 <TypingDots />
//                 <Text style={{color: theme.colors.foreground, fontSize: 13}}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}
//           </Animated.ScrollView>

//           {/* ✅ Original disabled CTA behavior */}
//           {/* <View
//             pointerEvents={canSendToOutfit ? 'auto' : 'none'}
//             style={{
//               justifyContent: 'center',
//               alignItems: 'center',
//               marginBottom: 12,
//               flexDirection: 'row',
//               marginLeft: 30,
//             }}>
//             <AppleTouchFeedback type="impactLight">
//               <TouchableOpacity
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {opacity: canSendToOutfit ? 1 : 0.4},
//                   {width: 240},
//                 ]}
//                 onPress={sendToOutfitSafe}
//                 disabled={!canSendToOutfit}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   Create Outfit From Prompt
//                 </Text>
//               </TouchableOpacity>
//             </AppleTouchFeedback>

//             <TooltipBubble
//               message="This button is only if you want to use this specific prompt to create your outfit."
//               position="top"
//             />
//           </View> */}

//           {/* 📥 Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//           />
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /** 🫧 Typing Dots */
// function TypingDots() {
//   const {theme} = useAppTheme();
//   const dot = {width: 6, height: 6, borderRadius: 3, marginHorizontal: 3};
//   return (
//     <View
//       style={{
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 8,
//       }}>
//       {[0, 150, 300].map(delay => (
//         <Animatable.View
//           key={delay}
//           delay={delay}
//           animation="pulse"
//           iterationCount="infinite"
//           easing="ease-in-out"
//           duration={900}
//           style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//         />
//       ))}
//     </View>
//   );
// }

// /** 👗 Create Outfit CTA (kept but unused) */
// export function CreateOutfitCTA({
//   visible,
//   onPress,
// }: {
//   visible: boolean;
//   onPress: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   if (!visible) return null;
//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       easing="ease-out-cubic"
//       useNativeDriver
//       style={{
//         justifyContent: 'center',
//         alignItems: 'center',
//         paddingVertical: 20,
//         transform: [{translateY: 10}],
//       }}>
//       <AppleTouchFeedback type="impactLight">
//         <TouchableOpacity
//           onPress={onPress}
//           style={[
//             globalStyles.buttonPrimary,
//             {
//               width: 240,
//               opacity: 1,
//               shadowColor: '#000',
//               shadowOpacity: 0.15,
//               shadowRadius: 8,
//               shadowOffset: {width: 0, height: 4},
//             },
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>
//             Create Outfit From Prompt
//           </Text>
//         </TouchableOpacity>
//       </AppleTouchFeedback>
//     </Animatable.View>
//   );
// }

// /** 📥 Animated Input Bar — iMessage-style (no internal scroll, keeps growing) */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
// }: any) {
//   const {theme} = useAppTheme();

//   // iMessage feel: no max cap, keep growing
//   const MIN_HEIGHT = 40;
//   const [inputHeight, setInputHeight] = React.useState(MIN_HEIGHT);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: 10,
//         paddingBottom: 16,
//         backgroundColor: 'transparent',
//       }}>
//       <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 20,
//           paddingHorizontal: 8,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}>
//         {/* 📝 Input (auto-grows forever, no ScrollView) */}
//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           multiline
//           scrollEnabled={false} // never scroll internally
//           keyboardAppearance="dark"
//           returnKeyType="send"
//           blurOnSubmit={false}
//           style={{
//             flex: 1,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: 10,
//             paddingBottom: 10,
//             fontSize: 16,
//             textAlignVertical: 'top',
//             flexGrow: 1, // ✅ allow it to grow naturally
//             flexShrink: 1, // ✅ prevent mic/send push-out
//             minHeight: 40, // ✅ sensible base height
//           }}
//         />

//         {/* 🎙️ Mic */}
//         <TouchableOpacity
//           onPressIn={onMicPressIn}
//           onPressOut={onMicPressOut}
//           hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <MaterialIcons
//             name={isRecording ? 'mic' : 'mic-none'}
//             size={24}
//             color={
//               isRecording ? theme.colors.primary : theme.colors.foreground2
//             }
//           />
//         </TouchableOpacity>

//         {/* 📤 Send */}
//         <TouchableOpacity
//           onPress={onSend}
//           disabled={!input.trim() || isTyping}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           {isTyping ? (
//             <ActivityIndicator />
//           ) : (
//             <View
//               style={{
//                 width: 34,
//                 height: 34,
//                 borderRadius: 17,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginLeft: 6,
//                 marginBottom: 2,
//                 backgroundColor: theme.colors.surface,
//               }}>
//               <MaterialIcons
//                 name="arrow-upward"
//                 size={24}
//                 color={theme.colors.foreground}
//               />
//             </View>
//           )}
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// }

// /** 🧠 API Call */
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

// /** 🎨 Styles */
// function stylesHeader(theme: any) {
//   return StyleSheet.create({
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 2,
//       paddingBottom: 8,
//       marginTop: -38,
//     },
//     headerLeft: {flexDirection: 'row', alignItems: 'center'},
//     presenceDot: {width: 8, height: 8, borderRadius: 4, marginRight: 8},
//     iconButton: {
//       padding: 8,
//       borderRadius: 10,
//       backgroundColor: theme.colors.surface,
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
//       marginVertical: 14,
//     },
//     bubble: {
//       maxWidth: '78%',
//       backgroundColor: theme.colors.button1,
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 6,
//       borderBottomLeftRadius: 22,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//       borderColor: theme.colors.surfaceborder,
//       borderWidth: tokens.borderWidth.hairline,
//       position: 'relative',
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     tail: {
//       position: 'absolute',
//       right: -6,
//       bottom: 0,
//       width: 14,
//       height: 14,
//       backgroundColor: 'rgba(0, 122, 255, 1)',
//       transform: [{rotate: '45deg'}],
//       borderBottomRightRadius: 4,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

// function stylesAssistantBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: 8,
//     },
//     bubble: {
//       maxWidth: '82%',
//       backgroundColor: theme.colors.surface,
//       borderColor: theme.colors.surfaceborder,
//       borderWidth: tokens.borderWidth.hairline,
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 22,
//       borderBottomLeftRadius: 6,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

///////////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
//   Image,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {Alert} from 'react-native';

// type Role = 'user' | 'assistant' | 'system';
// type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();

//   const userId = useUUID();
//   const [profilePicture, setProfilePicture] = useState<string>('');

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(`profile_picture:${userId}`);
//       if (cached) {
//         setProfilePicture(
//           `${cached}${cached.includes('?') ? '&' : '?'}v=${Date.now()}`,
//         ); // bust cache so updates show immediately
//       }
//     })();
//   }, [userId]);

//   /** 💾 Persist chat thread */
//   useEffect(() => {
//     (async () => {
//       const saved = await AsyncStorage.getItem(`chat_thread:${userId}`);
//       if (saved) {
//         const parsed: Message[] = JSON.parse(saved);
//         if (parsed?.length) setMessages(parsed);
//       }
//     })();
//   }, [userId]);

//   useEffect(() => {
//     if (messages?.length) {
//       AsyncStorage.setItem(`chat_thread:${userId}`, JSON.stringify(messages));
//     }
//   }, [messages, userId]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   /** 📤 Send message */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;
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
//     h('impactLight');

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
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);

//   /** ✅ Original button logic */
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

//   /** 📊 Render bubbles */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme)
//       : stylesAssistantBubble(theme);

//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View key={m.id} style={{transform: [{translateX}]}}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[
//             bubble.row,
//             // ADD MORE VERTICAL SPACE BETWEEN BUBBLES
//             {marginVertical: 10, transform: [{scale: 0.98}]},
//           ]}>
//           {/* 🤖 Chatbot icon for assistant messages */}
//           {!isUser && (
//             <View
//               style={{
//                 width: 36,
//                 height: 36,
//                 borderRadius: 19,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 alignSelf: 'flex-end',
//                 marginRight: 6,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <MaterialIcons
//                 name="smart-toy"
//                 size={22}
//                 color={theme.colors.buttonText1}
//                 style={{transform: [{scale: 1.05}]}}
//               />
//             </View>
//           )}

//           {/* 💬 Message bubble */}
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>
//           </Animatable.View>

//           {/* 👤 User profile image for user messages */}
//           {isUser && (
//             <View
//               style={{
//                 width: 38,
//                 height: 38,
//                 borderRadius: 50,
//                 overflow: 'hidden',
//                 backgroundColor: theme.colors.background,
//                 alignSelf: 'flex-end',
//               }}>
//               {profilePicture ? (
//                 <Image
//                   source={{uri: profilePicture}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <MaterialIcons
//                   name="person"
//                   size={22}
//                   color={theme.colors.foreground2}
//                   style={{alignSelf: 'center', marginTop: 6}}
//                 />
//               )}
//             </View>
//           )}
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         <View style={stylesHeader(theme).header}>
//           <View style={stylesHeader(theme).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text style={globalStyles.header}>AI Stylist Chat</Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme).iconButton}
//               onPress={() => {
//                 h('impactLight');
//                 Alert.alert(
//                   'Clear Chat?',
//                   'This will erase your current conversation with the stylist.',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Clear Chat',
//                       style: 'destructive',
//                       onPress: async () => {
//                         await AsyncStorage.removeItem(`chat_thread:${userId}`);
//                         setMessages([
//                           {
//                             id: 'seed-1',
//                             role: 'assistant',
//                             text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//                             createdAt: Date.now(),
//                           },
//                         ]);
//                         scrollToBottom();
//                       },
//                     },
//                   ],
//                 );
//               }}>
//               <MaterialIcons
//                 name="delete"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>

//         {/* 💬 Main Scrollable Content */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             {/* 📩 All Messages */}
//             <View style={{paddingHorizontal: 12, paddingBottom: 20}}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing Indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: 14,
//                   paddingVertical: 10,
//                   marginHorizontal: 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                   // backgroundColor: theme.colors.surface3,
//                 }}>
//                 <TypingDots />
//                 <Text style={{color: theme.colors.foreground, fontSize: 13}}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}
//           </Animated.ScrollView>

//           {/* ✅ Original disabled CTA behavior */}
//           {/* <View
//             pointerEvents={canSendToOutfit ? 'auto' : 'none'}
//             style={{
//               justifyContent: 'center',
//               alignItems: 'center',
//               marginBottom: 12,
//               flexDirection: 'row',
//               marginLeft: 30,
//             }}>
//             <AppleTouchFeedback type="impactLight">
//               <TouchableOpacity
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {opacity: canSendToOutfit ? 1 : 0.4},
//                   {width: 240},
//                 ]}
//                 onPress={sendToOutfitSafe}
//                 disabled={!canSendToOutfit}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   Create Outfit From Prompt
//                 </Text>
//               </TouchableOpacity>
//             </AppleTouchFeedback>

//             <TooltipBubble
//               message="This button is only if you want to use this specific prompt to create your outfit."
//               position="top"
//             />
//           </View> */}

//           {/* 📥 Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//           />
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /** 🫧 Typing Dots */
// function TypingDots() {
//   const {theme} = useAppTheme();
//   const dot = {width: 6, height: 6, borderRadius: 3, marginHorizontal: 3};
//   return (
//     <View
//       style={{
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 8,
//       }}>
//       {[0, 150, 300].map(delay => (
//         <Animatable.View
//           key={delay}
//           delay={delay}
//           animation="pulse"
//           iterationCount="infinite"
//           easing="ease-in-out"
//           duration={900}
//           style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//         />
//       ))}
//     </View>
//   );
// }

// /** 👗 Create Outfit CTA (kept but unused) */
// export function CreateOutfitCTA({
//   visible,
//   onPress,
// }: {
//   visible: boolean;
//   onPress: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   if (!visible) return null;
//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       easing="ease-out-cubic"
//       useNativeDriver
//       style={{
//         justifyContent: 'center',
//         alignItems: 'center',
//         paddingVertical: 20,
//         transform: [{translateY: 10}],
//       }}>
//       <AppleTouchFeedback type="impactLight">
//         <TouchableOpacity
//           onPress={onPress}
//           style={[
//             globalStyles.buttonPrimary,
//             {
//               width: 240,
//               opacity: 1,
//               shadowColor: '#000',
//               shadowOpacity: 0.15,
//               shadowRadius: 8,
//               shadowOffset: {width: 0, height: 4},
//             },
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>
//             Create Outfit From Prompt
//           </Text>
//         </TouchableOpacity>
//       </AppleTouchFeedback>
//     </Animatable.View>
//   );
// }

// /** 📥 Animated Input Bar — iMessage-style (no internal scroll, keeps growing) */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
// }: any) {
//   const {theme} = useAppTheme();

//   // iMessage feel: no max cap, keep growing
//   const MIN_HEIGHT = 40;
//   const [inputHeight, setInputHeight] = React.useState(MIN_HEIGHT);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: 10,
//         paddingBottom: 16,
//         backgroundColor: 'transparent',
//       }}>
//       <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 20,
//           paddingHorizontal: 8,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}>
//         {/* 📝 Input (auto-grows forever, no ScrollView) */}
//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           multiline
//           scrollEnabled={false} // never scroll internally
//           keyboardAppearance="dark"
//           returnKeyType="send"
//           blurOnSubmit={false}
//           style={{
//             flex: 1,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: 10,
//             paddingBottom: 10,
//             fontSize: 16,
//             textAlignVertical: 'top',
//             flexGrow: 1, // ✅ allow it to grow naturally
//             flexShrink: 1, // ✅ prevent mic/send push-out
//             minHeight: 40, // ✅ sensible base height
//           }}
//         />

//         {/* 🎙️ Mic */}
//         <TouchableOpacity
//           onPressIn={onMicPressIn}
//           onPressOut={onMicPressOut}
//           hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <MaterialIcons
//             name={isRecording ? 'mic' : 'mic-none'}
//             size={24}
//             color={
//               isRecording ? theme.colors.primary : theme.colors.foreground2
//             }
//           />
//         </TouchableOpacity>

//         {/* 📤 Send */}
//         <TouchableOpacity
//           onPress={onSend}
//           disabled={!input.trim() || isTyping}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           {isTyping ? (
//             <ActivityIndicator />
//           ) : (
//             <View
//               style={{
//                 width: 34,
//                 height: 34,
//                 borderRadius: 17,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginLeft: 6,
//                 marginBottom: 2,
//                 backgroundColor: theme.colors.surface,
//               }}>
//               <MaterialIcons
//                 name="arrow-upward"
//                 size={24}
//                 color={theme.colors.foreground}
//               />
//             </View>
//           )}
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// }

// /** 🧠 API Call */
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

// /** 🎨 Styles */
// function stylesHeader(theme: any) {
//   return StyleSheet.create({
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 2,
//       paddingBottom: 8,
//       marginTop: -38,
//     },
//     headerLeft: {flexDirection: 'row', alignItems: 'center'},
//     presenceDot: {width: 8, height: 8, borderRadius: 4, marginRight: 8},
//     iconButton: {
//       padding: 8,
//       borderRadius: 10,
//       backgroundColor: theme.colors.surface,
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
//       marginVertical: 14,
//     },
//     bubble: {
//       maxWidth: '78%',
//       backgroundColor: theme.colors.button1,
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 6,
//       borderBottomLeftRadius: 22,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//       borderColor: theme.colors.surfaceborder,
//       borderWidth: tokens.borderWidth.hairline,
//       position: 'relative',
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     tail: {
//       position: 'absolute',
//       right: -6,
//       bottom: 0,
//       width: 14,
//       height: 14,
//       backgroundColor: 'rgba(0, 122, 255, 1)',
//       transform: [{rotate: '45deg'}],
//       borderBottomRightRadius: 4,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

// function stylesAssistantBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: 8,
//     },
//     bubble: {
//       maxWidth: '82%',
//       backgroundColor: theme.colors.surface,
//       borderColor: theme.colors.surfaceborder,
//       borderWidth: tokens.borderWidth.hairline,
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 22,
//       borderBottomLeftRadius: 6,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

///////////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
//   Image,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {Alert} from 'react-native';

// type Role = 'user' | 'assistant' | 'system';
// type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();

//   const userId = useUUID();
//   const [profilePicture, setProfilePicture] = useState<string>('');

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(`profile_picture:${userId}`);
//       if (cached) {
//         setProfilePicture(
//           `${cached}${cached.includes('?') ? '&' : '?'}v=${Date.now()}`,
//         ); // bust cache so updates show immediately
//       }
//     })();
//   }, [userId]);

//   /** 💾 Persist chat thread */
//   useEffect(() => {
//     (async () => {
//       const saved = await AsyncStorage.getItem(`chat_thread:${userId}`);
//       if (saved) {
//         const parsed: Message[] = JSON.parse(saved);
//         if (parsed?.length) setMessages(parsed);
//       }
//     })();
//   }, [userId]);

//   useEffect(() => {
//     if (messages?.length) {
//       AsyncStorage.setItem(`chat_thread:${userId}`, JSON.stringify(messages));
//     }
//   }, [messages, userId]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   /** 📤 Send message */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;
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
//     h('impactLight');

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
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);

//   /** ✅ Original button logic */
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

//   /** 📊 Render bubbles */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme)
//       : stylesAssistantBubble(theme);

//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View key={m.id} style={{transform: [{translateX}]}}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[
//             bubble.row,
//             // ADD MORE VERTICAL SPACE BETWEEN BUBBLES
//             {marginVertical: 10, transform: [{scale: 0.98}]},
//           ]}>
//           {/* 🤖 Chatbot icon for assistant messages */}
//           {!isUser && (
//             <View
//               style={{
//                 width: 36,
//                 height: 36,
//                 borderRadius: 19,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 alignSelf: 'flex-end',
//                 marginRight: 6,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <MaterialIcons
//                 name="smart-toy"
//                 size={22}
//                 color={theme.colors.buttonText1}
//                 style={{transform: [{scale: 1.05}]}}
//               />
//             </View>
//           )}

//           {/* 💬 Message bubble */}
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>
//           </Animatable.View>

//           {/* 👤 User profile image for user messages */}
//           {isUser && (
//             <View
//               style={{
//                 width: 38,
//                 height: 38,
//                 borderRadius: 50,
//                 overflow: 'hidden',
//                 backgroundColor: theme.colors.background,
//                 alignSelf: 'flex-end',
//               }}>
//               {profilePicture ? (
//                 <Image
//                   source={{uri: profilePicture}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <MaterialIcons
//                   name="person"
//                   size={22}
//                   color={theme.colors.foreground2}
//                   style={{alignSelf: 'center', marginTop: 6}}
//                 />
//               )}
//             </View>
//           )}
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         <View style={stylesHeader(theme).header}>
//           <View style={stylesHeader(theme).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text style={globalStyles.header}>AI Stylist Chat</Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme).iconButton}
//               onPress={() => {
//                 h('impactLight');
//                 Alert.alert(
//                   'Clear Chat?',
//                   'This will erase your current conversation with the stylist.',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Clear Chat',
//                       style: 'destructive',
//                       onPress: async () => {
//                         await AsyncStorage.removeItem(`chat_thread:${userId}`);
//                         setMessages([
//                           {
//                             id: 'seed-1',
//                             role: 'assistant',
//                             text: "Hey — I'm your AI Stylist. Tell me the vibe, weather, and where you're headed. I’ll craft a look that feels like you.",
//                             createdAt: Date.now(),
//                           },
//                         ]);
//                         scrollToBottom();
//                       },
//                     },
//                   ],
//                 );
//               }}>
//               <MaterialIcons
//                 name="delete"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>

//         {/* 💬 Main Scrollable Content */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             {/* 📩 All Messages */}
//             <View style={{paddingHorizontal: 12, paddingBottom: 20}}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing Indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: 14,
//                   paddingVertical: 10,
//                   marginHorizontal: 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                   // backgroundColor: theme.colors.surface3,
//                 }}>
//                 <TypingDots />
//                 <Text style={{color: theme.colors.foreground, fontSize: 13}}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}
//           </Animated.ScrollView>

//           {/* ✅ Original disabled CTA behavior */}
//           {/* <View
//             pointerEvents={canSendToOutfit ? 'auto' : 'none'}
//             style={{
//               justifyContent: 'center',
//               alignItems: 'center',
//               marginBottom: 12,
//               flexDirection: 'row',
//               marginLeft: 30,
//             }}>
//             <AppleTouchFeedback type="impactLight">
//               <TouchableOpacity
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {opacity: canSendToOutfit ? 1 : 0.4},
//                   {width: 240},
//                 ]}
//                 onPress={sendToOutfitSafe}
//                 disabled={!canSendToOutfit}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   Create Outfit From Prompt
//                 </Text>
//               </TouchableOpacity>
//             </AppleTouchFeedback>

//             <TooltipBubble
//               message="This button is only if you want to use this specific prompt to create your outfit."
//               position="top"
//             />
//           </View> */}

//           {/* 📥 Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//           />
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /** 🫧 Typing Dots */
// function TypingDots() {
//   const {theme} = useAppTheme();
//   const dot = {width: 6, height: 6, borderRadius: 3, marginHorizontal: 3};
//   return (
//     <View
//       style={{
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 8,
//       }}>
//       {[0, 150, 300].map(delay => (
//         <Animatable.View
//           key={delay}
//           delay={delay}
//           animation="pulse"
//           iterationCount="infinite"
//           easing="ease-in-out"
//           duration={900}
//           style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//         />
//       ))}
//     </View>
//   );
// }

// /** 👗 Create Outfit CTA (kept but unused) */
// export function CreateOutfitCTA({
//   visible,
//   onPress,
// }: {
//   visible: boolean;
//   onPress: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   if (!visible) return null;
//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       easing="ease-out-cubic"
//       useNativeDriver
//       style={{
//         justifyContent: 'center',
//         alignItems: 'center',
//         paddingVertical: 20,
//         transform: [{translateY: 10}],
//       }}>
//       <AppleTouchFeedback type="impactLight">
//         <TouchableOpacity
//           onPress={onPress}
//           style={[
//             globalStyles.buttonPrimary,
//             {
//               width: 240,
//               opacity: 1,
//               shadowColor: '#000',
//               shadowOpacity: 0.15,
//               shadowRadius: 8,
//               shadowOffset: {width: 0, height: 4},
//             },
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>
//             Create Outfit From Prompt
//           </Text>
//         </TouchableOpacity>
//       </AppleTouchFeedback>
//     </Animatable.View>
//   );
// }

// /** 📥 Animated Input Bar */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
// }: any) {
//   const {theme} = useAppTheme();

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: 10,
//         paddingBottom: 16,
//         backgroundColor: 'transparent',
//       }}>
//       <Animatable.View
//         animation="pulse"
//         iterationCount="infinite"
//         duration={5000}
//         easing="ease-in-out"
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 20,
//           paddingHorizontal: 8,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}>
//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           style={{
//             flex: 1,
//             height: 45,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: 12,
//             fontSize: 16,
//           }}
//           multiline
//           keyboardAppearance="dark"
//           onSubmitEditing={onSend}
//           returnKeyType="send"
//           blurOnSubmit={false}
//         />

//         {/* 🎙️ Mic */}
//         <Animatable.View
//           animation={isRecording ? 'pulse' : undefined}
//           iterationCount="infinite"
//           duration={1200}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <TouchableOpacity
//             onPressIn={onMicPressIn}
//             onPressOut={onMicPressOut}
//             hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//             <MaterialIcons
//               name={isRecording ? 'mic' : 'mic-none'}
//               size={24}
//               color={
//                 isRecording ? theme.colors.primary : theme.colors.foreground2
//               }
//             />
//           </TouchableOpacity>
//         </Animatable.View>

//         {/* 📤 Send */}
//         <Animatable.View
//           animation="fadeIn"
//           duration={400}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: !input.trim() || isTyping ? 0.9 : 1}],
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           <TouchableOpacity
//             onPress={onSend}
//             disabled={!input.trim() || isTyping}>
//             {isTyping ? (
//               <ActivityIndicator />
//             ) : (
//               <View
//                 style={{
//                   width: 34,
//                   height: 34,
//                   borderRadius: 17,
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   marginLeft: 6,
//                   marginBottom: 2,
//                   backgroundColor: theme.colors.surface,
//                 }}>
//                 <MaterialIcons
//                   name="arrow-upward"
//                   size={24}
//                   color={theme.colors.foreground}
//                 />
//               </View>
//             )}
//           </TouchableOpacity>
//         </Animatable.View>
//       </Animatable.View>
//     </Animatable.View>
//   );
// }

// /** 🧠 API Call */
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

// /** 🎨 Styles */
// function stylesHeader(theme: any) {
//   return StyleSheet.create({
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 2,
//       paddingBottom: 8,
//       marginTop: -38,
//     },
//     headerLeft: {flexDirection: 'row', alignItems: 'center'},
//     presenceDot: {width: 8, height: 8, borderRadius: 4, marginRight: 8},
//     iconButton: {
//       padding: 8,
//       borderRadius: 10,
//       backgroundColor: theme.colors.surface,
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
//       marginVertical: 14,
//     },
//     bubble: {
//       maxWidth: '78%',
//       backgroundColor: theme.colors.button1,
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 6,
//       borderBottomLeftRadius: 22,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//       borderColor: theme.colors.surfaceborder,
//       borderWidth: tokens.borderWidth.hairline,
//       position: 'relative',
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     tail: {
//       position: 'absolute',
//       right: -6,
//       bottom: 0,
//       width: 14,
//       height: 14,
//       backgroundColor: 'rgba(0, 122, 255, 1)',
//       transform: [{rotate: '45deg'}],
//       borderBottomRightRadius: 4,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

// function stylesAssistantBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: 8,
//     },
//     bubble: {
//       maxWidth: '82%',
//       backgroundColor: theme.colors.surface,
//       borderColor: theme.colors.surfaceborder,
//       borderWidth: tokens.borderWidth.hairline,
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 22,
//       borderBottomLeftRadius: 6,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

///////////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
//   Image,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';

// type Role = 'user' | 'assistant' | 'system';
// type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();

//   const userId = useUUID();
//   const [profilePicture, setProfilePicture] = useState<string>('');

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(`profile_picture:${userId}`);
//       if (cached) {
//         setProfilePicture(
//           `${cached}${cached.includes('?') ? '&' : '?'}v=${Date.now()}`,
//         ); // bust cache so updates show immediately
//       }
//     })();
//   }, [userId]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   /** 📤 Send message */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;
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
//     h('impactLight');

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
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);

//   /** ✅ Original button logic */
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

//   /** 📊 Render bubbles */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme)
//       : stylesAssistantBubble(theme);

//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View key={m.id} style={{transform: [{translateX}]}}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[
//             bubble.row,
//             // ADD MORE VERTICAL SPACE BETWEEN BUBBLES
//             {marginVertical: 10, transform: [{scale: 0.98}]},
//           ]}>
//           {/* 🤖 Chatbot icon for assistant messages */}
//           {!isUser && (
//             <View
//               style={{
//                 width: 36,
//                 height: 36,
//                 borderRadius: 19,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 alignSelf: 'flex-end',
//                 marginRight: 6,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <MaterialIcons
//                 name="smart-toy"
//                 size={22}
//                 color={theme.colors.buttonText1}
//                 style={{transform: [{scale: 1.05}]}}
//               />
//             </View>
//           )}

//           {/* 💬 Message bubble */}
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>
//           </Animatable.View>

//           {/* 👤 User profile image for user messages */}
//           {isUser && (
//             <View
//               style={{
//                 width: 38,
//                 height: 38,
//                 borderRadius: 50,
//                 overflow: 'hidden',
//                 backgroundColor: theme.colors.background,
//                 alignSelf: 'flex-end',
//               }}>
//               {profilePicture ? (
//                 <Image
//                   source={{uri: profilePicture}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <MaterialIcons
//                   name="person"
//                   size={22}
//                   color={theme.colors.foreground2}
//                   style={{alignSelf: 'center', marginTop: 6}}
//                 />
//               )}
//             </View>
//           )}
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         <View style={stylesHeader(theme).header}>
//           <View style={stylesHeader(theme).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text style={globalStyles.header}>AI Stylist Chat</Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme).iconButton}
//               onPress={() => {
//                 h('selection');
//                 scrollToBottom();
//               }}>
//               <MaterialIcons
//                 name="refresh"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>

//         {/* 💬 Main Scrollable Content */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             {/* 📩 All Messages */}
//             <View style={{paddingHorizontal: 12, paddingBottom: 20}}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing Indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: 14,
//                   paddingVertical: 10,
//                   marginHorizontal: 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                   backgroundColor: theme.colors.surface3,
//                 }}>
//                 <TypingDots />
//                 <Text style={{color: theme.colors.foreground, fontSize: 13}}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}
//           </Animated.ScrollView>

//           {/* ✅ Original disabled CTA behavior */}
//           {/* <View
//             pointerEvents={canSendToOutfit ? 'auto' : 'none'}
//             style={{
//               justifyContent: 'center',
//               alignItems: 'center',
//               marginBottom: 12,
//               flexDirection: 'row',
//               marginLeft: 30,
//             }}>
//             <AppleTouchFeedback type="impactLight">
//               <TouchableOpacity
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {opacity: canSendToOutfit ? 1 : 0.4},
//                   {width: 240},
//                 ]}
//                 onPress={sendToOutfitSafe}
//                 disabled={!canSendToOutfit}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   Create Outfit From Prompt
//                 </Text>
//               </TouchableOpacity>
//             </AppleTouchFeedback>

//             <TooltipBubble
//               message="This button is only if you want to use this specific prompt to create your outfit."
//               position="top"
//             />
//           </View> */}

//           {/* 📥 Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//           />
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /** 🫧 Typing Dots */
// function TypingDots() {
//   const {theme} = useAppTheme();
//   const dot = {width: 6, height: 6, borderRadius: 3, marginHorizontal: 3};
//   return (
//     <View
//       style={{
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 8,
//       }}>
//       {[0, 150, 300].map(delay => (
//         <Animatable.View
//           key={delay}
//           delay={delay}
//           animation="pulse"
//           iterationCount="infinite"
//           easing="ease-in-out"
//           duration={900}
//           style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//         />
//       ))}
//     </View>
//   );
// }

// /** 👗 Create Outfit CTA (kept but unused) */
// export function CreateOutfitCTA({
//   visible,
//   onPress,
// }: {
//   visible: boolean;
//   onPress: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   if (!visible) return null;
//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       easing="ease-out-cubic"
//       useNativeDriver
//       style={{
//         justifyContent: 'center',
//         alignItems: 'center',
//         paddingVertical: 20,
//         transform: [{translateY: 10}],
//       }}>
//       <AppleTouchFeedback type="impactLight">
//         <TouchableOpacity
//           onPress={onPress}
//           style={[
//             globalStyles.buttonPrimary,
//             {
//               width: 240,
//               opacity: 1,
//               shadowColor: '#000',
//               shadowOpacity: 0.15,
//               shadowRadius: 8,
//               shadowOffset: {width: 0, height: 4},
//             },
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>
//             Create Outfit From Prompt
//           </Text>
//         </TouchableOpacity>
//       </AppleTouchFeedback>
//     </Animatable.View>
//   );
// }

// /** 📥 Animated Input Bar */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
// }: any) {
//   const {theme} = useAppTheme();

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: 10,
//         paddingBottom: 16,
//         backgroundColor: 'transparent',
//       }}>
//       <Animatable.View
//         animation="pulse"
//         iterationCount="infinite"
//         duration={5000}
//         easing="ease-in-out"
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 20,
//           paddingHorizontal: 8,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}>
//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           style={{
//             flex: 1,
//             height: 45,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: 12,
//             fontSize: 16,
//           }}
//           multiline
//           keyboardAppearance="dark"
//           onSubmitEditing={onSend}
//           returnKeyType="send"
//           blurOnSubmit={false}
//         />

//         {/* 🎙️ Mic */}
//         <Animatable.View
//           animation={isRecording ? 'pulse' : undefined}
//           iterationCount="infinite"
//           duration={1200}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <TouchableOpacity
//             onPressIn={onMicPressIn}
//             onPressOut={onMicPressOut}
//             hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//             <MaterialIcons
//               name={isRecording ? 'mic' : 'mic-none'}
//               size={24}
//               color={
//                 isRecording ? theme.colors.primary : theme.colors.foreground2
//               }
//             />
//           </TouchableOpacity>
//         </Animatable.View>

//         {/* 📤 Send */}
//         <Animatable.View
//           animation="fadeIn"
//           duration={400}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: !input.trim() || isTyping ? 0.9 : 1}],
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           <TouchableOpacity
//             onPress={onSend}
//             disabled={!input.trim() || isTyping}>
//             {isTyping ? (
//               <ActivityIndicator />
//             ) : (
//               <View
//                 style={{
//                   width: 34,
//                   height: 34,
//                   borderRadius: 17,
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   marginLeft: 6,
//                   marginBottom: 2,
//                   backgroundColor: theme.colors.surface,
//                 }}>
//                 <MaterialIcons
//                   name="arrow-upward"
//                   size={24}
//                   color={theme.colors.foreground}
//                 />
//               </View>
//             )}
//           </TouchableOpacity>
//         </Animatable.View>
//       </Animatable.View>
//     </Animatable.View>
//   );
// }

// /** 🧠 API Call */
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

// /** 🎨 Styles */
// function stylesHeader(theme: any) {
//   return StyleSheet.create({
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 2,
//       paddingBottom: 8,
//       marginTop: -38,
//     },
//     headerLeft: {flexDirection: 'row', alignItems: 'center'},
//     presenceDot: {width: 8, height: 8, borderRadius: 4, marginRight: 8},
//     iconButton: {
//       padding: 8,
//       borderRadius: 10,
//       backgroundColor: theme.colors.surface,
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
//       marginVertical: 14,
//     },
//     bubble: {
//       maxWidth: '78%',
//       backgroundColor: theme.colors.button1,
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 6,
//       borderBottomLeftRadius: 22,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//       borderColor: theme.colors.surfaceborder,
//       borderWidth: tokens.borderWidth.hairline,
//       position: 'relative',
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     tail: {
//       position: 'absolute',
//       right: -6,
//       bottom: 0,
//       width: 14,
//       height: 14,
//       backgroundColor: 'rgba(0, 122, 255, 1)',
//       transform: [{rotate: '45deg'}],
//       borderBottomRightRadius: 4,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

// function stylesAssistantBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: 8,
//     },
//     bubble: {
//       maxWidth: '82%',
//       backgroundColor: theme.colors.surface,
//       borderColor: theme.colors.surfaceborder,
//       borderWidth: tokens.borderWidth.hairline,
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 22,
//       borderBottomLeftRadius: 6,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

/////////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
//   Image,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type Role = 'user' | 'assistant' | 'system';
// type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   /** 📤 Send message */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;
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
//     h('impactLight');

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
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);

//   /** ✅ Original button logic */
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

//   /** 📊 Render bubbles */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme)
//       : stylesAssistantBubble(theme);

//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View key={m.id} style={{transform: [{translateX}]}}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[
//             bubble.row,
//             // ADD MORE VERTICAL SPACE BETWEEN BUBBLES
//             {marginVertical: 10, transform: [{scale: 0.98}]},
//           ]}>
//           {/* 🤖 Chatbot icon for assistant messages */}
//           {!isUser && (
//             <View
//               style={{
//                 width: 36,
//                 height: 36,
//                 borderRadius: 19,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 alignSelf: 'flex-end',
//                 marginRight: 6,
//                 shadowColor: '#000',
//                 shadowOpacity: 0.15,
//                 shadowRadius: 6,
//                 shadowOffset: {width: 0, height: 2},
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <MaterialIcons
//                 name="smart-toy"
//                 size={22}
//                 color={theme.colors.primary}
//                 style={{transform: [{scale: 1.05}]}}
//               />
//             </View>
//           )}

//           {/* 💬 Message bubble */}
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>
//           </Animatable.View>

//           {/* 👤 User profile image for user messages */}
//           {isUser && (
//             <View
//               style={{
//                 width: 36,
//                 height: 36,
//                 borderRadius: 20,
//                 overflow: 'hidden',
//                 backgroundColor: theme.colors.surface,
//                 alignSelf: 'flex-end',
//                 shadowColor: '#000',
//                 shadowOpacity: 0.15,
//                 shadowRadius: 6,
//                 shadowOffset: {width: 0, height: 2},
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <Image
//                 source={{
//                   uri: 'https://i.pravatar.cc/200?u=mikegiffin',
//                 }}
//                 style={{width: '100%', height: '100%'}}
//                 resizeMode="cover"
//               />
//               {/* <MaterialIcons
//                 name="smart-toy"
//                 size={22}
//                 color={theme.colors.primary}
//                 style={{transform: [{scale: 1.05}]}}
//               /> */}
//             </View>
//           )}
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         <View style={stylesHeader(theme).header}>
//           <View style={stylesHeader(theme).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text style={globalStyles.header}>AI Stylist Chat</Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme).iconButton}
//               onPress={() => {
//                 h('selection');
//                 scrollToBottom();
//               }}>
//               <MaterialIcons
//                 name="refresh"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>

//         {/* 💬 Main Scrollable Content */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             {/* 📩 All Messages */}
//             <View style={{paddingHorizontal: 12, paddingBottom: 20}}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing Indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: 14,
//                   paddingVertical: 10,
//                   marginHorizontal: 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                   backgroundColor: theme.colors.surface3,
//                 }}>
//                 <TypingDots />
//                 <Text style={{color: theme.colors.foreground, fontSize: 13}}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}
//           </Animated.ScrollView>

//           {/* ✅ Original disabled CTA behavior */}
//           {/* <View
//             pointerEvents={canSendToOutfit ? 'auto' : 'none'}
//             style={{
//               justifyContent: 'center',
//               alignItems: 'center',
//               marginBottom: 12,
//               flexDirection: 'row',
//               marginLeft: 30,
//             }}>
//             <AppleTouchFeedback type="impactLight">
//               <TouchableOpacity
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {opacity: canSendToOutfit ? 1 : 0.4},
//                   {width: 240},
//                 ]}
//                 onPress={sendToOutfitSafe}
//                 disabled={!canSendToOutfit}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   Create Outfit From Prompt
//                 </Text>
//               </TouchableOpacity>
//             </AppleTouchFeedback>

//             <TooltipBubble
//               message="This button is only if you want to use this specific prompt to create your outfit."
//               position="top"
//             />
//           </View> */}

//           {/* 📥 Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//           />
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /** 🫧 Typing Dots */
// function TypingDots() {
//   const {theme} = useAppTheme();
//   const dot = {width: 6, height: 6, borderRadius: 3, marginHorizontal: 3};
//   return (
//     <View
//       style={{
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 8,
//       }}>
//       {[0, 150, 300].map(delay => (
//         <Animatable.View
//           key={delay}
//           delay={delay}
//           animation="pulse"
//           iterationCount="infinite"
//           easing="ease-in-out"
//           duration={900}
//           style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//         />
//       ))}
//     </View>
//   );
// }

// /** 👗 Create Outfit CTA (kept but unused) */
// export function CreateOutfitCTA({
//   visible,
//   onPress,
// }: {
//   visible: boolean;
//   onPress: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   if (!visible) return null;
//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       easing="ease-out-cubic"
//       useNativeDriver
//       style={{
//         justifyContent: 'center',
//         alignItems: 'center',
//         paddingVertical: 20,
//         transform: [{translateY: 10}],
//       }}>
//       <AppleTouchFeedback type="impactLight">
//         <TouchableOpacity
//           onPress={onPress}
//           style={[
//             globalStyles.buttonPrimary,
//             {
//               width: 240,
//               opacity: 1,
//               shadowColor: '#000',
//               shadowOpacity: 0.15,
//               shadowRadius: 8,
//               shadowOffset: {width: 0, height: 4},
//             },
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>
//             Create Outfit From Prompt
//           </Text>
//         </TouchableOpacity>
//       </AppleTouchFeedback>
//     </Animatable.View>
//   );
// }

// /** 📥 Animated Input Bar */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
// }: any) {
//   const {theme} = useAppTheme();

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: 10,
//         paddingBottom: 16,
//         backgroundColor: 'transparent',
//       }}>
//       <Animatable.View
//         animation="pulse"
//         iterationCount="infinite"
//         duration={5000}
//         easing="ease-in-out"
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 20,
//           paddingHorizontal: 8,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}>
//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           style={{
//             flex: 1,
//             height: 45,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: 12,
//             fontSize: 16,
//           }}
//           multiline
//           keyboardAppearance="dark"
//           onSubmitEditing={onSend}
//           returnKeyType="send"
//           blurOnSubmit={false}
//         />

//         {/* 🎙️ Mic */}
//         <Animatable.View
//           animation={isRecording ? 'pulse' : undefined}
//           iterationCount="infinite"
//           duration={1200}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <TouchableOpacity
//             onPressIn={onMicPressIn}
//             onPressOut={onMicPressOut}
//             hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//             <MaterialIcons
//               name={isRecording ? 'mic' : 'mic-none'}
//               size={24}
//               color={
//                 isRecording ? theme.colors.primary : theme.colors.foreground2
//               }
//             />
//           </TouchableOpacity>
//         </Animatable.View>

//         {/* 📤 Send */}
//         <Animatable.View
//           animation="fadeIn"
//           duration={400}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: !input.trim() || isTyping ? 0.9 : 1}],
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           <TouchableOpacity
//             onPress={onSend}
//             disabled={!input.trim() || isTyping}>
//             {isTyping ? (
//               <ActivityIndicator />
//             ) : (
//               <View
//                 style={{
//                   width: 34,
//                   height: 34,
//                   borderRadius: 17,
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   marginLeft: 6,
//                   backgroundColor: theme.colors.surface,
//                 }}>
//                 <MaterialIcons
//                   name="arrow-upward"
//                   size={24}
//                   color={theme.colors.foreground}
//                 />
//               </View>
//             )}
//           </TouchableOpacity>
//         </Animatable.View>
//       </Animatable.View>
//     </Animatable.View>
//   );
// }

// /** 🧠 API Call */
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

// /** 🎨 Styles */
// function stylesHeader(theme: any) {
//   return StyleSheet.create({
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 2,
//       paddingBottom: 8,
//       marginTop: -38,
//     },
//     headerLeft: {flexDirection: 'row', alignItems: 'center'},
//     presenceDot: {width: 8, height: 8, borderRadius: 4, marginRight: 8},
//     iconButton: {
//       padding: 8,
//       borderRadius: 10,
//       backgroundColor: theme.colors.surface,
//     },
//   });
// }

// // function stylesUserBubble(theme: any) {
// //   return StyleSheet.create({
// //     row: {
// //       flexDirection: 'row',
// //       alignItems: 'flex-end',
// //       justifyContent: 'flex-end',
// //       gap: 8,
// //       marginVertical: 2,
// //     },
// //     bubble: {
// //       maxWidth: '78%',
// //       backgroundColor: 'rgba(0, 119, 255, 1)',
// //       borderWidth: tokens.borderWidth.hairline,
// //       borderColor: theme.colors.surfaceBorder,
// //       paddingHorizontal: 14,
// //       paddingVertical: 10,
// //       borderRadius: 16,
// //       marginRight: 8,
// //     },
// //     text: {
// //       color: theme.colors.buttonText1,
// //       fontSize: 16,
// //       lineHeight: 22,
// //     },
// //     time: {
// //       color: theme.colors.buttonText1,
// //       fontSize: 11,
// //       marginTop: 4,
// //       textAlign: 'right',
// //     },
// //   });
// // }

// function stylesUserBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-end',
//       gap: 8,
//       marginVertical: 14,
//     },
//     bubble: {
//       maxWidth: '78%',
//       // backgroundColor: 'rgba(0, 122, 255, 1)',
//       // backgroundColor: 'rgba(43, 43, 43, 1)',
//       backgroundColor: 'rgba(144, 0, 255, 1)',
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 6,
//       borderBottomLeftRadius: 22,
//       borderTopRightRadius: 22,
//       marginRight: 8,

//       // 🍏 Apple-style depth
//       shadowColor: '#000',
//       shadowOpacity: 0.15,
//       shadowRadius: 8,
//       shadowOffset: {width: 0, height: 4},

//       position: 'relative',
//       borderWidth: 1,
//       borderColor: 'rgba(255, 255, 255, 0.08)',
//     },
//     tail: {
//       position: 'absolute',
//       right: -6,
//       bottom: 0,
//       width: 14,
//       height: 14,
//       backgroundColor: 'rgba(0, 122, 255, 1)',
//       transform: [{rotate: '45deg'}],
//       borderBottomRightRadius: 4,
//     },
//     text: {
//       color: '#fff',
//       fontSize: 16,
//       lineHeight: 22,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },
//     time: {
//       color: 'rgba(255,255,255,0.7)',
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

// // function stylesAssistantBubble(theme: any) {
// //   return StyleSheet.create({
// //     row: {
// //       flexDirection: 'row',
// //       alignItems: 'flex-end',
// //       justifyContent: 'flex-start',
// //       gap: 8,
// //       marginVertical: 8,
// //     },
// //     bubble: {
// //       maxWidth: '82%',
// //       backgroundColor: theme.colors.surface3,
// //       paddingHorizontal: 14,
// //       paddingVertical: 10,
// //       borderRadius: 20,
// //       borderWidth: tokens.borderWidth.hairline,
// //       borderColor: theme.colors.surfaceBorder,
// //       marginLeft: 8,
// //     },
// //     text: {
// //       color: theme.colors.foreground,
// //       fontSize: 16,
// //       lineHeight: 22,
// //     },
// //     time: {
// //       color: theme.colors.foreground,
// //       fontSize: 11,
// //       marginTop: 4,
// //       textAlign: 'right',
// //     },
// //   });
// // }

// function stylesAssistantBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: 8,
//     },
//     bubble: {
//       maxWidth: '82%',
//       // backgroundColor: theme.colors.surface3,
//       // backgroundColor: 'rgba(144, 0, 255, 1)',
//       backgroundColor: 'rgba(43, 43, 43, 1)',
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderTopLeftRadius: 22,
//       borderBottomRightRadius: 22, // 👈 slightly flatter top-right
//       borderBottomLeftRadius: 6,
//       borderTopRightRadius: 22,
//       marginRight: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

////////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type Role = 'user' | 'assistant' | 'system';
// type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   /** 📤 Send message */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;
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
//     h('impactLight');

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
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);

//   /** ✅ Original button logic */
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

//   /** 📊 Render bubbles */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme)
//       : stylesAssistantBubble(theme);

//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View key={m.id} style={{transform: [{translateX}]}}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[bubble.row, {transform: [{scale: 0.98}]}]}>
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>
//           </Animatable.View>
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         <View style={stylesHeader(theme).header}>
//           <View style={stylesHeader(theme).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text style={globalStyles.header}>AI Stylist Chat</Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme).iconButton}
//               onPress={() => {
//                 h('selection');
//                 scrollToBottom();
//               }}>
//               <MaterialIcons
//                 name="refresh"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>

//         {/* 💬 Main Scrollable Content */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             {/* 📩 All Messages */}
//             <View style={{paddingHorizontal: 12, paddingBottom: 20}}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing Indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: 14,
//                   paddingVertical: 10,
//                   marginHorizontal: 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                   backgroundColor: theme.colors.surface3,
//                 }}>
//                 <TypingDots />
//                 <Text style={{color: theme.colors.foreground, fontSize: 13}}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}
//           </Animated.ScrollView>

//           {/* ✅ Original disabled CTA behavior */}
//           {/* <View
//             pointerEvents={canSendToOutfit ? 'auto' : 'none'}
//             style={{
//               justifyContent: 'center',
//               alignItems: 'center',
//               marginBottom: 12,
//               flexDirection: 'row',
//               marginLeft: 30,
//             }}>
//             <AppleTouchFeedback type="impactLight">
//               <TouchableOpacity
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {opacity: canSendToOutfit ? 1 : 0.4},
//                   {width: 240},
//                 ]}
//                 onPress={sendToOutfitSafe}
//                 disabled={!canSendToOutfit}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   Create Outfit From Prompt
//                 </Text>
//               </TouchableOpacity>
//             </AppleTouchFeedback>

//             <TooltipBubble
//               message="This button is only if you want to use this specific prompt to create your outfit."
//               position="top"
//             />
//           </View> */}

//           {/* 📥 Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//           />
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /** 🫧 Typing Dots */
// function TypingDots() {
//   const {theme} = useAppTheme();
//   const dot = {width: 6, height: 6, borderRadius: 3, marginHorizontal: 3};
//   return (
//     <View
//       style={{
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 8,
//       }}>
//       {[0, 150, 300].map(delay => (
//         <Animatable.View
//           key={delay}
//           delay={delay}
//           animation="pulse"
//           iterationCount="infinite"
//           easing="ease-in-out"
//           duration={900}
//           style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//         />
//       ))}
//     </View>
//   );
// }

// /** 👗 Create Outfit CTA (kept but unused) */
// export function CreateOutfitCTA({
//   visible,
//   onPress,
// }: {
//   visible: boolean;
//   onPress: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   if (!visible) return null;
//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       easing="ease-out-cubic"
//       useNativeDriver
//       style={{
//         justifyContent: 'center',
//         alignItems: 'center',
//         paddingVertical: 20,
//         transform: [{translateY: 10}],
//       }}>
//       <AppleTouchFeedback type="impactLight">
//         <TouchableOpacity
//           onPress={onPress}
//           style={[
//             globalStyles.buttonPrimary,
//             {
//               width: 240,
//               opacity: 1,
//               shadowColor: '#000',
//               shadowOpacity: 0.15,
//               shadowRadius: 8,
//               shadowOffset: {width: 0, height: 4},
//             },
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>
//             Create Outfit From Prompt
//           </Text>
//         </TouchableOpacity>
//       </AppleTouchFeedback>
//     </Animatable.View>
//   );
// }

// /** 📥 Animated Input Bar */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
// }: any) {
//   const {theme} = useAppTheme();

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: 10,
//         paddingBottom: 16,
//         backgroundColor: 'transparent',
//       }}>
//       <Animatable.View
//         animation="pulse"
//         iterationCount="infinite"
//         duration={5000}
//         easing="ease-in-out"
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 20,
//           paddingHorizontal: 8,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}>
//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           style={{
//             flex: 1,
//             height: 45,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: 12,
//             fontSize: 16,
//           }}
//           multiline
//           keyboardAppearance="dark"
//           onSubmitEditing={onSend}
//           returnKeyType="send"
//           blurOnSubmit={false}
//         />

//         {/* 🎙️ Mic */}
//         <Animatable.View
//           animation={isRecording ? 'pulse' : undefined}
//           iterationCount="infinite"
//           duration={1200}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <TouchableOpacity
//             onPressIn={onMicPressIn}
//             onPressOut={onMicPressOut}
//             hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//             <MaterialIcons
//               name={isRecording ? 'mic' : 'mic-none'}
//               size={24}
//               color={
//                 isRecording ? theme.colors.primary : theme.colors.foreground2
//               }
//             />
//           </TouchableOpacity>
//         </Animatable.View>

//         {/* 📤 Send */}
//         <Animatable.View
//           animation="fadeIn"
//           duration={400}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: !input.trim() || isTyping ? 0.9 : 1}],
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           <TouchableOpacity
//             onPress={onSend}
//             disabled={!input.trim() || isTyping}>
//             {isTyping ? (
//               <ActivityIndicator />
//             ) : (
//               <View
//                 style={{
//                   width: 34,
//                   height: 34,
//                   borderRadius: 17,
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   marginLeft: 6,
//                   backgroundColor: theme.colors.surface,
//                 }}>
//                 <MaterialIcons
//                   name="arrow-upward"
//                   size={24}
//                   color={theme.colors.foreground}
//                 />
//               </View>
//             )}
//           </TouchableOpacity>
//         </Animatable.View>
//       </Animatable.View>
//     </Animatable.View>
//   );
// }

// /** 🧠 API Call */
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

// /** 🎨 Styles */
// function stylesHeader(theme: any) {
//   return StyleSheet.create({
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 2,
//       paddingBottom: 8,
//       marginTop: -38,
//     },
//     headerLeft: {flexDirection: 'row', alignItems: 'center'},
//     presenceDot: {width: 8, height: 8, borderRadius: 4, marginRight: 8},
//     iconButton: {
//       padding: 8,
//       borderRadius: 10,
//       backgroundColor: theme.colors.surface,
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
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 16,
//       marginRight: 8,
//     },
//     text: {
//       color: theme.colors.buttonText1,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.buttonText1,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

// function stylesAssistantBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: 8,
//     },
//     bubble: {
//       maxWidth: '82%',
//       backgroundColor: theme.colors.surface3,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 20,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//       marginLeft: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

///////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Role = 'user' | 'assistant' | 'system';
// type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// // tiny helper so we can keep feedback minimal + consistent
// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);
//   const [showSuggestions, setShowSuggestions] = useState(false);
//   const [showCTA, setShowCTA] = useState(false);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   /** 📤 Send message */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;
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
//     h('impactLight');
//     setShowSuggestions(false); // hide suggestions permanently after first send

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
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);

//   /** 📊 Render bubbles with always-on animation + parallax */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme)
//       : stylesAssistantBubble(theme);

//     // 🎢 Parallax interpolation based on scroll
//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View
//         key={m.id}
//         style={{
//           transform: [{translateX}],
//         }}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[bubble.row, {transform: [{scale: 0.98}]}]}>
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>
//           </Animatable.View>
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         <View style={stylesHeader(theme).header}>
//           <View style={stylesHeader(theme).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text style={globalStyles.header}>AI Stylist Chat</Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme).iconButton}
//               onPress={() => {
//                 h('selection');
//                 scrollToBottom();
//               }}>
//               <MaterialIcons
//                 name="refresh"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>

//         {/* 💬 Main Scrollable Content */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             contentInsetAdjustmentBehavior="always"
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             {/* ✨ Suggestions (only before first message) */}
//             {showSuggestions && (
//               <AnimatedSuggestions
//                 suggestions={suggestions}
//                 onSelect={s => setInput(s)}
//               />
//             )}

//             {/* 📩 All Messages */}
//             <View style={{paddingHorizontal: 12, paddingBottom: 20}}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing Indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: 14,
//                   paddingVertical: 10,
//                   marginHorizontal: 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                   backgroundColor: theme.colors.surface3,
//                 }}>
//                 <TypingDots />
//                 <Text style={{color: theme.colors.foreground, fontSize: 13}}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}

//             {/* 👗 Create Outfit CTA (shown only if triggered) */}
//             <CreateOutfitCTA
//               visible={showCTA}
//               onPress={() => {
//                 h('impactMedium');
//                 navigate('Outfit', {
//                   seedPrompt:
//                     messages[messages.length - 1]?.text ?? 'Refine outfit',
//                   autogenerate: true,
//                   ts: Date.now(),
//                 });
//               }}
//             />
//           </Animated.ScrollView>

//           {/* 📥 Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//           />

//           {/* 🚀 Manual “Generate Outfit” trigger button */}
//           <View
//             style={{
//               justifyContent: 'center',
//               alignItems: 'center',
//               marginBottom: 10,
//             }}>
//             <AppleTouchFeedback type="impactLight">
//               <TouchableOpacity
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {width: 220, opacity: 0.9, marginTop: 4},
//                 ]}
//                 onPress={() => setShowCTA(true)}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   Generate Outfit
//                 </Text>
//               </TouchableOpacity>
//             </AppleTouchFeedback>
//           </View>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /** 🫧 Typing Dots */
// function TypingDots() {
//   const {theme} = useAppTheme();
//   const dot = {width: 6, height: 6, borderRadius: 3, marginHorizontal: 3};
//   return (
//     <View
//       style={{
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 8,
//       }}>
//       {[0, 150, 300].map(delay => (
//         <Animatable.View
//           key={delay}
//           delay={delay}
//           animation="pulse"
//           iterationCount="infinite"
//           easing="ease-in-out"
//           duration={900}
//           style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//         />
//       ))}
//     </View>
//   );
// }

// /** ✨ Animated Suggestions */
// export function AnimatedSuggestions({
//   suggestions,
//   onSelect,
// }: {
//   suggestions: string[];
//   onSelect: (text: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={700}
//       delay={150}
//       style={{
//         paddingHorizontal: 16,
//         marginBottom: 14,
//         flexDirection: 'row',
//         flexWrap: 'wrap',
//       }}>
//       {suggestions.map((s, i) => (
//         <Animatable.View
//           key={s}
//           animation="zoomIn"
//           delay={i * 140}
//           duration={700}
//           easing="ease-out-back"
//           useNativeDriver
//           style={{
//             backgroundColor: theme.colors.background,
//             borderColor: theme.colors.buttonText1,
//             borderWidth: theme.borderWidth.md,
//             borderRadius: 20,
//             paddingVertical: 12,
//             paddingHorizontal: 14,
//             marginRight: 8,
//             marginBottom: 8,
//             shadowColor: '#000',
//             shadowOpacity: 0.15,
//             shadowOffset: {width: 0, height: 3},
//             shadowRadius: 5,
//             transform: [{scale: 0.95}],
//           }}>
//           <TouchableOpacity onPress={() => onSelect(s)}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '600',
//                 fontSize: 14,
//               }}>
//               {s}
//             </Text>
//           </TouchableOpacity>
//         </Animatable.View>
//       ))}
//     </Animatable.View>
//   );
// }

// /** 👗 Create Outfit CTA */
// export function CreateOutfitCTA({
//   visible,
//   onPress,
// }: {
//   visible: boolean;
//   onPress: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   if (!visible) return null;
//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       easing="ease-out-cubic"
//       useNativeDriver
//       style={{
//         justifyContent: 'center',
//         alignItems: 'center',
//         paddingVertical: 20,
//         transform: [{translateY: 10}],
//       }}>
//       <AppleTouchFeedback type="impactLight">
//         <TouchableOpacity
//           onPress={onPress}
//           style={[
//             globalStyles.buttonPrimary,
//             {
//               width: 240,
//               opacity: 1,
//               shadowColor: '#000',
//               shadowOpacity: 0.15,
//               shadowRadius: 8,
//               shadowOffset: {width: 0, height: 4},
//             },
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>
//             Create Outfit From Prompt
//           </Text>
//         </TouchableOpacity>
//       </AppleTouchFeedback>
//     </Animatable.View>
//   );
// }

// /** 📥 Animated Input Bar */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
// }: any) {
//   const {theme} = useAppTheme();

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: 10,
//         paddingBottom: 16,
//         backgroundColor: 'transparent',
//       }}>
//       <Animatable.View
//         animation="pulse"
//         iterationCount="infinite"
//         duration={5000}
//         easing="ease-in-out"
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 20,
//           paddingHorizontal: 8,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}>
//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           style={{
//             flex: 1,
//             height: 45,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: 12,
//             fontSize: 16,
//           }}
//           multiline
//           keyboardAppearance="dark"
//           onSubmitEditing={onSend}
//           returnKeyType="send"
//           blurOnSubmit={false}
//         />

//         {/* 🎙️ Mic */}
//         <Animatable.View
//           animation={isRecording ? 'pulse' : undefined}
//           iterationCount="infinite"
//           duration={1200}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <TouchableOpacity
//             onPressIn={onMicPressIn}
//             onPressOut={onMicPressOut}
//             hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//             <MaterialIcons
//               name={isRecording ? 'mic' : 'mic-none'}
//               size={24}
//               color={
//                 isRecording ? theme.colors.primary : theme.colors.foreground2
//               }
//             />
//           </TouchableOpacity>
//         </Animatable.View>

//         {/* 📤 Send */}
//         <Animatable.View
//           animation="fadeIn"
//           duration={400}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: !input.trim() || isTyping ? 0.9 : 1}],
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           <TouchableOpacity
//             onPress={onSend}
//             disabled={!input.trim() || isTyping}>
//             {isTyping ? (
//               <ActivityIndicator />
//             ) : (
//               <MaterialIcons
//                 name="arrow-upward"
//                 size={24}
//                 color={theme.colors.foreground}
//               />
//             )}
//           </TouchableOpacity>
//         </Animatable.View>
//       </Animatable.View>
//     </Animatable.View>
//   );
// }

// /** 🧠 API Call */
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

// /** 🎨 Styles */
// function stylesHeader(theme: any) {
//   return StyleSheet.create({
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 2,
//       paddingBottom: 8,
//       marginTop: -45,
//     },
//     headerLeft: {flexDirection: 'row', alignItems: 'center'},
//     presenceDot: {width: 8, height: 8, borderRadius: 4, marginRight: 8},
//     iconButton: {
//       padding: 8,
//       borderRadius: 10,
//       backgroundColor: theme.colors.surface,
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
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 16,
//       marginRight: 8,
//     },
//     text: {
//       color: theme.colors.buttonText1,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.buttonText1,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

// function stylesAssistantBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: 8,
//     },
//     bubble: {
//       maxWidth: '82%',
//       backgroundColor: theme.colors.surface3,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 20,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//       marginLeft: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

/////////////

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
//   ActivityIndicator,
//   PermissionsAndroid,
//   Keyboard,
//   TouchableWithoutFeedback,
//   Animated,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import dayjs from 'dayjs';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Role = 'user' | 'assistant' | 'system';
// type Message = {id: string; role: Role; text: string; createdAt: number};
// type Props = {navigate: (screen: string, params?: any) => void};

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// // tiny helper so we can keep feedback minimal + consistent
// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();

//   /** 🌐 State */
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
//   const [isHolding, setIsHolding] = useState(false);
//   const [showSuggestions, setShowSuggestions] = useState(false);
//   const [showCTA, setShowCTA] = useState(false);

//   const scrollRef = useRef<ScrollView | null>(null);
//   const inputRef = useRef<TextInput | null>(null);
//   const scrollY = useRef(new Animated.Value(0)).current;

//   /** 🎙️ Voice */
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   useEffect(() => {
//     if (typeof speech === 'string') setInput(speech);
//   }, [speech]);

//   /** 📜 Scroll-to-bottom helper */
//   const scrollToBottom = useCallback(() => {
//     requestAnimationFrame(() =>
//       scrollRef.current?.scrollToEnd({animated: true}),
//     );
//   }, []);
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     const s1 = Keyboard.addListener('keyboardWillShow', scrollToBottom);
//     const s2 = Keyboard.addListener('keyboardDidShow', scrollToBottom);
//     return () => {
//       s1.remove();
//       s2.remove();
//     };
//   }, [scrollToBottom]);

//   /** 🎙️ Mic logic */
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
//     }
//     return true;
//   }
//   const handleMicPressIn = useCallback(async () => {
//     if (!(await prepareAudio())) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);
//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   }, [stopListening]);

//   /** 📤 Send message */
//   const send = useCallback(async () => {
//     const trimmed = input.trim();
//     if (!trimmed || isTyping) return;
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
//     h('impactLight');
//     setShowSuggestions(false); // hide suggestions permanently after first send

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
//       h('selection');
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
//       h('notificationError');
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages]);

//   /** 📊 Render bubbles with always-on animation + parallax */
//   const renderMessage = (m: Message, idx: number) => {
//     const isUser = m.role === 'user';
//     const bubble = isUser
//       ? stylesUserBubble(theme)
//       : stylesAssistantBubble(theme);

//     // 🎢 Parallax interpolation based on scroll
//     const translateX = scrollY.interpolate({
//       inputRange: [0, 400],
//       outputRange: [0, isUser ? -6 : 6],
//       extrapolate: 'clamp',
//     });

//     return (
//       <Animated.View
//         key={m.id}
//         style={{
//           transform: [{translateX}],
//         }}>
//         <Animatable.View
//           animation={isUser ? 'fadeInRight' : 'fadeInLeft'}
//           duration={420}
//           delay={idx * 90}
//           easing="ease-out-cubic"
//           style={[bubble.row, {transform: [{scale: 0.98}]}]}>
//           <Animatable.View
//             animation="zoomIn"
//             delay={idx * 90 + 80}
//             duration={420}
//             easing="ease-out-cubic"
//             style={bubble.bubble}>
//             <Text style={bubble.text}>{m.text}</Text>
//             <Text style={bubble.time}>
//               {dayjs(m.createdAt).format('h:mm A')}
//             </Text>
//           </Animatable.View>
//         </Animatable.View>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[globalStyles.screen]}
//       edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 40 : 0}>
//         {/* 🧠 Header */}
//         <View style={stylesHeader(theme).header}>
//           <View style={stylesHeader(theme).headerLeft}>
//             <View
//               style={[
//                 stylesHeader(theme).presenceDot,
//                 {backgroundColor: theme.colors.success},
//               ]}
//             />
//             <Text style={globalStyles.header}>AI Stylist Chat</Text>
//           </View>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={stylesHeader(theme).iconButton}
//               onPress={() => {
//                 h('selection');
//                 scrollToBottom();
//               }}>
//               <MaterialIcons
//                 name="refresh"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </AppleTouchFeedback>
//         </View>

//         {/* 💬 Main Scrollable Content */}
//         <View style={{flex: 1}}>
//           <Animated.ScrollView
//             ref={scrollRef}
//             onScroll={Animated.event(
//               [{nativeEvent: {contentOffset: {y: scrollY}}}],
//               {useNativeDriver: true},
//             )}
//             scrollEventThrottle={16}
//             contentContainerStyle={{paddingBottom: 100}}
//             contentInsetAdjustmentBehavior="always"
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled"
//             keyboardDismissMode={
//               Platform.OS === 'ios' ? 'interactive' : 'on-drag'
//             }>
//             {/* ✨ Suggestions (only before first message) */}
//             {showSuggestions && (
//               <AnimatedSuggestions
//                 suggestions={suggestions}
//                 onSelect={s => setInput(s)}
//               />
//             )}

//             {/* 📩 All Messages */}
//             <View style={{paddingHorizontal: 12, paddingBottom: 20}}>
//               {messages.map((m, i) => renderMessage(m, i))}
//             </View>

//             {/* 🫧 Typing Indicator */}
//             {isTyping && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   paddingHorizontal: 14,
//                   paddingVertical: 10,
//                   marginHorizontal: 12,
//                   marginBottom: 8,
//                   borderRadius: 14,
//                   backgroundColor: theme.colors.surface3,
//                 }}>
//                 <TypingDots />
//                 <Text style={{color: theme.colors.foreground, fontSize: 13}}>
//                   Stylist is thinking…
//                 </Text>
//               </Animatable.View>
//             )}

//             {/* 👗 Create Outfit CTA (shown only if triggered) */}
//             <CreateOutfitCTA
//               visible={showCTA}
//               onPress={() => {
//                 h('impactMedium');
//                 navigate('Outfit', {
//                   seedPrompt:
//                     messages[messages.length - 1]?.text ?? 'Refine outfit',
//                   autogenerate: true,
//                   ts: Date.now(),
//                 });
//               }}
//             />
//           </Animated.ScrollView>

//           {/* 📥 Animated Input Bar */}
//           <AnimatedInputBar
//             input={input}
//             setInput={setInput}
//             onSend={send}
//             isTyping={isTyping}
//             inputRef={inputRef}
//             onMicPressIn={handleMicPressIn}
//             onMicPressOut={handleMicPressOut}
//             isRecording={isRecording}
//           />

//           {/* 🚀 Manual “Generate Outfit” trigger button */}
//           <View
//             style={{
//               justifyContent: 'center',
//               alignItems: 'center',
//               marginBottom: 10,
//             }}>
//             <AppleTouchFeedback type="impactLight">
//               <TouchableOpacity
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {width: 220, opacity: 0.9, marginTop: 4},
//                 ]}
//                 onPress={() => setShowCTA(true)}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   Generate Outfit
//                 </Text>
//               </TouchableOpacity>
//             </AppleTouchFeedback>
//           </View>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /** 🫧 Typing Dots */
// function TypingDots() {
//   const {theme} = useAppTheme();
//   const dot = {width: 6, height: 6, borderRadius: 3, marginHorizontal: 3};
//   return (
//     <View
//       style={{
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 8,
//       }}>
//       {[0, 150, 300].map(delay => (
//         <Animatable.View
//           key={delay}
//           delay={delay}
//           animation="pulse"
//           iterationCount="infinite"
//           easing="ease-in-out"
//           duration={900}
//           style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//         />
//       ))}
//     </View>
//   );
// }

// /** ✨ Animated Suggestions */
// export function AnimatedSuggestions({
//   suggestions,
//   onSelect,
// }: {
//   suggestions: string[];
//   onSelect: (text: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={700}
//       delay={150}
//       style={{
//         paddingHorizontal: 16,
//         marginBottom: 14,
//         flexDirection: 'row',
//         flexWrap: 'wrap',
//       }}>
//       {suggestions.map((s, i) => (
//         <Animatable.View
//           key={s}
//           animation="zoomIn"
//           delay={i * 140}
//           duration={700}
//           easing="ease-out-back"
//           useNativeDriver
//           style={{
//             backgroundColor: theme.colors.background,
//             borderColor: theme.colors.buttonText1,
//             borderWidth: theme.borderWidth.md,
//             borderRadius: 20,
//             paddingVertical: 12,
//             paddingHorizontal: 14,
//             marginRight: 8,
//             marginBottom: 8,
//             shadowColor: '#000',
//             shadowOpacity: 0.15,
//             shadowOffset: {width: 0, height: 3},
//             shadowRadius: 5,
//             transform: [{scale: 0.95}],
//           }}>
//           <TouchableOpacity onPress={() => onSelect(s)}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '600',
//                 fontSize: 14,
//               }}>
//               {s}
//             </Text>
//           </TouchableOpacity>
//         </Animatable.View>
//       ))}
//     </Animatable.View>
//   );
// }

// /** 👗 Create Outfit CTA */
// export function CreateOutfitCTA({
//   visible,
//   onPress,
// }: {
//   visible: boolean;
//   onPress: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   if (!visible) return null;
//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       easing="ease-out-cubic"
//       useNativeDriver
//       style={{
//         justifyContent: 'center',
//         alignItems: 'center',
//         paddingVertical: 20,
//         transform: [{translateY: 10}],
//       }}>
//       <AppleTouchFeedback type="impactLight">
//         <TouchableOpacity
//           onPress={onPress}
//           style={[
//             globalStyles.buttonPrimary,
//             {
//               width: 240,
//               opacity: 1,
//               shadowColor: '#000',
//               shadowOpacity: 0.15,
//               shadowRadius: 8,
//               shadowOffset: {width: 0, height: 4},
//             },
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>
//             Create Outfit From Prompt
//           </Text>
//         </TouchableOpacity>
//       </AppleTouchFeedback>
//     </Animatable.View>
//   );
// }

// /** 📥 Animated Input Bar */
// export function AnimatedInputBar({
//   input,
//   setInput,
//   onSend,
//   isTyping,
//   inputRef,
//   onMicPressIn,
//   onMicPressOut,
//   isRecording,
// }: any) {
//   const {theme} = useAppTheme();

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={600}
//       delay={200}
//       style={{
//         paddingHorizontal: 10,
//         paddingBottom: 16,
//         backgroundColor: 'transparent',
//       }}>
//       <Animatable.View
//         animation="pulse"
//         iterationCount="infinite"
//         duration={5000}
//         easing="ease-in-out"
//         style={{
//           flexDirection: 'row',
//           alignItems: 'flex-end',
//           borderWidth: tokens.borderWidth.xl,
//           borderColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface3,
//           borderRadius: 20,
//           paddingHorizontal: 8,
//           shadowColor: '#000',
//           shadowOpacity: 0.08,
//           shadowRadius: 5,
//           shadowOffset: {width: 0, height: 2},
//         }}>
//         <TextInput
//           ref={inputRef}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Ask for a look… event, vibe, weather"
//           placeholderTextColor={'#9c9c9cff'}
//           style={{
//             flex: 1,
//             height: 45,
//             color: theme.colors.foreground,
//             paddingHorizontal: 8,
//             paddingTop: 12,
//             fontSize: 16,
//           }}
//           multiline
//           keyboardAppearance="dark"
//           onSubmitEditing={onSend}
//           returnKeyType="send"
//           blurOnSubmit={false}
//         />

//         {/* 🎙️ Mic */}
//         <Animatable.View
//           animation={isRecording ? 'pulse' : undefined}
//           iterationCount="infinite"
//           duration={1200}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: isRecording ? 1.15 : 1}],
//           }}>
//           <TouchableOpacity
//             onPressIn={onMicPressIn}
//             onPressOut={onMicPressOut}
//             hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//             <MaterialIcons
//               name={isRecording ? 'mic' : 'mic-none'}
//               size={24}
//               color={
//                 isRecording ? theme.colors.primary : theme.colors.foreground2
//               }
//             />
//           </TouchableOpacity>
//         </Animatable.View>

//         {/* 📤 Send */}
//         <Animatable.View
//           animation="fadeIn"
//           duration={400}
//           style={{
//             width: 38,
//             height: 42,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{scale: !input.trim() || isTyping ? 0.9 : 1}],
//             opacity: !input.trim() || isTyping ? 0.4 : 1,
//           }}>
//           <TouchableOpacity
//             onPress={onSend}
//             disabled={!input.trim() || isTyping}>
//             {isTyping ? (
//               <ActivityIndicator />
//             ) : (
//               <MaterialIcons
//                 name="arrow-upward"
//                 size={24}
//                 color={theme.colors.foreground}
//               />
//             )}
//           </TouchableOpacity>
//         </Animatable.View>
//       </Animatable.View>
//     </Animatable.View>
//   );
// }

// /** 🧠 API Call */
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

// /** 🎨 Styles */
// function stylesHeader(theme: any) {
//   return StyleSheet.create({
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 2,
//       paddingBottom: 8,
//       marginTop: -38,
//     },
//     headerLeft: {flexDirection: 'row', alignItems: 'center'},
//     presenceDot: {width: 8, height: 8, borderRadius: 4, marginRight: 8},
//     iconButton: {
//       padding: 8,
//       borderRadius: 10,
//       backgroundColor: theme.colors.surface,
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
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 16,
//       marginRight: 8,
//     },
//     text: {
//       color: theme.colors.buttonText1,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.buttonText1,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

// function stylesAssistantBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: 8,
//     },
//     bubble: {
//       maxWidth: '82%',
//       backgroundColor: theme.colors.surface3,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 20,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//       marginLeft: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

//////////////////////

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
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Role = 'user' | 'assistant' | 'system';

// type Message = {
//   id: string;
//   role: Role;
//   text: string;
//   createdAt: number;
// };

// type Props = {navigate: (screen: string, params?: any) => void};

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// // tiny helper so we can keep feedback minimal + consistent
// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();

//   /** Styles */
//   function makeStyles() {
//     const {theme} = useAppTheme();

//     return StyleSheet.create({
//       safeArea: {
//         backgroundColor: theme.colors.surface,
//         flex: 1,
//       },
//       header: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         paddingHorizontal: 16,
//         paddingTop: 2,
//         paddingBottom: 8,
//         color: theme.colors.foreground,
//         marginTop: -38,
//       },
//       ctaPill: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 12,
//         height: 34,
//         borderRadius: 20,
//         backgroundColor: theme.colors.button1,
//         marginLeft: 6,
//         maxWidth: 280,
//         marginTop: 8,
//       },
//       ctaText: {
//         color: theme.colors.foreground,
//         fontSize: 13,
//         fontWeight: '700',
//       },
//       headerLeft: {flexDirection: 'row', alignItems: 'center'},
//       presenceDot: {
//         width: 8,
//         height: 8,
//         borderRadius: 4,
//       },
//       headerRight: {flexDirection: 'row', alignItems: 'center', gap: 4},
//       iconButton: {
//         padding: 8,
//         borderRadius: 10,
//         backgroundColor: theme.colors.surface,
//       },
//       messagesWrap: {
//         flex: 1,
//         minHeight: 120,
//       },
//       listContent: {
//         paddingHorizontal: 12,
//         paddingBottom: 6,
//         gap: 10,
//       },
//       typingContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 14,
//         paddingVertical: 10,
//         marginHorizontal: 12,
//         marginBottom: 8,
//         borderRadius: 14,
//         backgroundColor: theme.colors.surface3,
//         borderWidth: tokens.borderWidth.hairline,
//         borderColor: theme.colors.surfaceBorder,
//         gap: 8,
//       },
//       typingText: {color: theme.colors.foreground, fontSize: 13},
//       inputBarWrap: {
//         paddingHorizontal: 10,
//         paddingBottom: Platform.OS === 'ios' ? 8 : 10,
//         paddingTop: 18,
//         marginBottom: 4,
//       },
//       inputBar: {
//         flexDirection: 'row',
//         alignItems: 'flex-end',
//         borderWidth: tokens.borderWidth.xl,
//         borderColor: theme.colors.surfaceBorder,
//         backgroundColor: theme.colors.surface3,
//         borderRadius: 20,
//         paddingHorizontal: 8,
//       },
//       input: {
//         flex: 1,
//         height: 45,
//         color: theme.colors.foreground,
//         paddingHorizontal: 8,
//         paddingTop: 12,
//         fontSize: 16,
//       },
//       leftIcon: {
//         width: 30,
//         height: 36,
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginRight: 4,
//       },
//       rightIcon: {
//         width: 30,
//         height: 42,
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginLeft: 4,
//       },

//       sendButton: {
//         width: 34,
//         height: 34,
//         borderRadius: 17,
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginLeft: 6,
//         backgroundColor: theme.colors.surface,
//         marginBottom: 5,
//       },
//     });
//   }

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

//   // feed speech into input
//   useEffect(() => {
//     if (typeof speech === 'string') {
//       setInput(speech);
//     }
//   }, [speech]);

//   // ✅ mic press handlers (with light haptic on start/stop)
//   const handleMicPressIn = useCallback(async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);

//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
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
//     h('impactLight'); // confirm send

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
//       h('selection'); // subtle feedback when reply lands

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
//       h('notificationError'); // gentle error cue
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages, suggestions]);

//   // ──────────────────────────────────────────────────────────────
//   // Hand-off to Outfit screen (after AI has replied)
//   // ──────────────────────────────────────────────────────────────
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     // lightweight handoff via nav params or an existing mailbox util
//     // navigate directly with prompt
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

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
//           <Text style={globalStyles.header}>AI Stylist Chat</Text>
//         </View>
//         <View style={themed.headerRight}>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={themed.iconButton}
//               onPress={() => {
//                 h('selection');
//                 scrollToBottom();
//               }}>
//               <MaterialIcons
//                 name="refresh"
//                 size={22}
//                 color={theme.colors.foreground}
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
//           contentContainerStyle={{paddingBottom: 100}}
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

//         {/* Send to Outfit */}
//         <View
//           pointerEvents={canSendToOutfit ? 'auto' : 'none'}
//           style={{
//             justifyContent: 'center',
//             alignItems: 'center',
//           }}>
//           <AppleTouchFeedback type="impactLight">
//             <TouchableOpacity
//               style={[
//                 globalStyles.buttonPrimary,
//                 {opacity: canSendToOutfit ? 1 : 0.4},
//                 {width: 240, marginTop: 12},
//               ]}
//               onPress={sendToOutfitSafe}
//               disabled={!canSendToOutfit}
//               accessibilityLabel="Create an outfit from this prompt"
//               accessibilityHint="Opens Style Me and builds an outfit from the AI’s latest response">
//               <Text style={globalStyles.buttonPrimaryText}>
//                 Create Outfit From Prompt
//               </Text>
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
//                   <MaterialIcons
//                     name="arrow-upward"
//                     size={22}
//                     color={theme.colors.foreground}
//                   />
//                 )}
//               </TouchableOpacity>
//             </AppleTouchFeedback>
//           </View>
//         </View>
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
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
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
//         style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//       />
//       <Animatable.View
//         delay={150}
//         animation="pulse"
//         iterationCount="infinite"
//         easing="ease-in-out"
//         duration={900}
//         style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//       />
//       <Animatable.View
//         delay={300}
//         animation="pulse"
//         iterationCount="infinite"
//         easing="ease-in-out"
//         duration={900}
//         style={[dot, {backgroundColor: theme.colors.buttonText1}]}
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
//   if (arr.length < 2) return arr;
//   const [head, ...rest] = arr;
//   return [...rest, head];
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
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 16,
//       marginRight: 8,
//     },
//     text: {
//       color: theme.colors.buttonText1,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.buttonText1,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//     avatarWrap: {width: 30, height: 30},
//     userInitials: {
//       width: 30,
//       height: 30,
//       borderRadius: 15,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     userInitialsText: {fontSize: 10, color: theme.colors.foreground},
//   });
// }

// function stylesAssistantBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: 8,
//     },
//     avatarWrap: {width: 30, height: 30},
//     avatar: {
//       width: 30,
//       height: 30,
//       borderRadius: 15,
//       backgroundColor: theme.colors.surface,
//     },
//     bubble: {
//       maxWidth: '82%',
//       backgroundColor: theme.colors.surface3,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 20,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//       marginLeft: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

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
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../config/api';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Role = 'user' | 'assistant' | 'system';

// type Message = {
//   id: string;
//   role: Role;
//   text: string;
//   createdAt: number;
// };

// type Props = {navigate: (screen: string, params?: any) => void};

// const SUGGESTIONS_DEFAULT = [
//   'Build a smart-casual look for 75°F',
//   'What should I wear to a gallery opening?',
//   'Make 3 outfit ideas from my polos + loafers',
//   'Refine that last look for “business creative”',
// ];

// // tiny helper so we can keep feedback minimal + consistent
// const h = (
//   type: 'selection' | 'impactLight' | 'impactMedium' | 'notificationError',
// ) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function AiStylistChatScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();

//   /** Styles */
//   function makeStyles() {
//     const {theme} = useAppTheme();

//     return StyleSheet.create({
//       safeArea: {
//         backgroundColor: theme.colors.surface,
//         flex: 1,
//       },
//       header: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         paddingHorizontal: 16,
//         paddingTop: 2,
//         paddingBottom: 8,
//         color: theme.colors.foreground,
//         marginTop: -38,
//       },
//       ctaPill: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 12,
//         height: 34,
//         borderRadius: 20,
//         backgroundColor: theme.colors.button1,
//         marginLeft: 6,
//         maxWidth: 280,
//         marginTop: 8,
//       },
//       ctaText: {
//         color: theme.colors.foreground,
//         fontSize: 13,
//         fontWeight: '700',
//       },
//       headerLeft: {flexDirection: 'row', alignItems: 'center'},
//       presenceDot: {
//         width: 8,
//         height: 8,
//         borderRadius: 4,
//       },
//       headerRight: {flexDirection: 'row', alignItems: 'center', gap: 4},
//       iconButton: {
//         padding: 8,
//         borderRadius: 10,
//         backgroundColor: theme.colors.surface,
//       },
//       messagesWrap: {
//         flex: 1,
//         minHeight: 120,
//       },
//       listContent: {
//         paddingHorizontal: 12,
//         paddingBottom: 6,
//         gap: 10,
//       },
//       typingContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 14,
//         paddingVertical: 10,
//         marginHorizontal: 12,
//         marginBottom: 8,
//         borderRadius: 14,
//         backgroundColor: theme.colors.surface3,
//         borderWidth: tokens.borderWidth.hairline,
//         borderColor: theme.colors.surfaceBorder,
//         gap: 8,
//       },
//       typingText: {color: theme.colors.foreground, fontSize: 13},
//       inputBarWrap: {
//         paddingHorizontal: 10,
//         paddingBottom: Platform.OS === 'ios' ? 8 : 10,
//         paddingTop: 18,
//         marginBottom: 4,
//       },
//       inputBar: {
//         flexDirection: 'row',
//         alignItems: 'flex-end',
//         borderWidth: tokens.borderWidth.xl,
//         borderColor: theme.colors.surfaceBorder,
//         backgroundColor: theme.colors.surface3,
//         borderRadius: 20,
//         paddingHorizontal: 8,
//       },
//       input: {
//         flex: 1,
//         height: 45,
//         color: theme.colors.foreground,
//         paddingHorizontal: 8,
//         paddingTop: 12,
//         fontSize: 16,
//       },
//       leftIcon: {
//         width: 30,
//         height: 36,
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginRight: 4,
//       },
//       rightIcon: {
//         width: 30,
//         height: 42,
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginLeft: 4,
//       },

//       sendButton: {
//         width: 34,
//         height: 34,
//         borderRadius: 17,
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginLeft: 6,
//         backgroundColor: theme.colors.surface,
//         marginBottom: 5,
//       },
//     });
//   }

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

//   // feed speech into input
//   useEffect(() => {
//     if (typeof speech === 'string') {
//       setInput(speech);
//     }
//   }, [speech]);

//   // ✅ mic press handlers (with light haptic on start/stop)
//   const handleMicPressIn = useCallback(async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     setIsHolding(true);
//     h('impactLight');
//     startListening();
//   }, [startListening]);

//   const handleMicPressOut = useCallback(() => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
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
//     h('impactLight'); // confirm send

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
//       h('selection'); // subtle feedback when reply lands

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
//       h('notificationError'); // gentle error cue
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, messages, suggestions]);

//   // ──────────────────────────────────────────────────────────────
//   // Hand-off to Outfit screen (after AI has replied)
//   // ──────────────────────────────────────────────────────────────
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
//         lastAssistantAfterUser = m;
//       }
//     }
//     return lastAssistantAfterUser?.text.trim() ?? '';
//   }, [messages]);

//   const sendToOutfitSafe = useCallback(() => {
//     if (!canSendToOutfit) return;
//     if (!assistantPrompt) return;
//     h('impactMedium');
//     const payload = {
//       seedPrompt: assistantPrompt,
//       autogenerate: true,
//       ts: Date.now(),
//     };
//     // lightweight handoff via nav params or an existing mailbox util
//     // navigate directly with prompt
//     navigate('Outfit', payload);
//   }, [assistantPrompt, canSendToOutfit, navigate]);

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
//           <Text style={globalStyles.header}>AI Stylist Chat</Text>
//         </View>
//         <View style={themed.headerRight}>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={themed.iconButton}
//               onPress={() => {
//                 h('selection');
//                 scrollToBottom();
//               }}>
//               <MaterialIcons
//                 name="refresh"
//                 size={22}
//                 color={theme.colors.foreground}
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
//           contentContainerStyle={{paddingBottom: 100}}
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

//         {/* Send to Outfit */}
//         <View
//           pointerEvents={canSendToOutfit ? 'auto' : 'none'}
//           style={{
//             justifyContent: 'center',
//             alignItems: 'center',
//           }}>
//           <AppleTouchFeedback type="impactLight">
//             <TouchableOpacity
//               style={[
//                 globalStyles.buttonPrimary,
//                 {opacity: canSendToOutfit ? 1 : 0.4},
//                 {width: 240, marginTop: 12},
//               ]}
//               onPress={sendToOutfitSafe}
//               disabled={!canSendToOutfit}
//               accessibilityLabel="Create an outfit from this prompt"
//               accessibilityHint="Opens Style Me and builds an outfit from the AI’s latest response">
//               <Text style={globalStyles.buttonPrimaryText}>
//                 Create Outfit From Prompt
//               </Text>
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
//                   <MaterialIcons
//                     name="arrow-upward"
//                     size={22}
//                     color={theme.colors.foreground}
//                   />
//                 )}
//               </TouchableOpacity>
//             </AppleTouchFeedback>
//           </View>
//         </View>
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
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
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
//         style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//       />
//       <Animatable.View
//         delay={150}
//         animation="pulse"
//         iterationCount="infinite"
//         easing="ease-in-out"
//         duration={900}
//         style={[dot, {backgroundColor: theme.colors.buttonText1}]}
//       />
//       <Animatable.View
//         delay={300}
//         animation="pulse"
//         iterationCount="infinite"
//         easing="ease-in-out"
//         duration={900}
//         style={[dot, {backgroundColor: theme.colors.buttonText1}]}
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
//   if (arr.length < 2) return arr;
//   const [head, ...rest] = arr;
//   return [...rest, head];
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
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 16,
//       marginRight: 8,
//     },
//     text: {
//       color: theme.colors.buttonText1,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.buttonText1,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//     avatarWrap: {width: 30, height: 30},
//     userInitials: {
//       width: 30,
//       height: 30,
//       borderRadius: 15,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     userInitialsText: {fontSize: 10, color: theme.colors.foreground},
//   });
// }

// function stylesAssistantBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: 8,
//     },
//     avatarWrap: {width: 30, height: 30},
//     avatar: {
//       width: 30,
//       height: 30,
//       borderRadius: 15,
//       backgroundColor: theme.colors.surface,
//     },
//     bubble: {
//       maxWidth: '82%',
//       backgroundColor: theme.colors.surface3,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 20,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//       marginLeft: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.foreground,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//   });
// }

/////////////////////////

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
// import {tokens} from '../styles/tokens/tokens';
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

//   /** Styles */
//   function makeStyles() {
//     const {theme} = useAppTheme();

//     return StyleSheet.create({
//       safeArea: {
//         backgroundColor: theme.colors.surface,
//         flex: 1,
//       },
//       header: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         paddingHorizontal: 16,
//         paddingTop: 2,
//         paddingBottom: 8,
//         color: theme.colors.foreground,
//         marginTop: -38,
//       },
//       ctaPill: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 12,
//         height: 34,
//         borderRadius: 10,
//         backgroundColor: theme.colors.button1,
//         marginLeft: 6,
//         maxWidth: 280,
//         marginTop: 8,
//       },
//       ctaText: {
//         color: theme.colors.foreground,
//         fontSize: 13,
//         fontWeight: '700',
//       },
//       headerLeft: {flexDirection: 'row', alignItems: 'center'},
//       presenceDot: {
//         width: 8,
//         height: 8,
//         borderRadius: 4,
//       },
//       headerRight: {flexDirection: 'row', alignItems: 'center', gap: 4},
//       iconButton: {
//         padding: 8,
//         borderRadius: 10,
//         backgroundColor: theme.colors.surface,
//       },
//       messagesWrap: {
//         flex: 1,
//         minHeight: 120,
//       },
//       listContent: {
//         paddingHorizontal: 12,
//         paddingBottom: 6,
//         gap: 10,
//       },
//       typingContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 14,
//         paddingVertical: 10,
//         marginHorizontal: 12,
//         marginBottom: 8,
//         borderRadius: 14,
//         backgroundColor: 'rgb(48, 48, 48)',
//         borderWidth: tokens.borderWidth.hairline,
//         borderColor: theme.colors.surfaceBorder,
//         gap: 8,
//       },
//       typingText: {color: theme.colors.surface, fontSize: 13},
//       suggestionRow: {
//         paddingVertical: 6,
//       },
//       suggestionContent: {paddingHorizontal: 12, columnGap: 8},
//       suggestionChip: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 15,
//         paddingVertical: 15,
//         borderRadius: 14,
//         backgroundColor: theme.colors.surface,
//         color: theme.colors.foreground,
//         borderWidth: tokens.borderWidth.hairline,
//         borderColor: 'rgb(48, 48, 48)',
//         maxWidth: 260,
//         gap: 6,
//         marginRight: 8,
//       },
//       suggestionText: {
//         color: theme.colors.foreground,
//         fontSize: 14,
//         fontWeight: '600',
//       },
//       inputBarWrap: {
//         paddingHorizontal: 10,
//         paddingBottom: Platform.OS === 'ios' ? 8 : 10,
//         paddingTop: 18,
//         marginBottom: 4,
//       },
//       inputBar: {
//         flexDirection: 'row',
//         alignItems: 'flex-end',
//         borderWidth: tokens.borderWidth.hairline,
//         borderColor: theme.colors.surfaceBorder,
//         backgroundColor: theme.colors.surface3,
//         borderRadius: 20,
//         paddingHorizontal: 8,
//       },
//       leftIcon: {
//         width: 30,
//         height: 36,
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginRight: 4,
//       },
//       rightIcon: {
//         width: 30,
//         height: 38,
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginLeft: 4,
//       },
//       input: {
//         flex: 1,
//         height: 40,
//         color: theme.colors.foreground,
//         paddingHorizontal: 8,
//         paddingTop: 10,
//         // paddingBottom: 6,
//         fontSize: 16,
//       },
//       sendButton: {
//         width: 34,
//         height: 34,
//         borderRadius: 17,
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginLeft: 6,
//         backgroundColor: theme.colors.surface,
//         marginBottom: 3,
//       },
//     });
//   }

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
//           <Text style={globalStyles.header}>AI Stylist Chat</Text>
//         </View>
//         <View style={themed.headerRight}>
//           <AppleTouchFeedback type="light">
//             <TouchableOpacity
//               style={themed.iconButton}
//               onPress={scrollToBottom}>
//               <MaterialIcons
//                 name="refresh"
//                 size={22}
//                 color={theme.colors.foreground}
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

//         {/* Send to Outfit */}
//         <View
//           pointerEvents={canSendToOutfit ? 'auto' : 'none'}
//           style={{
//             justifyContent: 'center',
//             alignItems: 'center',
//             // borderTopWidth: theme.borderWidth.hairline,
//             // borderTopColor: theme.colors.surfaceBorder,
//           }}>
//           <AppleTouchFeedback type="impactLight">
//             <TouchableOpacity
//               style={[
//                 globalStyles.buttonPrimary,
//                 {opacity: canSendToOutfit ? 1 : 0.4},
//                 {width: 240, marginTop: 12},
//               ]}
//               onPress={sendToOutfitSafe}
//               disabled={!canSendToOutfit}
//               accessibilityLabel="Create an outfit from this prompt"
//               accessibilityHint="Opens Style Me and builds an outfit from the AI’s latest response">
//               <Text style={globalStyles.buttonPrimaryText}>
//                 Create Outfit From Prompt
//               </Text>
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
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceborder,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 16,
//       marginRight: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       lineHeight: 22,
//     },
//     time: {
//       color: theme.colors.foreground3,
//       fontSize: 11,
//       marginTop: 4,
//       textAlign: 'right',
//     },
//     avatarWrap: {width: 30, height: 30},
//     userInitials: {
//       width: 30,
//       height: 30,
//       borderRadius: 15,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     userInitialsText: {fontSize: 10, color: theme.colors.foreground},
//   });
// }

// function stylesAssistantBubble(theme: any) {
//   return StyleSheet.create({
//     row: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       justifyContent: 'flex-start',
//       gap: 8,
//       marginVertical: 8,
//     },
//     avatarWrap: {width: 30, height: 30},
//     avatar: {
//       width: 30,
//       height: 30,
//       borderRadius: 15,
//       backgroundColor: theme.colors.surface,
//     },
//     bubble: {
//       maxWidth: '82%',
//       backgroundColor: theme.colors.surface3,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 20,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceborder,
//       marginLeft: 8,
//     },
//     text: {
//       color: theme.colors.foreground,
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
