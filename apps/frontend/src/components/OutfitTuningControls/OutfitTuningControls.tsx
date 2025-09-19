import React, {useMemo, useRef, useState} from 'react';
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
        onPress={e => setFromX(e.nativeEvent.locationX)}
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
          onPress={() => onChange(clamp(toStep(value - step)))}
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
          onPress={() => onChange(clamp(toStep(value + step)))}
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

  // style prefs toggle
  useStylePrefs,
  onToggleStylePrefs,

  // NEW — feedback
  useFeedback = true,
  onToggleFeedback,

  // NEW — style agent
  styleAgent,
  onChangeStyleAgent,

  // weights
  weights,
  onChangeWeights,

  isGenerating = false,
  statusText,
  onRefine,

  // NEW
  canGenerate = true,
  showRefine = true,
}: Props) {
  const {theme} = useAppTheme();

  const role = useAuthRole();
  console.log('ROLE FROM HOOK =', role);

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

    // Keep numeric order: agent1 → agent12
    const numbered = Object.entries(STYLE_AGENTS)
      .sort(([a], [b]) => {
        const na = parseInt(a.replace('agent', ''), 10);
        const nb = parseInt(b.replace('agent', ''), 10);
        return na - nb;
      })
      .map(([key, cfg]) => ({
        label: cfg.name, // e.g. "Power Tailoring (Tom Ford–inspired)"
        value: key as StyleAgentKey, // 'agent1' | ... | 'agent12'
      }));

    return [...none, ...numbered];
  }, []);

  const isGenDisabled = !canGenerate || isGenerating;

  const S = StyleSheet.create({
    container: {width: '100%', paddingHorizontal: 20, gap: 12},
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    subRow: {flexDirection: 'row', alignItems: 'center'},
    label: {marginLeft: 8, color: theme.colors.foreground, fontSize: 14},
    faint: {color: theme.colors.muted, fontSize: 12},
    pill: {borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12},
    pillPrimary2: {backgroundColor: isGenerating ? '#7a88ff' : '#474747ff'},
    pillTextPrimary: {color: '#fff', fontWeight: '600', fontSize: 13},
    cta: {
      height: 48,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
      opacity: isGenDisabled ? 0.5 : 1,
      marginTop: 8,
      marginBottom: 4,
      width: 150,
    },
    headerWrap: {marginTop: 4, marginBottom: 4},
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
    ctaText: {color: '#fff', fontSize: 16, fontWeight: '600'},
    section: {gap: 10},
    iconBtn: {
      width: 25,
      height: 25,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ddWrapper: {
      position: 'relative',
      zIndex: 9999,
    },
    ddWrapperOpen: {
      position: 'relative',
      zIndex: 9999,
      elevation: 9999,
    },
    card: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      gap: 10,
    },
    cardTitle: {color: theme.colors.foreground, fontWeight: '600'},
    refineInput: {
      borderWidth: 1,
      borderColor: '#666',
      borderRadius: 8,
      padding: 10,
      marginTop: 6,
      color: theme.colors.foreground,
    },
    hint: {
      textAlign: 'center',
      marginBottom: 8,
      color: theme.colors.muted,
      fontSize: 12,
    },
  });

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

  return (
    <View style={S.container}>
      {/* Primary CTA */}
      <View
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <TouchableOpacity
          style={S.cta}
          onPress={onRegenerate}
          disabled={isGenDisabled}
          accessibilityState={{disabled: isGenDisabled}}
          testID="generate-outfit-button">
          <Text style={S.ctaText}>
            {isGenerating ? 'Generating…' : 'Create Outfit'}
          </Text>
        </TouchableOpacity>

        {/* NEW: Single gear to toggle ALL content below */}
        <TouchableOpacity
          onPress={() => setShowExtras(s => !s)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={showExtras ? 'Hide options' : 'Show options'}
          testID="master-gear-toggle"
          style={[S.iconBtn, {marginTop: 10}]}>
          <MaterialIcons name="settings" size={20} color={'#504949ff'} />
        </TouchableOpacity>
      </View>

      {/* NEW: Refinement input + button (hidden until outfit exists) */}
      {showRefine && (
        <>
          <TextInput
            style={S.refineInput}
            value={refineText}
            onChangeText={setRefineText}
            placeholder="Refine outfit (e.g. make shorts more colorful)"
            placeholderTextColor="#888"
          />
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
                  onRefine(refineText.trim());
                  setRefineText('');
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
      )}

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
              // Handle both value and updater fn that DropDownPicker may pass
              setValue={next => {
                const resolved =
                  typeof next === 'function'
                    ? (next(styleAgent) as StyleAgentKey | null)
                    : (next as StyleAgentKey | null);
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
            />
          </View>

          {/* Weather row */}
          <View style={[S.row, {marginTop: 22}]}>
            <View style={S.subRow}>
              <Switch
                value={useWeather}
                onValueChange={enabled => {
                  onToggleWeather(enabled);
                  if (!enabled) setShowWeatherPicker(false);
                }}
                trackColor={{false: '#767577', true: '#405de6'}}
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
              onPress={() => setShowWeatherPicker(s => !s)}
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
                setValue={val => onChangeWeather(val as unknown as string)}
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
              />
              <Text style={[S.faint, {marginTop: 6}]}>
                {useWeather
                  ? 'Auto uses your current location.'
                  : 'Weather is off — outfits ignore weather.'}
              </Text>
            </View>
          )}

          {/* RBAC - Advanced controls gear (👈 unchanged logic, now inside extras) */}
          {role !== 'developer' && (
            <View style={[S.row, {marginTop: 4}]}>
              <Text style={[S.faint]}>Advanced Controls</Text>
              <TouchableOpacity
                onPress={() => setShowMoreOptions(s => !s)}
                onLongPress={() => setShowHiddenDev(v => !v)}
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
            <View style={S.section}>
              <View style={[S.row, {marginTop: 6}]}>
                <View style={S.subRow}>
                  <Switch
                    value={feedbackEnabled}
                    onValueChange={enabled => {
                      setFeedbackEnabled(enabled);
                      onToggleFeedback?.(enabled);
                    }}
                    trackColor={{false: '#767577', true: '#405de6'}}
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
                    onPress={() => onChangeWeights?.(DEFAULT_WEIGHTS)}
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
            {/* Status */}
            {statusText ? (
              <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

////////////////

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
//   // styleAgent?: string | null; // 'agent1' | 'agent2' | 'agent3' | null
//   // onChangeStyleAgent?: (agent: string | null) => void;
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

//   const role = useAuthRole();
//   console.log('ROLE FROM HOOK =', role);

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

//   // const styleAgentOptions = [
//   //   {label: 'None (Use My Style Preferences)', value: null},
//   //   {label: 'Stylist 1 — The Classicist', value: 'agent1'},
//   //   {label: 'Stylist 2 — Rebel Streetwear', value: 'agent2'},
//   //   {label: 'Stylist 3 — Heritage', value: 'agent3'},
//   // ];

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
//       {/* Header */}
//       {/* <View style={S.headerWrap}>
//         <Text style={S.headerSubtitle}>
//           Tap Create Outfit — We’ll create an outfit according to your input
//           above.
//         </Text>
//       </View> */}

//       {/* Primary CTA */}
//       <View
//         style={{
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         <TouchableOpacity
//           style={S.cta}
//           onPress={onRegenerate}
//           disabled={isGenDisabled}
//           accessibilityState={{disabled: isGenDisabled}}
//           testID="generate-outfit-button">
//           <Text style={S.ctaText}>
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
//             {/* <DropDownPicker
//               open={openStyleAgent}
//               setOpen={setOpenStyleAgent}
//               value={styleAgent ?? null}
//               setValue={val => onChangeStyleAgent?.(val as string | null)}
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
//                 maxHeight: 280,
//               }}
//             /> */}
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
//                 maxHeight: 280,
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
//                 trackColor={{false: '#767577', true: '#405de6'}}
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

// export type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

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
//   styleAgent?: string | null; // 'agent1' | 'agent2' | 'agent3' | null
//   onChangeStyleAgent?: (agent: string | null) => void;

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

//   const role = useAuthRole();
//   console.log('ROLE FROM HOOK =', role);

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

//   const styleAgentOptions = [
//     {label: 'None (Use My Style Preferences)', value: null},
//     {label: 'Stylist 1 — The Classicist', value: 'agent1'},
//     {label: 'Stylist 2 — Rebel Streetwear', value: 'agent2'},
//     {label: 'Stylist 3 — Heritage', value: 'agent3'},
//   ];

//   const isGenDisabled = !canGenerate || isGenerating;

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
//       {/* Header */}
//       {/* <View style={S.headerWrap}>
//         <Text style={S.headerSubtitle}>
//           Tap Create Outfit — We’ll create an outfit according to your input
//           above.
//         </Text>
//       </View> */}

//       {/* Primary CTA */}
//       <View
//         style={{
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         <TouchableOpacity
//           style={S.cta}
//           onPress={onRegenerate}
//           disabled={isGenDisabled}
//           accessibilityState={{disabled: isGenDisabled}}
//           testID="generate-outfit-button">
//           <Text style={S.ctaText}>
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
//               setValue={val => onChangeStyleAgent?.(val as string | null)}
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
//                 maxHeight: 280,
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
//                 trackColor={{false: '#767577', true: '#405de6'}}
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

/////////////////////

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

// export type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

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
//   styleAgent?: string | null; // 'agent1' | 'agent2' | 'agent3' | null
//   onChangeStyleAgent?: (agent: string | null) => void;

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

//   const role = useAuthRole();
//   console.log('ROLE FROM HOOK =', role);

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

//   const styleAgentOptions = [
//     {label: 'None (Use My Style Preferences)', value: null},
//     {label: 'Stylist 1 — The Classicist', value: 'agent1'},
//     {label: 'Stylist 2 — Rebel Streetwear', value: 'agent2'},
//     {label: 'Stylist 3 — Heritage', value: 'agent3'},
//   ];

//   const isGenDisabled = !canGenerate || isGenerating;

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
//       borderRadius: 10,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: '#ff8c00',
//       opacity: isGenerating ? 0.7 : 1,
//       marginTop: 8,
//       marginBottom: 12,
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
//       {/* Header */}
//       {/* <View style={S.headerWrap}>
//         <Text style={S.headerSubtitle}>
//           Tap Create Outfit — We’ll create an outfit according to your input
//           above.
//         </Text>
//       </View> */}

//       {/* Primary CTA */}
//       <View
//         style={{
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         <TouchableOpacity
//           style={S.cta}
//           onPress={onRegenerate}
//           disabled={isGenDisabled}
//           accessibilityState={{disabled: isGenDisabled}}
//           testID="generate-outfit-button">
//           <Text style={S.ctaText}>
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
//           <TouchableOpacity
//             style={S.refineCta}
//             onPress={() => {
//               if (onRefine && refineText.trim()) {
//                 onRefine(refineText.trim());
//                 setRefineText('');
//               }
//             }}
//             disabled={isGenerating}
//             accessibilityState={{disabled: isGenerating}}
//             testID="refine-outfit-button">
//             <Text style={S.ctaText}>
//               {isGenerating ? 'Refining…' : 'Refine Outfit'}
//             </Text>
//           </TouchableOpacity>
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
//               setValue={val => onChangeStyleAgent?.(val as string | null)}
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
//                 maxHeight: 280,
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
//                 trackColor={{false: '#767577', true: '#405de6'}}
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

//////////////////////

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

// export type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

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
//   styleAgent?: string | null; // 'agent1' | 'agent2' | 'agent3' | null
//   onChangeStyleAgent?: (agent: string | null) => void;

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

//   const role = useAuthRole();
//   console.log('ROLE FROM HOOK =', role);

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

//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: 'Hot Weather', value: 'hot'},
//     {label: 'Cold Weather', value: 'cold'},
//     {label: 'Rainy Weather', value: 'rainy'},
//   ];

//   const styleAgentOptions = [
//     {label: 'None (Use My Style Preferences)', value: null},
//     {label: 'Stylist 1 — The Classicist', value: 'agent1'},
//     {label: 'Stylist 2 — Rebel Streetwear', value: 'agent2'},
//     {label: 'Stylist 3 — Heritage', value: 'agent3'},
//   ];

//   const isGenDisabled = !canGenerate || isGenerating;

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
//       borderRadius: 10,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: '#ff8c00',
//       opacity: isGenerating ? 0.7 : 1,
//       marginTop: 8,
//       marginBottom: 12,
//     },
//     ctaText: {color: '#fff', fontSize: 16, fontWeight: '600'},
//     section: {gap: 10},
//     iconBtn: {
//       width: 36,
//       height: 36,
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
//       {/* Primary CTA — disabled until prompt provided */}
//       {/* Header */}
//       <View style={S.headerWrap}>
//         <Text style={S.headerSubtitle}>
//           Tap Create Outfit — We’ll create an outfit according to your input
//           above.
//         </Text>
//       </View>
//       <View
//         style={{
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         <TouchableOpacity
//           style={S.cta}
//           onPress={onRegenerate}
//           disabled={isGenDisabled}
//           accessibilityState={{disabled: isGenDisabled}}
//           testID="generate-outfit-button">
//           <Text style={S.ctaText}>
//             {isGenerating ? 'Generating…' : 'Create Outfit'}
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* {!canGenerate && !isGenerating && (
//         <Text style={S.hint}>Enter a prompt to enable Generate.</Text>
//       )} */}

//       {/* ⬇️ Moved OUT of Advanced: Style profile toggle */}
//       {/* <View style={[S.row, {marginTop: 12}]}>
//         <View className="subRow" style={S.subRow}>
//           <Switch
//             value={useStylePrefs}
//             onValueChange={onToggleStylePrefs}
//             trackColor={{false: '#767577', true: '#405de6'}}
//             thumbColor={useStylePrefs ? '#fff' : '#f4f3f4'}
//           />
//           <Text style={S.label}>Use Style Profile</Text>
//           <Text style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//             ({useStylePrefs ? 'On' : 'Off'})
//           </Text>
//         </View>
//         <View style={{width: 1}} />
//       </View> */}

//       {/* ⬇️ Moved OUT of Advanced: AI Style Agent */}
//       <View style={[S.row, {marginTop: 18, marginBottom: 2}]}>
//         <Text style={S.label}>Stylist Presets</Text>
//       </View>

//       <View style={openStyleAgent ? S.ddWrapperOpen : S.ddWrapper}>
//         <DropDownPicker
//           open={openStyleAgent}
//           setOpen={setOpenStyleAgent}
//           value={styleAgent ?? null}
//           setValue={val => onChangeStyleAgent?.(val as string | null)}
//           items={styleAgentOptions}
//           placeholder="Choose (Optional)"
//           listMode="SCROLLVIEW"
//           maxHeight={580} // ⬅️ enables scrolling when tall
//           scrollViewProps={{nestedScrollEnabled: true}} // (harmless on iOS; needed on Android)
//           dropDownDirection="AUTO"
//           style={{backgroundColor: theme.colors.surface}}
//           textStyle={{color: theme.colors.foreground}}
//           dropDownContainerStyle={{
//             backgroundColor: theme.colors.surface,
//             zIndex: 9999,
//             elevation: 9999,
//             maxHeight: 280, // ⬅️ defensive: cap container height too
//           }}
//         />
//       </View>

//       {/* Weather row */}
//       <View style={[S.row, {marginTop: 22}]}>
//         <View style={S.subRow}>
//           <Switch
//             value={useWeather}
//             onValueChange={enabled => {
//               onToggleWeather(enabled);
//               if (!enabled) setShowWeatherPicker(false);
//             }}
//             trackColor={{false: '#767577', true: '#405de6'}}
//             thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//           />
//           <Text style={S.label}>Use Weather</Text>
//           <Text style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//             ({modeLabel})
//           </Text>
//         </View>

//         <TouchableOpacity
//           disabled={weatherDisabled}
//           onPress={() => setShowWeatherPicker(s => !s)}
//           activeOpacity={0.8}
//           style={[
//             S.pill,
//             S.pillPrimary2,
//             {opacity: weatherDisabled ? 0.2 : 1},
//           ]}>
//           <Text style={S.pillTextPrimary}>
//             {showWeatherPicker ? 'Hide Controls' : 'Advanced Weather'}
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* Weather picker */}
//       {showWeatherPicker && (
//         <View style={openWeather ? S.ddWrapperOpen : S.ddWrapper}>
//           <DropDownPicker
//             open={openWeather}
//             setOpen={setOpenWeather}
//             value={weather}
//             setValue={val => onChangeWeather(val as unknown as string)}
//             items={weatherOptions}
//             placeholder={
//               useWeather ? 'Choose weather option' : 'Weather (disabled)'
//             }
//             listMode="SCROLLVIEW"
//             dropDownDirection="AUTO"
//             style={{backgroundColor: theme.colors.surface}}
//             textStyle={{color: theme.colors.foreground}}
//             dropDownContainerStyle={{
//               backgroundColor: theme.colors.surface,
//               zIndex: 9999,
//               elevation: 9999,
//             }}
//             disabled={weatherDisabled}
//           />
//           <Text style={[S.faint, {marginTop: 6}]}>
//             {useWeather
//               ? 'Auto uses your current location.'
//               : 'Weather is off — outfits ignore weather.'}
//           </Text>
//         </View>
//       )}

//       {/* RBAC - Advanced controls gear (👈 only if developer) */}
//       {role !== 'developer' && (
//         <View style={[S.row, {marginTop: 4}]}>
//           <Text style={[S.faint]}>Advanced Controls</Text>
//           <TouchableOpacity
//             onPress={() => setShowMoreOptions(s => !s)}
//             onLongPress={() => setShowHiddenDev(v => !v)}
//             delayLongPress={500}
//             activeOpacity={0.8}
//             accessibilityRole="button"
//             accessibilityLabel={
//               showMoreOptions ? 'Hide options' : 'Show options'
//             }
//             testID="options-gear-button"
//             style={S.iconBtn}>
//             <MaterialIcons
//               name="settings"
//               size={20}
//               color={theme.colors.primary}
//             />
//           </TouchableOpacity>
//         </View>
//       )}

//       {/* Advanced section */}
//       {showMoreOptions && (
//         <View style={S.section}>
//           <View style={[S.row, {marginTop: 6}]}>
//             <View style={S.subRow}>
//               <Switch
//                 value={feedbackEnabled}
//                 onValueChange={enabled => {
//                   setFeedbackEnabled(enabled);
//                   onToggleFeedback?.(enabled);
//                 }}
//                 trackColor={{false: '#767577', true: '#405de6'}}
//                 thumbColor={feedbackEnabled ? '#fff' : '#f4f3f4'}
//               />
//               <Text style={S.label}>Use Feedback Influence</Text>
//               <Text
//                 style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//                 ({feedbackEnabled ? 'On' : 'Off'})
//               </Text>
//             </View>
//             <Text style={[S.faint]} />
//           </View>

//           {/* DEV: Scoring Weights */}
//           <View style={S.card}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//               }}>
//               <Text style={S.cardTitle}>Scoring Weights (dev)</Text>
//               <TouchableOpacity
//                 onPress={() => onChangeWeights?.(DEFAULT_WEIGHTS)}
//                 style={{
//                   paddingVertical: 6,
//                   paddingHorizontal: 10,
//                   borderRadius: 8,
//                   backgroundColor: '#333',
//                 }}>
//                 <Text style={{color: '#fff', fontWeight: '600'}}>Reset</Text>
//               </TouchableOpacity>
//             </View>

//             <SliderLite
//               label="Constraints"
//               min={0}
//               max={3}
//               step={0.1}
//               value={w.constraintsWeight}
//               onChange={v => setWeights({constraintsWeight: v})}
//             />

//             <SliderLite
//               label="Style"
//               min={0}
//               max={3}
//               step={0.1}
//               value={w.styleWeight}
//               onChange={v => setWeights({styleWeight: v})}
//               disabled={!useStylePrefs}
//             />

//             <SliderLite
//               label="Weather"
//               min={0}
//               max={3}
//               step={0.1}
//               value={w.weatherWeight}
//               onChange={v => setWeights({weatherWeight: v})}
//             />
//           </View>
//         </View>
//       )}

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
//           <TouchableOpacity
//             style={S.refineCta}
//             onPress={() => {
//               if (onRefine && refineText.trim()) {
//                 onRefine(refineText.trim());
//                 setRefineText('');
//               }
//             }}
//             disabled={isGenerating}
//             accessibilityState={{disabled: isGenerating}}
//             testID="refine-outfit-button">
//             <Text style={S.ctaText}>
//               {isGenerating ? 'Refining…' : 'Refine Outfit'}
//             </Text>
//           </TouchableOpacity>
//         </>
//       )}

//       <View style={{marginTop: 8}}>
//         {/* Status */}
//         {statusText ? (
//           <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
//         ) : null}
//       </View>
//     </View>
//   );
// }

/////////////////

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

// export type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

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
//   styleAgent?: string | null; // 'agent1' | 'agent2' | 'agent3' | null
//   onChangeStyleAgent?: (agent: string | null) => void;

//   // weights controls (nullable from parent; we’ll default safely)
//   weights?: Weights;
//   onChangeWeights?: (w: Weights) => void;

//   onRegenerate: () => void;
//   onGenerate?: () => void;
//   onRefine?: (refinement: string) => void;
//   isGenerating?: boolean;
//   statusText?: string;

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
//             backgroundColor: '#0A84FF', // system blue vibe
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
//             borderRadius: 10,
//             backgroundColor: '#1f1f1f',
//           }}>
//           <Text style={{color: '#fff'}}>-</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           disabled={disabled}
//           onPress={() => onChange(clamp(toStep(value + step)))}
//           style={{
//             paddingVertical: 6,
//             paddingHorizontal: 12,
//             borderRadius: 10,
//             backgroundColor: '#1f1f1f',
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

//   const role = useAuthRole();
//   console.log('ROLE FROM HOOK =', role);

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

//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: 'Hot Weather', value: 'hot'},
//     {label: 'Cold Weather', value: 'cold'},
//     {label: 'Rainy Weather', value: 'rainy'},
//   ];

//   const styleAgentOptions = [
//     {label: 'None (Use My Style Preferences)', value: null},
//     {label: 'Stylist 1 — The Classicist', value: 'agent1'},
//     {label: 'Stylist 2 — Rebel Streetwear', value: 'agent2'},
//     {label: 'Stylist 3 — Heritage', value: 'agent3'},
//   ];

//   const isGenDisabled = !canGenerate || isGenerating;

//   const S = StyleSheet.create({
//     container: {
//       width: '100%',
//       paddingHorizontal: 20,
//       paddingTop: 4,
//       gap: 12,
//     },

//     // Apple-ish header
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

//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     subRow: {flexDirection: 'row', alignItems: 'center'},
//     label: {marginLeft: 8, color: theme.colors.foreground, fontSize: 14},
//     faint: {color: theme.colors.muted, fontSize: 12},

//     // Apple-like cards (soft border, rounded, subtle bg)
//     card: {
//       padding: 14,
//       borderRadius: 14,
//       backgroundColor: theme.colors.surface,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: '#2a2a2a',
//       gap: 10,
//     },
//     cardTitle: {
//       color: theme.colors.foreground,
//       fontWeight: '600',
//       fontSize: 14,
//       marginBottom: 4,
//     },

//     // Pills & buttons
//     pill: {
//       borderRadius: 20,
//       paddingVertical: 8,
//       paddingHorizontal: 12,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: '#3a3a3a',
//       backgroundColor: '#1c1c1e',
//     },
//     pillTextPrimary: {color: '#fff', fontWeight: '600', fontSize: 13},

//     // Primary CTA
//     cta: {
//       height: 52,
//       borderRadius: 14,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: isGenerating ? '#7a88ff' : '#0A84FF',
//       opacity: isGenDisabled ? 0.5 : 1,
//       marginTop: 2,
//       marginBottom: 6,
//     },
//     ctaText: {color: '#fff', fontSize: 17, fontWeight: '700'},

//     // Refine
//     refineInput: {
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: '#3a3a3a',
//       borderRadius: 12,
//       padding: 12,
//       marginTop: 6,
//       color: theme.colors.foreground,
//       backgroundColor: '#1c1c1e',
//       fontSize: 15,
//     },
//     refineCta: {
//       height: 46,
//       borderRadius: 12,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: '#ff8c00',
//       opacity: isGenerating ? 0.7 : 1,
//       marginTop: 8,
//       marginBottom: 10,
//     },

//     // Icon button (gear)
//     iconBtn: {
//       width: 34,
//       height: 34,
//       borderRadius: 17,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: '#2a2a2a',
//     },

//     ddWrapper: {position: 'relative', zIndex: 9999},
//     ddWrapperOpen: {
//       position: 'relative',
//       zIndex: 9999,
//       elevation: 9999,
//     },

//     // Small helper text
//     hint: {
//       textAlign: 'center',
//       marginBottom: 8,
//       color: theme.colors.muted,
//       fontSize: 12,
//     },
//   });

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
//       {/* Header */}
//       <View style={S.headerWrap}>
//         <Text style={S.headerTitle}>Style my outfit</Text>
//         <Text style={S.headerSubtitle}>
//           Tap Generate — we’ll use your wardrobe and preferences.
//         </Text>
//       </View>

//       {/* Primary CTA — unchanged logic */}
//       <TouchableOpacity
//         style={S.cta}
//         onPress={onRegenerate}
//         disabled={isGenDisabled}
//         accessibilityState={{disabled: isGenDisabled}}
//         testID="generate-outfit-button">
//         <Text style={S.ctaText}>
//           {isGenerating ? 'Generating…' : 'Generate Outfit'}
//         </Text>
//       </TouchableOpacity>

//       {/* Stylist Presets */}
//       <View style={S.card}>
//         <Text style={S.cardTitle}>Stylist Presets</Text>
//         <View style={openStyleAgent ? S.ddWrapperOpen : S.ddWrapper}>
//           <DropDownPicker
//             open={openStyleAgent}
//             setOpen={setOpenStyleAgent}
//             value={styleAgent ?? null}
//             setValue={val => onChangeStyleAgent?.(val as string | null)}
//             items={styleAgentOptions}
//             placeholder="Choose (optional)"
//             listMode="SCROLLVIEW"
//             maxHeight={580}
//             scrollViewProps={{nestedScrollEnabled: true}}
//             dropDownDirection="AUTO"
//             style={{
//               backgroundColor: theme.colors.surface,
//               borderColor: '#2a2a2a',
//             }}
//             textStyle={{color: theme.colors.foreground, fontSize: 15}}
//             dropDownContainerStyle={{
//               backgroundColor: theme.colors.surface,
//               zIndex: 9999,
//               elevation: 9999,
//               maxHeight: 280,
//               borderColor: '#2a2a2a',
//             }}
//           />
//         </View>
//       </View>

//       {/* Weather */}
//       <View style={S.card}>
//         <View style={S.row}>
//           <View style={S.subRow}>
//             <Switch
//               value={useWeather}
//               onValueChange={enabled => {
//                 onToggleWeather(enabled);
//                 if (!enabled) setShowWeatherPicker(false);
//               }}
//               trackColor={{false: '#767577', true: '#0A84FF'}}
//               thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//             />
//             <Text style={S.label}>Use Weather</Text>
//             <Text
//               style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//               ({modeLabel})
//             </Text>
//           </View>

//           <TouchableOpacity
//             disabled={weatherDisabled}
//             onPress={() => setShowWeatherPicker(s => !s)}
//             activeOpacity={0.8}
//             style={[
//               S.pill,
//               {
//                 opacity: weatherDisabled ? 0.3 : 1,
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 gap: 6,
//               },
//             ]}>
//             <Text style={S.pillTextPrimary}>
//               {showWeatherPicker ? 'Hide Controls' : 'Advanced Weather'}
//             </Text>
//             <MaterialIcons
//               name={showWeatherPicker ? 'expand-less' : 'chevron-right'}
//               size={18}
//               color="#fff"
//             />
//           </TouchableOpacity>
//         </View>

//         {showWeatherPicker && (
//           <View
//             style={[
//               openWeather ? S.ddWrapperOpen : S.ddWrapper,
//               {marginTop: 10},
//             ]}>
//             <DropDownPicker
//               open={openWeather}
//               setOpen={setOpenWeather}
//               value={weather}
//               setValue={val => onChangeWeather(val as unknown as string)}
//               items={weatherOptions}
//               placeholder={
//                 useWeather ? 'Choose weather option' : 'Weather (disabled)'
//               }
//               listMode="SCROLLVIEW"
//               dropDownDirection="AUTO"
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 borderColor: '#2a2a2a',
//               }}
//               textStyle={{color: theme.colors.foreground, fontSize: 15}}
//               dropDownContainerStyle={{
//                 backgroundColor: theme.colors.surface,
//                 zIndex: 9999,
//                 elevation: 9999,
//                 borderColor: '#2a2a2a',
//               }}
//               disabled={weatherDisabled}
//             />
//             <Text style={[S.faint, {marginTop: 8}]}>
//               {useWeather
//                 ? 'Auto uses your current location.'
//                 : 'Weather is off — outfits ignore weather.'}
//             </Text>
//           </View>
//         )}
//       </View>

//       {/* Advanced */}
//       {role !== 'developer' && (
//         <View style={[S.card]}>
//           <View style={[S.row]}>
//             <Text style={S.cardTitle}>More Options</Text>
//             <TouchableOpacity
//               onPress={() => setShowMoreOptions(s => !s)}
//               onLongPress={() => setShowHiddenDev(v => !v)}
//               delayLongPress={500}
//               activeOpacity={0.8}
//               accessibilityRole="button"
//               accessibilityLabel={
//                 showMoreOptions ? 'Hide options' : 'Show options'
//               }
//               testID="options-gear-button"
//               style={[
//                 S.iconBtn,
//                 {flexDirection: 'row', gap: 6, paddingHorizontal: 8},
//               ]}>
//               <MaterialIcons
//                 name={showMoreOptions ? 'expand-less' : 'chevron-right'}
//                 size={18}
//                 color={theme.colors.primary}
//               />
//             </TouchableOpacity>
//           </View>

//           {showMoreOptions && (
//             <View style={{gap: 12, marginTop: 6}}>
//               <View style={[S.row]}>
//                 <View style={S.subRow}>
//                   <Switch
//                     value={feedbackEnabled}
//                     onValueChange={enabled => {
//                       setFeedbackEnabled(enabled);
//                       onToggleFeedback?.(enabled);
//                     }}
//                     trackColor={{false: '#767577', true: '#0A84FF'}}
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

//               {/* DEV Weights */}
//               <View style={[S.card, {marginTop: 2}]}>
//                 <View style={S.row}>
//                   <Text style={S.cardTitle}>Scoring Weights (dev)</Text>
//                   <TouchableOpacity
//                     onPress={() => onChangeWeights?.(DEFAULT_WEIGHTS)}
//                     style={{
//                       paddingVertical: 6,
//                       paddingHorizontal: 10,
//                       borderRadius: 10,
//                       backgroundColor: '#1f1f1f',
//                       borderWidth: StyleSheet.hairlineWidth,
//                       borderColor: '#3a3a3a',
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
//         </View>
//       )}

//       {/* Refine — unchanged logic */}
//       {showRefine && (
//         <View style={S.card}>
//           <Text style={S.cardTitle}>Refine</Text>
//           <TextInput
//             style={S.refineInput}
//             value={refineText}
//             onChangeText={setRefineText}
//             placeholder="e.g., swap sneakers for loafers"
//             placeholderTextColor="#888"
//           />
//           <TouchableOpacity
//             style={S.refineCta}
//             onPress={() => {
//               if (onRefine && refineText.trim()) {
//                 onRefine(refineText.trim());
//                 setRefineText('');
//               }
//             }}
//             disabled={isGenerating}
//             accessibilityState={{disabled: isGenerating}}
//             testID="refine-outfit-button">
//             <Text style={S.ctaText}>
//               {isGenerating ? 'Refining…' : 'Refine Outfit'}
//             </Text>
//           </TouchableOpacity>
//         </View>
//       )}

//       {/* Status */}
//       {statusText ? (
//         <Text style={[S.faint, {marginTop: 6, textAlign: 'center'}]}>
//           {statusText}
//         </Text>
//       ) : null}
//     </View>
//   );
// }

/////////////////////////////

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

// export type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

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
//   styleAgent?: string | null; // 'agent1' | 'agent2' | 'agent3' | null
//   onChangeStyleAgent?: (agent: string | null) => void;

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

//   const role = useAuthRole();
//   console.log('ROLE FROM HOOK =', role);

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

//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: 'Hot Weather', value: 'hot'},
//     {label: 'Cold Weather', value: 'cold'},
//     {label: 'Rainy Weather', value: 'rainy'},
//   ];

//   const styleAgentOptions = [
//     {label: 'None (Use My Style Preferences)', value: null},
//     {label: 'Stylist 1 — The Classicist', value: 'agent1'},
//     {label: 'Stylist 2 — Rebel Streetwear', value: 'agent2'},
//     {label: 'Stylist 3 — Heritage', value: 'agent3'},
//   ];

//   const isGenDisabled = !canGenerate || isGenerating;

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
//       borderRadius: 10,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//       opacity: isGenDisabled ? 0.5 : 1,
//       marginTop: 8,
//       marginBottom: 4,
//     },
//     refineCta: {
//       height: 48,
//       borderRadius: 10,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: '#ff8c00',
//       opacity: isGenerating ? 0.7 : 1,
//       marginTop: 8,
//       marginBottom: 12,
//     },
//     ctaText: {color: '#fff', fontSize: 16, fontWeight: '600'},
//     section: {gap: 10},
//     iconBtn: {
//       width: 36,
//       height: 36,
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
//       {/* Primary CTA — disabled until prompt provided */}
//       <TouchableOpacity
//         style={S.cta}
//         onPress={onRegenerate}
//         disabled={isGenDisabled}
//         accessibilityState={{disabled: isGenDisabled}}
//         testID="generate-outfit-button">
//         <Text style={S.ctaText}>
//           {isGenerating ? 'Generating…' : 'Generate Outfit'}
//         </Text>
//       </TouchableOpacity>

//       {/* {!canGenerate && !isGenerating && (
//         <Text style={S.hint}>Enter a prompt to enable Generate.</Text>
//       )} */}

//       {/* ⬇️ Moved OUT of Advanced: Style profile toggle */}
//       {/* <View style={[S.row, {marginTop: 12}]}>
//         <View className="subRow" style={S.subRow}>
//           <Switch
//             value={useStylePrefs}
//             onValueChange={onToggleStylePrefs}
//             trackColor={{false: '#767577', true: '#405de6'}}
//             thumbColor={useStylePrefs ? '#fff' : '#f4f3f4'}
//           />
//           <Text style={S.label}>Use Style Profile</Text>
//           <Text style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//             ({useStylePrefs ? 'On' : 'Off'})
//           </Text>
//         </View>
//         <View style={{width: 1}} />
//       </View> */}

//       {/* ⬇️ Moved OUT of Advanced: AI Style Agent */}
//       <View style={[S.row, {marginTop: 18, marginBottom: 2}]}>
//         <Text style={S.label}>Stylist Presets</Text>
//       </View>

//       <View style={openStyleAgent ? S.ddWrapperOpen : S.ddWrapper}>
//         <DropDownPicker
//           open={openStyleAgent}
//           setOpen={setOpenStyleAgent}
//           value={styleAgent ?? null}
//           setValue={val => onChangeStyleAgent?.(val as string | null)}
//           items={styleAgentOptions}
//           placeholder="Choose (Optional)"
//           listMode="SCROLLVIEW"
//           maxHeight={580} // ⬅️ enables scrolling when tall
//           scrollViewProps={{nestedScrollEnabled: true}} // (harmless on iOS; needed on Android)
//           dropDownDirection="AUTO"
//           style={{backgroundColor: theme.colors.surface}}
//           textStyle={{color: theme.colors.foreground}}
//           dropDownContainerStyle={{
//             backgroundColor: theme.colors.surface,
//             zIndex: 9999,
//             elevation: 9999,
//             maxHeight: 280, // ⬅️ defensive: cap container height too
//           }}
//         />
//       </View>

//       {/* Weather row */}
//       <View style={[S.row, {marginTop: 22}]}>
//         <View style={S.subRow}>
//           <Switch
//             value={useWeather}
//             onValueChange={enabled => {
//               onToggleWeather(enabled);
//               if (!enabled) setShowWeatherPicker(false);
//             }}
//             trackColor={{false: '#767577', true: '#405de6'}}
//             thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//           />
//           <Text style={S.label}>Use Weather</Text>
//           <Text style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//             ({modeLabel})
//           </Text>
//         </View>

//         <TouchableOpacity
//           disabled={weatherDisabled}
//           onPress={() => setShowWeatherPicker(s => !s)}
//           activeOpacity={0.8}
//           style={[
//             S.pill,
//             S.pillPrimary2,
//             {opacity: weatherDisabled ? 0.2 : 1},
//           ]}>
//           <Text style={S.pillTextPrimary}>
//             {showWeatherPicker ? 'Hide Controls' : 'Advanced Weather'}
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* Weather picker */}
//       {showWeatherPicker && (
//         <View style={openWeather ? S.ddWrapperOpen : S.ddWrapper}>
//           <DropDownPicker
//             open={openWeather}
//             setOpen={setOpenWeather}
//             value={weather}
//             setValue={val => onChangeWeather(val as unknown as string)}
//             items={weatherOptions}
//             placeholder={
//               useWeather ? 'Choose weather option' : 'Weather (disabled)'
//             }
//             listMode="SCROLLVIEW"
//             dropDownDirection="AUTO"
//             style={{backgroundColor: theme.colors.surface}}
//             textStyle={{color: theme.colors.foreground}}
//             dropDownContainerStyle={{
//               backgroundColor: theme.colors.surface,
//               zIndex: 9999,
//               elevation: 9999,
//             }}
//             disabled={weatherDisabled}
//           />
//           <Text style={[S.faint, {marginTop: 6}]}>
//             {useWeather
//               ? 'Auto uses your current location.'
//               : 'Weather is off — outfits ignore weather.'}
//           </Text>
//         </View>
//       )}

//       {/* RBAC - Advanced controls gear (👈 only if developer) */}
//       {role !== 'developer' && (
//         <View style={[S.row, {marginTop: 4}]}>
//           <Text style={[S.faint]}>Advanced Controls</Text>
//           <TouchableOpacity
//             onPress={() => setShowMoreOptions(s => !s)}
//             onLongPress={() => setShowHiddenDev(v => !v)}
//             delayLongPress={500}
//             activeOpacity={0.8}
//             accessibilityRole="button"
//             accessibilityLabel={
//               showMoreOptions ? 'Hide options' : 'Show options'
//             }
//             testID="options-gear-button"
//             style={S.iconBtn}>
//             <MaterialIcons
//               name="settings"
//               size={20}
//               color={theme.colors.primary}
//             />
//           </TouchableOpacity>
//         </View>
//       )}

//       {/* Advanced section */}
//       {showMoreOptions && (
//         <View style={S.section}>
//           <View style={[S.row, {marginTop: 6}]}>
//             <View style={S.subRow}>
//               <Switch
//                 value={feedbackEnabled}
//                 onValueChange={enabled => {
//                   setFeedbackEnabled(enabled);
//                   onToggleFeedback?.(enabled);
//                 }}
//                 trackColor={{false: '#767577', true: '#405de6'}}
//                 thumbColor={feedbackEnabled ? '#fff' : '#f4f3f4'}
//               />
//               <Text style={S.label}>Use Feedback Influence</Text>
//               <Text
//                 style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//                 ({feedbackEnabled ? 'On' : 'Off'})
//               </Text>
//             </View>
//             <Text style={[S.faint]} />
//           </View>

//           {/* DEV: Scoring Weights */}
//           <View style={S.card}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//               }}>
//               <Text style={S.cardTitle}>Scoring Weights (dev)</Text>
//               <TouchableOpacity
//                 onPress={() => onChangeWeights?.(DEFAULT_WEIGHTS)}
//                 style={{
//                   paddingVertical: 6,
//                   paddingHorizontal: 10,
//                   borderRadius: 8,
//                   backgroundColor: '#333',
//                 }}>
//                 <Text style={{color: '#fff', fontWeight: '600'}}>Reset</Text>
//               </TouchableOpacity>
//             </View>

//             <SliderLite
//               label="Constraints"
//               min={0}
//               max={3}
//               step={0.1}
//               value={w.constraintsWeight}
//               onChange={v => setWeights({constraintsWeight: v})}
//             />

//             <SliderLite
//               label="Style"
//               min={0}
//               max={3}
//               step={0.1}
//               value={w.styleWeight}
//               onChange={v => setWeights({styleWeight: v})}
//               disabled={!useStylePrefs}
//             />

//             <SliderLite
//               label="Weather"
//               min={0}
//               max={3}
//               step={0.1}
//               value={w.weatherWeight}
//               onChange={v => setWeights({weatherWeight: v})}
//             />
//           </View>
//         </View>
//       )}

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
//           <TouchableOpacity
//             style={S.refineCta}
//             onPress={() => {
//               if (onRefine && refineText.trim()) {
//                 onRefine(refineText.trim());
//                 setRefineText('');
//               }
//             }}
//             disabled={isGenerating}
//             accessibilityState={{disabled: isGenerating}}
//             testID="refine-outfit-button">
//             <Text style={S.ctaText}>
//               {isGenerating ? 'Refining…' : 'Refine Outfit'}
//             </Text>
//           </TouchableOpacity>
//         </>
//       )}

//       <View style={{marginTop: 8}}>
//         {/* Status */}
//         {statusText ? (
//           <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
//         ) : null}
//       </View>
//     </View>
//   );
// }
