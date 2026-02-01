// NEW VERSION 2 WITH INPUT AND BUTTON SWAP OUT - KEEP

import React, {useMemo, useRef, useState, useEffect} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  LayoutChangeEvent,
  TextInput,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import {useAppTheme} from '../../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAuthRole} from '../../hooks/useAuthRole';
import {STYLE_AGENTS} from '../../../../backend-nest/src/wardrobe/logic/style-agents';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import * as Animatable from 'react-native-animatable';
import Voice from '@react-native-voice/voice';
import {useWindowDimensions} from 'react-native';
import {VoiceTarget} from '../../utils/VoiceUtils/voiceTarget';

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type as any, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

export type Weights = {
  constraintsWeight: number;
  styleWeight: number;
  weatherWeight: number;
};

type StyleAgentKey = keyof typeof STYLE_AGENTS;

const DEFAULT_WEIGHTS: Weights = {
  constraintsWeight: 1.0,
  styleWeight: 1.2,
  weatherWeight: 0.8,
};

type Props = {
  weather: string; // 'auto' | 'hot' | 'cold' | 'rainy'
  onChangeWeather: (value: string) => void;

  // Weather toggle
  useWeather: boolean;
  onToggleWeather: (enabled: boolean) => void;

  // Style profile toggle
  useStylePrefs: boolean;
  onToggleStylePrefs: (enabled: boolean) => void;

  // NEW — Feedback influence toggle (optional props; default ON)
  useFeedback?: boolean;
  onToggleFeedback?: (enabled: boolean) => void;

  // NEW — Style Agent override
  styleAgent?: StyleAgentKey | null;
  onChangeStyleAgent?: (agent: StyleAgentKey | null) => void;

  // weights controls (nullable from parent; we’ll default safely)
  weights?: Weights;
  onChangeWeights?: (w: Weights) => void;

  onRegenerate: () => void;
  onGenerate?: () => void;
  onRefine?: (refinement: string) => void;
  isGenerating?: boolean;
  statusText?: string; // e.g. "Using local weather: 70°F · none · wind 12 mph"

  // ⬇️ NEW — gate "Generate Outfit" on prompt
  canGenerate?: boolean; // default true if omitted
  // ⬇️ NEW — control visibility of Refine UI
  showRefine?: boolean; // default true
  // Content to render between refine input and button (e.g. adjustment chips)
  adjustmentContent?: React.ReactNode;
};

/** Minimal slider with NO external packages */
function SliderLite({
  label,
  min = 0,
  max = 2,
  step = 0.1,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const trackWidth = useRef(1);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const toStep = (v: number) => Math.round(v / step) * step;

  const pct = useMemo(() => {
    const p = ((value - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, isFinite(p) ? p : 0));
  }, [value, min, max]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = Math.max(1, e.nativeEvent.layout.width);
  };

  const setFromX = (x: number) => {
    const ratio = Math.max(0, Math.min(1, x / trackWidth.current));
    const raw = min + ratio * (max - min);
    onChange(clamp(toStep(raw)));
  };

  return (
    <View style={{opacity: disabled ? 0.4 : 1}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
        <Text style={{fontSize: 12, color: '#9aa0a6'}}>{label}</Text>
        <Text style={{fontSize: 12, color: '#9aa0a6'}}>{value.toFixed(2)}</Text>
      </View>

      <Pressable
        disabled={disabled}
        onLayout={onTrackLayout}
        onPress={e => {
          h('selection');
          setFromX(e.nativeEvent.locationX);
        }}
        style={{
          height: 28,
          borderRadius: 999,
          backgroundColor: '#2a2a2a',
          justifyContent: 'center',
          marginTop: 6,
        }}>
        <View
          style={{
            width: `${pct}%`,
            height: 8,
            marginHorizontal: 8,
            borderRadius: 999,
            backgroundColor: '#405de6',
          }}
        />
      </Pressable>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 6,
        }}>
        <TouchableOpacity
          disabled={disabled}
          onPress={() => {
            h('selection');
            onChange(clamp(toStep(value - step)));
          }}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: '#333',
          }}>
          <Text style={{color: '#fff'}}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={disabled}
          onPress={() => {
            h('selection');
            onChange(clamp(toStep(value + step)));
          }}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: '#333',
          }}>
          <Text style={{color: '#fff'}}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function OutfitTuningControls({
  weather,
  onChangeWeather,
  onRegenerate,
  useWeather,
  onToggleWeather,
  useStylePrefs,
  onToggleStylePrefs,
  useFeedback = true,
  onToggleFeedback,
  styleAgent,
  onChangeStyleAgent,
  weights,
  onChangeWeights,
  isGenerating = false,
  statusText,
  onRefine,
  canGenerate = true,
  showRefine = true,
  adjustmentContent,
}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const role = useAuthRole();

  const S = StyleSheet.create({
    container: {width: '100%', gap: 12},
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    section: {gap: 10},
    subRow: {flexDirection: 'row', alignItems: 'center'},
    label: {marginLeft: 8, color: theme.colors.foreground, fontSize: 14},
    faint: {color: theme.colors.muted, fontSize: 12},
    pill: {borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12},
    pillPrimary2: {
      backgroundColor: isGenerating
        ? theme.colors.button1
        : theme.colors.button1,
    },
    iconBtn: {
      width: 25,
      height: 25,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    headerSubtitle: {
      fontSize: 13,
      color: theme.colors.muted,
      marginTop: 2,
    },
    // cta: {
    //   height: 48,
    //   borderRadius: 50,
    //   justifyContent: 'center',
    //   alignItems: 'center',
    //   backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
    //   opacity: isGenDisabled ? 0.5 : 1,
    //   marginTop: 8,
    //   marginBottom: 4,
    //   width: 150,
    // },
    headerWrap: {marginTop: 4, marginBottom: 4},
    card: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    cardTitle: {color: theme.colors.foreground, fontWeight: '600'},
    ddWrapper: {
      position: 'relative',
      zIndex: 9999,
    },
    ddWrapperOpen: {
      position: 'relative',
      zIndex: 9999,
      elevation: 9999,
    },
    pillTextPrimary: {color: '#fff', fontWeight: '600', fontSize: 13},
    // refineInputContainer: {
    //   flexDirection: 'row',
    //   alignItems: 'center',
    //   width: 400,
    //   borderRadius: tokens.borderRadius.md,
    //   backgroundColor: theme.colors.surface3,
    //   paddingHorizontal: 14,
    //   marginTop: 10,
    // },
    refineInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      width: '95%', // ✅ proportional on all devices
      maxWidth: 460, // ✅ wider cap for large phones
      borderRadius: tokens.borderRadius.md,
      backgroundColor: theme.colors.surface3,
      paddingHorizontal: 14,
      marginTop: 10,
    },

    refineInput: {
      paddingHorizontal: 0,      paddingVertical: 12,

      color: theme.colors.foreground,
      fontSize: 16,
      fontWeight: '400',
    },
    micButton: {
      marginRight: 20,
    },
    micIcon: {
      color: theme.colors.foreground,
    },
    refineCta: {
      height: 48,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#ff8c00',
      opacity: isGenerating ? 0.7 : 1,
      marginTop: 12,
      marginBottom: 12,
      width: 150,
    },
    ctaText: {color: theme.colors.buttonText1, fontSize: 16, fontWeight: '700'},
    hint: {
      textAlign: 'center',
      marginBottom: 8,
      color: theme.colors.muted,
      fontSize: 12,
    },
  });

  const {width} = useWindowDimensions();

  // voice state
  const [isListening, setIsListening] = useState(false);

  // Set VoiceTarget for floating mic button when refine input is shown
  useEffect(() => {
    if (showRefine) {
      VoiceTarget.set(setRefineText, 'refineText');
    }
  }, [showRefine]);

  useEffect(() => {
    Voice.onSpeechResults = e => {
      if (e.value && e.value.length > 0) setRefineText(e.value[0]);
    };
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechError = () => setIsListening(false);

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const toggleListening = async () => {
    if (isListening) {
      await Voice.stop();
      setIsListening(false);
    } else {
      try {
        h('impactLight');
        await Voice.start('en-US');
        setIsListening(true);
      } catch (e) {
        // console.log('🎙️ Voice start error:', e);
        setIsListening(false);
      }
    }
  };

  // SAFE DEFAULTS so we never blow up if parent forgets to pass weights
  const w: Weights = weights ?? DEFAULT_WEIGHTS;

  const setWeights = (next: Partial<Weights>) => {
    const merged = {...w, ...next};
    onChangeWeights?.(merged);
  };

  // Dropdown state
  const [openWeather, setOpenWeather] = useState(false);
  const [openStyleAgent, setOpenStyleAgent] = useState(false);

  // Panels
  const [showWeatherPicker, setShowWeatherPicker] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // NEW — hidden developer controls (revealed with a long-press on gear)
  const [showHiddenDev, setShowHiddenDev] = useState(false);
  const [feedbackEnabled, setFeedbackEnabled] = useState(useFeedback);

  // 👇 NEW refinement input state
  const [refineText, setRefineText] = useState('');

  // 👇 NEW — collapses EVERYTHING below the CTA behind a single gear
  const [showExtras, setShowExtras] = useState(false);

  const weatherOptions = [
    {label: 'Use My Location (Auto)', value: 'auto'},
    {label: 'Hot Weather', value: 'hot'},
    {label: 'Cold Weather', value: 'cold'},
    {label: 'Rainy Weather', value: 'rainy'},
  ];

  const styleAgentOptions = useMemo(() => {
    const none = [
      {label: 'None (Use My Style Preferences)', value: null as null},
    ];

    const numbered = Object.entries(STYLE_AGENTS)
      .sort(([a], [b]) => {
        const na = parseInt(a.replace('agent', ''), 10);
        const nb = parseInt(b.replace('agent', ''), 10);
        return na - nb;
      })
      .map(([key, cfg]) => ({
        label: cfg.name,
        value: key as StyleAgentKey,
      }));

    return [...none, ...numbered];
  }, []);

  const isGenDisabled = !canGenerate || isGenerating;
  const weatherDisabled = !useWeather;
  const modeLabel = useWeather
    ? weather === 'auto'
      ? 'Auto'
      : weather === 'hot'
      ? 'Hot'
      : weather === 'cold'
      ? 'Cold'
      : 'Rainy'
    : 'Off';

  // Don't render anything until outfit exists (v2 uses separate entry UI)
  if (!showRefine) {
    return null;
  }

  return (
    <View style={S.container}>
      {/* ---------- UPDATE OUTFIT ---------- */}
      <>
          <View style={{alignItems: 'left'}}>
              <Text style={{color: theme.colors.foreground, fontWeight: 600, marginBottom: 6}}>
                Want to tweak this outfit?
              </Text>
            <View
              style={[
                globalStyles.promptRow,
                {
                  minHeight: 45,
                  paddingHorizontal: 14,
                  borderWidth: tokens.borderWidth.xl,
                  borderColor: theme.colors.surfaceBorder,
                  backgroundColor: theme.colors.surface3,
                  borderRadius: 30,
                  // width: Math.min(width * 0.9, 460),
                  alignSelf: 'center',
                },
              ]}>
       
              <TextInput
                multiline
                scrollEnabled={false}
                style={[
                  globalStyles.promptInput,
                  {
                    color: theme.colors.foreground,
                    flex: 1,
                    minHeight: 42,
                    paddingTop: 10,
                    paddingBottom: 10,
                    textAlignVertical: 'top',
                  },
                ]}
                value={refineText}
                onChangeText={setRefineText}
                placeholder="Refine outfit (e.g. make shorts more colorful)"
                placeholderTextColor="#888"
              />
              {refineText.length > 0 && (
                <TouchableOpacity
                  onPress={() => setRefineText('')}
                  style={{paddingHorizontal: 8}}>
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={theme.colors.foreground2}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={toggleListening}>
                <MaterialIcons
                  name={isListening ? 'mic' : 'mic-none'}
                  size={22}
                  color={theme.colors.foreground}
                  style={{marginRight: 6}}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Adjustment content slot (e.g. adjustment chips) */}
          {adjustmentContent}

          <View
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <TouchableOpacity
              style={S.refineCta}
              onPress={() => {
                if (onRefine && refineText.trim()) {
                  h('impactLight');
                  onRefine(refineText.trim());
                  setRefineText('');
                  setIsListening(false);
                }
              }}
              disabled={isGenerating}
              accessibilityState={{disabled: isGenerating}}
              testID="refine-outfit-button">
              <Text style={S.ctaText}>
                {isGenerating ? 'Refining…' : 'Refine Outfit'}
              </Text>
            </TouchableOpacity>
          </View>
        </>

      {/* EVERYTHING BELOW THE CTA IS NOW COLLAPSIBLE */}
      {showExtras && (
        <>
          {/* ⬇️ Moved OUT of Advanced: AI Style Agent */}
          <View style={[S.row, {marginTop: 18, marginBottom: 2}]}>
            <Text style={S.label}>Stylist Presets</Text>
          </View>

          <View style={openStyleAgent ? S.ddWrapperOpen : S.ddWrapper}>
            <DropDownPicker
              open={openStyleAgent}
              setOpen={setOpenStyleAgent}
              value={styleAgent ?? null}
              setValue={next => {
                const resolved =
                  typeof next === 'function'
                    ? (next(styleAgent) as StyleAgentKey | null)
                    : (next as StyleAgentKey | null);
                h('impactLight');
                onChangeStyleAgent?.(resolved);
              }}
              items={styleAgentOptions}
              placeholder="Choose (Optional)"
              listMode="SCROLLVIEW"
              maxHeight={580}
              scrollViewProps={{nestedScrollEnabled: true}}
              dropDownDirection="AUTO"
              style={{backgroundColor: theme.colors.surface}}
              textStyle={{color: theme.colors.foreground}}
              dropDownContainerStyle={{
                backgroundColor: theme.colors.surface,
                zIndex: 9999,
                elevation: 9999,
                maxHeight: 180,
              }}
              onOpen={() => h('selection')}
            />
          </View>

          {/* Weather row */}
          <View style={[S.row, {marginTop: 22}]}>
            <View style={S.subRow}>
              <Switch
                value={useWeather}
                onValueChange={enabled => {
                  h('selection');
                  onToggleWeather(enabled);
                  if (!enabled) setShowWeatherPicker(false);
                }}
                trackColor={{false: '#767577', true: theme.colors.button1}}
                thumbColor={useWeather ? '#fff' : '#f4f3f4'}
              />
              <Text style={S.label}>Use Weather</Text>
              <Text
                style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
                ({modeLabel})
              </Text>
            </View>

            <TouchableOpacity
              disabled={weatherDisabled}
              onPress={() => {
                if (!weatherDisabled) h('selection');
                setShowWeatherPicker(s => !s);
              }}
              activeOpacity={0.8}
              style={[
                S.pill,
                S.pillPrimary2,
                {opacity: weatherDisabled ? 0.2 : 1},
              ]}>
              <Text style={S.pillTextPrimary}>
                {showWeatherPicker ? 'Hide Controls' : 'Advanced Weather'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weather picker */}
          {showWeatherPicker && (
            <View style={openWeather ? S.ddWrapperOpen : S.ddWrapper}>
              <DropDownPicker
                open={openWeather}
                setOpen={setOpenWeather}
                value={weather}
                setValue={val => {
                  h('selection');
                  onChangeWeather(val as unknown as string);
                }}
                items={weatherOptions}
                placeholder={
                  useWeather ? 'Choose weather option' : 'Weather (disabled)'
                }
                listMode="SCROLLVIEW"
                dropDownDirection="AUTO"
                style={{backgroundColor: theme.colors.surface}}
                textStyle={{color: theme.colors.foreground}}
                dropDownContainerStyle={{
                  backgroundColor: theme.colors.surface,
                  zIndex: 9999,
                  elevation: 9999,
                }}
                disabled={weatherDisabled}
                onOpen={() => h('selection')}
              />
              <Text style={[S.faint, {marginTop: 6}]}>
                {useWeather
                  ? 'Auto uses your current location.'
                  : 'Weather is off — outfits ignore weather.'}
              </Text>
            </View>
          )}

          {/* RBAC - Advanced controls gear */}
          {role !== 'developer' && (
            <View style={[S.row, {marginTop: 4}]}>
              <Text style={[S.faint]}>Advanced Controls</Text>
              <TouchableOpacity
                onPress={() => {
                  h('selection');
                  setShowMoreOptions(s => !s);
                }}
                onLongPress={() => {
                  h('impactMedium');
                  setShowHiddenDev(v => !v);
                }}
                delayLongPress={500}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={
                  showMoreOptions ? 'Hide options' : 'Show options'
                }
                testID="options-gear-button"
                style={S.iconBtn}>
                <MaterialIcons
                  name="settings"
                  size={20}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Advanced section */}
          {showMoreOptions && (
            <View style={{gap: 10}}>
              <View style={[S.row, {marginTop: 6}]}>
                <View style={S.subRow}>
                  <Switch
                    value={feedbackEnabled}
                    onValueChange={enabled => {
                      h('selection');
                      setFeedbackEnabled(enabled);
                      onToggleFeedback?.(enabled);
                    }}
                    trackColor={{false: '#767577', true: theme.colors.button1}}
                    thumbColor={feedbackEnabled ? '#fff' : '#f4f3f4'}
                  />
                  <Text style={S.label}>Use Feedback Influence</Text>
                  <Text
                    style={[
                      S.label,
                      {marginLeft: 10, color: theme.colors.muted},
                    ]}>
                    ({feedbackEnabled ? 'On' : 'Off'})
                  </Text>
                </View>
                <Text style={[S.faint]} />
              </View>

              {/* DEV: Scoring Weights */}
              <View style={S.card}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <Text style={S.cardTitle}>Scoring Weights (dev)</Text>
                  <TouchableOpacity
                    onPress={() => {
                      h('impactLight');
                      onChangeWeights?.(DEFAULT_WEIGHTS);
                    }}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      backgroundColor: '#333',
                    }}>
                    <Text style={{color: '#fff', fontWeight: '600'}}>
                      Reset
                    </Text>
                  </TouchableOpacity>
                </View>

                <SliderLite
                  label="Constraints"
                  min={0}
                  max={3}
                  step={0.1}
                  value={w.constraintsWeight}
                  onChange={v => setWeights({constraintsWeight: v})}
                />

                <SliderLite
                  label="Style"
                  min={0}
                  max={3}
                  step={0.1}
                  value={w.styleWeight}
                  onChange={v => setWeights({styleWeight: v})}
                  disabled={!useStylePrefs}
                />

                <SliderLite
                  label="Weather"
                  min={0}
                  max={3}
                  step={0.1}
                  value={w.weatherWeight}
                  onChange={v => setWeights({weatherWeight: v})}
                />
              </View>
            </View>
          )}

          <View style={{marginTop: 8}}>
            {statusText ? (
              <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

/////////////////////

// // NEW VERSION 1 WITH INPUT AND BUTTON SWAP OUT - KEEP

// import React, {useMemo, useRef, useState, useEffect} from 'react';
// import {
//   View,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   Switch,
//   Pressable,
//   LayoutChangeEvent,
//   TextInput,
// } from 'react-native';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAuthRole} from '../../hooks/useAuthRole';
// import {STYLE_AGENTS} from '../../../../backend-nest/src/wardrobe/logic/style-agents';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import Voice from '@react-native-voice/voice';
// import {useWindowDimensions} from 'react-native';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

// type StyleAgentKey = keyof typeof STYLE_AGENTS;

// const DEFAULT_WEIGHTS: Weights = {
//   constraintsWeight: 1.0,
//   styleWeight: 1.2,
//   weatherWeight: 0.8,
// };

// type Props = {
//   weather: string; // 'auto' | 'hot' | 'cold' | 'rainy'
//   onChangeWeather: (value: string) => void;

//   // Weather toggle
//   useWeather: boolean;
//   onToggleWeather: (enabled: boolean) => void;

//   // Style profile toggle
//   useStylePrefs: boolean;
//   onToggleStylePrefs: (enabled: boolean) => void;

//   // NEW — Feedback influence toggle (optional props; default ON)
//   useFeedback?: boolean;
//   onToggleFeedback?: (enabled: boolean) => void;

//   // NEW — Style Agent override
//   styleAgent?: StyleAgentKey | null;
//   onChangeStyleAgent?: (agent: StyleAgentKey | null) => void;

//   // weights controls (nullable from parent; we’ll default safely)
//   weights?: Weights;
//   onChangeWeights?: (w: Weights) => void;

//   onRegenerate: () => void;
//   onGenerate?: () => void;
//   onRefine?: (refinement: string) => void;
//   isGenerating?: boolean;
//   statusText?: string; // e.g. "Using local weather: 70°F · none · wind 12 mph"

//   // ⬇️ NEW — gate "Generate Outfit" on prompt
//   canGenerate?: boolean; // default true if omitted
//   // ⬇️ NEW — control visibility of Refine UI
//   showRefine?: boolean; // default true
// };

// /** Minimal slider with NO external packages */
// function SliderLite({
//   label,
//   min = 0,
//   max = 2,
//   step = 0.1,
//   value,
//   onChange,
//   disabled = false,
// }: {
//   label: string;
//   min?: number;
//   max?: number;
//   step?: number;
//   value: number;
//   onChange: (v: number) => void;
//   disabled?: boolean;
// }) {
//   const trackWidth = useRef(1);

//   const clamp = (v: number) => Math.min(max, Math.max(min, v));
//   const toStep = (v: number) => Math.round(v / step) * step;

//   const pct = useMemo(() => {
//     const p = ((value - min) / (max - min)) * 100;
//     return Math.max(0, Math.min(100, isFinite(p) ? p : 0));
//   }, [value, min, max]);

//   const onTrackLayout = (e: LayoutChangeEvent) => {
//     trackWidth.current = Math.max(1, e.nativeEvent.layout.width);
//   };

//   const setFromX = (x: number) => {
//     const ratio = Math.max(0, Math.min(1, x / trackWidth.current));
//     const raw = min + ratio * (max - min);
//     onChange(clamp(toStep(raw)));
//   };

//   return (
//     <View style={{opacity: disabled ? 0.4 : 1}}>
//       <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
//         <Text style={{fontSize: 12, color: '#9aa0a6'}}>{label}</Text>
//         <Text style={{fontSize: 12, color: '#9aa0a6'}}>{value.toFixed(2)}</Text>
//       </View>

//       <Pressable
//         disabled={disabled}
//         onLayout={onTrackLayout}
//         onPress={e => {
//           h('selection');
//           setFromX(e.nativeEvent.locationX);
//         }}
//         style={{
//           height: 28,
//           borderRadius: 999,
//           backgroundColor: '#2a2a2a',
//           justifyContent: 'center',
//           marginTop: 6,
//         }}>
//         <View
//           style={{
//             width: `${pct}%`,
//             height: 8,
//             marginHorizontal: 8,
//             borderRadius: 999,
//             backgroundColor: '#405de6',
//           }}
//         />
//       </Pressable>

//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 6,
//         }}>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => {
//             h('selection');
//             onChange(clamp(toStep(value - step)));
//           }}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 8,
//             backgroundColor: '#333',
//           }}>
//           <Text style={{color: '#fff'}}>-</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => {
//             h('selection');
//             onChange(clamp(toStep(value + step)));
//           }}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 8,
//             backgroundColor: '#333',
//           }}>
//           <Text style={{color: '#fff'}}>+</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// export default function OutfitTuningControls({
//   weather,
//   onChangeWeather,
//   onRegenerate,
//   useWeather,
//   onToggleWeather,
//   useStylePrefs,
//   onToggleStylePrefs,
//   useFeedback = true,
//   onToggleFeedback,
//   styleAgent,
//   onChangeStyleAgent,
//   weights,
//   onChangeWeights,
//   isGenerating = false,
//   statusText,
//   onRefine,
//   canGenerate = true,
//   showRefine = true,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const role = useAuthRole();

//   const S = StyleSheet.create({
//     container: {width: '100%', paddingHorizontal: 20, gap: 12},
//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     section: {gap: 10},
//     subRow: {flexDirection: 'row', alignItems: 'center'},
//     label: {marginLeft: 8, color: theme.colors.foreground, fontSize: 14},
//     faint: {color: theme.colors.muted, fontSize: 12},
//     pill: {borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12},
//     pillPrimary2: {
//       backgroundColor: isGenerating
//         ? theme.colors.button1
//         : theme.colors.button1,
//     },
//     iconBtn: {
//       width: 25,
//       height: 25,
//       borderRadius: 18,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     headerTitle: {
//       fontSize: 22,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     headerSubtitle: {
//       fontSize: 13,
//       color: theme.colors.muted,
//       marginTop: 2,
//     },
//     // cta: {
//     //   height: 48,
//     //   borderRadius: 50,
//     //   justifyContent: 'center',
//     //   alignItems: 'center',
//     //   backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//     //   opacity: isGenDisabled ? 0.5 : 1,
//     //   marginTop: 8,
//     //   marginBottom: 4,
//     //   width: 150,
//     // },
//     headerWrap: {marginTop: 4, marginBottom: 4},
//     card: {
//       padding: 12,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//     },
//     cardTitle: {color: theme.colors.foreground, fontWeight: '600'},
//     ddWrapper: {
//       position: 'relative',
//       zIndex: 9999,
//     },
//     ddWrapperOpen: {
//       position: 'relative',
//       zIndex: 9999,
//       elevation: 9999,
//     },
//     card: {
//       padding: 12,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//     },
//     pillTextPrimary: {color: '#fff', fontWeight: '600', fontSize: 13},
//     // refineInputContainer: {
//     //   flexDirection: 'row',
//     //   alignItems: 'center',
//     //   width: 400,
//     //   borderRadius: tokens.borderRadius.md,
//     //   backgroundColor: theme.colors.surface3,
//     //   paddingHorizontal: 14,
//     //   marginTop: 10,
//     // },
//     refineInputContainer: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       alignSelf: 'center',
//       width: '95%', // ✅ proportional on all devices
//       maxWidth: 460, // ✅ wider cap for large phones
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface3,
//       paddingHorizontal: 14,
//       marginTop: 10,
//     },

//     refineInput: {
//       paddingHorizontal: 0,
//       paddingVertical: 12,

//       color: theme.colors.foreground,
//       fontSize: 16,
//       fontWeight: '400',
//     },
//     micButton: {
//       marginRight: 20,
//     },
//     micIcon: {
//       color: theme.colors.foreground,
//     },
//     refineCta: {
//       height: 48,
//       borderRadius: 50,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: '#ff8c00',
//       opacity: isGenerating ? 0.7 : 1,
//       marginTop: 12,
//       marginBottom: 12,
//       width: 150,
//     },
//     ctaText: {color: theme.colors.buttonText1, fontSize: 16, fontWeight: '700'},
//     hint: {
//       textAlign: 'center',
//       marginBottom: 8,
//       color: theme.colors.muted,
//       fontSize: 12,
//     },
//   });

//   const {width} = useWindowDimensions();

//   // voice state
//   const [isListening, setIsListening] = useState(false);

//   useEffect(() => {
//     Voice.onSpeechResults = e => {
//       if (e.value && e.value.length > 0) setRefineText(e.value[0]);
//     };
//     Voice.onSpeechEnd = () => setIsListening(false);
//     Voice.onSpeechError = () => setIsListening(false);

//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   const toggleListening = async () => {
//     if (isListening) {
//       await Voice.stop();
//       setIsListening(false);
//     } else {
//       try {
//         h('impactLight');
//         await Voice.start('en-US');
//         setIsListening(true);
//       } catch (e) {
//         // console.log('🎙️ Voice start error:', e);
//         setIsListening(false);
//       }
//     }
//   };

//   // SAFE DEFAULTS so we never blow up if parent forgets to pass weights
//   const w: Weights = weights ?? DEFAULT_WEIGHTS;

//   const setWeights = (next: Partial<Weights>) => {
//     const merged = {...w, ...next};
//     onChangeWeights?.(merged);
//   };

//   // Dropdown state
//   const [openWeather, setOpenWeather] = useState(false);
//   const [openStyleAgent, setOpenStyleAgent] = useState(false);

//   // Panels
//   const [showWeatherPicker, setShowWeatherPicker] = useState(false);
//   const [showMoreOptions, setShowMoreOptions] = useState(false);

//   // NEW — hidden developer controls (revealed with a long-press on gear)
//   const [showHiddenDev, setShowHiddenDev] = useState(false);
//   const [feedbackEnabled, setFeedbackEnabled] = useState(useFeedback);

//   // 👇 NEW refinement input state
//   const [refineText, setRefineText] = useState('');

//   // 👇 NEW — collapses EVERYTHING below the CTA behind a single gear
//   const [showExtras, setShowExtras] = useState(false);

//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: 'Hot Weather', value: 'hot'},
//     {label: 'Cold Weather', value: 'cold'},
//     {label: 'Rainy Weather', value: 'rainy'},
//   ];

//   const styleAgentOptions = useMemo(() => {
//     const none = [
//       {label: 'None (Use My Style Preferences)', value: null as null},
//     ];

//     const numbered = Object.entries(STYLE_AGENTS)
//       .sort(([a], [b]) => {
//         const na = parseInt(a.replace('agent', ''), 10);
//         const nb = parseInt(b.replace('agent', ''), 10);
//         return na - nb;
//       })
//       .map(([key, cfg]) => ({
//         label: cfg.name,
//         value: key as StyleAgentKey,
//       }));

//     return [...none, ...numbered];
//   }, []);

//   const isGenDisabled = !canGenerate || isGenerating;
//   const weatherDisabled = !useWeather;
//   const modeLabel = useWeather
//     ? weather === 'auto'
//       ? 'Auto'
//       : weather === 'hot'
//       ? 'Hot'
//       : weather === 'cold'
//       ? 'Cold'
//       : 'Rainy'
//     : 'Off';

//   return (
//     <View style={S.container}>
//       {/* Swap between Create and Update UI */}
//       {!showRefine ? (
//         // ---------- CREATE OUTFIT ----------
//         <View
//           style={{
//             display: 'flex',
//             justifyContent: 'center',
//             alignItems: 'center',
//           }}>
//           <Animatable.View
//             animation="fadeInUp"
//             delay={100}
//             duration={800}
//             easing="ease-out-back"
//             useNativeDriver>
//             <TouchableOpacity
//               style={[globalStyles.buttonPrimary, {width: 140}]}
//               onPress={() => {
//                 h('impactMedium');
//                 onRegenerate();
//               }}
//               disabled={isGenDisabled}
//               accessibilityState={{disabled: isGenDisabled}}
//               testID="generate-outfit-button">
//               <Text
//                 style={[globalStyles.buttonPrimaryText, {fontWeight: '700'}]}>
//                 {isGenerating ? 'Generating…' : 'Create Outfit'}
//               </Text>
//             </TouchableOpacity>
//           </Animatable.View>
//         </View>
//       ) : (
//         // ---------- UPDATE OUTFIT ----------
//         <>
//           <View style={{alignItems: 'center', paddingHorizontal: 16}}>
//             <View
//               style={[
//                 globalStyles.promptRow,
//                 {
//                   height: 45,
//                   marginTop: 12,
//                   paddingHorizontal: 14,
//                   borderWidth: tokens.borderWidth.xl,
//                   borderColor: theme.colors.surfaceBorder,
//                   backgroundColor: theme.colors.surface3,
//                   borderRadius: 30,
//                   width: Math.min(width * 0.9, 460),
//                   alignSelf: 'center',
//                 },
//               ]}>
//               <TextInput
//                 style={[
//                   globalStyles.promptInput,
//                   {color: theme.colors.foreground, flex: 1},
//                 ]}
//                 value={refineText}
//                 onChangeText={setRefineText}
//                 placeholder="Refine outfit (e.g. make shorts more colorful)"
//                 placeholderTextColor="#888"
//               />
//               {refineText.length > 0 && (
//                 <TouchableOpacity
//                   onPress={() => setRefineText('')}
//                   style={{paddingHorizontal: 8}}>
//                   <MaterialIcons
//                     name="close"
//                     size={22}
//                     color={theme.colors.foreground2}
//                   />
//                 </TouchableOpacity>
//               )}
//               <TouchableOpacity onPress={toggleListening}>
//                 <MaterialIcons
//                   name={isListening ? 'mic' : 'mic-none'}
//                   size={22}
//                   color={theme.colors.foreground}
//                   style={{marginRight: 6}}
//                 />
//               </TouchableOpacity>
//             </View>
//           </View>

//           <View
//             style={{
//               display: 'flex',
//               justifyContent: 'center',
//               alignItems: 'center',
//             }}>
//             <TouchableOpacity
//               style={S.refineCta}
//               onPress={() => {
//                 if (onRefine && refineText.trim()) {
//                   h('impactLight');
//                   onRefine(refineText.trim());
//                   setRefineText('');
//                   setIsListening(false);
//                 }
//               }}
//               disabled={isGenerating}
//               accessibilityState={{disabled: isGenerating}}
//               testID="refine-outfit-button">
//               <Text style={S.ctaText}>
//                 {isGenerating ? 'Refining…' : 'Update Outfit'}
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </>
//       )}

//       {/* EVERYTHING BELOW THE CTA IS NOW COLLAPSIBLE */}
//       {showExtras && (
//         <>
//           {/* ⬇️ Moved OUT of Advanced: AI Style Agent */}
//           <View style={[S.row, {marginTop: 18, marginBottom: 2}]}>
//             <Text style={S.label}>Stylist Presets</Text>
//           </View>

//           <View style={openStyleAgent ? S.ddWrapperOpen : S.ddWrapper}>
//             <DropDownPicker
//               open={openStyleAgent}
//               setOpen={setOpenStyleAgent}
//               value={styleAgent ?? null}
//               setValue={next => {
//                 const resolved =
//                   typeof next === 'function'
//                     ? (next(styleAgent) as StyleAgentKey | null)
//                     : (next as StyleAgentKey | null);
//                 h('impactLight');
//                 onChangeStyleAgent?.(resolved);
//               }}
//               items={styleAgentOptions}
//               placeholder="Choose (Optional)"
//               listMode="SCROLLVIEW"
//               maxHeight={580}
//               scrollViewProps={{nestedScrollEnabled: true}}
//               dropDownDirection="AUTO"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{
//                 backgroundColor: theme.colors.surface,
//                 zIndex: 9999,
//                 elevation: 9999,
//                 maxHeight: 180,
//               }}
//               onOpen={() => h('selection')}
//             />
//           </View>

//           {/* Weather row */}
//           <View style={[S.row, {marginTop: 22}]}>
//             <View style={S.subRow}>
//               <Switch
//                 value={useWeather}
//                 onValueChange={enabled => {
//                   h('selection');
//                   onToggleWeather(enabled);
//                   if (!enabled) setShowWeatherPicker(false);
//                 }}
//                 trackColor={{false: '#767577', true: theme.colors.button1}}
//                 thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//               />
//               <Text style={S.label}>Use Weather</Text>
//               <Text
//                 style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//                 ({modeLabel})
//               </Text>
//             </View>

//             <TouchableOpacity
//               disabled={weatherDisabled}
//               onPress={() => {
//                 if (!weatherDisabled) h('selection');
//                 setShowWeatherPicker(s => !s);
//               }}
//               activeOpacity={0.8}
//               style={[
//                 S.pill,
//                 S.pillPrimary2,
//                 {opacity: weatherDisabled ? 0.2 : 1},
//               ]}>
//               <Text style={S.pillTextPrimary}>
//                 {showWeatherPicker ? 'Hide Controls' : 'Advanced Weather'}
//               </Text>
//             </TouchableOpacity>
//           </View>

//           {/* Weather picker */}
//           {showWeatherPicker && (
//             <View style={openWeather ? S.ddWrapperOpen : S.ddWrapper}>
//               <DropDownPicker
//                 open={openWeather}
//                 setOpen={setOpenWeather}
//                 value={weather}
//                 setValue={val => {
//                   h('selection');
//                   onChangeWeather(val as unknown as string);
//                 }}
//                 items={weatherOptions}
//                 placeholder={
//                   useWeather ? 'Choose weather option' : 'Weather (disabled)'
//                 }
//                 listMode="SCROLLVIEW"
//                 dropDownDirection="AUTO"
//                 style={{backgroundColor: theme.colors.surface}}
//                 textStyle={{color: theme.colors.foreground}}
//                 dropDownContainerStyle={{
//                   backgroundColor: theme.colors.surface,
//                   zIndex: 9999,
//                   elevation: 9999,
//                 }}
//                 disabled={weatherDisabled}
//                 onOpen={() => h('selection')}
//               />
//               <Text style={[S.faint, {marginTop: 6}]}>
//                 {useWeather
//                   ? 'Auto uses your current location.'
//                   : 'Weather is off — outfits ignore weather.'}
//               </Text>
//             </View>
//           )}

//           {/* RBAC - Advanced controls gear */}
//           {role !== 'developer' && (
//             <View style={[S.row, {marginTop: 4}]}>
//               <Text style={[S.faint]}>Advanced Controls</Text>
//               <TouchableOpacity
//                 onPress={() => {
//                   h('selection');
//                   setShowMoreOptions(s => !s);
//                 }}
//                 onLongPress={() => {
//                   h('impactMedium');
//                   setShowHiddenDev(v => !v);
//                 }}
//                 delayLongPress={500}
//                 activeOpacity={0.8}
//                 accessibilityRole="button"
//                 accessibilityLabel={
//                   showMoreOptions ? 'Hide options' : 'Show options'
//                 }
//                 testID="options-gear-button"
//                 style={S.iconBtn}>
//                 <MaterialIcons
//                   name="settings"
//                   size={20}
//                   color={theme.colors.primary}
//                 />
//               </TouchableOpacity>
//             </View>
//           )}

//           {/* Advanced section */}
//           {showMoreOptions && (
//             <View style={{gap: 10}}>
//               <View style={[S.row, {marginTop: 6}]}>
//                 <View style={S.subRow}>
//                   <Switch
//                     value={feedbackEnabled}
//                     onValueChange={enabled => {
//                       h('selection');
//                       setFeedbackEnabled(enabled);
//                       onToggleFeedback?.(enabled);
//                     }}
//                     trackColor={{false: '#767577', true: theme.colors.button1}}
//                     thumbColor={feedbackEnabled ? '#fff' : '#f4f3f4'}
//                   />
//                   <Text style={S.label}>Use Feedback Influence</Text>
//                   <Text
//                     style={[
//                       S.label,
//                       {marginLeft: 10, color: theme.colors.muted},
//                     ]}>
//                     ({feedbackEnabled ? 'On' : 'Off'})
//                   </Text>
//                 </View>
//                 <Text style={[S.faint]} />
//               </View>

//               {/* DEV: Scoring Weights */}
//               <View style={S.card}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <Text style={S.cardTitle}>Scoring Weights (dev)</Text>
//                   <TouchableOpacity
//                     onPress={() => {
//                       h('impactLight');
//                       onChangeWeights?.(DEFAULT_WEIGHTS);
//                     }}
//                     style={{
//                       paddingVertical: 6,
//                       paddingHorizontal: 10,
//                       borderRadius: 8,
//                       backgroundColor: '#333',
//                     }}>
//                     <Text style={{color: '#fff', fontWeight: '600'}}>
//                       Reset
//                     </Text>
//                   </TouchableOpacity>
//                 </View>

//                 <SliderLite
//                   label="Constraints"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.constraintsWeight}
//                   onChange={v => setWeights({constraintsWeight: v})}
//                 />

//                 <SliderLite
//                   label="Style"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.styleWeight}
//                   onChange={v => setWeights({styleWeight: v})}
//                   disabled={!useStylePrefs}
//                 />

//                 <SliderLite
//                   label="Weather"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.weatherWeight}
//                   onChange={v => setWeights({weatherWeight: v})}
//                 />
//               </View>
//             </View>
//           )}

//           <View style={{marginTop: 8}}>
//             {statusText ? (
//               <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
//             ) : null}
//           </View>
//         </>
//       )}
//     </View>
//   );
// }

// /////////////////////

// KEEP LAST GREAT VERSION BEFORE SWAPPING INPUT FIELD AND BUTTONS

// import React, {useMemo, useRef, useState, useEffect} from 'react';
// import {
//   View,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   Switch,
//   Pressable,
//   LayoutChangeEvent,
//   TextInput,
// } from 'react-native';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAuthRole} from '../../hooks/useAuthRole';
// import {STYLE_AGENTS} from '../../../../backend-nest/src/wardrobe/logic/style-agents';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import Voice from '@react-native-voice/voice';
// import {useWindowDimensions} from 'react-native';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

// type StyleAgentKey = keyof typeof STYLE_AGENTS;

// const DEFAULT_WEIGHTS: Weights = {
//   constraintsWeight: 1.0,
//   styleWeight: 1.2,
//   weatherWeight: 0.8,
// };

// type Props = {
//   weather: string; // 'auto' | 'hot' | 'cold' | 'rainy'
//   onChangeWeather: (value: string) => void;

//   // Weather toggle
//   useWeather: boolean;
//   onToggleWeather: (enabled: boolean) => void;

//   // Style profile toggle
//   useStylePrefs: boolean;
//   onToggleStylePrefs: (enabled: boolean) => void;

//   // NEW — Feedback influence toggle (optional props; default ON)
//   useFeedback?: boolean;
//   onToggleFeedback?: (enabled: boolean) => void;

//   // NEW — Style Agent override
//   styleAgent?: StyleAgentKey | null;
//   onChangeStyleAgent?: (agent: StyleAgentKey | null) => void;

//   // weights controls (nullable from parent; we’ll default safely)
//   weights?: Weights;
//   onChangeWeights?: (w: Weights) => void;

//   onRegenerate: () => void;
//   onGenerate?: () => void;
//   onRefine?: (refinement: string) => void;
//   isGenerating?: boolean;
//   statusText?: string; // e.g. "Using local weather: 70°F · none · wind 12 mph"

//   // ⬇️ NEW — gate "Generate Outfit" on prompt
//   canGenerate?: boolean; // default true if omitted
//   // ⬇️ NEW — control visibility of Refine UI
//   showRefine?: boolean; // default true
// };

// /** Minimal slider with NO external packages */
// function SliderLite({
//   label,
//   min = 0,
//   max = 2,
//   step = 0.1,
//   value,
//   onChange,
//   disabled = false,
// }: {
//   label: string;
//   min?: number;
//   max?: number;
//   step?: number;
//   value: number;
//   onChange: (v: number) => void;
//   disabled?: boolean;
// }) {
//   const trackWidth = useRef(1);

//   const clamp = (v: number) => Math.min(max, Math.max(min, v));
//   const toStep = (v: number) => Math.round(v / step) * step;

//   const pct = useMemo(() => {
//     const p = ((value - min) / (max - min)) * 100;
//     return Math.max(0, Math.min(100, isFinite(p) ? p : 0));
//   }, [value, min, max]);

//   const onTrackLayout = (e: LayoutChangeEvent) => {
//     trackWidth.current = Math.max(1, e.nativeEvent.layout.width);
//   };

//   const setFromX = (x: number) => {
//     const ratio = Math.max(0, Math.min(1, x / trackWidth.current));
//     const raw = min + ratio * (max - min);
//     onChange(clamp(toStep(raw)));
//   };

//   return (
//     <View style={{opacity: disabled ? 0.4 : 1}}>
//       <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
//         <Text style={{fontSize: 12, color: '#9aa0a6'}}>{label}</Text>
//         <Text style={{fontSize: 12, color: '#9aa0a6'}}>{value.toFixed(2)}</Text>
//       </View>

//       <Pressable
//         disabled={disabled}
//         onLayout={onTrackLayout}
//         onPress={e => {
//           h('selection');
//           setFromX(e.nativeEvent.locationX);
//         }}
//         style={{
//           height: 28,
//           borderRadius: 999,
//           backgroundColor: '#2a2a2a',
//           justifyContent: 'center',
//           marginTop: 6,
//         }}>
//         <View
//           style={{
//             width: `${pct}%`,
//             height: 8,
//             marginHorizontal: 8,
//             borderRadius: 999,
//             backgroundColor: '#405de6',
//           }}
//         />
//       </Pressable>

//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 6,
//         }}>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => {
//             h('selection');
//             onChange(clamp(toStep(value - step)));
//           }}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 8,
//             backgroundColor: '#333',
//           }}>
//           <Text style={{color: '#fff'}}>-</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => {
//             h('selection');
//             onChange(clamp(toStep(value + step)));
//           }}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 8,
//             backgroundColor: '#333',
//           }}>
//           <Text style={{color: '#fff'}}>+</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// export default function OutfitTuningControls({
//   weather,
//   onChangeWeather,
//   onRegenerate,
//   useWeather,
//   onToggleWeather,
//   useStylePrefs,
//   onToggleStylePrefs,
//   useFeedback = true,
//   onToggleFeedback,
//   styleAgent,
//   onChangeStyleAgent,
//   weights,
//   onChangeWeights,
//   isGenerating = false,
//   statusText,
//   onRefine,
//   canGenerate = true,
//   showRefine = true,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const role = useAuthRole();

//   const S = StyleSheet.create({
//     container: {width: '100%', paddingHorizontal: 20, gap: 12},
//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     section: {gap: 10},
//     subRow: {flexDirection: 'row', alignItems: 'center'},
//     label: {marginLeft: 8, color: theme.colors.foreground, fontSize: 14},
//     faint: {color: theme.colors.muted, fontSize: 12},
//     pill: {borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12},
//     pillPrimary2: {
//       backgroundColor: isGenerating
//         ? theme.colors.button1
//         : theme.colors.button1,
//     },
//     iconBtn: {
//       width: 25,
//       height: 25,
//       borderRadius: 18,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     headerTitle: {
//       fontSize: 22,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     headerSubtitle: {
//       fontSize: 13,
//       color: theme.colors.muted,
//       marginTop: 2,
//     },
//     // cta: {
//     //   height: 48,
//     //   borderRadius: 50,
//     //   justifyContent: 'center',
//     //   alignItems: 'center',
//     //   backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//     //   opacity: isGenDisabled ? 0.5 : 1,
//     //   marginTop: 8,
//     //   marginBottom: 4,
//     //   width: 150,
//     // },
//     headerWrap: {marginTop: 4, marginBottom: 4},
//     card: {
//       padding: 12,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//     },
//     cardTitle: {color: theme.colors.foreground, fontWeight: '600'},
//     ddWrapper: {
//       position: 'relative',
//       zIndex: 9999,
//     },
//     ddWrapperOpen: {
//       position: 'relative',
//       zIndex: 9999,
//       elevation: 9999,
//     },
//     card: {
//       padding: 12,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//     },
//     pillTextPrimary: {color: '#fff', fontWeight: '600', fontSize: 13},
//     // refineInputContainer: {
//     //   flexDirection: 'row',
//     //   alignItems: 'center',
//     //   width: 400,
//     //   borderRadius: tokens.borderRadius.md,
//     //   backgroundColor: theme.colors.surface3,
//     //   paddingHorizontal: 14,
//     //   marginTop: 10,
//     // },
//     refineInputContainer: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       alignSelf: 'center',
//       width: '95%', // ✅ proportional on all devices
//       maxWidth: 460, // ✅ wider cap for large phones
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface3,
//       paddingHorizontal: 14,
//       marginTop: 10,
//     },

//     refineInput: {
//       paddingHorizontal: 0,
//       paddingVertical: 12,

//       color: theme.colors.foreground,
//       fontSize: 16,
//       fontWeight: '400',
//     },
//     micButton: {
//       marginRight: 20,
//     },
//     micIcon: {
//       color: theme.colors.foreground,
//     },
//     refineCta: {
//       height: 48,
//       borderRadius: 50,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: '#ff8c00',
//       opacity: isGenerating ? 0.7 : 1,
//       marginTop: 12,
//       marginBottom: 12,
//       width: 150,
//     },
//     ctaText: {color: theme.colors.buttonText1, fontSize: 16, fontWeight: '700'},
//     hint: {
//       textAlign: 'center',
//       marginBottom: 8,
//       color: theme.colors.muted,
//       fontSize: 12,
//     },
//   });

//   const {width} = useWindowDimensions();

//   // voice state
//   const [isListening, setIsListening] = useState(false);

//   useEffect(() => {
//     Voice.onSpeechResults = e => {
//       if (e.value && e.value.length > 0) setRefineText(e.value[0]);
//     };
//     Voice.onSpeechEnd = () => setIsListening(false);
//     Voice.onSpeechError = () => setIsListening(false);

//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   const toggleListening = async () => {
//     if (isListening) {
//       await Voice.stop();
//       setIsListening(false);
//     } else {
//       try {
//         h('impactLight');
//         await Voice.start('en-US');
//         setIsListening(true);
//       } catch (e) {
//         // console.log('🎙️ Voice start error:', e);
//         setIsListening(false);
//       }
//     }
//   };

//   // SAFE DEFAULTS so we never blow up if parent forgets to pass weights
//   const w: Weights = weights ?? DEFAULT_WEIGHTS;

//   const setWeights = (next: Partial<Weights>) => {
//     const merged = {...w, ...next};
//     onChangeWeights?.(merged);
//   };

//   // Dropdown state
//   const [openWeather, setOpenWeather] = useState(false);
//   const [openStyleAgent, setOpenStyleAgent] = useState(false);

//   // Panels
//   const [showWeatherPicker, setShowWeatherPicker] = useState(false);
//   const [showMoreOptions, setShowMoreOptions] = useState(false);

//   // NEW — hidden developer controls (revealed with a long-press on gear)
//   const [showHiddenDev, setShowHiddenDev] = useState(false);
//   const [feedbackEnabled, setFeedbackEnabled] = useState(useFeedback);

//   // 👇 NEW refinement input state
//   const [refineText, setRefineText] = useState('');

//   // 👇 NEW — collapses EVERYTHING below the CTA behind a single gear
//   const [showExtras, setShowExtras] = useState(false);

//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: 'Hot Weather', value: 'hot'},
//     {label: 'Cold Weather', value: 'cold'},
//     {label: 'Rainy Weather', value: 'rainy'},
//   ];

//   const styleAgentOptions = useMemo(() => {
//     const none = [
//       {label: 'None (Use My Style Preferences)', value: null as null},
//     ];

//     const numbered = Object.entries(STYLE_AGENTS)
//       .sort(([a], [b]) => {
//         const na = parseInt(a.replace('agent', ''), 10);
//         const nb = parseInt(b.replace('agent', ''), 10);
//         return na - nb;
//       })
//       .map(([key, cfg]) => ({
//         label: cfg.name,
//         value: key as StyleAgentKey,
//       }));

//     return [...none, ...numbered];
//   }, []);

//   const isGenDisabled = !canGenerate || isGenerating;
//   const weatherDisabled = !useWeather;
//   const modeLabel = useWeather
//     ? weather === 'auto'
//       ? 'Auto'
//       : weather === 'hot'
//       ? 'Hot'
//       : weather === 'cold'
//       ? 'Cold'
//       : 'Rainy'
//     : 'Off';

//   return (
//     <View style={S.container}>
//       {/* Primary CTA */}
//       <View
//         style={{
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         <Animatable.View
//           animation="fadeInUp"
//           delay={100}
//           duration={800}
//           easing="ease-out-back"
//           useNativeDriver>
//           <TouchableOpacity
//             style={[globalStyles.buttonPrimary, {width: 140}]}
//             onPress={() => {
//               h('impactMedium');
//               onRegenerate();
//             }}
//             disabled={isGenDisabled}
//             accessibilityState={{disabled: isGenDisabled}}
//             testID="generate-outfit-button">
//             <Text style={[globalStyles.buttonPrimaryText, {fontWeight: '700'}]}>
//               {isGenerating ? 'Generating…' : 'Create Outfit'}
//             </Text>
//           </TouchableOpacity>
//         </Animatable.View>
//       </View>

//       {/* NEW: Refinement input + button (hidden until outfit exists) */}
//       {/* NEW: Refinement input + button (hidden until outfit exists) */}
//       {showRefine && (
//         <>
//           <View style={{alignItems: 'center', paddingHorizontal: 16}}>
//             <View
//               style={[
//                 globalStyles.promptRow,
//                 {
//                   height: 45,
//                   marginTop: 12,
//                   paddingHorizontal: 14,
//                   borderWidth: tokens.borderWidth.xl,
//                   borderColor: theme.colors.surfaceBorder,
//                   backgroundColor: theme.colors.surface3,
//                   borderRadius: 30,
//                   width: Math.min(width * 0.9, 460), // ✅ adaptive width that looks wide everywhere
//                   alignSelf: 'center',
//                 },
//               ]}>
//               <TextInput
//                 style={[
//                   globalStyles.promptInput,
//                   {color: theme.colors.foreground, flex: 1},
//                 ]}
//                 value={refineText}
//                 onChangeText={setRefineText}
//                 placeholder="Refine outfit (e.g. make shorts more colorful)"
//                 placeholderTextColor="#888"
//               />

//               {/* ✅ Clear Button — one tap fix */}
//               {refineText.length > 0 && (
//                 <TouchableOpacity
//                   onPress={async () => {
//                     try {
//                       // ✅ stop + cancel to flush any partial recognition
//                       await Voice.stop();
//                       await Voice.cancel();
//                     } catch (e) {
//                       console.warn('Voice stop/cancel error:', e);
//                     }

//                     // ✅ delay a moment to avoid race with onSpeechResults
//                     setTimeout(() => {
//                       setRefineText('');
//                       setIsListening(false);
//                     }, 100);
//                   }}
//                   style={{paddingHorizontal: 8}}>
//                   <MaterialIcons
//                     name="close"
//                     size={22}
//                     color={theme.colors.foreground2}
//                   />
//                 </TouchableOpacity>
//               )}

//               {/* 🎙️ Mic toggle */}
//               <TouchableOpacity onPress={toggleListening}>
//                 <MaterialIcons
//                   name={isListening ? 'mic' : 'mic-none'}
//                   size={22}
//                   color={theme.colors.foreground}
//                   style={{marginRight: 6}}
//                 />
//               </TouchableOpacity>
//             </View>
//           </View>

//           <View
//             style={{
//               display: 'flex',
//               justifyContent: 'center',
//               alignItems: 'center',
//             }}>
//             <TouchableOpacity
//               style={S.refineCta}
//               onPress={() => {
//                 if (onRefine && refineText.trim()) {
//                   h('impactLight');
//                   onRefine(refineText.trim());
//                   setRefineText('');
//                   setIsListening(false);
//                 }
//               }}
//               disabled={isGenerating}
//               accessibilityState={{disabled: isGenerating}}
//               testID="refine-outfit-button">
//               <Text style={S.ctaText}>
//                 {isGenerating ? 'Refining…' : 'Update Outfit'}
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </>
//       )}

//       {/* EVERYTHING BELOW THE CTA IS NOW COLLAPSIBLE */}
//       {showExtras && (
//         <>
//           {/* ⬇️ Moved OUT of Advanced: AI Style Agent */}
//           <View style={[S.row, {marginTop: 18, marginBottom: 2}]}>
//             <Text style={S.label}>Stylist Presets</Text>
//           </View>

//           <View style={openStyleAgent ? S.ddWrapperOpen : S.ddWrapper}>
//             <DropDownPicker
//               open={openStyleAgent}
//               setOpen={setOpenStyleAgent}
//               value={styleAgent ?? null}
//               setValue={next => {
//                 const resolved =
//                   typeof next === 'function'
//                     ? (next(styleAgent) as StyleAgentKey | null)
//                     : (next as StyleAgentKey | null);
//                 h('impactLight');
//                 onChangeStyleAgent?.(resolved);
//               }}
//               items={styleAgentOptions}
//               placeholder="Choose (Optional)"
//               listMode="SCROLLVIEW"
//               maxHeight={580}
//               scrollViewProps={{nestedScrollEnabled: true}}
//               dropDownDirection="AUTO"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{
//                 backgroundColor: theme.colors.surface,
//                 zIndex: 9999,
//                 elevation: 9999,
//                 maxHeight: 180,
//               }}
//               onOpen={() => h('selection')}
//             />
//           </View>

//           {/* Weather row */}
//           <View style={[S.row, {marginTop: 22}]}>
//             <View style={S.subRow}>
//               <Switch
//                 value={useWeather}
//                 onValueChange={enabled => {
//                   h('selection');
//                   onToggleWeather(enabled);
//                   if (!enabled) setShowWeatherPicker(false);
//                 }}
//                 trackColor={{false: '#767577', true: theme.colors.button1}}
//                 thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//               />
//               <Text style={S.label}>Use Weather</Text>
//               <Text
//                 style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//                 ({modeLabel})
//               </Text>
//             </View>

//             <TouchableOpacity
//               disabled={weatherDisabled}
//               onPress={() => {
//                 if (!weatherDisabled) h('selection');
//                 setShowWeatherPicker(s => !s);
//               }}
//               activeOpacity={0.8}
//               style={[
//                 S.pill,
//                 S.pillPrimary2,
//                 {opacity: weatherDisabled ? 0.2 : 1},
//               ]}>
//               <Text style={S.pillTextPrimary}>
//                 {showWeatherPicker ? 'Hide Controls' : 'Advanced Weather'}
//               </Text>
//             </TouchableOpacity>
//           </View>

//           {/* Weather picker */}
//           {showWeatherPicker && (
//             <View style={openWeather ? S.ddWrapperOpen : S.ddWrapper}>
//               <DropDownPicker
//                 open={openWeather}
//                 setOpen={setOpenWeather}
//                 value={weather}
//                 setValue={val => {
//                   h('selection');
//                   onChangeWeather(val as unknown as string);
//                 }}
//                 items={weatherOptions}
//                 placeholder={
//                   useWeather ? 'Choose weather option' : 'Weather (disabled)'
//                 }
//                 listMode="SCROLLVIEW"
//                 dropDownDirection="AUTO"
//                 style={{backgroundColor: theme.colors.surface}}
//                 textStyle={{color: theme.colors.foreground}}
//                 dropDownContainerStyle={{
//                   backgroundColor: theme.colors.surface,
//                   zIndex: 9999,
//                   elevation: 9999,
//                 }}
//                 disabled={weatherDisabled}
//                 onOpen={() => h('selection')}
//               />
//               <Text style={[S.faint, {marginTop: 6}]}>
//                 {useWeather
//                   ? 'Auto uses your current location.'
//                   : 'Weather is off — outfits ignore weather.'}
//               </Text>
//             </View>
//           )}

//           {/* RBAC - Advanced controls gear */}
//           {role !== 'developer' && (
//             <View style={[S.row, {marginTop: 4}]}>
//               <Text style={[S.faint]}>Advanced Controls</Text>
//               <TouchableOpacity
//                 onPress={() => {
//                   h('selection');
//                   setShowMoreOptions(s => !s);
//                 }}
//                 onLongPress={() => {
//                   h('impactMedium');
//                   setShowHiddenDev(v => !v);
//                 }}
//                 delayLongPress={500}
//                 activeOpacity={0.8}
//                 accessibilityRole="button"
//                 accessibilityLabel={
//                   showMoreOptions ? 'Hide options' : 'Show options'
//                 }
//                 testID="options-gear-button"
//                 style={S.iconBtn}>
//                 <MaterialIcons
//                   name="settings"
//                   size={20}
//                   color={theme.colors.primary}
//                 />
//               </TouchableOpacity>
//             </View>
//           )}

//           {/* Advanced section */}
//           {showMoreOptions && (
//             <View style={{gap: 10}}>
//               <View style={[S.row, {marginTop: 6}]}>
//                 <View style={S.subRow}>
//                   <Switch
//                     value={feedbackEnabled}
//                     onValueChange={enabled => {
//                       h('selection');
//                       setFeedbackEnabled(enabled);
//                       onToggleFeedback?.(enabled);
//                     }}
//                     trackColor={{false: '#767577', true: theme.colors.button1}}
//                     thumbColor={feedbackEnabled ? '#fff' : '#f4f3f4'}
//                   />
//                   <Text style={S.label}>Use Feedback Influence</Text>
//                   <Text
//                     style={[
//                       S.label,
//                       {marginLeft: 10, color: theme.colors.muted},
//                     ]}>
//                     ({feedbackEnabled ? 'On' : 'Off'})
//                   </Text>
//                 </View>
//                 <Text style={[S.faint]} />
//               </View>

//               {/* DEV: Scoring Weights */}
//               <View style={S.card}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <Text style={S.cardTitle}>Scoring Weights (dev)</Text>
//                   <TouchableOpacity
//                     onPress={() => {
//                       h('impactLight');
//                       onChangeWeights?.(DEFAULT_WEIGHTS);
//                     }}
//                     style={{
//                       paddingVertical: 6,
//                       paddingHorizontal: 10,
//                       borderRadius: 8,
//                       backgroundColor: '#333',
//                     }}>
//                     <Text style={{color: '#fff', fontWeight: '600'}}>
//                       Reset
//                     </Text>
//                   </TouchableOpacity>
//                 </View>

//                 <SliderLite
//                   label="Constraints"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.constraintsWeight}
//                   onChange={v => setWeights({constraintsWeight: v})}
//                 />

//                 <SliderLite
//                   label="Style"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.styleWeight}
//                   onChange={v => setWeights({styleWeight: v})}
//                   disabled={!useStylePrefs}
//                 />

//                 <SliderLite
//                   label="Weather"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.weatherWeight}
//                   onChange={v => setWeights({weatherWeight: v})}
//                 />
//               </View>
//             </View>
//           )}

//           <View style={{marginTop: 8}}>
//             {statusText ? (
//               <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
//             ) : null}
//           </View>
//         </>
//       )}
//     </View>
//   );
// }

////////////////

// import React, {useMemo, useRef, useState, useEffect} from 'react';
// import {
//   View,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   Switch,
//   Pressable,
//   LayoutChangeEvent,
//   TextInput,
// } from 'react-native';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAuthRole} from '../../hooks/useAuthRole';
// import {STYLE_AGENTS} from '../../../../backend-nest/src/wardrobe/logic/style-agents';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import Voice from '@react-native-voice/voice';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

// type StyleAgentKey = keyof typeof STYLE_AGENTS;

// const DEFAULT_WEIGHTS: Weights = {
//   constraintsWeight: 1.0,
//   styleWeight: 1.2,
//   weatherWeight: 0.8,
// };

// type Props = {
//   weather: string; // 'auto' | 'hot' | 'cold' | 'rainy'
//   onChangeWeather: (value: string) => void;

//   // Weather toggle
//   useWeather: boolean;
//   onToggleWeather: (enabled: boolean) => void;

//   // Style profile toggle
//   useStylePrefs: boolean;
//   onToggleStylePrefs: (enabled: boolean) => void;

//   // NEW — Feedback influence toggle (optional props; default ON)
//   useFeedback?: boolean;
//   onToggleFeedback?: (enabled: boolean) => void;

//   // NEW — Style Agent override
//   styleAgent?: StyleAgentKey | null;
//   onChangeStyleAgent?: (agent: StyleAgentKey | null) => void;

//   // weights controls (nullable from parent; we’ll default safely)
//   weights?: Weights;
//   onChangeWeights?: (w: Weights) => void;

//   onRegenerate: () => void;
//   onGenerate?: () => void;
//   onRefine?: (refinement: string) => void;
//   isGenerating?: boolean;
//   statusText?: string; // e.g. "Using local weather: 70°F · none · wind 12 mph"

//   // ⬇️ NEW — gate "Generate Outfit" on prompt
//   canGenerate?: boolean; // default true if omitted
//   // ⬇️ NEW — control visibility of Refine UI
//   showRefine?: boolean; // default true
// };

// /** Minimal slider with NO external packages */
// function SliderLite({
//   label,
//   min = 0,
//   max = 2,
//   step = 0.1,
//   value,
//   onChange,
//   disabled = false,
// }: {
//   label: string;
//   min?: number;
//   max?: number;
//   step?: number;
//   value: number;
//   onChange: (v: number) => void;
//   disabled?: boolean;
// }) {
//   const trackWidth = useRef(1);

//   const clamp = (v: number) => Math.min(max, Math.max(min, v));
//   const toStep = (v: number) => Math.round(v / step) * step;

//   const pct = useMemo(() => {
//     const p = ((value - min) / (max - min)) * 100;
//     return Math.max(0, Math.min(100, isFinite(p) ? p : 0));
//   }, [value, min, max]);

//   const onTrackLayout = (e: LayoutChangeEvent) => {
//     trackWidth.current = Math.max(1, e.nativeEvent.layout.width);
//   };

//   const setFromX = (x: number) => {
//     const ratio = Math.max(0, Math.min(1, x / trackWidth.current));
//     const raw = min + ratio * (max - min);
//     onChange(clamp(toStep(raw)));
//   };

//   return (
//     <View style={{opacity: disabled ? 0.4 : 1}}>
//       <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
//         <Text style={{fontSize: 12, color: '#9aa0a6'}}>{label}</Text>
//         <Text style={{fontSize: 12, color: '#9aa0a6'}}>{value.toFixed(2)}</Text>
//       </View>

//       <Pressable
//         disabled={disabled}
//         onLayout={onTrackLayout}
//         onPress={e => {
//           h('selection');
//           setFromX(e.nativeEvent.locationX);
//         }}
//         style={{
//           height: 28,
//           borderRadius: 999,
//           backgroundColor: '#2a2a2a',
//           justifyContent: 'center',
//           marginTop: 6,
//         }}>
//         <View
//           style={{
//             width: `${pct}%`,
//             height: 8,
//             marginHorizontal: 8,
//             borderRadius: 999,
//             backgroundColor: '#405de6',
//           }}
//         />
//       </Pressable>

//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 6,
//         }}>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => {
//             h('selection');
//             onChange(clamp(toStep(value - step)));
//           }}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 8,
//             backgroundColor: '#333',
//           }}>
//           <Text style={{color: '#fff'}}>-</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => {
//             h('selection');
//             onChange(clamp(toStep(value + step)));
//           }}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 8,
//             backgroundColor: '#333',
//           }}>
//           <Text style={{color: '#fff'}}>+</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// export default function OutfitTuningControls({
//   weather,
//   onChangeWeather,
//   onRegenerate,
//   useWeather,
//   onToggleWeather,
//   useStylePrefs,
//   onToggleStylePrefs,
//   useFeedback = true,
//   onToggleFeedback,
//   styleAgent,
//   onChangeStyleAgent,
//   weights,
//   onChangeWeights,
//   isGenerating = false,
//   statusText,
//   onRefine,
//   canGenerate = true,
//   showRefine = true,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const role = useAuthRole();

//   const S = StyleSheet.create({
//     container: {width: '100%', paddingHorizontal: 20, gap: 12},
//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     section: {gap: 10},
//     subRow: {flexDirection: 'row', alignItems: 'center'},
//     label: {marginLeft: 8, color: theme.colors.foreground, fontSize: 14},
//     faint: {color: theme.colors.muted, fontSize: 12},
//     pill: {borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12},
//     pillPrimary2: {
//       backgroundColor: isGenerating
//         ? theme.colors.button1
//         : theme.colors.button1,
//     },
//     iconBtn: {
//       width: 25,
//       height: 25,
//       borderRadius: 18,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     headerTitle: {
//       fontSize: 22,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     headerSubtitle: {
//       fontSize: 13,
//       color: theme.colors.muted,
//       marginTop: 2,
//     },
//     // cta: {
//     //   height: 48,
//     //   borderRadius: 50,
//     //   justifyContent: 'center',
//     //   alignItems: 'center',
//     //   backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//     //   opacity: isGenDisabled ? 0.5 : 1,
//     //   marginTop: 8,
//     //   marginBottom: 4,
//     //   width: 150,
//     // },
//     headerWrap: {marginTop: 4, marginBottom: 4},
//     card: {
//       padding: 12,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//     },
//     cardTitle: {color: theme.colors.foreground, fontWeight: '600'},
//     ddWrapper: {
//       position: 'relative',
//       zIndex: 9999,
//     },
//     ddWrapperOpen: {
//       position: 'relative',
//       zIndex: 9999,
//       elevation: 9999,
//     },
//     card: {
//       padding: 12,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//     },
//     pillTextPrimary: {color: '#fff', fontWeight: '600', fontSize: 13},
//     refineInputContainer: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       width: 400,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface3,
//       paddingHorizontal: 14,
//       marginTop: 10,
//     },
//     refineInput: {
//       paddingHorizontal: 0,
//       paddingVertical: 12,

//       color: theme.colors.foreground,
//       fontSize: 16,
//       fontWeight: '400',
//     },
//     micButton: {
//       marginRight: 20,
//     },
//     micIcon: {
//       color: theme.colors.foreground,
//     },
//     refineCta: {
//       height: 48,
//       borderRadius: 50,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: '#ff8c00',
//       opacity: isGenerating ? 0.7 : 1,
//       marginTop: 12,
//       marginBottom: 12,
//       width: 150,
//     },
//     ctaText: {color: theme.colors.buttonText1, fontSize: 16, fontWeight: '700'},
//     hint: {
//       textAlign: 'center',
//       marginBottom: 8,
//       color: theme.colors.muted,
//       fontSize: 12,
//     },
//   });

//   // voice state
//   const [isListening, setIsListening] = useState(false);

//   useEffect(() => {
//     Voice.onSpeechResults = e => {
//       if (e.value && e.value.length > 0) setRefineText(e.value[0]);
//     };
//     Voice.onSpeechEnd = () => setIsListening(false);
//     Voice.onSpeechError = () => setIsListening(false);

//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   const toggleListening = async () => {
//     if (isListening) {
//       await Voice.stop();
//       setIsListening(false);
//     } else {
//       try {
//         h('impactLight');
//         await Voice.start('en-US');
//         setIsListening(true);
//       } catch (e) {
//         // console.log('🎙️ Voice start error:', e);
//         setIsListening(false);
//       }
//     }
//   };

//   // SAFE DEFAULTS so we never blow up if parent forgets to pass weights
//   const w: Weights = weights ?? DEFAULT_WEIGHTS;

//   const setWeights = (next: Partial<Weights>) => {
//     const merged = {...w, ...next};
//     onChangeWeights?.(merged);
//   };

//   // Dropdown state
//   const [openWeather, setOpenWeather] = useState(false);
//   const [openStyleAgent, setOpenStyleAgent] = useState(false);

//   // Panels
//   const [showWeatherPicker, setShowWeatherPicker] = useState(false);
//   const [showMoreOptions, setShowMoreOptions] = useState(false);

//   // NEW — hidden developer controls (revealed with a long-press on gear)
//   const [showHiddenDev, setShowHiddenDev] = useState(false);
//   const [feedbackEnabled, setFeedbackEnabled] = useState(useFeedback);

//   // 👇 NEW refinement input state
//   const [refineText, setRefineText] = useState('');

//   // 👇 NEW — collapses EVERYTHING below the CTA behind a single gear
//   const [showExtras, setShowExtras] = useState(false);

//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: 'Hot Weather', value: 'hot'},
//     {label: 'Cold Weather', value: 'cold'},
//     {label: 'Rainy Weather', value: 'rainy'},
//   ];

//   const styleAgentOptions = useMemo(() => {
//     const none = [
//       {label: 'None (Use My Style Preferences)', value: null as null},
//     ];

//     const numbered = Object.entries(STYLE_AGENTS)
//       .sort(([a], [b]) => {
//         const na = parseInt(a.replace('agent', ''), 10);
//         const nb = parseInt(b.replace('agent', ''), 10);
//         return na - nb;
//       })
//       .map(([key, cfg]) => ({
//         label: cfg.name,
//         value: key as StyleAgentKey,
//       }));

//     return [...none, ...numbered];
//   }, []);

//   const isGenDisabled = !canGenerate || isGenerating;
//   const weatherDisabled = !useWeather;
//   const modeLabel = useWeather
//     ? weather === 'auto'
//       ? 'Auto'
//       : weather === 'hot'
//       ? 'Hot'
//       : weather === 'cold'
//       ? 'Cold'
//       : 'Rainy'
//     : 'Off';

//   return (
//     <View style={S.container}>
//       {/* Primary CTA */}
//       <View
//         style={{
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         <Animatable.View
//           animation="fadeInUp"
//           delay={100}
//           duration={800}
//           easing="ease-out-back"
//           useNativeDriver>
//           <TouchableOpacity
//             style={[globalStyles.buttonPrimary, {width: 140}]}
//             onPress={() => {
//               h('impactMedium');
//               onRegenerate();
//             }}
//             disabled={isGenDisabled}
//             accessibilityState={{disabled: isGenDisabled}}
//             testID="generate-outfit-button">
//             <Text style={[globalStyles.buttonPrimaryText, {fontWeight: '700'}]}>
//               {isGenerating ? 'Generating…' : 'Create Outfit'}
//             </Text>
//           </TouchableOpacity>
//         </Animatable.View>
//       </View>

//       {/* NEW: Refinement input + button (hidden until outfit exists) */}
//       {showRefine && (
//         <>
//           <View style={{alignItems: 'center', paddingHorizontal: 16}}>
//             <View
//               style={[
//                 globalStyles.promptRow,
//                 {
//                   height: 45,
//                   marginTop: 12,
//                   paddingHorizontal: 14,
//                   borderWidth: tokens.borderWidth.xl,
//                   borderColor: theme.colors.surfaceBorder,
//                   backgroundColor: theme.colors.surface3,
//                   borderRadius: 20,
//                   width: 400,
//                 },
//               ]}>
//               <TextInput
//                 style={[
//                   globalStyles.promptInput,
//                   {color: theme.colors.foreground},
//                 ]}
//                 value={refineText}
//                 onChangeText={setRefineText}
//                 placeholder="Refine outfit (e.g. make shorts more colorful)"
//                 placeholderTextColor="#888"
//               />
//               <TouchableOpacity onPress={toggleListening}>
//                 <MaterialIcons
//                   name={isListening ? 'mic' : 'mic-none'}
//                   size={22}
//                   color={theme.colors.foreground}
//                   style={{marginRight: 30}}
//                 />
//               </TouchableOpacity>
//             </View>
//           </View>
//           <View
//             style={{
//               display: 'flex',
//               justifyContent: 'center',
//               alignItems: 'center',
//             }}>
//             <TouchableOpacity
//               style={S.refineCta}
//               onPress={() => {
//                 if (onRefine && refineText.trim()) {
//                   h('impactLight');
//                   onRefine(refineText.trim());
//                   setRefineText('');
//                 }
//               }}
//               disabled={isGenerating}
//               accessibilityState={{disabled: isGenerating}}
//               testID="refine-outfit-button">
//               <Text style={S.ctaText}>
//                 {isGenerating ? 'Refining…' : 'Update Outfit'}
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </>
//       )}

//       {/* EVERYTHING BELOW THE CTA IS NOW COLLAPSIBLE */}
//       {showExtras && (
//         <>
//           {/* ⬇️ Moved OUT of Advanced: AI Style Agent */}
//           <View style={[S.row, {marginTop: 18, marginBottom: 2}]}>
//             <Text style={S.label}>Stylist Presets</Text>
//           </View>

//           <View style={openStyleAgent ? S.ddWrapperOpen : S.ddWrapper}>
//             <DropDownPicker
//               open={openStyleAgent}
//               setOpen={setOpenStyleAgent}
//               value={styleAgent ?? null}
//               setValue={next => {
//                 const resolved =
//                   typeof next === 'function'
//                     ? (next(styleAgent) as StyleAgentKey | null)
//                     : (next as StyleAgentKey | null);
//                 h('impactLight');
//                 onChangeStyleAgent?.(resolved);
//               }}
//               items={styleAgentOptions}
//               placeholder="Choose (Optional)"
//               listMode="SCROLLVIEW"
//               maxHeight={580}
//               scrollViewProps={{nestedScrollEnabled: true}}
//               dropDownDirection="AUTO"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{
//                 backgroundColor: theme.colors.surface,
//                 zIndex: 9999,
//                 elevation: 9999,
//                 maxHeight: 180,
//               }}
//               onOpen={() => h('selection')}
//             />
//           </View>

//           {/* Weather row */}
//           <View style={[S.row, {marginTop: 22}]}>
//             <View style={S.subRow}>
//               <Switch
//                 value={useWeather}
//                 onValueChange={enabled => {
//                   h('selection');
//                   onToggleWeather(enabled);
//                   if (!enabled) setShowWeatherPicker(false);
//                 }}
//                 trackColor={{false: '#767577', true: theme.colors.button1}}
//                 thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//               />
//               <Text style={S.label}>Use Weather</Text>
//               <Text
//                 style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//                 ({modeLabel})
//               </Text>
//             </View>

//             <TouchableOpacity
//               disabled={weatherDisabled}
//               onPress={() => {
//                 if (!weatherDisabled) h('selection');
//                 setShowWeatherPicker(s => !s);
//               }}
//               activeOpacity={0.8}
//               style={[
//                 S.pill,
//                 S.pillPrimary2,
//                 {opacity: weatherDisabled ? 0.2 : 1},
//               ]}>
//               <Text style={S.pillTextPrimary}>
//                 {showWeatherPicker ? 'Hide Controls' : 'Advanced Weather'}
//               </Text>
//             </TouchableOpacity>
//           </View>

//           {/* Weather picker */}
//           {showWeatherPicker && (
//             <View style={openWeather ? S.ddWrapperOpen : S.ddWrapper}>
//               <DropDownPicker
//                 open={openWeather}
//                 setOpen={setOpenWeather}
//                 value={weather}
//                 setValue={val => {
//                   h('selection');
//                   onChangeWeather(val as unknown as string);
//                 }}
//                 items={weatherOptions}
//                 placeholder={
//                   useWeather ? 'Choose weather option' : 'Weather (disabled)'
//                 }
//                 listMode="SCROLLVIEW"
//                 dropDownDirection="AUTO"
//                 style={{backgroundColor: theme.colors.surface}}
//                 textStyle={{color: theme.colors.foreground}}
//                 dropDownContainerStyle={{
//                   backgroundColor: theme.colors.surface,
//                   zIndex: 9999,
//                   elevation: 9999,
//                 }}
//                 disabled={weatherDisabled}
//                 onOpen={() => h('selection')}
//               />
//               <Text style={[S.faint, {marginTop: 6}]}>
//                 {useWeather
//                   ? 'Auto uses your current location.'
//                   : 'Weather is off — outfits ignore weather.'}
//               </Text>
//             </View>
//           )}

//           {/* RBAC - Advanced controls gear */}
//           {role !== 'developer' && (
//             <View style={[S.row, {marginTop: 4}]}>
//               <Text style={[S.faint]}>Advanced Controls</Text>
//               <TouchableOpacity
//                 onPress={() => {
//                   h('selection');
//                   setShowMoreOptions(s => !s);
//                 }}
//                 onLongPress={() => {
//                   h('impactMedium');
//                   setShowHiddenDev(v => !v);
//                 }}
//                 delayLongPress={500}
//                 activeOpacity={0.8}
//                 accessibilityRole="button"
//                 accessibilityLabel={
//                   showMoreOptions ? 'Hide options' : 'Show options'
//                 }
//                 testID="options-gear-button"
//                 style={S.iconBtn}>
//                 <MaterialIcons
//                   name="settings"
//                   size={20}
//                   color={theme.colors.primary}
//                 />
//               </TouchableOpacity>
//             </View>
//           )}

//           {/* Advanced section */}
//           {showMoreOptions && (
//             <View style={{gap: 10}}>
//               <View style={[S.row, {marginTop: 6}]}>
//                 <View style={S.subRow}>
//                   <Switch
//                     value={feedbackEnabled}
//                     onValueChange={enabled => {
//                       h('selection');
//                       setFeedbackEnabled(enabled);
//                       onToggleFeedback?.(enabled);
//                     }}
//                     trackColor={{false: '#767577', true: theme.colors.button1}}
//                     thumbColor={feedbackEnabled ? '#fff' : '#f4f3f4'}
//                   />
//                   <Text style={S.label}>Use Feedback Influence</Text>
//                   <Text
//                     style={[
//                       S.label,
//                       {marginLeft: 10, color: theme.colors.muted},
//                     ]}>
//                     ({feedbackEnabled ? 'On' : 'Off'})
//                   </Text>
//                 </View>
//                 <Text style={[S.faint]} />
//               </View>

//               {/* DEV: Scoring Weights */}
//               <View style={S.card}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <Text style={S.cardTitle}>Scoring Weights (dev)</Text>
//                   <TouchableOpacity
//                     onPress={() => {
//                       h('impactLight');
//                       onChangeWeights?.(DEFAULT_WEIGHTS);
//                     }}
//                     style={{
//                       paddingVertical: 6,
//                       paddingHorizontal: 10,
//                       borderRadius: 8,
//                       backgroundColor: '#333',
//                     }}>
//                     <Text style={{color: '#fff', fontWeight: '600'}}>
//                       Reset
//                     </Text>
//                   </TouchableOpacity>
//                 </View>

//                 <SliderLite
//                   label="Constraints"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.constraintsWeight}
//                   onChange={v => setWeights({constraintsWeight: v})}
//                 />

//                 <SliderLite
//                   label="Style"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.styleWeight}
//                   onChange={v => setWeights({styleWeight: v})}
//                   disabled={!useStylePrefs}
//                 />

//                 <SliderLite
//                   label="Weather"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.weatherWeight}
//                   onChange={v => setWeights({weatherWeight: v})}
//                 />
//               </View>
//             </View>
//           )}

//           <View style={{marginTop: 8}}>
//             {statusText ? (
//               <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
//             ) : null}
//           </View>
//         </>
//       )}
//     </View>
//   );
// }

//////////////////////

// import React, {useMemo, useRef, useState, useEffect} from 'react';
// import {
//   View,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   Switch,
//   Pressable,
//   LayoutChangeEvent,
//   TextInput,
// } from 'react-native';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAuthRole} from '../../hooks/useAuthRole';
// import {STYLE_AGENTS} from '../../../../backend-nest/src/wardrobe/logic/style-agents';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import Voice from '@react-native-voice/voice';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

// type StyleAgentKey = keyof typeof STYLE_AGENTS;

// const DEFAULT_WEIGHTS: Weights = {
//   constraintsWeight: 1.0,
//   styleWeight: 1.2,
//   weatherWeight: 0.8,
// };

// type Props = {
//   weather: string; // 'auto' | 'hot' | 'cold' | 'rainy'
//   onChangeWeather: (value: string) => void;

//   // Weather toggle
//   useWeather: boolean;
//   onToggleWeather: (enabled: boolean) => void;

//   // Style profile toggle
//   useStylePrefs: boolean;
//   onToggleStylePrefs: (enabled: boolean) => void;

//   // NEW — Feedback influence toggle (optional props; default ON)
//   useFeedback?: boolean;
//   onToggleFeedback?: (enabled: boolean) => void;

//   // NEW — Style Agent override
//   styleAgent?: StyleAgentKey | null;
//   onChangeStyleAgent?: (agent: StyleAgentKey | null) => void;

//   // weights controls (nullable from parent; we’ll default safely)
//   weights?: Weights;
//   onChangeWeights?: (w: Weights) => void;

//   onRegenerate: () => void;
//   onGenerate?: () => void;
//   onRefine?: (refinement: string) => void;
//   isGenerating?: boolean;
//   statusText?: string; // e.g. "Using local weather: 70°F · none · wind 12 mph"

//   // ⬇️ NEW — gate "Generate Outfit" on prompt
//   canGenerate?: boolean; // default true if omitted
//   // ⬇️ NEW — control visibility of Refine UI
//   showRefine?: boolean; // default true
// };

// /** Minimal slider with NO external packages */
// function SliderLite({
//   label,
//   min = 0,
//   max = 2,
//   step = 0.1,
//   value,
//   onChange,
//   disabled = false,
// }: {
//   label: string;
//   min?: number;
//   max?: number;
//   step?: number;
//   value: number;
//   onChange: (v: number) => void;
//   disabled?: boolean;
// }) {
//   const trackWidth = useRef(1);

//   const clamp = (v: number) => Math.min(max, Math.max(min, v));
//   const toStep = (v: number) => Math.round(v / step) * step;

//   const pct = useMemo(() => {
//     const p = ((value - min) / (max - min)) * 100;
//     return Math.max(0, Math.min(100, isFinite(p) ? p : 0));
//   }, [value, min, max]);

//   const onTrackLayout = (e: LayoutChangeEvent) => {
//     trackWidth.current = Math.max(1, e.nativeEvent.layout.width);
//   };

//   const setFromX = (x: number) => {
//     const ratio = Math.max(0, Math.min(1, x / trackWidth.current));
//     const raw = min + ratio * (max - min);
//     onChange(clamp(toStep(raw)));
//   };

//   return (
//     <View style={{opacity: disabled ? 0.4 : 1}}>
//       <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
//         <Text style={{fontSize: 12, color: '#9aa0a6'}}>{label}</Text>
//         <Text style={{fontSize: 12, color: '#9aa0a6'}}>{value.toFixed(2)}</Text>
//       </View>

//       <Pressable
//         disabled={disabled}
//         onLayout={onTrackLayout}
//         onPress={e => {
//           h('selection');
//           setFromX(e.nativeEvent.locationX);
//         }}
//         style={{
//           height: 28,
//           borderRadius: 999,
//           backgroundColor: '#2a2a2a',
//           justifyContent: 'center',
//           marginTop: 6,
//         }}>
//         <View
//           style={{
//             width: `${pct}%`,
//             height: 8,
//             marginHorizontal: 8,
//             borderRadius: 999,
//             backgroundColor: '#405de6',
//           }}
//         />
//       </Pressable>

//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 6,
//         }}>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => {
//             h('selection');
//             onChange(clamp(toStep(value - step)));
//           }}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 8,
//             backgroundColor: '#333',
//           }}>
//           <Text style={{color: '#fff'}}>-</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => {
//             h('selection');
//             onChange(clamp(toStep(value + step)));
//           }}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 8,
//             backgroundColor: '#333',
//           }}>
//           <Text style={{color: '#fff'}}>+</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// export default function OutfitTuningControls({
//   weather,
//   onChangeWeather,
//   onRegenerate,
//   useWeather,
//   onToggleWeather,
//   useStylePrefs,
//   onToggleStylePrefs,
//   useFeedback = true,
//   onToggleFeedback,
//   styleAgent,
//   onChangeStyleAgent,
//   weights,
//   onChangeWeights,
//   isGenerating = false,
//   statusText,
//   onRefine,
//   canGenerate = true,
//   showRefine = true,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const role = useAuthRole();

//   const S = StyleSheet.create({
//     container: {width: '100%', paddingHorizontal: 20, gap: 12},
//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     section: {gap: 10},
//     subRow: {flexDirection: 'row', alignItems: 'center'},
//     label: {marginLeft: 8, color: theme.colors.foreground, fontSize: 14},
//     faint: {color: theme.colors.muted, fontSize: 12},
//     pill: {borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12},
//     pillPrimary2: {
//       backgroundColor: isGenerating
//         ? theme.colors.button1
//         : theme.colors.button1,
//     },
//     iconBtn: {
//       width: 25,
//       height: 25,
//       borderRadius: 18,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     headerTitle: {
//       fontSize: 22,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     headerSubtitle: {
//       fontSize: 13,
//       color: theme.colors.muted,
//       marginTop: 2,
//     },
//     // cta: {
//     //   height: 48,
//     //   borderRadius: 50,
//     //   justifyContent: 'center',
//     //   alignItems: 'center',
//     //   backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//     //   opacity: isGenDisabled ? 0.5 : 1,
//     //   marginTop: 8,
//     //   marginBottom: 4,
//     //   width: 150,
//     // },
//     headerWrap: {marginTop: 4, marginBottom: 4},
//     card: {
//       padding: 12,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//     },
//     cardTitle: {color: theme.colors.foreground, fontWeight: '600'},
//     ddWrapper: {
//       position: 'relative',
//       zIndex: 9999,
//     },
//     ddWrapperOpen: {
//       position: 'relative',
//       zIndex: 9999,
//       elevation: 9999,
//     },
//     card: {
//       padding: 12,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//     },
//     pillTextPrimary: {color: '#fff', fontWeight: '600', fontSize: 13},
//     refineInputContainer: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       width: 400,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface3,
//       paddingHorizontal: 14,
//       marginTop: 10,
//     },
//     refineInput: {
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       marginTop: 10,
//       color: theme.colors.foreground,
//       fontSize: 16,
//       fontWeight: '400',
//     },
//     micButton: {
//       padding: 6,
//     },
//     micIcon: {
//       color: '#ff8c00',
//     },
//     refineCta: {
//       height: 48,
//       borderRadius: 50,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: '#ff8c00',
//       opacity: isGenerating ? 0.7 : 1,
//       marginTop: 12,
//       marginBottom: 12,
//       width: 150,
//     },
//     ctaText: {color: theme.colors.buttonText1, fontSize: 16, fontWeight: '700'},
//     hint: {
//       textAlign: 'center',
//       marginBottom: 8,
//       color: theme.colors.muted,
//       fontSize: 12,
//     },
//   });

//   // voice state
//   const [isListening, setIsListening] = useState(false);

//   useEffect(() => {
//     Voice.onSpeechResults = e => {
//       if (e.value && e.value.length > 0) setRefineText(e.value[0]);
//     };
//     Voice.onSpeechEnd = () => setIsListening(false);
//     Voice.onSpeechError = () => setIsListening(false);

//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   const toggleListening = async () => {
//     if (isListening) {
//       await Voice.stop();
//       setIsListening(false);
//     } else {
//       try {
//         h('impactLight');
//         await Voice.start('en-US');
//         setIsListening(true);
//       } catch (e) {
//         // console.log('🎙️ Voice start error:', e);
//         setIsListening(false);
//       }
//     }
//   };

//   // SAFE DEFAULTS so we never blow up if parent forgets to pass weights
//   const w: Weights = weights ?? DEFAULT_WEIGHTS;

//   const setWeights = (next: Partial<Weights>) => {
//     const merged = {...w, ...next};
//     onChangeWeights?.(merged);
//   };

//   // Dropdown state
//   const [openWeather, setOpenWeather] = useState(false);
//   const [openStyleAgent, setOpenStyleAgent] = useState(false);

//   // Panels
//   const [showWeatherPicker, setShowWeatherPicker] = useState(false);
//   const [showMoreOptions, setShowMoreOptions] = useState(false);

//   // NEW — hidden developer controls (revealed with a long-press on gear)
//   const [showHiddenDev, setShowHiddenDev] = useState(false);
//   const [feedbackEnabled, setFeedbackEnabled] = useState(useFeedback);

//   // 👇 NEW refinement input state
//   const [refineText, setRefineText] = useState('');

//   // 👇 NEW — collapses EVERYTHING below the CTA behind a single gear
//   const [showExtras, setShowExtras] = useState(false);

//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: 'Hot Weather', value: 'hot'},
//     {label: 'Cold Weather', value: 'cold'},
//     {label: 'Rainy Weather', value: 'rainy'},
//   ];

//   const styleAgentOptions = useMemo(() => {
//     const none = [
//       {label: 'None (Use My Style Preferences)', value: null as null},
//     ];

//     const numbered = Object.entries(STYLE_AGENTS)
//       .sort(([a], [b]) => {
//         const na = parseInt(a.replace('agent', ''), 10);
//         const nb = parseInt(b.replace('agent', ''), 10);
//         return na - nb;
//       })
//       .map(([key, cfg]) => ({
//         label: cfg.name,
//         value: key as StyleAgentKey,
//       }));

//     return [...none, ...numbered];
//   }, []);

//   const isGenDisabled = !canGenerate || isGenerating;
//   const weatherDisabled = !useWeather;
//   const modeLabel = useWeather
//     ? weather === 'auto'
//       ? 'Auto'
//       : weather === 'hot'
//       ? 'Hot'
//       : weather === 'cold'
//       ? 'Cold'
//       : 'Rainy'
//     : 'Off';

//   return (
//     <View style={S.container}>
//       {/* Primary CTA */}
//       <View
//         style={{
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         <Animatable.View
//           animation="fadeInUp"
//           delay={100}
//           duration={800}
//           easing="ease-out-back"
//           useNativeDriver>
//           <TouchableOpacity
//             style={[globalStyles.buttonPrimary, {width: 140}]}
//             onPress={() => {
//               h('impactMedium');
//               onRegenerate();
//             }}
//             disabled={isGenDisabled}
//             accessibilityState={{disabled: isGenDisabled}}
//             testID="generate-outfit-button">
//             <Text style={[globalStyles.buttonPrimaryText, {fontWeight: '700'}]}>
//               {isGenerating ? 'Generating…' : 'Create Outfit'}
//             </Text>
//           </TouchableOpacity>
//         </Animatable.View>
//       </View>

//       {/* NEW: Refinement input + button (hidden until outfit exists) */}
//       {showRefine && (
//         <>
//           <View style={{alignItems: 'center', paddingHorizontal: 16}}>
//             <View style={S.refineInputContainer}>
//               <TextInput
//                 style={S.refineInput}
//                 value={refineText}
//                 onChangeText={setRefineText}
//                 placeholder="Refine outfit (e.g. make shorts more colorful)"
//                 placeholderTextColor="#888"
//               />
//               <TouchableOpacity onPress={toggleListening} style={S.micButton}>
//                 <MaterialIcons
//                   name={isListening ? 'mic' : 'mic-none'}
//                   size={24}
//                   style={S.micIcon}
//                 />
//               </TouchableOpacity>
//             </View>
//           </View>
//           <View
//             style={{
//               display: 'flex',
//               justifyContent: 'center',
//               alignItems: 'center',
//             }}>
//             <TouchableOpacity
//               style={S.refineCta}
//               onPress={() => {
//                 if (onRefine && refineText.trim()) {
//                   h('impactLight');
//                   onRefine(refineText.trim());
//                   setRefineText('');
//                 }
//               }}
//               disabled={isGenerating}
//               accessibilityState={{disabled: isGenerating}}
//               testID="refine-outfit-button">
//               <Text style={S.ctaText}>
//                 {isGenerating ? 'Refining…' : 'Update Outfit'}
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </>
//       )}

//       {/* EVERYTHING BELOW THE CTA IS NOW COLLAPSIBLE */}
//       {showExtras && (
//         <>
//           {/* ⬇️ Moved OUT of Advanced: AI Style Agent */}
//           <View style={[S.row, {marginTop: 18, marginBottom: 2}]}>
//             <Text style={S.label}>Stylist Presets</Text>
//           </View>

//           <View style={openStyleAgent ? S.ddWrapperOpen : S.ddWrapper}>
//             <DropDownPicker
//               open={openStyleAgent}
//               setOpen={setOpenStyleAgent}
//               value={styleAgent ?? null}
//               setValue={next => {
//                 const resolved =
//                   typeof next === 'function'
//                     ? (next(styleAgent) as StyleAgentKey | null)
//                     : (next as StyleAgentKey | null);
//                 h('impactLight');
//                 onChangeStyleAgent?.(resolved);
//               }}
//               items={styleAgentOptions}
//               placeholder="Choose (Optional)"
//               listMode="SCROLLVIEW"
//               maxHeight={580}
//               scrollViewProps={{nestedScrollEnabled: true}}
//               dropDownDirection="AUTO"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{
//                 backgroundColor: theme.colors.surface,
//                 zIndex: 9999,
//                 elevation: 9999,
//                 maxHeight: 180,
//               }}
//               onOpen={() => h('selection')}
//             />
//           </View>

//           {/* Weather row */}
//           <View style={[S.row, {marginTop: 22}]}>
//             <View style={S.subRow}>
//               <Switch
//                 value={useWeather}
//                 onValueChange={enabled => {
//                   h('selection');
//                   onToggleWeather(enabled);
//                   if (!enabled) setShowWeatherPicker(false);
//                 }}
//                 trackColor={{false: '#767577', true: theme.colors.button1}}
//                 thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//               />
//               <Text style={S.label}>Use Weather</Text>
//               <Text
//                 style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//                 ({modeLabel})
//               </Text>
//             </View>

//             <TouchableOpacity
//               disabled={weatherDisabled}
//               onPress={() => {
//                 if (!weatherDisabled) h('selection');
//                 setShowWeatherPicker(s => !s);
//               }}
//               activeOpacity={0.8}
//               style={[
//                 S.pill,
//                 S.pillPrimary2,
//                 {opacity: weatherDisabled ? 0.2 : 1},
//               ]}>
//               <Text style={S.pillTextPrimary}>
//                 {showWeatherPicker ? 'Hide Controls' : 'Advanced Weather'}
//               </Text>
//             </TouchableOpacity>
//           </View>

//           {/* Weather picker */}
//           {showWeatherPicker && (
//             <View style={openWeather ? S.ddWrapperOpen : S.ddWrapper}>
//               <DropDownPicker
//                 open={openWeather}
//                 setOpen={setOpenWeather}
//                 value={weather}
//                 setValue={val => {
//                   h('selection');
//                   onChangeWeather(val as unknown as string);
//                 }}
//                 items={weatherOptions}
//                 placeholder={
//                   useWeather ? 'Choose weather option' : 'Weather (disabled)'
//                 }
//                 listMode="SCROLLVIEW"
//                 dropDownDirection="AUTO"
//                 style={{backgroundColor: theme.colors.surface}}
//                 textStyle={{color: theme.colors.foreground}}
//                 dropDownContainerStyle={{
//                   backgroundColor: theme.colors.surface,
//                   zIndex: 9999,
//                   elevation: 9999,
//                 }}
//                 disabled={weatherDisabled}
//                 onOpen={() => h('selection')}
//               />
//               <Text style={[S.faint, {marginTop: 6}]}>
//                 {useWeather
//                   ? 'Auto uses your current location.'
//                   : 'Weather is off — outfits ignore weather.'}
//               </Text>
//             </View>
//           )}

//           {/* RBAC - Advanced controls gear */}
//           {role !== 'developer' && (
//             <View style={[S.row, {marginTop: 4}]}>
//               <Text style={[S.faint]}>Advanced Controls</Text>
//               <TouchableOpacity
//                 onPress={() => {
//                   h('selection');
//                   setShowMoreOptions(s => !s);
//                 }}
//                 onLongPress={() => {
//                   h('impactMedium');
//                   setShowHiddenDev(v => !v);
//                 }}
//                 delayLongPress={500}
//                 activeOpacity={0.8}
//                 accessibilityRole="button"
//                 accessibilityLabel={
//                   showMoreOptions ? 'Hide options' : 'Show options'
//                 }
//                 testID="options-gear-button"
//                 style={S.iconBtn}>
//                 <MaterialIcons
//                   name="settings"
//                   size={20}
//                   color={theme.colors.primary}
//                 />
//               </TouchableOpacity>
//             </View>
//           )}

//           {/* Advanced section */}
//           {showMoreOptions && (
//             <View style={{gap: 10}}>
//               <View style={[S.row, {marginTop: 6}]}>
//                 <View style={S.subRow}>
//                   <Switch
//                     value={feedbackEnabled}
//                     onValueChange={enabled => {
//                       h('selection');
//                       setFeedbackEnabled(enabled);
//                       onToggleFeedback?.(enabled);
//                     }}
//                     trackColor={{false: '#767577', true: theme.colors.button1}}
//                     thumbColor={feedbackEnabled ? '#fff' : '#f4f3f4'}
//                   />
//                   <Text style={S.label}>Use Feedback Influence</Text>
//                   <Text
//                     style={[
//                       S.label,
//                       {marginLeft: 10, color: theme.colors.muted},
//                     ]}>
//                     ({feedbackEnabled ? 'On' : 'Off'})
//                   </Text>
//                 </View>
//                 <Text style={[S.faint]} />
//               </View>

//               {/* DEV: Scoring Weights */}
//               <View style={S.card}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <Text style={S.cardTitle}>Scoring Weights (dev)</Text>
//                   <TouchableOpacity
//                     onPress={() => {
//                       h('impactLight');
//                       onChangeWeights?.(DEFAULT_WEIGHTS);
//                     }}
//                     style={{
//                       paddingVertical: 6,
//                       paddingHorizontal: 10,
//                       borderRadius: 8,
//                       backgroundColor: '#333',
//                     }}>
//                     <Text style={{color: '#fff', fontWeight: '600'}}>
//                       Reset
//                     </Text>
//                   </TouchableOpacity>
//                 </View>

//                 <SliderLite
//                   label="Constraints"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.constraintsWeight}
//                   onChange={v => setWeights({constraintsWeight: v})}
//                 />

//                 <SliderLite
//                   label="Style"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.styleWeight}
//                   onChange={v => setWeights({styleWeight: v})}
//                   disabled={!useStylePrefs}
//                 />

//                 <SliderLite
//                   label="Weather"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.weatherWeight}
//                   onChange={v => setWeights({weatherWeight: v})}
//                 />
//               </View>
//             </View>
//           )}

//           <View style={{marginTop: 8}}>
//             {statusText ? (
//               <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
//             ) : null}
//           </View>
//         </>
//       )}
//     </View>
//   );
// }

///////////////////

// import React, {useMemo, useRef, useState} from 'react';
// import {
//   View,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   Switch,
//   Pressable,
//   LayoutChangeEvent,
//   TextInput,
// } from 'react-native';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAuthRole} from '../../hooks/useAuthRole';
// import {STYLE_AGENTS} from '../../../../backend-nest/src/wardrobe/logic/style-agents';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

// type StyleAgentKey = keyof typeof STYLE_AGENTS;

// const DEFAULT_WEIGHTS: Weights = {
//   constraintsWeight: 1.0,
//   styleWeight: 1.2,
//   weatherWeight: 0.8,
// };

// type Props = {
//   weather: string; // 'auto' | 'hot' | 'cold' | 'rainy'
//   onChangeWeather: (value: string) => void;

//   // Weather toggle
//   useWeather: boolean;
//   onToggleWeather: (enabled: boolean) => void;

//   // Style profile toggle
//   useStylePrefs: boolean;
//   onToggleStylePrefs: (enabled: boolean) => void;

//   // NEW — Feedback influence toggle (optional props; default ON)
//   useFeedback?: boolean;
//   onToggleFeedback?: (enabled: boolean) => void;

//   // NEW — Style Agent override
//   styleAgent?: StyleAgentKey | null;
//   onChangeStyleAgent?: (agent: StyleAgentKey | null) => void;

//   // weights controls (nullable from parent; we’ll default safely)
//   weights?: Weights;
//   onChangeWeights?: (w: Weights) => void;

//   onRegenerate: () => void;
//   onGenerate?: () => void;
//   onRefine?: (refinement: string) => void;
//   isGenerating?: boolean;
//   statusText?: string; // e.g. "Using local weather: 70°F · none · wind 12 mph"

//   // ⬇️ NEW — gate "Generate Outfit" on prompt
//   canGenerate?: boolean; // default true if omitted
//   // ⬇️ NEW — control visibility of Refine UI
//   showRefine?: boolean; // default true
// };

// /** Minimal slider with NO external packages */
// function SliderLite({
//   label,
//   min = 0,
//   max = 2,
//   step = 0.1,
//   value,
//   onChange,
//   disabled = false,
// }: {
//   label: string;
//   min?: number;
//   max?: number;
//   step?: number;
//   value: number;
//   onChange: (v: number) => void;
//   disabled?: boolean;
// }) {
//   const trackWidth = useRef(1);

//   const clamp = (v: number) => Math.min(max, Math.max(min, v));
//   const toStep = (v: number) => Math.round(v / step) * step;

//   const pct = useMemo(() => {
//     const p = ((value - min) / (max - min)) * 100;
//     return Math.max(0, Math.min(100, isFinite(p) ? p : 0));
//   }, [value, min, max]);

//   const onTrackLayout = (e: LayoutChangeEvent) => {
//     trackWidth.current = Math.max(1, e.nativeEvent.layout.width);
//   };

//   const setFromX = (x: number) => {
//     const ratio = Math.max(0, Math.min(1, x / trackWidth.current));
//     const raw = min + ratio * (max - min);
//     onChange(clamp(toStep(raw)));
//   };

//   return (
//     <View style={{opacity: disabled ? 0.4 : 1}}>
//       <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
//         <Text style={{fontSize: 12, color: '#9aa0a6'}}>{label}</Text>
//         <Text style={{fontSize: 12, color: '#9aa0a6'}}>{value.toFixed(2)}</Text>
//       </View>

//       <Pressable
//         disabled={disabled}
//         onLayout={onTrackLayout}
//         onPress={e => {
//           h('selection'); // tap on track
//           setFromX(e.nativeEvent.locationX);
//         }}
//         style={{
//           height: 28,
//           borderRadius: 999,
//           backgroundColor: '#2a2a2a',
//           justifyContent: 'center',
//           marginTop: 6,
//         }}>
//         <View
//           style={{
//             width: `${pct}%`,
//             height: 8,
//             marginHorizontal: 8,
//             borderRadius: 999,
//             backgroundColor: '#405de6',
//           }}
//         />
//       </Pressable>

//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 6,
//         }}>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => {
//             h('selection');
//             onChange(clamp(toStep(value - step)));
//           }}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 8,
//             backgroundColor: '#333',
//           }}>
//           <Text style={{color: '#fff'}}>-</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => {
//             h('selection');
//             onChange(clamp(toStep(value + step)));
//           }}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 8,
//             backgroundColor: '#333',
//           }}>
//           <Text style={{color: '#fff'}}>+</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// export default function OutfitTuningControls({
//   weather,
//   onChangeWeather,

//   onRegenerate,
//   useWeather,
//   onToggleWeather,

//   // style prefs toggle
//   useStylePrefs,
//   onToggleStylePrefs,

//   // NEW — feedback
//   useFeedback = true,
//   onToggleFeedback,

//   // NEW — style agent
//   styleAgent,
//   onChangeStyleAgent,

//   // weights
//   weights,
//   onChangeWeights,

//   isGenerating = false,
//   statusText,
//   onRefine,

//   // NEW
//   canGenerate = true,
//   showRefine = true,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const role = useAuthRole();
//   console.log('ROLE FROM HOOK =', role);

//   const S = StyleSheet.create({
//     container: {width: '100%', paddingHorizontal: 20, gap: 12},
//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     subRow: {flexDirection: 'row', alignItems: 'center'},
//     label: {marginLeft: 8, color: theme.colors.foreground, fontSize: 14},
//     faint: {color: theme.colors.muted, fontSize: 12},
//     pill: {borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12},
//     pillPrimary2: {
//       backgroundColor: isGenerating
//         ? theme.colors.button1
//         : theme.colors.button1,
//     },
//     pillTextPrimary: {color: '#fff', fontWeight: '600', fontSize: 13},
//     cta: {
//       height: 48,
//       borderRadius: 50,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//       opacity: isGenDisabled ? 0.5 : 1,
//       marginTop: 8,
//       marginBottom: 4,
//       width: 150,
//     },
//     headerWrap: {marginTop: 4, marginBottom: 4},
//     headerTitle: {
//       fontSize: 22,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     headerSubtitle: {
//       fontSize: 13,
//       color: theme.colors.muted,
//       marginTop: 2,
//     },
//     refineCta: {
//       height: 48,
//       borderRadius: 50,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: '#ff8c00',
//       opacity: isGenerating ? 0.7 : 1,
//       marginTop: 12,
//       marginBottom: 12,
//       width: 150,
//     },
//     ctaText: {color: theme.colors.buttonText1, fontSize: 16, fontWeight: '700'},
//     section: {gap: 10},
//     iconBtn: {
//       width: 25,
//       height: 25,
//       borderRadius: 18,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     ddWrapper: {
//       position: 'relative',
//       zIndex: 9999,
//     },
//     ddWrapperOpen: {
//       position: 'relative',
//       zIndex: 9999,
//       elevation: 9999,
//     },
//     card: {
//       padding: 12,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//     },
//     cardTitle: {color: theme.colors.foreground, fontWeight: '600'},
//     refineInput: {
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       marginTop: 10,
//       color: theme.colors.foreground,
//       fontSize: 16,
//       fontWeight: '400',
//     },
//     hint: {
//       textAlign: 'center',
//       marginBottom: 8,
//       color: theme.colors.muted,
//       fontSize: 12,
//     },
//   });

//   // SAFE DEFAULTS so we never blow up if parent forgets to pass weights
//   const w: Weights = weights ?? DEFAULT_WEIGHTS;

//   const setWeights = (next: Partial<Weights>) => {
//     const merged = {...w, ...next};
//     onChangeWeights?.(merged);
//   };

//   // Dropdown state
//   const [openWeather, setOpenWeather] = useState(false);
//   const [openStyleAgent, setOpenStyleAgent] = useState(false);

//   // Panels
//   const [showWeatherPicker, setShowWeatherPicker] = useState(false);
//   const [showMoreOptions, setShowMoreOptions] = useState(false);

//   // NEW — hidden developer controls (revealed with a long-press on gear)
//   const [showHiddenDev, setShowHiddenDev] = useState(false);
//   const [feedbackEnabled, setFeedbackEnabled] = useState(useFeedback);

//   // 👇 NEW refinement input state
//   const [refineText, setRefineText] = useState('');

//   // 👇 NEW — collapses EVERYTHING below the CTA behind a single gear
//   const [showExtras, setShowExtras] = useState(false);

//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: 'Hot Weather', value: 'hot'},
//     {label: 'Cold Weather', value: 'cold'},
//     {label: 'Rainy Weather', value: 'rainy'},
//   ];

//   const styleAgentOptions = useMemo(() => {
//     const none = [
//       {label: 'None (Use My Style Preferences)', value: null as null},
//     ];

//     // Keep numeric order: agent1 → agent12
//     const numbered = Object.entries(STYLE_AGENTS)
//       .sort(([a], [b]) => {
//         const na = parseInt(a.replace('agent', ''), 10);
//         const nb = parseInt(b.replace('agent', ''), 10);
//         return na - nb;
//       })
//       .map(([key, cfg]) => ({
//         label: cfg.name, // e.g. "Power Tailoring (Tom Ford–inspired)"
//         value: key as StyleAgentKey, // 'agent1' | ... | 'agent12'
//       }));

//     return [...none, ...numbered];
//   }, []);

//   const isGenDisabled = !canGenerate || isGenerating;

//   const weatherDisabled = !useWeather;
//   const modeLabel = useWeather
//     ? weather === 'auto'
//       ? 'Auto'
//       : weather === 'hot'
//       ? 'Hot'
//       : weather === 'cold'
//       ? 'Cold'
//       : 'Rainy'
//     : 'Off';

//   return (
//     <View style={S.container}>
//       {/* Primary CTA */}
//       <View
//         style={{
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         <Animatable.View
//           animation="fadeInUp"
//           delay={100}
//           duration={800}
//           easing="ease-out-back"
//           useNativeDriver>
//           <TouchableOpacity
//             style={[globalStyles.buttonPrimary, {width: 140}]}
//             onPress={() => {
//               h('impactMedium'); // primary action tap
//               onRegenerate();
//             }}
//             disabled={isGenDisabled}
//             accessibilityState={{disabled: isGenDisabled}}
//             testID="generate-outfit-button">
//             <Text style={[globalStyles.buttonPrimaryText, {fontWeight: '700'}]}>
//               {isGenerating ? 'Generating…' : 'Create Outfit'}
//             </Text>
//           </TouchableOpacity>
//         </Animatable.View>
//       </View>

//       {/* NEW: Refinement input + button (hidden until outfit exists) */}
//       {showRefine && (
//         <>
//           <View style={{alignItems: 'center', paddingHorizontal: 16}}>
//             <TextInput
//               style={[
//                 S.refineInput,
//                 {
//                   width: 400,
//                   borderRadius: tokens.borderRadius.md,
//                   backgroundColor: theme.colors.surface3,
//                   paddingVertical: 14,
//                 },
//               ]}
//               value={refineText}
//               onChangeText={setRefineText}
//               placeholder="Refine outfit (e.g. make shorts more colorful)"
//               placeholderTextColor="#888"
//             />
//           </View>
//           <View
//             style={{
//               display: 'flex',
//               justifyContent: 'center',
//               alignItems: 'center',
//             }}>
//             <TouchableOpacity
//               style={S.refineCta}
//               onPress={() => {
//                 if (onRefine && refineText.trim()) {
//                   h('impactLight'); // refine tap
//                   onRefine(refineText.trim());
//                   setRefineText('');
//                 }
//               }}
//               disabled={isGenerating}
//               accessibilityState={{disabled: isGenerating}}
//               testID="refine-outfit-button">
//               <Text style={S.ctaText}>
//                 {isGenerating ? 'Refining…' : 'Update Outfit'}
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </>
//       )}

//       {/* EVERYTHING BELOW THE CTA IS NOW COLLAPSIBLE */}
//       {showExtras && (
//         <>
//           {/* ⬇️ Moved OUT of Advanced: AI Style Agent */}
//           <View style={[S.row, {marginTop: 18, marginBottom: 2}]}>
//             <Text style={S.label}>Stylist Presets</Text>
//           </View>

//           <View style={openStyleAgent ? S.ddWrapperOpen : S.ddWrapper}>
//             <DropDownPicker
//               open={openStyleAgent}
//               setOpen={setOpenStyleAgent}
//               value={styleAgent ?? null}
//               // Handle both value and updater fn that DropDownPicker may pass
//               setValue={next => {
//                 const resolved =
//                   typeof next === 'function'
//                     ? (next(styleAgent) as StyleAgentKey | null)
//                     : (next as StyleAgentKey | null);
//                 h('impactLight'); // selecting a preset
//                 onChangeStyleAgent?.(resolved);
//               }}
//               items={styleAgentOptions}
//               placeholder="Choose (Optional)"
//               listMode="SCROLLVIEW"
//               maxHeight={580}
//               scrollViewProps={{nestedScrollEnabled: true}}
//               dropDownDirection="AUTO"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{
//                 backgroundColor: theme.colors.surface,
//                 zIndex: 9999,
//                 elevation: 9999,
//                 maxHeight: 180,
//               }}
//               onOpen={() => h('selection')}
//             />
//           </View>

//           {/* Weather row */}
//           <View style={[S.row, {marginTop: 22}]}>
//             <View style={S.subRow}>
//               <Switch
//                 value={useWeather}
//                 onValueChange={enabled => {
//                   h('selection');
//                   onToggleWeather(enabled);
//                   if (!enabled) setShowWeatherPicker(false);
//                 }}
//                 trackColor={{false: '#767577', true: theme.colors.button1}}
//                 thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//               />
//               <Text style={S.label}>Use Weather</Text>
//               <Text
//                 style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//                 ({modeLabel})
//               </Text>
//             </View>

//             <TouchableOpacity
//               disabled={weatherDisabled}
//               onPress={() => {
//                 if (!weatherDisabled) h('selection');
//                 setShowWeatherPicker(s => !s);
//               }}
//               activeOpacity={0.8}
//               style={[
//                 S.pill,
//                 S.pillPrimary2,
//                 {opacity: weatherDisabled ? 0.2 : 1},
//               ]}>
//               <Text style={S.pillTextPrimary}>
//                 {showWeatherPicker ? 'Hide Controls' : 'Advanced Weather'}
//               </Text>
//             </TouchableOpacity>
//           </View>

//           {/* Weather picker */}
//           {showWeatherPicker && (
//             <View style={openWeather ? S.ddWrapperOpen : S.ddWrapper}>
//               <DropDownPicker
//                 open={openWeather}
//                 setOpen={setOpenWeather}
//                 value={weather}
//                 setValue={val => {
//                   h('selection');
//                   onChangeWeather(val as unknown as string);
//                 }}
//                 items={weatherOptions}
//                 placeholder={
//                   useWeather ? 'Choose weather option' : 'Weather (disabled)'
//                 }
//                 listMode="SCROLLVIEW"
//                 dropDownDirection="AUTO"
//                 style={{backgroundColor: theme.colors.surface}}
//                 textStyle={{color: theme.colors.foreground}}
//                 dropDownContainerStyle={{
//                   backgroundColor: theme.colors.surface,
//                   zIndex: 9999,
//                   elevation: 9999,
//                 }}
//                 disabled={weatherDisabled}
//                 onOpen={() => h('selection')}
//               />
//               <Text style={[S.faint, {marginTop: 6}]}>
//                 {useWeather
//                   ? 'Auto uses your current location.'
//                   : 'Weather is off — outfits ignore weather.'}
//               </Text>
//             </View>
//           )}

//           {/* RBAC - Advanced controls gear (👈 unchanged logic, now inside extras) */}
//           {role !== 'developer' && (
//             <View style={[S.row, {marginTop: 4}]}>
//               <Text style={[S.faint]}>Advanced Controls</Text>
//               <TouchableOpacity
//                 onPress={() => {
//                   h('selection');
//                   setShowMoreOptions(s => !s);
//                 }}
//                 onLongPress={() => {
//                   h('impactMedium');
//                   setShowHiddenDev(v => !v);
//                 }}
//                 delayLongPress={500}
//                 activeOpacity={0.8}
//                 accessibilityRole="button"
//                 accessibilityLabel={
//                   showMoreOptions ? 'Hide options' : 'Show options'
//                 }
//                 testID="options-gear-button"
//                 style={S.iconBtn}>
//                 <MaterialIcons
//                   name="settings"
//                   size={20}
//                   color={theme.colors.primary}
//                 />
//               </TouchableOpacity>
//             </View>
//           )}

//           {/* Advanced section */}
//           {showMoreOptions && (
//             <View style={S.section}>
//               <View style={[S.row, {marginTop: 6}]}>
//                 <View style={S.subRow}>
//                   <Switch
//                     value={feedbackEnabled}
//                     onValueChange={enabled => {
//                       h('selection');
//                       setFeedbackEnabled(enabled);
//                       onToggleFeedback?.(enabled);
//                     }}
//                     trackColor={{false: '#767577', true: theme.colors.button1}}
//                     thumbColor={feedbackEnabled ? '#fff' : '#f4f3f4'}
//                   />
//                   <Text style={S.label}>Use Feedback Influence</Text>
//                   <Text
//                     style={[
//                       S.label,
//                       {marginLeft: 10, color: theme.colors.muted},
//                     ]}>
//                     ({feedbackEnabled ? 'On' : 'Off'})
//                   </Text>
//                 </View>
//                 <Text style={[S.faint]} />
//               </View>

//               {/* DEV: Scoring Weights */}
//               <View style={S.card}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <Text style={S.cardTitle}>Scoring Weights (dev)</Text>
//                   <TouchableOpacity
//                     onPress={() => {
//                       h('impactLight');
//                       onChangeWeights?.(DEFAULT_WEIGHTS);
//                     }}
//                     style={{
//                       paddingVertical: 6,
//                       paddingHorizontal: 10,
//                       borderRadius: 8,
//                       backgroundColor: '#333',
//                     }}>
//                     <Text style={{color: '#fff', fontWeight: '600'}}>
//                       Reset
//                     </Text>
//                   </TouchableOpacity>
//                 </View>

//                 <SliderLite
//                   label="Constraints"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.constraintsWeight}
//                   onChange={v => setWeights({constraintsWeight: v})}
//                 />

//                 <SliderLite
//                   label="Style"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.styleWeight}
//                   onChange={v => setWeights({styleWeight: v})}
//                   disabled={!useStylePrefs}
//                 />

//                 <SliderLite
//                   label="Weather"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.weatherWeight}
//                   onChange={v => setWeights({weatherWeight: v})}
//                 />
//               </View>
//             </View>
//           )}

//           <View style={{marginTop: 8}}>
//             {/* Status */}
//             {statusText ? (
//               <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
//             ) : null}
//           </View>
//         </>
//       )}
//     </View>
//   );
// }

//////////////////

// import React, {useMemo, useRef, useState} from 'react';
// import {
//   View,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   Switch,
//   Pressable,
//   LayoutChangeEvent,
//   TextInput,
// } from 'react-native';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAuthRole} from '../../hooks/useAuthRole';
// import {STYLE_AGENTS} from '../../../../backend-nest/src/wardrobe/logic/style-agents';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

// type StyleAgentKey = keyof typeof STYLE_AGENTS;

// const DEFAULT_WEIGHTS: Weights = {
//   constraintsWeight: 1.0,
//   styleWeight: 1.2,
//   weatherWeight: 0.8,
// };

// type Props = {
//   weather: string; // 'auto' | 'hot' | 'cold' | 'rainy'
//   onChangeWeather: (value: string) => void;

//   // Weather toggle
//   useWeather: boolean;
//   onToggleWeather: (enabled: boolean) => void;

//   // Style profile toggle
//   useStylePrefs: boolean;
//   onToggleStylePrefs: (enabled: boolean) => void;

//   // NEW — Feedback influence toggle (optional props; default ON)
//   useFeedback?: boolean;
//   onToggleFeedback?: (enabled: boolean) => void;

//   // NEW — Style Agent override
//   styleAgent?: StyleAgentKey | null;
//   onChangeStyleAgent?: (agent: StyleAgentKey | null) => void;

//   // weights controls (nullable from parent; we’ll default safely)
//   weights?: Weights;
//   onChangeWeights?: (w: Weights) => void;

//   onRegenerate: () => void;
//   onGenerate?: () => void;
//   onRefine?: (refinement: string) => void;
//   isGenerating?: boolean;
//   statusText?: string; // e.g. "Using local weather: 70°F · none · wind 12 mph"

//   // ⬇️ NEW — gate "Generate Outfit" on prompt
//   canGenerate?: boolean; // default true if omitted
//   // ⬇️ NEW — control visibility of Refine UI
//   showRefine?: boolean; // default true
// };

// /** Minimal slider with NO external packages */
// function SliderLite({
//   label,
//   min = 0,
//   max = 2,
//   step = 0.1,
//   value,
//   onChange,
//   disabled = false,
// }: {
//   label: string;
//   min?: number;
//   max?: number;
//   step?: number;
//   value: number;
//   onChange: (v: number) => void;
//   disabled?: boolean;
// }) {
//   const trackWidth = useRef(1);

//   const clamp = (v: number) => Math.min(max, Math.max(min, v));
//   const toStep = (v: number) => Math.round(v / step) * step;

//   const pct = useMemo(() => {
//     const p = ((value - min) / (max - min)) * 100;
//     return Math.max(0, Math.min(100, isFinite(p) ? p : 0));
//   }, [value, min, max]);

//   const onTrackLayout = (e: LayoutChangeEvent) => {
//     trackWidth.current = Math.max(1, e.nativeEvent.layout.width);
//   };

//   const setFromX = (x: number) => {
//     const ratio = Math.max(0, Math.min(1, x / trackWidth.current));
//     const raw = min + ratio * (max - min);
//     onChange(clamp(toStep(raw)));
//   };

//   return (
//     <View style={{opacity: disabled ? 0.4 : 1}}>
//       <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
//         <Text style={{fontSize: 12, color: '#9aa0a6'}}>{label}</Text>
//         <Text style={{fontSize: 12, color: '#9aa0a6'}}>{value.toFixed(2)}</Text>
//       </View>

//       <Pressable
//         disabled={disabled}
//         onLayout={onTrackLayout}
//         onPress={e => {
//           h('selection'); // tap on track
//           setFromX(e.nativeEvent.locationX);
//         }}
//         style={{
//           height: 28,
//           borderRadius: 999,
//           backgroundColor: '#2a2a2a',
//           justifyContent: 'center',
//           marginTop: 6,
//         }}>
//         <View
//           style={{
//             width: `${pct}%`,
//             height: 8,
//             marginHorizontal: 8,
//             borderRadius: 999,
//             backgroundColor: '#405de6',
//           }}
//         />
//       </Pressable>

//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 6,
//         }}>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => {
//             h('selection');
//             onChange(clamp(toStep(value - step)));
//           }}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 8,
//             backgroundColor: '#333',
//           }}>
//           <Text style={{color: '#fff'}}>-</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => {
//             h('selection');
//             onChange(clamp(toStep(value + step)));
//           }}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 8,
//             backgroundColor: '#333',
//           }}>
//           <Text style={{color: '#fff'}}>+</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// export default function OutfitTuningControls({
//   weather,
//   onChangeWeather,

//   onRegenerate,
//   useWeather,
//   onToggleWeather,

//   // style prefs toggle
//   useStylePrefs,
//   onToggleStylePrefs,

//   // NEW — feedback
//   useFeedback = true,
//   onToggleFeedback,

//   // NEW — style agent
//   styleAgent,
//   onChangeStyleAgent,

//   // weights
//   weights,
//   onChangeWeights,

//   isGenerating = false,
//   statusText,
//   onRefine,

//   // NEW
//   canGenerate = true,
//   showRefine = true,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const role = useAuthRole();
//   console.log('ROLE FROM HOOK =', role);

//   const S = StyleSheet.create({
//     container: {width: '100%', paddingHorizontal: 20, gap: 12},
//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     subRow: {flexDirection: 'row', alignItems: 'center'},
//     label: {marginLeft: 8, color: theme.colors.foreground, fontSize: 14},
//     faint: {color: theme.colors.muted, fontSize: 12},
//     pill: {borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12},
//     pillPrimary2: {
//       backgroundColor: isGenerating
//         ? theme.colors.button1
//         : theme.colors.button1,
//     },
//     pillTextPrimary: {color: '#fff', fontWeight: '600', fontSize: 13},
//     cta: {
//       height: 48,
//       borderRadius: 50,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//       opacity: isGenDisabled ? 0.5 : 1,
//       marginTop: 8,
//       marginBottom: 4,
//       width: 150,
//     },
//     headerWrap: {marginTop: 4, marginBottom: 4},
//     headerTitle: {
//       fontSize: 22,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     headerSubtitle: {
//       fontSize: 13,
//       color: theme.colors.muted,
//       marginTop: 2,
//     },
//     refineCta: {
//       height: 48,
//       borderRadius: 50,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: '#ff8c00',
//       opacity: isGenerating ? 0.7 : 1,
//       marginTop: 12,
//       marginBottom: 12,
//       width: 150,
//     },
//     ctaText: {color: '#fff', fontSize: 16, fontWeight: '600'},
//     section: {gap: 10},
//     iconBtn: {
//       width: 25,
//       height: 25,
//       borderRadius: 18,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     ddWrapper: {
//       position: 'relative',
//       zIndex: 9999,
//     },
//     ddWrapperOpen: {
//       position: 'relative',
//       zIndex: 9999,
//       elevation: 9999,
//     },
//     card: {
//       padding: 12,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       gap: 10,
//     },
//     cardTitle: {color: theme.colors.foreground, fontWeight: '600'},
//     refineInput: {
//       borderWidth: 1,
//       borderColor: '#666',
//       borderRadius: 8,
//       padding: 10,
//       marginTop: 6,
//       color: theme.colors.foreground,
//     },
//     hint: {
//       textAlign: 'center',
//       marginBottom: 8,
//       color: theme.colors.muted,
//       fontSize: 12,
//     },
//   });

//   // SAFE DEFAULTS so we never blow up if parent forgets to pass weights
//   const w: Weights = weights ?? DEFAULT_WEIGHTS;

//   const setWeights = (next: Partial<Weights>) => {
//     const merged = {...w, ...next};
//     onChangeWeights?.(merged);
//   };

//   // Dropdown state
//   const [openWeather, setOpenWeather] = useState(false);
//   const [openStyleAgent, setOpenStyleAgent] = useState(false);

//   // Panels
//   const [showWeatherPicker, setShowWeatherPicker] = useState(false);
//   const [showMoreOptions, setShowMoreOptions] = useState(false);

//   // NEW — hidden developer controls (revealed with a long-press on gear)
//   const [showHiddenDev, setShowHiddenDev] = useState(false);
//   const [feedbackEnabled, setFeedbackEnabled] = useState(useFeedback);

//   // 👇 NEW refinement input state
//   const [refineText, setRefineText] = useState('');

//   // 👇 NEW — collapses EVERYTHING below the CTA behind a single gear
//   const [showExtras, setShowExtras] = useState(false);

//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: 'Hot Weather', value: 'hot'},
//     {label: 'Cold Weather', value: 'cold'},
//     {label: 'Rainy Weather', value: 'rainy'},
//   ];

//   const styleAgentOptions = useMemo(() => {
//     const none = [
//       {label: 'None (Use My Style Preferences)', value: null as null},
//     ];

//     // Keep numeric order: agent1 → agent12
//     const numbered = Object.entries(STYLE_AGENTS)
//       .sort(([a], [b]) => {
//         const na = parseInt(a.replace('agent', ''), 10);
//         const nb = parseInt(b.replace('agent', ''), 10);
//         return na - nb;
//       })
//       .map(([key, cfg]) => ({
//         label: cfg.name, // e.g. "Power Tailoring (Tom Ford–inspired)"
//         value: key as StyleAgentKey, // 'agent1' | ... | 'agent12'
//       }));

//     return [...none, ...numbered];
//   }, []);

//   const isGenDisabled = !canGenerate || isGenerating;

//   const weatherDisabled = !useWeather;
//   const modeLabel = useWeather
//     ? weather === 'auto'
//       ? 'Auto'
//       : weather === 'hot'
//       ? 'Hot'
//       : weather === 'cold'
//       ? 'Cold'
//       : 'Rainy'
//     : 'Off';

//   return (
//     <View style={S.container}>
//       {/* Primary CTA */}
//       <View
//         style={{
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         <TouchableOpacity
//           style={[globalStyles.buttonPrimary, {width: 140}]}
//           onPress={() => {
//             h('impactMedium'); // primary action tap
//             onRegenerate();
//           }}
//           disabled={isGenDisabled}
//           accessibilityState={{disabled: isGenDisabled}}
//           testID="generate-outfit-button">
//           <Text style={globalStyles.buttonPrimaryText}>
//             {isGenerating ? 'Generating…' : 'Create Outfit'}
//           </Text>
//         </TouchableOpacity>

//         {/* NEW: Single gear to toggle ALL content below */}
//         <TouchableOpacity
//           onPress={() => {
//             h('selection');
//             setShowExtras(s => !s);
//           }}
//           activeOpacity={0.8}
//           accessibilityRole="button"
//           accessibilityLabel={showExtras ? 'Hide options' : 'Show options'}
//           testID="master-gear-toggle"
//           style={[S.iconBtn, {marginTop: 10}]}>
//           <MaterialIcons name="settings" size={28} color={'#504949ff'} />
//         </TouchableOpacity>
//       </View>

//       {/* NEW: Refinement input + button (hidden until outfit exists) */}
//       {showRefine && (
//         <>
//           <TextInput
//             style={S.refineInput}
//             value={refineText}
//             onChangeText={setRefineText}
//             placeholder="Refine outfit (e.g. make shorts more colorful)"
//             placeholderTextColor="#888"
//           />
//           <View
//             style={{
//               display: 'flex',
//               justifyContent: 'center',
//               alignItems: 'center',
//             }}>
//             <TouchableOpacity
//               style={S.refineCta}
//               onPress={() => {
//                 if (onRefine && refineText.trim()) {
//                   h('impactLight'); // refine tap
//                   onRefine(refineText.trim());
//                   setRefineText('');
//                 }
//               }}
//               disabled={isGenerating}
//               accessibilityState={{disabled: isGenerating}}
//               testID="refine-outfit-button">
//               <Text style={S.ctaText}>
//                 {isGenerating ? 'Refining…' : 'Refine Outfit'}
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </>
//       )}

//       {/* EVERYTHING BELOW THE CTA IS NOW COLLAPSIBLE */}
//       {showExtras && (
//         <>
//           {/* ⬇️ Moved OUT of Advanced: AI Style Agent */}
//           <View style={[S.row, {marginTop: 18, marginBottom: 2}]}>
//             <Text style={S.label}>Stylist Presets</Text>
//           </View>

//           <View style={openStyleAgent ? S.ddWrapperOpen : S.ddWrapper}>
//             <DropDownPicker
//               open={openStyleAgent}
//               setOpen={setOpenStyleAgent}
//               value={styleAgent ?? null}
//               // Handle both value and updater fn that DropDownPicker may pass
//               setValue={next => {
//                 const resolved =
//                   typeof next === 'function'
//                     ? (next(styleAgent) as StyleAgentKey | null)
//                     : (next as StyleAgentKey | null);
//                 h('impactLight'); // selecting a preset
//                 onChangeStyleAgent?.(resolved);
//               }}
//               items={styleAgentOptions}
//               placeholder="Choose (Optional)"
//               listMode="SCROLLVIEW"
//               maxHeight={580}
//               scrollViewProps={{nestedScrollEnabled: true}}
//               dropDownDirection="AUTO"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{
//                 backgroundColor: theme.colors.surface,
//                 zIndex: 9999,
//                 elevation: 9999,
//                 maxHeight: 180,
//               }}
//               onOpen={() => h('selection')}
//             />
//           </View>

//           {/* Weather row */}
//           <View style={[S.row, {marginTop: 22}]}>
//             <View style={S.subRow}>
//               <Switch
//                 value={useWeather}
//                 onValueChange={enabled => {
//                   h('selection');
//                   onToggleWeather(enabled);
//                   if (!enabled) setShowWeatherPicker(false);
//                 }}
//                 trackColor={{false: '#767577', true: theme.colors.button1}}
//                 thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//               />
//               <Text style={S.label}>Use Weather</Text>
//               <Text
//                 style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//                 ({modeLabel})
//               </Text>
//             </View>

//             <TouchableOpacity
//               disabled={weatherDisabled}
//               onPress={() => {
//                 if (!weatherDisabled) h('selection');
//                 setShowWeatherPicker(s => !s);
//               }}
//               activeOpacity={0.8}
//               style={[
//                 S.pill,
//                 S.pillPrimary2,
//                 {opacity: weatherDisabled ? 0.2 : 1},
//               ]}>
//               <Text style={S.pillTextPrimary}>
//                 {showWeatherPicker ? 'Hide Controls' : 'Advanced Weather'}
//               </Text>
//             </TouchableOpacity>
//           </View>

//           {/* Weather picker */}
//           {showWeatherPicker && (
//             <View style={openWeather ? S.ddWrapperOpen : S.ddWrapper}>
//               <DropDownPicker
//                 open={openWeather}
//                 setOpen={setOpenWeather}
//                 value={weather}
//                 setValue={val => {
//                   h('selection');
//                   onChangeWeather(val as unknown as string);
//                 }}
//                 items={weatherOptions}
//                 placeholder={
//                   useWeather ? 'Choose weather option' : 'Weather (disabled)'
//                 }
//                 listMode="SCROLLVIEW"
//                 dropDownDirection="AUTO"
//                 style={{backgroundColor: theme.colors.surface}}
//                 textStyle={{color: theme.colors.foreground}}
//                 dropDownContainerStyle={{
//                   backgroundColor: theme.colors.surface,
//                   zIndex: 9999,
//                   elevation: 9999,
//                 }}
//                 disabled={weatherDisabled}
//                 onOpen={() => h('selection')}
//               />
//               <Text style={[S.faint, {marginTop: 6}]}>
//                 {useWeather
//                   ? 'Auto uses your current location.'
//                   : 'Weather is off — outfits ignore weather.'}
//               </Text>
//             </View>
//           )}

//           {/* RBAC - Advanced controls gear (👈 unchanged logic, now inside extras) */}
//           {role !== 'developer' && (
//             <View style={[S.row, {marginTop: 4}]}>
//               <Text style={[S.faint]}>Advanced Controls</Text>
//               <TouchableOpacity
//                 onPress={() => {
//                   h('selection');
//                   setShowMoreOptions(s => !s);
//                 }}
//                 onLongPress={() => {
//                   h('impactMedium');
//                   setShowHiddenDev(v => !v);
//                 }}
//                 delayLongPress={500}
//                 activeOpacity={0.8}
//                 accessibilityRole="button"
//                 accessibilityLabel={
//                   showMoreOptions ? 'Hide options' : 'Show options'
//                 }
//                 testID="options-gear-button"
//                 style={S.iconBtn}>
//                 <MaterialIcons
//                   name="settings"
//                   size={20}
//                   color={theme.colors.primary}
//                 />
//               </TouchableOpacity>
//             </View>
//           )}

//           {/* Advanced section */}
//           {showMoreOptions && (
//             <View style={S.section}>
//               <View style={[S.row, {marginTop: 6}]}>
//                 <View style={S.subRow}>
//                   <Switch
//                     value={feedbackEnabled}
//                     onValueChange={enabled => {
//                       h('selection');
//                       setFeedbackEnabled(enabled);
//                       onToggleFeedback?.(enabled);
//                     }}
//                     trackColor={{false: '#767577', true: theme.colors.button1}}
//                     thumbColor={feedbackEnabled ? '#fff' : '#f4f3f4'}
//                   />
//                   <Text style={S.label}>Use Feedback Influence</Text>
//                   <Text
//                     style={[
//                       S.label,
//                       {marginLeft: 10, color: theme.colors.muted},
//                     ]}>
//                     ({feedbackEnabled ? 'On' : 'Off'})
//                   </Text>
//                 </View>
//                 <Text style={[S.faint]} />
//               </View>

//               {/* DEV: Scoring Weights */}
//               <View style={S.card}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <Text style={S.cardTitle}>Scoring Weights (dev)</Text>
//                   <TouchableOpacity
//                     onPress={() => {
//                       h('impactLight');
//                       onChangeWeights?.(DEFAULT_WEIGHTS);
//                     }}
//                     style={{
//                       paddingVertical: 6,
//                       paddingHorizontal: 10,
//                       borderRadius: 8,
//                       backgroundColor: '#333',
//                     }}>
//                     <Text style={{color: '#fff', fontWeight: '600'}}>
//                       Reset
//                     </Text>
//                   </TouchableOpacity>
//                 </View>

//                 <SliderLite
//                   label="Constraints"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.constraintsWeight}
//                   onChange={v => setWeights({constraintsWeight: v})}
//                 />

//                 <SliderLite
//                   label="Style"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.styleWeight}
//                   onChange={v => setWeights({styleWeight: v})}
//                   disabled={!useStylePrefs}
//                 />

//                 <SliderLite
//                   label="Weather"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.weatherWeight}
//                   onChange={v => setWeights({weatherWeight: v})}
//                 />
//               </View>
//             </View>
//           )}

//           <View style={{marginTop: 8}}>
//             {/* Status */}
//             {statusText ? (
//               <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
//             ) : null}
//           </View>
//         </>
//       )}
//     </View>
//   );
// }

////////////////////////

// import React, {useMemo, useRef, useState} from 'react';
// import {
//   View,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   Switch,
//   Pressable,
//   LayoutChangeEvent,
//   TextInput,
// } from 'react-native';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAuthRole} from '../../hooks/useAuthRole';
// import {STYLE_AGENTS} from '../../../../backend-nest/src/wardrobe/logic/style-agents';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// export type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

// type StyleAgentKey = keyof typeof STYLE_AGENTS;

// const DEFAULT_WEIGHTS: Weights = {
//   constraintsWeight: 1.0,
//   styleWeight: 1.2,
//   weatherWeight: 0.8,
// };

// type Props = {
//   weather: string; // 'auto' | 'hot' | 'cold' | 'rainy'
//   onChangeWeather: (value: string) => void;

//   // Weather toggle
//   useWeather: boolean;
//   onToggleWeather: (enabled: boolean) => void;

//   // Style profile toggle
//   useStylePrefs: boolean;
//   onToggleStylePrefs: (enabled: boolean) => void;

//   // NEW — Feedback influence toggle (optional props; default ON)
//   useFeedback?: boolean;
//   onToggleFeedback?: (enabled: boolean) => void;

//   // NEW — Style Agent override
//   styleAgent?: StyleAgentKey | null;
//   onChangeStyleAgent?: (agent: StyleAgentKey | null) => void;

//   // weights controls (nullable from parent; we’ll default safely)
//   weights?: Weights;
//   onChangeWeights?: (w: Weights) => void;

//   onRegenerate: () => void;
//   onGenerate?: () => void;
//   onRefine?: (refinement: string) => void;
//   isGenerating?: boolean;
//   statusText?: string; // e.g. "Using local weather: 70°F · none · wind 12 mph"

//   // ⬇️ NEW — gate "Generate Outfit" on prompt
//   canGenerate?: boolean; // default true if omitted
//   // ⬇️ NEW — control visibility of Refine UI
//   showRefine?: boolean; // default true
// };

// /** Minimal slider with NO external packages */
// function SliderLite({
//   label,
//   min = 0,
//   max = 2,
//   step = 0.1,
//   value,
//   onChange,
//   disabled = false,
// }: {
//   label: string;
//   min?: number;
//   max?: number;
//   step?: number;
//   value: number;
//   onChange: (v: number) => void;
//   disabled?: boolean;
// }) {
//   const trackWidth = useRef(1);

//   const clamp = (v: number) => Math.min(max, Math.max(min, v));
//   const toStep = (v: number) => Math.round(v / step) * step;

//   const pct = useMemo(() => {
//     const p = ((value - min) / (max - min)) * 100;
//     return Math.max(0, Math.min(100, isFinite(p) ? p : 0));
//   }, [value, min, max]);

//   const onTrackLayout = (e: LayoutChangeEvent) => {
//     trackWidth.current = Math.max(1, e.nativeEvent.layout.width);
//   };

//   const setFromX = (x: number) => {
//     const ratio = Math.max(0, Math.min(1, x / trackWidth.current));
//     const raw = min + ratio * (max - min);
//     onChange(clamp(toStep(raw)));
//   };

//   return (
//     <View style={{opacity: disabled ? 0.4 : 1}}>
//       <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
//         <Text style={{fontSize: 12, color: '#9aa0a6'}}>{label}</Text>
//         <Text style={{fontSize: 12, color: '#9aa0a6'}}>{value.toFixed(2)}</Text>
//       </View>

//       <Pressable
//         disabled={disabled}
//         onLayout={onTrackLayout}
//         onPress={e => setFromX(e.nativeEvent.locationX)}
//         style={{
//           height: 28,
//           borderRadius: 999,
//           backgroundColor: '#2a2a2a',
//           justifyContent: 'center',
//           marginTop: 6,
//         }}>
//         <View
//           style={{
//             width: `${pct}%`,
//             height: 8,
//             marginHorizontal: 8,
//             borderRadius: 999,
//             backgroundColor: '#405de6',
//           }}
//         />
//       </Pressable>

//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 6,
//         }}>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => onChange(clamp(toStep(value - step)))}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 8,
//             backgroundColor: '#333',
//           }}>
//           <Text style={{color: '#fff'}}>-</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => onChange(clamp(toStep(value + step)))}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 8,
//             backgroundColor: '#333',
//           }}>
//           <Text style={{color: '#fff'}}>+</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// export default function OutfitTuningControls({
//   weather,
//   onChangeWeather,

//   onRegenerate,
//   useWeather,
//   onToggleWeather,

//   // style prefs toggle
//   useStylePrefs,
//   onToggleStylePrefs,

//   // NEW — feedback
//   useFeedback = true,
//   onToggleFeedback,

//   // NEW — style agent
//   styleAgent,
//   onChangeStyleAgent,

//   // weights
//   weights,
//   onChangeWeights,

//   isGenerating = false,
//   statusText,
//   onRefine,

//   // NEW
//   canGenerate = true,
//   showRefine = true,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const role = useAuthRole();
//   console.log('ROLE FROM HOOK =', role);

//   const S = StyleSheet.create({
//     container: {width: '100%', paddingHorizontal: 20, gap: 12},
//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     subRow: {flexDirection: 'row', alignItems: 'center'},
//     label: {marginLeft: 8, color: theme.colors.foreground, fontSize: 14},
//     faint: {color: theme.colors.muted, fontSize: 12},
//     pill: {borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12},
//     pillPrimary2: {backgroundColor: isGenerating ? '#7a88ff' : '#474747ff'},
//     pillTextPrimary: {color: '#fff', fontWeight: '600', fontSize: 13},
//     cta: {
//       height: 48,
//       borderRadius: 50,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//       opacity: isGenDisabled ? 0.5 : 1,
//       marginTop: 8,
//       marginBottom: 4,
//       width: 150,
//     },
//     headerWrap: {marginTop: 4, marginBottom: 4},
//     headerTitle: {
//       fontSize: 22,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     headerSubtitle: {
//       fontSize: 13,
//       color: theme.colors.muted,
//       marginTop: 2,
//     },
//     refineCta: {
//       height: 48,
//       borderRadius: 50,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: '#ff8c00',
//       opacity: isGenerating ? 0.7 : 1,
//       marginTop: 12,
//       marginBottom: 12,
//       width: 150,
//     },
//     ctaText: {color: '#fff', fontSize: 16, fontWeight: '600'},
//     section: {gap: 10},
//     iconBtn: {
//       width: 25,
//       height: 25,
//       borderRadius: 18,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     ddWrapper: {
//       position: 'relative',
//       zIndex: 9999,
//     },
//     ddWrapperOpen: {
//       position: 'relative',
//       zIndex: 9999,
//       elevation: 9999,
//     },
//     card: {
//       padding: 12,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       gap: 10,
//     },
//     cardTitle: {color: theme.colors.foreground, fontWeight: '600'},
//     refineInput: {
//       borderWidth: 1,
//       borderColor: '#666',
//       borderRadius: 8,
//       padding: 10,
//       marginTop: 6,
//       color: theme.colors.foreground,
//     },
//     hint: {
//       textAlign: 'center',
//       marginBottom: 8,
//       color: theme.colors.muted,
//       fontSize: 12,
//     },
//   });

//   // SAFE DEFAULTS so we never blow up if parent forgets to pass weights
//   const w: Weights = weights ?? DEFAULT_WEIGHTS;

//   const setWeights = (next: Partial<Weights>) => {
//     const merged = {...w, ...next};
//     onChangeWeights?.(merged);
//   };

//   // Dropdown state
//   const [openWeather, setOpenWeather] = useState(false);
//   const [openStyleAgent, setOpenStyleAgent] = useState(false);

//   // Panels
//   const [showWeatherPicker, setShowWeatherPicker] = useState(false);
//   const [showMoreOptions, setShowMoreOptions] = useState(false);

//   // NEW — hidden developer controls (revealed with a long-press on gear)
//   const [showHiddenDev, setShowHiddenDev] = useState(false);
//   const [feedbackEnabled, setFeedbackEnabled] = useState(useFeedback);

//   // 👇 NEW refinement input state
//   const [refineText, setRefineText] = useState('');

//   // 👇 NEW — collapses EVERYTHING below the CTA behind a single gear
//   const [showExtras, setShowExtras] = useState(false);

//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: 'Hot Weather', value: 'hot'},
//     {label: 'Cold Weather', value: 'cold'},
//     {label: 'Rainy Weather', value: 'rainy'},
//   ];

//   const styleAgentOptions = useMemo(() => {
//     const none = [
//       {label: 'None (Use My Style Preferences)', value: null as null},
//     ];

//     // Keep numeric order: agent1 → agent12
//     const numbered = Object.entries(STYLE_AGENTS)
//       .sort(([a], [b]) => {
//         const na = parseInt(a.replace('agent', ''), 10);
//         const nb = parseInt(b.replace('agent', ''), 10);
//         return na - nb;
//       })
//       .map(([key, cfg]) => ({
//         label: cfg.name, // e.g. "Power Tailoring (Tom Ford–inspired)"
//         value: key as StyleAgentKey, // 'agent1' | ... | 'agent12'
//       }));

//     return [...none, ...numbered];
//   }, []);

//   const isGenDisabled = !canGenerate || isGenerating;

//   const weatherDisabled = !useWeather;
//   const modeLabel = useWeather
//     ? weather === 'auto'
//       ? 'Auto'
//       : weather === 'hot'
//       ? 'Hot'
//       : weather === 'cold'
//       ? 'Cold'
//       : 'Rainy'
//     : 'Off';

//   return (
//     <View style={S.container}>
//       {/* Primary CTA */}
//       <View
//         style={{
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         <TouchableOpacity
//           style={[globalStyles.buttonPrimary, {width: 140}]}
//           onPress={onRegenerate}
//           disabled={isGenDisabled}
//           accessibilityState={{disabled: isGenDisabled}}
//           testID="generate-outfit-button">
//           <Text style={globalStyles.buttonPrimaryText}>
//             {isGenerating ? 'Generating…' : 'Create Outfit'}
//           </Text>
//         </TouchableOpacity>

//         {/* NEW: Single gear to toggle ALL content below */}
//         <TouchableOpacity
//           onPress={() => setShowExtras(s => !s)}
//           activeOpacity={0.8}
//           accessibilityRole="button"
//           accessibilityLabel={showExtras ? 'Hide options' : 'Show options'}
//           testID="master-gear-toggle"
//           style={[S.iconBtn, {marginTop: 10}]}>
//           <MaterialIcons name="settings" size={20} color={'#504949ff'} />
//         </TouchableOpacity>
//       </View>

//       {/* NEW: Refinement input + button (hidden until outfit exists) */}
//       {showRefine && (
//         <>
//           <TextInput
//             style={S.refineInput}
//             value={refineText}
//             onChangeText={setRefineText}
//             placeholder="Refine outfit (e.g. make shorts more colorful)"
//             placeholderTextColor="#888"
//           />
//           <View
//             style={{
//               display: 'flex',
//               justifyContent: 'center',
//               alignItems: 'center',
//             }}>
//             <TouchableOpacity
//               style={S.refineCta}
//               onPress={() => {
//                 if (onRefine && refineText.trim()) {
//                   onRefine(refineText.trim());
//                   setRefineText('');
//                 }
//               }}
//               disabled={isGenerating}
//               accessibilityState={{disabled: isGenerating}}
//               testID="refine-outfit-button">
//               <Text style={S.ctaText}>
//                 {isGenerating ? 'Refining…' : 'Refine Outfit'}
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </>
//       )}

//       {/* EVERYTHING BELOW THE CTA IS NOW COLLAPSIBLE */}
//       {showExtras && (
//         <>
//           {/* ⬇️ Moved OUT of Advanced: AI Style Agent */}
//           <View style={[S.row, {marginTop: 18, marginBottom: 2}]}>
//             <Text style={S.label}>Stylist Presets</Text>
//           </View>

//           <View style={openStyleAgent ? S.ddWrapperOpen : S.ddWrapper}>
//             <DropDownPicker
//               open={openStyleAgent}
//               setOpen={setOpenStyleAgent}
//               value={styleAgent ?? null}
//               // Handle both value and updater fn that DropDownPicker may pass
//               setValue={next => {
//                 const resolved =
//                   typeof next === 'function'
//                     ? (next(styleAgent) as StyleAgentKey | null)
//                     : (next as StyleAgentKey | null);
//                 onChangeStyleAgent?.(resolved);
//               }}
//               items={styleAgentOptions}
//               placeholder="Choose (Optional)"
//               listMode="SCROLLVIEW"
//               maxHeight={580}
//               scrollViewProps={{nestedScrollEnabled: true}}
//               dropDownDirection="AUTO"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{
//                 backgroundColor: theme.colors.surface,
//                 zIndex: 9999,
//                 elevation: 9999,
//                 maxHeight: 180,
//               }}
//             />
//           </View>

//           {/* Weather row */}
//           <View style={[S.row, {marginTop: 22}]}>
//             <View style={S.subRow}>
//               <Switch
//                 value={useWeather}
//                 onValueChange={enabled => {
//                   onToggleWeather(enabled);
//                   if (!enabled) setShowWeatherPicker(false);
//                 }}
//                 trackColor={{false: '#767577', true: 'rgba(102, 0, 197, 1)'}}
//                 thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//               />
//               <Text style={S.label}>Use Weather</Text>
//               <Text
//                 style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//                 ({modeLabel})
//               </Text>
//             </View>

//             <TouchableOpacity
//               disabled={weatherDisabled}
//               onPress={() => setShowWeatherPicker(s => !s)}
//               activeOpacity={0.8}
//               style={[
//                 S.pill,
//                 S.pillPrimary2,
//                 {opacity: weatherDisabled ? 0.2 : 1},
//               ]}>
//               <Text style={S.pillTextPrimary}>
//                 {showWeatherPicker ? 'Hide Controls' : 'Advanced Weather'}
//               </Text>
//             </TouchableOpacity>
//           </View>

//           {/* Weather picker */}
//           {showWeatherPicker && (
//             <View style={openWeather ? S.ddWrapperOpen : S.ddWrapper}>
//               <DropDownPicker
//                 open={openWeather}
//                 setOpen={setOpenWeather}
//                 value={weather}
//                 setValue={val => onChangeWeather(val as unknown as string)}
//                 items={weatherOptions}
//                 placeholder={
//                   useWeather ? 'Choose weather option' : 'Weather (disabled)'
//                 }
//                 listMode="SCROLLVIEW"
//                 dropDownDirection="AUTO"
//                 style={{backgroundColor: theme.colors.surface}}
//                 textStyle={{color: theme.colors.foreground}}
//                 dropDownContainerStyle={{
//                   backgroundColor: theme.colors.surface,
//                   zIndex: 9999,
//                   elevation: 9999,
//                 }}
//                 disabled={weatherDisabled}
//               />
//               <Text style={[S.faint, {marginTop: 6}]}>
//                 {useWeather
//                   ? 'Auto uses your current location.'
//                   : 'Weather is off — outfits ignore weather.'}
//               </Text>
//             </View>
//           )}

//           {/* RBAC - Advanced controls gear (👈 unchanged logic, now inside extras) */}
//           {role !== 'developer' && (
//             <View style={[S.row, {marginTop: 4}]}>
//               <Text style={[S.faint]}>Advanced Controls</Text>
//               <TouchableOpacity
//                 onPress={() => setShowMoreOptions(s => !s)}
//                 onLongPress={() => setShowHiddenDev(v => !v)}
//                 delayLongPress={500}
//                 activeOpacity={0.8}
//                 accessibilityRole="button"
//                 accessibilityLabel={
//                   showMoreOptions ? 'Hide options' : 'Show options'
//                 }
//                 testID="options-gear-button"
//                 style={S.iconBtn}>
//                 <MaterialIcons
//                   name="settings"
//                   size={20}
//                   color={theme.colors.primary}
//                 />
//               </TouchableOpacity>
//             </View>
//           )}

//           {/* Advanced section */}
//           {showMoreOptions && (
//             <View style={S.section}>
//               <View style={[S.row, {marginTop: 6}]}>
//                 <View style={S.subRow}>
//                   <Switch
//                     value={feedbackEnabled}
//                     onValueChange={enabled => {
//                       setFeedbackEnabled(enabled);
//                       onToggleFeedback?.(enabled);
//                     }}
//                     trackColor={{false: '#767577', true: '#405de6'}}
//                     thumbColor={feedbackEnabled ? '#fff' : '#f4f3f4'}
//                   />
//                   <Text style={S.label}>Use Feedback Influence</Text>
//                   <Text
//                     style={[
//                       S.label,
//                       {marginLeft: 10, color: theme.colors.muted},
//                     ]}>
//                     ({feedbackEnabled ? 'On' : 'Off'})
//                   </Text>
//                 </View>
//                 <Text style={[S.faint]} />
//               </View>

//               {/* DEV: Scoring Weights */}
//               <View style={S.card}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <Text style={S.cardTitle}>Scoring Weights (dev)</Text>
//                   <TouchableOpacity
//                     onPress={() => onChangeWeights?.(DEFAULT_WEIGHTS)}
//                     style={{
//                       paddingVertical: 6,
//                       paddingHorizontal: 10,
//                       borderRadius: 8,
//                       backgroundColor: '#333',
//                     }}>
//                     <Text style={{color: '#fff', fontWeight: '600'}}>
//                       Reset
//                     </Text>
//                   </TouchableOpacity>
//                 </View>

//                 <SliderLite
//                   label="Constraints"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.constraintsWeight}
//                   onChange={v => setWeights({constraintsWeight: v})}
//                 />

//                 <SliderLite
//                   label="Style"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.styleWeight}
//                   onChange={v => setWeights({styleWeight: v})}
//                   disabled={!useStylePrefs}
//                 />

//                 <SliderLite
//                   label="Weather"
//                   min={0}
//                   max={3}
//                   step={0.1}
//                   value={w.weatherWeight}
//                   onChange={v => setWeights({weatherWeight: v})}
//                 />
//               </View>
//             </View>
//           )}

//           <View style={{marginTop: 8}}>
//             {/* Status */}
//             {statusText ? (
//               <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
//             ) : null}
//           </View>
//         </>
//       )}
//     </View>
//   );
// }
