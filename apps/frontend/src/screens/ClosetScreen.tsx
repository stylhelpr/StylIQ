import React, {useState, useEffect, useMemo, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Animated,
  Easing,
  Alert,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {getInferredCategory} from '../utils/categoryUtils';
import {MainCategory, Subcategory} from '../types/categoryTypes';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useUUID} from '../context/UUIDContext';
import {apiClient} from '../lib/apiClient';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import {TooltipBubble} from '../components/ToolTip/ToolTip1';
import LiquidGlassCard from '../components/LiquidGlassCard/LiquidGlassCard';
import {useClosetVoiceCommands} from '../utils/VoiceUtils/VoiceContext';
import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

// Animated pressable with scale effect for images
const ScalePressable = ({
  children,
  onPress,
  onLongPress,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  onLongPress?: () => void;
  style?: any;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}>
      <Animated.View style={[style, {transform: [{scale: scaleAnim}]}]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

type WardrobeItem = {
  id: string;
  image_url: string;
  name: string;
  color?: string;
  main_category?: MainCategory | string;
  subcategory?: Subcategory | string;
  fit?: string;
  size?: string;
  brand?: string;
  material?: string;
  width?: number;
  height?: number;
  favorite?: boolean;
};

type Props = {
  navigate: (screen: string, params?: any) => void;
};

const CATEGORY_META: Array<{
  value: MainCategory | 'All';
  label: string;
  icon: string;
}> = [
  {value: 'All', label: 'All', icon: 'category'},
  {value: 'Tops', label: 'Tops', icon: 'checkroom'},
  {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
  {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
  {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
  {value: 'Accessories', label: 'Accessories', icon: 'watch'},
  {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
  {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
  {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
  {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
  {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
  {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
  {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
  {value: 'Unisex', label: 'Unisex', icon: 'wc'},
  {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
  {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
];

const sortOptions = [
  {label: 'Name A-Z', value: 'az'},
  {label: 'Name Z-A', value: 'za'},
  {label: 'Favorites First', value: 'favorites'},
];

export default function ClosetScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const queryClient = useQueryClient();
  const userId = useUUID();

  const insets = useSafeAreaInsets();
  const [swipeActive, setSwipeActive] = useState(false);
  const scrollEnabled = !swipeActive;

  // Sync scroll position with global nav for bottom nav hide/show
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (global.__navScrollY) {
        global.__navScrollY.setValue(event.nativeEvent.contentOffset.y);
      }
    },
    [],
  );

  const [selectedCategory, setSelectedCategory] = useState<
    'All' | MainCategory
  >('All');
  const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');

  // 🍏 Menu states
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'filter' | 'sort'>('main'); // main or submenus

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItemToEdit, setSelectedItemToEdit] =
    useState<WardrobeItem | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedColor, setEditedColor] = useState('');

  const screenFade = useRef(new Animated.Value(0)).current;
  const screenTranslate = useRef(new Animated.Value(50)).current;
  // const fabBounce = useRef(new Animated.Value(100)).current;
  const fabBounce = useRef(new Animated.Value(250)).current;

  const submenuOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(screenFade, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.spring(screenTranslate, {
        toValue: 0,
        speed: 2,
        bounciness: 14,
        useNativeDriver: true,
      }),
    ]).start();
    Animated.spring(fabBounce, {
      toValue: 0,
      delay: 900,
      speed: 2,
      bounciness: 14,
      useNativeDriver: true,
    }).start();
  }, []);

  const {data: wardrobe = [], isLoading} = useQuery({
    queryKey: ['wardrobe', userId],
    queryFn: async () => {
      const res = await apiClient.get('/wardrobe');
      return res.data;
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds - prevent unnecessary refetches
  });

  const hSelect = () =>
    ReactNativeHapticFeedback.trigger('selection', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/wardrobe/${id}`);
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
      const prev = queryClient.getQueryData<WardrobeItem[]>(['wardrobe', userId]);
      queryClient.setQueryData<WardrobeItem[]>(
        ['wardrobe', userId],
        old => old?.filter(item => item.id !== id) || [],
      );
      return {prev};
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['wardrobe', userId], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      color,
    }: {
      id: string;
      name?: string;
      color?: string;
    }) => {
      await apiClient.put(`/wardrobe/${id}`, {name, color});
    },
    onMutate: async ({id, name, color}) => {
      await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
      const prev = queryClient.getQueryData<WardrobeItem[]>(['wardrobe', userId]);
      queryClient.setQueryData<WardrobeItem[]>(
        ['wardrobe', userId],
        old =>
          old?.map(item =>
            item.id === id
              ? {...item, name: name ?? item.name, color: color ?? item.color}
              : item,
          ) || [],
      );
      return {prev};
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['wardrobe', userId], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
    },
  });

  const filtered = useMemo(() => {
    return (wardrobe as WardrobeItem[])
      .map(item => {
        const inferred = getInferredCategory(item.name);
        const effectiveMain: MainCategory | undefined =
          (item.main_category as MainCategory) ?? inferred?.main;
        return {...item, inferredCategory: inferred, effectiveMain};
      })
      .filter(item => {
        if (selectedCategory === 'All') return true;
        return item.effectiveMain === selectedCategory;
      })
      .sort((a, b) => {
        if (sortOption === 'az') return a.name.localeCompare(b.name);
        if (sortOption === 'za') return b.name.localeCompare(a.name);
        if (sortOption === 'favorites')
          return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
        return 0;
      });
  }, [wardrobe, selectedCategory, sortOption]);

  const categorizedItems = useMemo(() => {
    const result: Record<string, Record<string, WardrobeItem[]>> = {};
    for (const item of filtered) {
      const main =
        (item.main_category as string) ||
        (item as any).inferredCategory?.main ||
        'Uncategorized';
      const sub =
        (item.subcategory as string) ||
        (item as any).inferredCategory?.sub ||
        'General';
      if (!result[main]) result[main] = {};
      if (!result[main][sub]) result[main][sub] = [];
      result[main][sub].push(item);
    }
    return result;
  }, [filtered]);

  // 🧠 Expanding FAB state (move these near your other useStates at top of ClosetScreen)
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  const toggleFab = () => {
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
    });
    Animated.spring(fabAnim, {
      toValue: fabOpen ? 0 : 1,
      useNativeDriver: false, // ✅ FIX — bottom can now animate safely
      friction: 6,
      tension: 40,
    }).start();
    setFabOpen(!fabOpen);
  };

  const fabItemOffset = (index: number) =>
    fabAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -70 * (index + 1)],
    });

  const fabOpacity = fabAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0.9, 1],
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
      await apiClient.put(`/wardrobe/favorite/${id}`, {favorite});
    },
    onMutate: async ({id, favorite}) => {
      await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
      const prev = queryClient.getQueryData<WardrobeItem[]>([
        'wardrobe',
        userId,
      ]);
      queryClient.setQueryData<WardrobeItem[]>(
        ['wardrobe', userId],
        old =>
          old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
      );
      return {prev};
    },
    onError: (err, _, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['wardrobe', userId], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
    },
  });

  const styles = StyleSheet.create({
    buttonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 10,
    },
    popover: {
      position: 'absolute',
      top: insets.top + 115, // 👈 adds notch + navbar offset
      right: 20,
      width: 220,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
      elevation: 20,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowOffset: {width: 0, height: 4},
      shadowRadius: 14,
      zIndex: 9999,
    },
    submenu: {
      position: 'absolute',
      top: insets.top + 115, // 👈 match same top offset
      right: 16,
      width: 320,
      maxHeight: Dimensions.get('window').height * 0.7,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 18,
      elevation: 20,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowOffset: {width: 0, height: 4},
      shadowRadius: 14,
      zIndex: 9999,
    },

    optionRow: {
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    optionText: {
      fontSize: 16,
      color: theme.colors.foreground,
      marginLeft: 8,
    },
    mainOptionText: {
      fontSize: 17,
      color: theme.colors.foreground,
      fontWeight: tokens.fontWeight.semiBold,
    },
  });

  // 2️⃣ Handler function (this is TypeScript, not JSX)
  const openSubmenu = (view: 'filter' | 'sort') => {
    setMenuView(view);
    submenuOpacity.setValue(0);
    Animated.timing(submenuOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  useClosetVoiceCommands(
    openSubmenu,
    setMenuVisible,
    setSelectedCategory,
    setSortOption,
  );

  return (
    // <GradientBackground>
    <SafeAreaView
      edges={['top']}
      style={[
        globalStyles.screen,
        globalStyles.container,
        {
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingBottom: 0,
        },
      ]}>
      <Animated.View
        style={{
          flex: 1,
          opacity: screenFade,
          transform: [{translateY: screenTranslate}],
        }}>
        <View
          style={{
            height: insets.top + 0, // ⬅️ 56 is about the old navbar height
            backgroundColor: theme.colors.background, // same tone as old nav
          }}
        />
        <Text style={globalStyles.header}>Wardrobe</Text>

        {/* 🔝 Header buttons */}
        <View style={globalStyles.section}>
          <View style={[styles.buttonRow]}>
            <View style={{marginRight: 8}}>
              <AppleTouchFeedback
                style={[
                  globalStyles.buttonPrimary,
                  {
                    paddingHorizontal: 28,
                    minWidth: 180,
                    alignSelf: 'center',
                    flexShrink: 0,
                  },
                ]}
                hapticStyle="impacMedium"
                onPress={() => navigate('OutfitBuilder')}>
                <Text style={globalStyles.buttonPrimaryText}>
                  + Build An Outfit
                </Text>
              </AppleTouchFeedback>
            </View>

            {/* 🍏 Unified Menu Trigger */}
            <AppleTouchFeedback
              hapticStyle="impactLight"
              style={{
                paddingHorizontal: 7,
                paddingVertical: 8,
                borderRadius: tokens.borderRadius.sm,
                backgroundColor: theme.colors.button1,
                elevation: 2,
              }}
              onPress={() => {
                setMenuVisible(prev => !prev);
                setMenuView('main');
              }}>
              {/* <MaterialIcons name="more-vert" size={32} color="white" /> */}
              <MaterialIcons
                name="filter-list"
                size={33}
                color={theme.colors.buttonText1}
              />
            </AppleTouchFeedback>
          </View>
        </View>

        {/* 🪩 Empty state */}
        {!isLoading && wardrobe.length === 0 && (
          <View style={{flexDirection: 'row', alignSelf: 'center'}}>
            <Text style={globalStyles.missingDataMessage1}>
              No wardrobe items found.
            </Text>
            <View style={{alignSelf: 'flex-start'}}>
              <TooltipBubble
                message="You haven’t uploaded any wardrobe items yet. Tap the + button”
             button at the bottom to start adding your personal wardrobe inventory."
                position="top"
              />
            </View>
          </View>
        )}

        {/* 👕 Wardrobe Grid */}
        <ScrollView
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}>
          {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
            <View key={mainCategory} style={globalStyles.section}>
              <Animated.Text
                style={[
                  globalStyles.sectionTitle5,
                  {
                    transform: [
                      {
                        translateY: screenFade.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                    opacity: screenFade,
                  },
                ]}>
                {mainCategory}
              </Animated.Text>

              {Object.entries(subMap).map(([subCategory, items]) => (
                <View key={subCategory}>
                  <Text style={[globalStyles.title3]}>{subCategory}</Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                    }}>
                    {items.map(item => (
                      <View
                        key={item.id}
                        style={{
                          marginBottom: 15,
                        }}>
                        <ScalePressable
                          style={globalStyles.outfitCard4}
                          onPress={() =>
                            navigate('ItemDetail', {itemId: item.id, item})
                          }
                          onLongPress={() => {
                            setEditedName(item.name ?? '');
                            setEditedColor(item.color ?? '');
                            setSelectedItemToEdit(item);
                            setShowEditModal(true);
                          }}>
                          <View
                            style={{
                              width: '100%',
                              backgroundColor: theme.colors.surface,
                            }}>
                            <Image
                              source={{uri: item.image_url}}
                              style={globalStyles.image10}
                              resizeMode="cover"
                            />
                          </View>
                          {/* ❤️ Favorite */}
                          <View
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              zIndex: 10,
                              padding: 4,
                            }}>
                            <AppleTouchFeedback
                              hapticStyle="impactLight"
                              onPress={() =>
                                favoriteMutation.mutate({
                                  id: item.id,
                                  favorite: !item.favorite,
                                })
                              }>
                              <MaterialIcons
                                name="favorite"
                                size={28}
                                color={
                                  item.favorite
                                    ? 'red'
                                    : theme.colors.inputBorder
                                }
                              />
                            </AppleTouchFeedback>
                          </View>

                          {/* 🏷️ Labels */}
                          <View style={globalStyles.labelContainer}>
                            <Text
                              style={[globalStyles.cardLabel]}
                              numberOfLines={1}
                              ellipsizeMode="tail">
                              {item.name}
                            </Text>
                            <Text
                              style={[globalStyles.cardSubLabel]}
                              numberOfLines={1}>
                              {subCategory}
                            </Text>
                          </View>

                          {/* 🪄 Try On */}
                          <AppleTouchFeedback
                            hapticStyle="impactLight"
                            onPress={() =>
                              navigate('TryOnOverlay', {
                                outfit: {
                                  top: {
                                    name: item.name,
                                    imageUri: item.image_url,
                                  },
                                },
                                userPhotoUri: Image.resolveAssetSource(
                                  require('../assets/images/full-body-temp1.png'),
                                ).uri,
                              })
                            }
                            style={{
                              position: 'absolute',
                              top: 10,
                              left: 8,
                              backgroundColor: 'black',
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 8,
                            }}>
                            <Text
                              style={{
                                color: theme.colors.foreground,
                                fontSize: 14,
                                fontWeight: tokens.fontWeight.medium,
                              }}>
                              Try On
                            </Text>
                          </AppleTouchFeedback>
                        </ScalePressable>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>

        <>
          {/* 🪩 Floating Mini FABs */}
          {[
            {icon: 'search', onPress: () => navigate('Search'), offset: 3},
            {
              icon: 'qr-code-scanner',
              onPress: () => navigate('BarcodeScannerScreen'),
              offset: 2,
            },
            {icon: 'add', onPress: () => navigate('AddItem'), offset: 1},
          ].map((btn, index) => (
            <Animated.View
              key={index}
              style={{
                position: 'absolute',
                bottom: 97,
                right: -2,
                opacity: fabOpacity,

                transform: [
                  {
                    translateX: fabAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -70 * (btn.offset + 0.3)],
                    }),
                  },
                  {scale: fabAnim},
                ],
              }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 26,
                  borderWidth: 1,
                  borderColor: theme.colors.foreground,
                  backgroundColor: 'rgba(54, 54, 54, 0.56)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Pressable
                  onPress={() => {
                    toggleFab();
                    btn.onPress();
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <MaterialIcons
                    name={btn.icon}
                    size={26}
                    color={theme.colors.foreground}
                  />
                </Pressable>
              </View>
            </Animated.View>
          ))}

          {/* 🪄 Main FAB (always visible) */}
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 96,
              right: 18,
              transform: [{translateY: fabBounce}],
            }}>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 32,
                borderWidth: 1,
                borderColor: theme.colors.foreground,
                backgroundColor: 'rgba(54, 54, 54, 0.56)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Pressable
                onPress={toggleFab}
                style={{
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: fabAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '45deg'],
                        }),
                      },
                    ],
                  }}>
                  <MaterialIcons
                    name="add"
                    size={32}
                    color={theme.colors.foreground}
                  />
                </Animated.View>
              </Pressable>
            </View>
          </Animated.View>
        </>

        {/* 🍏 Popover + Submenus — Moved to Bottom for Layering Fix */}
        {menuVisible && (
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'transparent',
                zIndex: 9999,
              }}>
              <TouchableWithoutFeedback>
                <>
                  {menuView === 'main' && (
                    <View style={styles.popover}>
                      <TouchableOpacity
                        style={styles.optionRow}
                        onPress={() => {
                          hSelect();
                          openSubmenu('filter');
                        }}>
                        <MaterialIcons
                          name="filter-list"
                          size={24}
                          color={theme.colors.foreground}
                        />
                        <Text style={styles.mainOptionText}>Filter</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.optionRow}
                        onPress={() => {
                          hSelect();
                          openSubmenu('sort');
                        }}>
                        <MaterialIcons
                          name="sort"
                          size={22}
                          color={theme.colors.foreground}
                        />
                        <Text style={styles.mainOptionText}>Sort</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {menuView === 'filter' && (
                    <Animated.View
                      style={[
                        styles.submenu,
                        {
                          opacity: submenuOpacity,
                          transform: [
                            {
                              scale: submenuOpacity.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.95, 1],
                              }),
                            },
                          ],
                        },
                      ]}>
                      <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{paddingBottom: 8}}>
                        {CATEGORY_META.map(cat => (
                          <TouchableOpacity
                            key={cat.value}
                            onPress={() => {
                              hSelect();
                              setSelectedCategory(cat.value as any);
                              setMenuVisible(false);
                            }}
                            style={styles.optionRow}>
                            <MaterialIcons
                              name={cat.icon}
                              size={20}
                              color={theme.colors.foreground}
                            />
                            <Text style={styles.optionText}>{cat.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </Animated.View>
                  )}

                  {menuView === 'sort' && (
                    <Animated.View
                      style={[
                        styles.submenu,
                        {
                          opacity: submenuOpacity,
                          transform: [
                            {
                              scale: submenuOpacity.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.95, 1],
                              }),
                            },
                          ],
                        },
                      ]}>
                      <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{paddingBottom: 8}}>
                        {sortOptions.map(opt => (
                          <TouchableOpacity
                            key={opt.value}
                            onPress={() => {
                              hSelect();
                              setSortOption(opt.value as any);
                              setMenuVisible(false);
                            }}
                            style={styles.optionRow}>
                            <MaterialIcons
                              name="sort"
                              size={20}
                              color={theme.colors.foreground}
                            />
                            <Text style={styles.optionText}>{opt.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </Animated.View>
                  )}
                </>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* ✏️ Edit Modal */}
        {selectedItemToEdit && showEditModal && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10000,
              elevation: 30,
            }}>
            <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
            </TouchableWithoutFeedback>

            <Animated.View
              style={{
                padding: 24,
                borderRadius: 12,
                backgroundColor: theme.colors.surface,
                width: '90%',
                maxWidth: 720,
                opacity: screenFade,
                transform: [
                  {
                    scale: screenFade.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              }}>
              <TextInput
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Name"
                style={styles.input}
                placeholderTextColor="#999"
              />
              <TextInput
                value={editedColor}
                onChangeText={setEditedColor}
                placeholder="Color"
                style={styles.input}
                placeholderTextColor="#999"
              />

              <AppleTouchFeedback
                hapticStyle="impactLight"
                onPress={() => {
                  if (selectedItemToEdit) {
                    updateMutation.mutate({
                      id: selectedItemToEdit.id,
                      name: editedName || selectedItemToEdit.name,
                      color: editedColor || selectedItemToEdit.color,
                    });
                    setShowEditModal(false);
                    setSelectedItemToEdit(null);
                  }
                }}
                style={{
                  paddingVertical: 12,
                  borderRadius: tokens.borderRadius.sm,
                  alignItems: 'center',
                  backgroundColor: theme.colors.primary,
                  marginTop: 12,
                }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: tokens.fontWeight.semiBold,
                    color: theme.colors.background,
                  }}>
                  Save Changes
                </Text>
              </AppleTouchFeedback>

              <AppleTouchFeedback
                hapticStyle="impactLight"
                onPress={() => {
                  Alert.alert(
                    'Delete Item',
                    'Are you sure you want to delete this item?',
                    [
                      {text: 'Cancel', style: 'cancel'},
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          deleteMutation.mutate(selectedItemToEdit.id);
                          setShowEditModal(false);
                          setSelectedItemToEdit(null);
                        },
                      },
                    ],
                  );
                }}
                style={{
                  backgroundColor: '#cc0000',
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 16,
                }}>
                <Text
                  style={{
                    color: '#fff',
                    textAlign: 'center',
                    fontWeight: tokens.fontWeight.semiBold,
                  }}>
                  Delete Item
                </Text>
              </AppleTouchFeedback>
            </Animated.View>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
    // </GradientBackground>
  );
}

/////////////////

// import React, {useState, useEffect, useMemo, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   TouchableWithoutFeedback,
//   TextInput,
//   Animated,
//   Easing,
//   Alert,
//   Pressable,
//   NativeSyntheticEvent,
//   NativeScrollEvent,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import LiquidGlassCard from '../components/LiquidGlassCard/LiquidGlassCard';
// import {useClosetVoiceCommands} from '../utils/VoiceUtils/VoiceContext';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();
//   const userId = useUUID();

//   const insets = useSafeAreaInsets();
//   const [swipeActive, setSwipeActive] = useState(false);
//   const scrollEnabled = !swipeActive;

//   // Sync scroll position with global nav for bottom nav hide/show
//   const handleScroll = useCallback(
//     (event: NativeSyntheticEvent<NativeScrollEvent>) => {
//       if (global.__navScrollY) {
//         global.__navScrollY.setValue(event.nativeEvent.contentOffset.y);
//       }
//     },
//     [],
//   );

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');

//   // 🍏 Menu states
//   const [menuVisible, setMenuVisible] = useState(false);
//   const [menuView, setMenuView] = useState<'main' | 'filter' | 'sort'>('main'); // main or submenus

//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(50)).current;
//   // const fabBounce = useRef(new Animated.Value(100)).current;
//   const fabBounce = useRef(new Animated.Value(250)).current;

//   const submenuOpacity = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 800,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//       Animated.spring(screenTranslate, {
//         toValue: 0,
//         speed: 2,
//         bounciness: 14,
//         useNativeDriver: true,
//       }),
//     ]).start();
//     Animated.spring(fabBounce, {
//       toValue: 0,
//       delay: 900,
//       speed: 2,
//       bounciness: 14,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const {data: wardrobe = [], isLoading} = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return res.json();
//     },
//     enabled: !!userId,
//   });

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {method: 'DELETE'});
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   // 🧠 Expanding FAB state (move these near your other useStates at top of ClosetScreen)
//   const [fabOpen, setFabOpen] = useState(false);
//   const fabAnim = useRef(new Animated.Value(0)).current;

//   const toggleFab = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//     });
//     Animated.spring(fabAnim, {
//       toValue: fabOpen ? 0 : 1,
//       useNativeDriver: false, // ✅ FIX — bottom can now animate safely
//       friction: 6,
//       tension: 40,
//     }).start();
//     setFabOpen(!fabOpen);
//   };

//   const fabItemOffset = (index: number) =>
//     fabAnim.interpolate({
//       inputRange: [0, 1],
//       outputRange: [0, -70 * (index + 1)],
//     });

//   const fabOpacity = fabAnim.interpolate({
//     inputRange: [0, 0.6, 1],
//     outputRange: [0, 0.9, 1],
//   });

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );
//       return {prev};
//     },
//     onError: (err, _, context) => {
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 10,
//     },
//     popover: {
//       position: 'absolute',
//       top: insets.top + 115, // 👈 adds notch + navbar offset
//       right: 20,
//       width: 220,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 12,
//       paddingHorizontal: 14,
//       elevation: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999,
//     },
//     submenu: {
//       position: 'absolute',
//       top: insets.top + 115, // 👈 match same top offset
//       right: 16,
//       width: 320,
//       maxHeight: Dimensions.get('window').height * 0.7,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 16,
//       paddingHorizontal: 18,
//       elevation: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999,
//     },

//     optionRow: {
//       paddingVertical: 10,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     optionText: {
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginLeft: 8,
//     },
//     mainOptionText: {
//       fontSize: 17,
//       color: theme.colors.foreground,
//       fontWeight: tokens.fontWeight.semiBold,
//     },
//   });

//   // 2️⃣ Handler function (this is TypeScript, not JSX)
//   const openSubmenu = (view: 'filter' | 'sort') => {
//     setMenuView(view);
//     submenuOpacity.setValue(0);
//     Animated.timing(submenuOpacity, {
//       toValue: 1,
//       duration: 180,
//       useNativeDriver: true,
//     }).start();
//   };

//   useClosetVoiceCommands(
//     openSubmenu,
//     setMenuVisible,
//     setSelectedCategory,
//     setSortOption,
//   );

//   return (
//     // <GradientBackground>
//     <SafeAreaView
//       edges={['top']}
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {
//           flex: 1,
//           backgroundColor: theme.colors.background,
//           paddingBottom: 0,
//         },
//       ]}>
//       <Animated.View
//         style={{
//           flex: 1,
//           opacity: screenFade,
//           transform: [{translateY: screenTranslate}],
//         }}>
//         <View
//           style={{
//             height: insets.top + 0, // ⬅️ 56 is about the old navbar height
//             backgroundColor: theme.colors.background, // same tone as old nav
//           }}
//         />
//         <Text style={globalStyles.header}>Wardrobe</Text>

//         {/* 🔝 Header buttons */}
//         <View style={globalStyles.section}>
//           <View style={[styles.buttonRow]}>
//             <View style={{marginRight: 8}}>
//               <AppleTouchFeedback
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {
//                     paddingHorizontal: 28,
//                     minWidth: 210,
//                     alignSelf: 'center',
//                     flexShrink: 0,
//                   },
//                 ]}
//                 hapticStyle="impacMedium"
//                 onPress={() => navigate('OutfitBuilder')}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   + Build An Outfit
//                 </Text>
//               </AppleTouchFeedback>
//             </View>

//             {/* 🍏 Unified Menu Trigger */}
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               style={{
//                 paddingHorizontal: 7,
//                 paddingVertical: 8,
//                 borderRadius: tokens.borderRadius.sm,
//                 backgroundColor: theme.colors.button1,
//                 elevation: 2,
//               }}
//               onPress={() => {
//                 setMenuVisible(prev => !prev);
//                 setMenuView('main');
//               }}>
//               {/* <MaterialIcons name="more-vert" size={32} color="white" /> */}
//               <MaterialIcons
//                 name="filter-list"
//                 size={33}
//                 color={theme.colors.buttonText1}
//               />
//             </AppleTouchFeedback>
//           </View>
//         </View>

//         {/* 🪩 Empty state */}
//         {!isLoading && wardrobe.length === 0 && (
//           <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//             <Text style={globalStyles.missingDataMessage1}>
//               No wardrobe items found.
//             </Text>
//             <View style={{alignSelf: 'flex-start'}}>
//               <TooltipBubble
//                 message="You haven’t uploaded any wardrobe items yet. Tap the “Add Clothes”
//              button below to start adding your personal wardrobe inventory."
//                 position="top"
//               />
//             </View>
//           </View>
//         )}

//         {/* 👕 Wardrobe Grid */}
//         <ScrollView
//           scrollEnabled={scrollEnabled}
//           showsVerticalScrollIndicator={false}
//           onScroll={handleScroll}
//           scrollEventThrottle={16}>
//           {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//             <View key={mainCategory} style={globalStyles.section}>
//               <Animated.Text
//                 style={[
//                   globalStyles.sectionTitle5,
//                   {
//                     transform: [
//                       {
//                         translateY: screenFade.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: [20, 0],
//                         }),
//                       },
//                     ],
//                     opacity: screenFade,
//                   },
//                 ]}>
//                 {mainCategory}
//               </Animated.Text>

//               {Object.entries(subMap).map(([subCategory, items]) => (
//                 <View key={subCategory}>
//                   <Text style={[globalStyles.title3]}>{subCategory}</Text>

//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       justifyContent: 'space-between',
//                     }}>
//                     {items.map(item => (
//                       <View
//                         key={item.id}
//                         style={{
//                           marginBottom: 15,
//                         }}>
//                         <Pressable
//                           style={globalStyles.outfitCard4}
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             navigate('ItemDetail', {itemId: item.id, item})
//                           }
//                           onLongPress={() => {
//                             setEditedName(item.name ?? '');
//                             setEditedColor(item.color ?? '');
//                             setSelectedItemToEdit(item);
//                             setShowEditModal(true);
//                           }}>
//                           <View
//                             style={{
//                               width: '100%',
//                               backgroundColor: theme.colors.surface,
//                             }}>
//                             <Image
//                               source={{uri: item.image_url}}
//                               style={globalStyles.image10}
//                               resizeMode="cover"
//                             />
//                           </View>
//                           {/* ❤️ Favorite */}
//                           <View
//                             style={{
//                               position: 'absolute',
//                               top: 8,
//                               right: 8,
//                               zIndex: 10,
//                               padding: 4,
//                             }}>
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={() =>
//                                 favoriteMutation.mutate({
//                                   id: item.id,
//                                   favorite: !item.favorite,
//                                 })
//                               }>
//                               <MaterialIcons
//                                 name="favorite"
//                                 size={28}
//                                 color={
//                                   item.favorite
//                                     ? 'red'
//                                     : theme.colors.inputBorder
//                                 }
//                               />
//                             </AppleTouchFeedback>
//                           </View>

//                           {/* 🏷️ Labels */}
//                           <View style={globalStyles.labelContainer}>
//                             <Text
//                               style={[globalStyles.cardLabel]}
//                               numberOfLines={1}
//                               ellipsizeMode="tail">
//                               {item.name}
//                             </Text>
//                             <Text
//                               style={[globalStyles.cardSubLabel]}
//                               numberOfLines={1}>
//                               {subCategory}
//                             </Text>
//                           </View>

//                           {/* 🪄 Try On */}
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() =>
//                               navigate('TryOnOverlay', {
//                                 outfit: {
//                                   top: {
//                                     name: item.name,
//                                     imageUri: item.image_url,
//                                   },
//                                 },
//                                 userPhotoUri: Image.resolveAssetSource(
//                                   require('../assets/images/full-body-temp1.png'),
//                                 ).uri,
//                               })
//                             }
//                             style={{
//                               position: 'absolute',
//                               top: 10,
//                               left: 8,
//                               backgroundColor: 'black',
//                               paddingHorizontal: 10,
//                               paddingVertical: 4,
//                               borderRadius: 8,
//                             }}>
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontSize: 14,
//                                 fontWeight: tokens.fontWeight.medium,
//                               }}>
//                               Try On
//                             </Text>
//                           </AppleTouchFeedback>
//                         </Pressable>
//                       </View>
//                     ))}
//                   </View>
//                 </View>
//               ))}
//             </View>
//           ))}
//         </ScrollView>

//         <>
//           {/* 🪩 Floating Mini FABs */}
//           {[
//             {
//               icon: 'qr-code-scanner',
//               onPress: () => navigate('BarcodeScannerScreen'),
//               offset: 1,
//             },
//             {icon: 'search', onPress: () => navigate('Search'), offset: 2},
//             {icon: 'add', onPress: () => navigate('AddItem'), offset: 3},
//           ].map((btn, index) => (
//             <Animated.View
//               key={index}
//               style={{
//                 position: 'absolute',
//                 bottom: 97,
//                 right: -2,
//                 opacity: fabOpacity,
//                 transform: [
//                   {
//                     translateX: fabAnim.interpolate({
//                       inputRange: [0, 1],
//                       outputRange: [0, -70 * (btn.offset + 0.3)],
//                     }),
//                   },
//                   {scale: fabAnim},
//                 ],
//               }}>
//               <LiquidGlassCard
//                 blurAmount={14}
//                 blurOpacity={0.6}
//                 borderRadius={26}
//                 style={{
//                   shadowColor: '#000',
//                   shadowOpacity: 0.25,
//                   shadowOffset: {width: 0, height: 4},
//                   shadowRadius: 8,
//                   elevation: 8,
//                   overflow: 'hidden',
//                 }}>
//                 <Pressable
//                   onPress={() => {
//                     toggleFab();
//                     btn.onPress();
//                   }}
//                   style={{
//                     width: 50,
//                     height: 50,
//                     borderRadius: 26,
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                   }}>
//                   <MaterialIcons
//                     name={btn.icon}
//                     size={26}
//                     color={theme.colors.foreground}
//                   />
//                 </Pressable>
//               </LiquidGlassCard>
//             </Animated.View>
//           ))}

//           {/* 🪄 Main FAB (always visible) */}
//           <Animated.View
//             style={{
//               position: 'absolute',
//               bottom: 96,
//               right: 18,
//               transform: [{translateY: fabBounce}],
//             }}>
//             <LiquidGlassCard
//               blurAmount={14}
//               blurOpacity={0.6}
//               borderRadius={32}
//               style={{
//                 width: 54,
//                 height: 54,
//                 borderRadius: 32,
//                 shadowColor: '#000',
//                 shadowOpacity: 0.25,
//                 shadowOffset: {width: 0, height: 6},
//                 shadowRadius: 10,
//                 elevation: 10,
//                 overflow: 'hidden',
//               }}>
//               <Pressable
//                 onPress={toggleFab}
//                 style={{
//                   width: '100%',
//                   height: '100%',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                 }}>
//                 <Animated.View
//                   style={{
//                     transform: [
//                       {
//                         rotate: fabAnim.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: ['0deg', '45deg'],
//                         }),
//                       },
//                     ],
//                   }}>
//                   <MaterialIcons
//                     name="add"
//                     size={32}
//                     color={theme.colors.foreground}
//                   />
//                 </Animated.View>
//               </Pressable>
//             </LiquidGlassCard>
//           </Animated.View>
//         </>

//         {/* 🍏 Popover + Submenus — Moved to Bottom for Layering Fix */}
//         {menuVisible && (
//           <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
//             <View
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//                 backgroundColor: 'transparent',
//                 zIndex: 9999,
//               }}>
//               <TouchableWithoutFeedback>
//                 <>
//                   {menuView === 'main' && (
//                     <View style={styles.popover}>
//                       <TouchableOpacity
//                         style={styles.optionRow}
//                         onPress={() => {
//                           hSelect();
//                           openSubmenu('filter');
//                         }}>
//                         <MaterialIcons
//                           name="filter-list"
//                           size={24}
//                           color={theme.colors.foreground}
//                         />
//                         <Text style={styles.mainOptionText}>Filter</Text>
//                       </TouchableOpacity>

//                       <TouchableOpacity
//                         style={styles.optionRow}
//                         onPress={() => {
//                           hSelect();
//                           openSubmenu('sort');
//                         }}>
//                         <MaterialIcons
//                           name="sort"
//                           size={22}
//                           color={theme.colors.foreground}
//                         />
//                         <Text style={styles.mainOptionText}>Sort</Text>
//                       </TouchableOpacity>
//                     </View>
//                   )}

//                   {menuView === 'filter' && (
//                     <Animated.View
//                       style={[
//                         styles.submenu,
//                         {
//                           opacity: submenuOpacity,
//                           transform: [
//                             {
//                               scale: submenuOpacity.interpolate({
//                                 inputRange: [0, 1],
//                                 outputRange: [0.95, 1],
//                               }),
//                             },
//                           ],
//                         },
//                       ]}>
//                       <ScrollView
//                         showsVerticalScrollIndicator={false}
//                         contentContainerStyle={{paddingBottom: 8}}>
//                         {CATEGORY_META.map(cat => (
//                           <TouchableOpacity
//                             key={cat.value}
//                             onPress={() => {
//                               hSelect();
//                               setSelectedCategory(cat.value as any);
//                               setMenuVisible(false);
//                             }}
//                             style={styles.optionRow}>
//                             <MaterialIcons
//                               name={cat.icon}
//                               size={20}
//                               color={theme.colors.foreground}
//                             />
//                             <Text style={styles.optionText}>{cat.label}</Text>
//                           </TouchableOpacity>
//                         ))}
//                       </ScrollView>
//                     </Animated.View>
//                   )}

//                   {menuView === 'sort' && (
//                     <Animated.View
//                       style={[
//                         styles.submenu,
//                         {
//                           opacity: submenuOpacity,
//                           transform: [
//                             {
//                               scale: submenuOpacity.interpolate({
//                                 inputRange: [0, 1],
//                                 outputRange: [0.95, 1],
//                               }),
//                             },
//                           ],
//                         },
//                       ]}>
//                       <ScrollView
//                         showsVerticalScrollIndicator={false}
//                         contentContainerStyle={{paddingBottom: 8}}>
//                         {sortOptions.map(opt => (
//                           <TouchableOpacity
//                             key={opt.value}
//                             onPress={() => {
//                               hSelect();
//                               setSortOption(opt.value as any);
//                               setMenuVisible(false);
//                             }}
//                             style={styles.optionRow}>
//                             <MaterialIcons
//                               name="sort"
//                               size={20}
//                               color={theme.colors.foreground}
//                             />
//                             <Text style={styles.optionText}>{opt.label}</Text>
//                           </TouchableOpacity>
//                         ))}
//                       </ScrollView>
//                     </Animated.View>
//                   )}
//                 </>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         )}

//         {/* ✏️ Edit Modal */}
//         {selectedItemToEdit && showEditModal && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'rgba(0,0,0,0.5)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               zIndex: 10000,
//               elevation: 30,
//             }}>
//             <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//               <View
//                 style={{
//                   position: 'absolute',
//                   top: 0,
//                   left: 0,
//                   right: 0,
//                   bottom: 0,
//                 }}
//               />
//             </TouchableWithoutFeedback>

//             <Animated.View
//               style={{
//                 padding: 24,
//                 borderRadius: 12,
//                 backgroundColor: theme.colors.surface,
//                 width: '90%',
//                 maxWidth: 720,
//                 opacity: screenFade,
//                 transform: [
//                   {
//                     scale: screenFade.interpolate({
//                       inputRange: [0, 1],
//                       outputRange: [0.8, 1],
//                     }),
//                   },
//                 ],
//               }}>
//               <TextInput
//                 value={editedName}
//                 onChangeText={setEditedName}
//                 placeholder="Name"
//                 style={styles.input}
//                 placeholderTextColor="#999"
//               />
//               <TextInput
//                 value={editedColor}
//                 onChangeText={setEditedColor}
//                 placeholder="Color"
//                 style={styles.input}
//                 placeholderTextColor="#999"
//               />

//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={async () => {
//                   if (selectedItemToEdit) {
//                     await fetch(
//                       `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                       {
//                         method: 'Put',
//                         headers: {'Content-Type': 'application/json'},
//                         body: JSON.stringify({
//                           name: editedName || selectedItemToEdit.name,
//                           color: editedColor || selectedItemToEdit.color,
//                         }),
//                       },
//                     );
//                     queryClient.invalidateQueries({
//                       queryKey: ['wardrobe', userId],
//                     });
//                     setShowEditModal(false);
//                     setSelectedItemToEdit(null);
//                   }
//                 }}
//                 style={{
//                   paddingVertical: 12,
//                   borderRadius: tokens.borderRadius.sm,
//                   alignItems: 'center',
//                   backgroundColor: theme.colors.primary,
//                   marginTop: 12,
//                 }}>
//                 <Text
//                   style={{
//                     fontSize: 16,
//                     fontWeight: tokens.fontWeight.semiBold,
//                     color: theme.colors.background,
//                   }}>
//                   Save Changes
//                 </Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   Alert.alert(
//                     'Delete Item',
//                     'Are you sure you want to delete this item?',
//                     [
//                       {text: 'Cancel', style: 'cancel'},
//                       {
//                         text: 'Delete',
//                         style: 'destructive',
//                         onPress: () => {
//                           deleteMutation.mutate(selectedItemToEdit.id);
//                           setShowEditModal(false);
//                           setSelectedItemToEdit(null);
//                         },
//                       },
//                     ],
//                   );
//                 }}
//                 style={{
//                   backgroundColor: '#cc0000',
//                   padding: 12,
//                   borderRadius: 8,
//                   marginTop: 16,
//                 }}>
//                 <Text
//                   style={{
//                     color: '#fff',
//                     textAlign: 'center',
//                     fontWeight: tokens.fontWeight.semiBold,
//                   }}>
//                   Delete Item
//                 </Text>
//               </AppleTouchFeedback>
//             </Animated.View>
//           </View>
//         )}
//       </Animated.View>
//     </SafeAreaView>
//     // </GradientBackground>
//   );
// }

////////////////

// import React, {useState, useEffect, useMemo, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   TouchableWithoutFeedback,
//   TextInput,
//   Animated,
//   Easing,
//   Alert,
//   Pressable,
//   NativeSyntheticEvent,
//   NativeScrollEvent,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import LiquidGlassCard from '../components/LiquidGlassCard/LiquidGlassCard';
// import {useClosetVoiceCommands} from '../utils/VoiceUtils/VoiceContext';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();
//   const userId = useUUID();

//   const insets = useSafeAreaInsets();
//   const [swipeActive, setSwipeActive] = useState(false);
//   const scrollEnabled = !swipeActive;

//   // Sync scroll position with global nav for bottom nav hide/show
//   const handleScroll = useCallback(
//     (event: NativeSyntheticEvent<NativeScrollEvent>) => {
//       if (global.__navScrollY) {
//         global.__navScrollY.setValue(event.nativeEvent.contentOffset.y);
//       }
//     },
//     [],
//   );

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');

//   // 🍏 Menu states
//   const [menuVisible, setMenuVisible] = useState(false);
//   const [menuView, setMenuView] = useState<'main' | 'filter' | 'sort'>('main'); // main or submenus

//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(50)).current;
//   // const fabBounce = useRef(new Animated.Value(100)).current;
//   const fabBounce = useRef(new Animated.Value(250)).current;

//   const submenuOpacity = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 800,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//       Animated.spring(screenTranslate, {
//         toValue: 0,
//         speed: 2,
//         bounciness: 14,
//         useNativeDriver: true,
//       }),
//     ]).start();
//     Animated.spring(fabBounce, {
//       toValue: 0,
//       delay: 900,
//       speed: 2,
//       bounciness: 14,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const {data: wardrobe = [], isLoading} = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return res.json();
//     },
//     enabled: !!userId,
//   });

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {method: 'DELETE'});
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   // 🧠 Expanding FAB state (move these near your other useStates at top of ClosetScreen)
//   const [fabOpen, setFabOpen] = useState(false);
//   const fabAnim = useRef(new Animated.Value(0)).current;

//   const toggleFab = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//     });
//     Animated.spring(fabAnim, {
//       toValue: fabOpen ? 0 : 1,
//       useNativeDriver: false, // ✅ FIX — bottom can now animate safely
//       friction: 6,
//       tension: 40,
//     }).start();
//     setFabOpen(!fabOpen);
//   };

//   const fabItemOffset = (index: number) =>
//     fabAnim.interpolate({
//       inputRange: [0, 1],
//       outputRange: [0, -70 * (index + 1)],
//     });

//   const fabOpacity = fabAnim.interpolate({
//     inputRange: [0, 0.6, 1],
//     outputRange: [0, 0.9, 1],
//   });

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );
//       return {prev};
//     },
//     onError: (err, _, context) => {
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     popover: {
//       position: 'absolute',
//       top: insets.top + 115, // 👈 adds notch + navbar offset
//       right: 20,
//       width: 220,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 12,
//       paddingHorizontal: 14,
//       elevation: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999,
//     },
//     submenu: {
//       position: 'absolute',
//       top: insets.top + 115, // 👈 match same top offset
//       right: 16,
//       width: 320,
//       maxHeight: Dimensions.get('window').height * 0.7,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 16,
//       paddingHorizontal: 18,
//       elevation: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999,
//     },

//     optionRow: {
//       paddingVertical: 10,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     optionText: {
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginLeft: 8,
//     },
//     mainOptionText: {
//       fontSize: 17,
//       color: theme.colors.foreground,
//       fontWeight: tokens.fontWeight.semiBold,
//     },
//   });

//   // const openSubmenu = (view: 'filter' | 'sort') => {
//   //   setMenuView(view);
//   //   submenuOpacity.setValue(0);
//   //   Animated.timing(submenuOpacity, {
//   //     toValue: 1,
//   //     duration: 180,
//   //     useNativeDriver: true,
//   //   }).start();
//   // };

//   // 2️⃣ Handler function (this is TypeScript, not JSX)
//   const openSubmenu = (view: 'filter' | 'sort') => {
//     setMenuView(view);
//     submenuOpacity.setValue(0);
//     Animated.timing(submenuOpacity, {
//       toValue: 1,
//       duration: 180,
//       useNativeDriver: true,
//     }).start();
//   };

//   useClosetVoiceCommands(
//     openSubmenu,
//     setMenuVisible,
//     setSelectedCategory,
//     setSortOption,
//   );

//   return (
//     // <GradientBackground>
//     <SafeAreaView
//       edges={['top']}
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {
//           flex: 1,
//           backgroundColor: theme.colors.background,
//           paddingBottom: 0,
//         },
//       ]}>
//       <Animated.View
//         style={{
//           flex: 1,
//           opacity: screenFade,
//           transform: [{translateY: screenTranslate}],
//         }}>
//         <View
//           style={{
//             height: insets.top + 0, // ⬅️ 56 is about the old navbar height
//             backgroundColor: theme.colors.background, // same tone as old nav
//           }}
//         />
//         <Text style={globalStyles.header}>Wardrobe</Text>

//         {/* 🔝 Header buttons */}
//         <View style={globalStyles.section}>
//           <View style={[styles.buttonRow]}>
//             <View style={{marginRight: 8}}>
//               <AppleTouchFeedback
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {
//                     paddingHorizontal: 28,
//                     minWidth: 210,
//                     alignSelf: 'center',
//                     flexShrink: 0,
//                   },
//                 ]}
//                 hapticStyle="impacMedium"
//                 onPress={() => navigate('OutfitBuilder')}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   + Build An Outfit
//                 </Text>
//               </AppleTouchFeedback>
//             </View>

//             {/* 🍏 Unified Menu Trigger */}
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               style={{
//                 paddingHorizontal: 7,
//                 paddingVertical: 7,
//                 borderRadius: 50,
//                 backgroundColor: theme.colors.button1,
//                 elevation: 2,
//               }}
//               onPress={() => {
//                 setMenuVisible(prev => !prev);
//                 setMenuView('main');
//               }}>
//               {/* <MaterialIcons name="more-vert" size={32} color="white" /> */}
//               <MaterialIcons
//                 name="filter-list"
//                 size={33}
//                 color={theme.colors.buttonText1}
//               />
//             </AppleTouchFeedback>
//           </View>
//         </View>

//         {/* 🪩 Empty state */}
//         {!isLoading && wardrobe.length === 0 && (
//           <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//             <Text style={globalStyles.missingDataMessage1}>
//               No wardrobe items found.
//             </Text>
//             <View style={{alignSelf: 'flex-start'}}>
//               <TooltipBubble
//                 message="You haven’t uploaded any wardrobe items yet. Tap the “Add Clothes”
//              button below to start adding your personal wardrobe inventory."
//                 position="top"
//               />
//             </View>
//           </View>
//         )}

//         {/* 👕 Wardrobe Grid */}
//         <ScrollView
//           scrollEnabled={scrollEnabled}
//           showsVerticalScrollIndicator={false}
//           onScroll={handleScroll}
//           scrollEventThrottle={16}>
//           {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//             <View key={mainCategory} style={globalStyles.section}>
//               <Animated.Text
//                 style={[
//                   globalStyles.sectionTitle5,
//                   {
//                     transform: [
//                       {
//                         translateY: screenFade.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: [20, 0],
//                         }),
//                       },
//                     ],
//                     opacity: screenFade,
//                   },
//                 ]}>
//                 {mainCategory}
//               </Animated.Text>

//               {Object.entries(subMap).map(([subCategory, items]) => (
//                 <View key={subCategory}>
//                   <Text style={[globalStyles.title3]}>{subCategory}</Text>

//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       justifyContent: 'space-between',
//                     }}>
//                     {items.map(item => (
//                       <View
//                         key={item.id}
//                         style={{
//                           marginBottom: 15,
//                         }}>
//                         <Pressable
//                           style={globalStyles.outfitCard4}
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             navigate('ItemDetail', {itemId: item.id, item})
//                           }
//                           onLongPress={() => {
//                             setEditedName(item.name ?? '');
//                             setEditedColor(item.color ?? '');
//                             setSelectedItemToEdit(item);
//                             setShowEditModal(true);
//                           }}>
//                           <View
//                             style={{
//                               width: '100%',
//                               backgroundColor: theme.colors.surface,
//                             }}>
//                             <Image
//                               source={{uri: item.image_url}}
//                               style={globalStyles.image10}
//                               resizeMode="cover"
//                             />
//                           </View>
//                           {/* ❤️ Favorite */}
//                           <View
//                             style={{
//                               position: 'absolute',
//                               top: 8,
//                               right: 8,
//                               zIndex: 10,
//                               padding: 4,
//                             }}>
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={() =>
//                                 favoriteMutation.mutate({
//                                   id: item.id,
//                                   favorite: !item.favorite,
//                                 })
//                               }>
//                               <MaterialIcons
//                                 name="favorite"
//                                 size={28}
//                                 color={
//                                   item.favorite
//                                     ? 'red'
//                                     : theme.colors.inputBorder
//                                 }
//                               />
//                             </AppleTouchFeedback>
//                           </View>

//                           {/* 🏷️ Labels */}
//                           <View style={globalStyles.labelContainer}>
//                             <Text
//                               style={[globalStyles.cardLabel]}
//                               numberOfLines={1}
//                               ellipsizeMode="tail">
//                               {item.name}
//                             </Text>
//                             <Text
//                               style={[globalStyles.cardSubLabel]}
//                               numberOfLines={1}>
//                               {subCategory}
//                             </Text>
//                           </View>

//                           {/* 🪄 Try On */}
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() =>
//                               navigate('TryOnOverlay', {
//                                 outfit: {
//                                   top: {
//                                     name: item.name,
//                                     imageUri: item.image_url,
//                                   },
//                                 },
//                                 userPhotoUri: Image.resolveAssetSource(
//                                   require('../assets/images/full-body-temp1.png'),
//                                 ).uri,
//                               })
//                             }
//                             style={{
//                               position: 'absolute',
//                               top: 10,
//                               left: 8,
//                               backgroundColor: 'black',
//                               paddingHorizontal: 10,
//                               paddingVertical: 4,
//                               borderRadius: 8,
//                             }}>
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontSize: 14,
//                                 fontWeight: tokens.fontWeight.medium,
//                               }}>
//                               Try On
//                             </Text>
//                           </AppleTouchFeedback>
//                         </Pressable>
//                       </View>
//                     ))}
//                   </View>
//                 </View>
//               ))}
//             </View>
//           ))}
//         </ScrollView>

//         {/* 🪩 Expanding FAB Stack */}
//         <>
//           {/* 🪩 Floating Mini FABs */}
//           {[
//             {
//               icon: 'qr-code-scanner',
//               onPress: () => navigate('BarcodeScannerScreen'),
//               offset: 1,
//             },
//             {icon: 'search', onPress: () => navigate('Search'), offset: 2},
//             {icon: 'add', onPress: () => navigate('AddItem'), offset: 3},
//           ].map((btn, index) => (
//             <Animated.View
//               key={index}
//               style={{
//                 position: 'absolute',
//                 bottom: 252 + 0 * btn.offset,
//                 right: 20,
//                 opacity: fabOpacity,
//                 transform: [
//                   {
//                     translateY: fabAnim.interpolate({
//                       inputRange: [0, 1],
//                       outputRange: [0, -70 * (btn.offset + 0.3)],
//                     }),
//                   },
//                   {scale: fabAnim},
//                 ],
//               }}>
//               <LiquidGlassCard
//                 blurAmount={14}
//                 blurOpacity={0.6}
//                 borderRadius={26}
//                 style={{
//                   shadowColor: '#000',
//                   shadowOpacity: 0.25,
//                   shadowOffset: {width: 0, height: 4},
//                   shadowRadius: 8,
//                   elevation: 8,
//                   overflow: 'hidden',
//                 }}>
//                 <Pressable
//                   onPress={() => {
//                     toggleFab();
//                     btn.onPress();
//                   }}
//                   style={{
//                     width: 52,
//                     height: 52,
//                     borderRadius: 26,
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                   }}>
//                   <MaterialIcons
//                     name={btn.icon}
//                     size={26}
//                     color={theme.colors.foreground}
//                   />
//                 </Pressable>
//               </LiquidGlassCard>
//             </Animated.View>
//           ))}

//           {/* 🪄 Main FAB (always visible) */}
//           <Animated.View
//             style={{
//               position: 'absolute',
//               bottom: 260,
//               right: 15,
//               transform: [{translateY: fabBounce}],
//             }}>
//             <LiquidGlassCard
//               blurAmount={14}
//               blurOpacity={0.6}
//               borderRadius={32}
//               style={{
//                 width: 64,
//                 height: 64,
//                 borderRadius: 32,
//                 shadowColor: '#000',
//                 shadowOpacity: 0.25,
//                 shadowOffset: {width: 0, height: 6},
//                 shadowRadius: 10,
//                 elevation: 10,
//                 overflow: 'hidden',
//               }}>
//               <Pressable
//                 onPress={toggleFab}
//                 style={{
//                   width: '100%',
//                   height: '100%',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                 }}>
//                 <Animated.View
//                   style={{
//                     transform: [
//                       {
//                         rotate: fabAnim.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: ['0deg', '45deg'],
//                         }),
//                       },
//                     ],
//                   }}>
//                   <MaterialIcons
//                     name="add"
//                     size={32}
//                     color={theme.colors.foreground}
//                   />
//                 </Animated.View>
//               </Pressable>
//             </LiquidGlassCard>
//           </Animated.View>
//         </>

//         {/* 🍏 Popover + Submenus — Moved to Bottom for Layering Fix */}
//         {menuVisible && (
//           <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
//             <View
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//                 backgroundColor: 'transparent',
//                 zIndex: 9999,
//               }}>
//               <TouchableWithoutFeedback>
//                 <>
//                   {menuView === 'main' && (
//                     <View style={styles.popover}>
//                       <TouchableOpacity
//                         style={styles.optionRow}
//                         onPress={() => {
//                           hSelect();
//                           openSubmenu('filter');
//                         }}>
//                         <MaterialIcons
//                           name="filter-list"
//                           size={24}
//                           color={theme.colors.foreground}
//                         />
//                         <Text style={styles.mainOptionText}>Filter</Text>
//                       </TouchableOpacity>

//                       <TouchableOpacity
//                         style={styles.optionRow}
//                         onPress={() => {
//                           hSelect();
//                           openSubmenu('sort');
//                         }}>
//                         <MaterialIcons
//                           name="sort"
//                           size={22}
//                           color={theme.colors.foreground}
//                         />
//                         <Text style={styles.mainOptionText}>Sort</Text>
//                       </TouchableOpacity>
//                     </View>
//                   )}

//                   {menuView === 'filter' && (
//                     <Animated.View
//                       style={[
//                         styles.submenu,
//                         {
//                           opacity: submenuOpacity,
//                           transform: [
//                             {
//                               scale: submenuOpacity.interpolate({
//                                 inputRange: [0, 1],
//                                 outputRange: [0.95, 1],
//                               }),
//                             },
//                           ],
//                         },
//                       ]}>
//                       <ScrollView
//                         showsVerticalScrollIndicator={false}
//                         contentContainerStyle={{paddingBottom: 8}}>
//                         {CATEGORY_META.map(cat => (
//                           <TouchableOpacity
//                             key={cat.value}
//                             onPress={() => {
//                               hSelect();
//                               setSelectedCategory(cat.value as any);
//                               setMenuVisible(false);
//                             }}
//                             style={styles.optionRow}>
//                             <MaterialIcons
//                               name={cat.icon}
//                               size={20}
//                               color={theme.colors.foreground}
//                             />
//                             <Text style={styles.optionText}>{cat.label}</Text>
//                           </TouchableOpacity>
//                         ))}
//                       </ScrollView>
//                     </Animated.View>
//                   )}

//                   {menuView === 'sort' && (
//                     <Animated.View
//                       style={[
//                         styles.submenu,
//                         {
//                           opacity: submenuOpacity,
//                           transform: [
//                             {
//                               scale: submenuOpacity.interpolate({
//                                 inputRange: [0, 1],
//                                 outputRange: [0.95, 1],
//                               }),
//                             },
//                           ],
//                         },
//                       ]}>
//                       <ScrollView
//                         showsVerticalScrollIndicator={false}
//                         contentContainerStyle={{paddingBottom: 8}}>
//                         {sortOptions.map(opt => (
//                           <TouchableOpacity
//                             key={opt.value}
//                             onPress={() => {
//                               hSelect();
//                               setSortOption(opt.value as any);
//                               setMenuVisible(false);
//                             }}
//                             style={styles.optionRow}>
//                             <MaterialIcons
//                               name="sort"
//                               size={20}
//                               color={theme.colors.foreground}
//                             />
//                             <Text style={styles.optionText}>{opt.label}</Text>
//                           </TouchableOpacity>
//                         ))}
//                       </ScrollView>
//                     </Animated.View>
//                   )}
//                 </>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         )}

//         {/* ✏️ Edit Modal */}
//         {selectedItemToEdit && showEditModal && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'rgba(0,0,0,0.5)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               zIndex: 10000,
//               elevation: 30,
//             }}>
//             <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//               <View
//                 style={{
//                   position: 'absolute',
//                   top: 0,
//                   left: 0,
//                   right: 0,
//                   bottom: 0,
//                 }}
//               />
//             </TouchableWithoutFeedback>

//             <Animated.View
//               style={{
//                 padding: 24,
//                 borderRadius: 12,
//                 backgroundColor: theme.colors.surface,
//                 width: '90%',
//                 maxWidth: 720,
//                 opacity: screenFade,
//                 transform: [
//                   {
//                     scale: screenFade.interpolate({
//                       inputRange: [0, 1],
//                       outputRange: [0.8, 1],
//                     }),
//                   },
//                 ],
//               }}>
//               <TextInput
//                 value={editedName}
//                 onChangeText={setEditedName}
//                 placeholder="Name"
//                 style={styles.input}
//                 placeholderTextColor="#999"
//               />
//               <TextInput
//                 value={editedColor}
//                 onChangeText={setEditedColor}
//                 placeholder="Color"
//                 style={styles.input}
//                 placeholderTextColor="#999"
//               />

//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={async () => {
//                   if (selectedItemToEdit) {
//                     await fetch(
//                       `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                       {
//                         method: 'Put',
//                         headers: {'Content-Type': 'application/json'},
//                         body: JSON.stringify({
//                           name: editedName || selectedItemToEdit.name,
//                           color: editedColor || selectedItemToEdit.color,
//                         }),
//                       },
//                     );
//                     queryClient.invalidateQueries({
//                       queryKey: ['wardrobe', userId],
//                     });
//                     setShowEditModal(false);
//                     setSelectedItemToEdit(null);
//                   }
//                 }}
//                 style={{
//                   paddingVertical: 12,
//                   borderRadius: tokens.borderRadius.sm,
//                   alignItems: 'center',
//                   backgroundColor: theme.colors.primary,
//                   marginTop: 12,
//                 }}>
//                 <Text
//                   style={{
//                     fontSize: 16,
//                     fontWeight: tokens.fontWeight.semiBold,
//                     color: theme.colors.background,
//                   }}>
//                   Save Changes
//                 </Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   Alert.alert(
//                     'Delete Item',
//                     'Are you sure you want to delete this item?',
//                     [
//                       {text: 'Cancel', style: 'cancel'},
//                       {
//                         text: 'Delete',
//                         style: 'destructive',
//                         onPress: () => {
//                           deleteMutation.mutate(selectedItemToEdit.id);
//                           setShowEditModal(false);
//                           setSelectedItemToEdit(null);
//                         },
//                       },
//                     ],
//                   );
//                 }}
//                 style={{
//                   backgroundColor: '#cc0000',
//                   padding: 12,
//                   borderRadius: 8,
//                   marginTop: 16,
//                 }}>
//                 <Text
//                   style={{
//                     color: '#fff',
//                     textAlign: 'center',
//                     fontWeight: tokens.fontWeight.semiBold,
//                   }}>
//                   Delete Item
//                 </Text>
//               </AppleTouchFeedback>
//             </Animated.View>
//           </View>
//         )}
//       </Animated.View>
//     </SafeAreaView>
//     // </GradientBackground>
//   );
// }

///////////////////

// import React, {useState, useEffect, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   TouchableWithoutFeedback,
//   TextInput,
//   Animated,
//   Easing,
//   Alert,
//   SafeAreaView,
//   Pressable,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import LiquidGlassCard from '../components/LiquidGlassCard/LiquidGlassCard';
// import {useClosetVoiceCommands} from '../utils/VoiceUtils/VoiceContext';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();
//   const userId = useUUID();

//   const [swipeActive, setSwipeActive] = useState(false);
//   const scrollEnabled = !swipeActive;

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');

//   // 🍏 Menu states
//   const [menuVisible, setMenuVisible] = useState(false);
//   const [menuView, setMenuView] = useState<'main' | 'filter' | 'sort'>('main'); // main or submenus

//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(50)).current;
//   // const fabBounce = useRef(new Animated.Value(100)).current;
//   const fabBounce = useRef(new Animated.Value(250)).current;

//   const submenuOpacity = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 800,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//       Animated.spring(screenTranslate, {
//         toValue: 0,
//         speed: 2,
//         bounciness: 14,
//         useNativeDriver: true,
//       }),
//     ]).start();
//     Animated.spring(fabBounce, {
//       toValue: 0,
//       delay: 900,
//       speed: 2,
//       bounciness: 14,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const {data: wardrobe = [], isLoading} = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return res.json();
//     },
//     enabled: !!userId,
//   });

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {method: 'DELETE'});
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   // 🧠 Expanding FAB state (move these near your other useStates at top of ClosetScreen)
//   const [fabOpen, setFabOpen] = useState(false);
//   const fabAnim = useRef(new Animated.Value(0)).current;

//   const toggleFab = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//     });
//     Animated.spring(fabAnim, {
//       toValue: fabOpen ? 0 : 1,
//       useNativeDriver: false, // ✅ FIX — bottom can now animate safely
//       friction: 6,
//       tension: 40,
//     }).start();
//     setFabOpen(!fabOpen);
//   };

//   const fabItemOffset = (index: number) =>
//     fabAnim.interpolate({
//       inputRange: [0, 1],
//       outputRange: [0, -70 * (index + 1)],
//     });

//   const fabOpacity = fabAnim.interpolate({
//     inputRange: [0, 0.6, 1],
//     outputRange: [0, 0.9, 1],
//   });

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );
//       return {prev};
//     },
//     onError: (err, _, context) => {
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     popover: {
//       position: 'absolute',
//       top: 50,
//       right: 20,
//       width: 220,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 12,
//       paddingHorizontal: 14,
//       elevation: 20, // ⬅️ higher than grid cards
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999, // ⬅️ ensures it's always on top
//     },
//     submenu: {
//       position: 'absolute',
//       top: 50,
//       right: 16,
//       width: 320, // slightly wider for readability
//       maxHeight: Dimensions.get('window').height * 0.7, // ⬆️ now up to 80% of screen height
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 16, // ⬆️ a bit more breathing room inside
//       paddingHorizontal: 18,
//       elevation: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999,
//     },

//     optionRow: {
//       paddingVertical: 10,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     optionText: {
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginLeft: 8,
//     },
//     mainOptionText: {
//       fontSize: 17,
//       color: theme.colors.foreground,
//       fontWeight: '600',
//     },
//   });

//   // const openSubmenu = (view: 'filter' | 'sort') => {
//   //   setMenuView(view);
//   //   submenuOpacity.setValue(0);
//   //   Animated.timing(submenuOpacity, {
//   //     toValue: 1,
//   //     duration: 180,
//   //     useNativeDriver: true,
//   //   }).start();
//   // };

//   // 2️⃣ Handler function (this is TypeScript, not JSX)
//   const openSubmenu = (view: 'filter' | 'sort') => {
//     setMenuView(view);
//     submenuOpacity.setValue(0);
//     Animated.timing(submenuOpacity, {
//       toValue: 1,
//       duration: 180,
//       useNativeDriver: true,
//     }).start();
//   };

//   useClosetVoiceCommands(
//     openSubmenu,
//     setMenuVisible,
//     setSelectedCategory,
//     setSortOption,
//   );

//   return (
//     // <GradientBackground>
//     <SafeAreaView
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {
//           paddingBottom: 0,
//           marginBottom: 0,
//           flex: 1,
//           backgroundColor: theme.colors.background,
//         },
//       ]}
//       edges={['top', 'left', 'right']} // ✅ ignore bottom inset
//     >
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       {/* 🔝 Header buttons */}
//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,
//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impacMedium"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text style={globalStyles.buttonPrimaryText}>
//                 + Build An Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           {/* 🍏 Unified Menu Trigger */}
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             style={{
//               paddingHorizontal: 7,
//               paddingVertical: 7,
//               borderRadius: 50,
//               backgroundColor: theme.colors.button1,
//               elevation: 2,
//             }}
//             onPress={() => {
//               setMenuVisible(prev => !prev);
//               setMenuView('main');
//             }}>
//             {/* <MaterialIcons name="more-vert" size={32} color="white" /> */}
//             <MaterialIcons
//               name="filter-list"
//               size={33}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {/* 🪩 Empty state */}
//       {!isLoading && wardrobe.length === 0 && (
//         <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//           <Text style={globalStyles.missingDataMessage1}>
//             No wardrobe items found.
//           </Text>
//           <View style={{alignSelf: 'flex-start'}}>
//             <TooltipBubble
//               message="You haven’t uploaded any wardrobe items yet. Tap the “Add Clothes”
//              button below to start adding your personal wardrobe inventory."
//               position="top"
//             />
//           </View>
//         </View>
//       )}

//       {/* 👕 Wardrobe Grid */}
//       <ScrollView scrollEnabled={scrollEnabled}>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Animated.Text
//               style={[
//                 globalStyles.sectionTitle5,
//                 {
//                   transform: [
//                     {
//                       translateY: screenFade.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: [20, 0],
//                       }),
//                     },
//                   ],
//                   opacity: screenFade,
//                 },
//               ]}>
//               {mainCategory}
//             </Animated.Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title3]}>{subCategory}</Text>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                   }}>
//                   {items.map(item => (
//                     <View
//                       key={item.id}
//                       style={{
//                         marginBottom: 15,
//                       }}>
//                       <Pressable
//                         style={globalStyles.outfitCard4}
//                         hapticStyle="impactLight"
//                         onPress={() =>
//                           navigate('ItemDetail', {itemId: item.id, item})
//                         }
//                         onLongPress={() => {
//                           setEditedName(item.name ?? '');
//                           setEditedColor(item.color ?? '');
//                           setSelectedItemToEdit(item);
//                           setShowEditModal(true);
//                         }}>
//                         <View
//                           style={{
//                             width: '100%',
//                             backgroundColor: theme.colors.surface,
//                           }}>
//                           <Image
//                             source={{uri: item.image_url}}
//                             style={globalStyles.image10}
//                             resizeMode="cover"
//                           />
//                         </View>
//                         {/* ❤️ Favorite */}
//                         <View
//                           style={{
//                             position: 'absolute',
//                             top: 8,
//                             right: 8,
//                             zIndex: 10,
//                             padding: 4,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() =>
//                               favoriteMutation.mutate({
//                                 id: item.id,
//                                 favorite: !item.favorite,
//                               })
//                             }>
//                             <MaterialIcons
//                               name="favorite"
//                               size={28}
//                               color={
//                                 item.favorite ? 'red' : theme.colors.inputBorder
//                               }
//                             />
//                           </AppleTouchFeedback>
//                         </View>

//                         {/* 🏷️ Labels */}
//                         <View style={globalStyles.labelContainer}>
//                           <Text
//                             style={[globalStyles.cardLabel]}
//                             numberOfLines={1}
//                             ellipsizeMode="tail">
//                             {item.name}
//                           </Text>
//                           <Text
//                             style={[globalStyles.cardSubLabel]}
//                             numberOfLines={1}>
//                             {subCategory}
//                           </Text>
//                         </View>

//                         {/* 🪄 Try On */}
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             navigate('TryOnOverlay', {
//                               outfit: {
//                                 top: {
//                                   name: item.name,
//                                   imageUri: item.image_url,
//                                 },
//                               },
//                               userPhotoUri: Image.resolveAssetSource(
//                                 require('../assets/images/full-body-temp1.png'),
//                               ).uri,
//                             })
//                           }
//                           style={{
//                             position: 'absolute',
//                             top: 10,
//                             left: 8,
//                             backgroundColor: 'black',
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 8,
//                           }}>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               fontSize: 14,
//                               fontWeight: '500',
//                             }}>
//                             Try On
//                           </Text>
//                         </AppleTouchFeedback>
//                       </Pressable>
//                     </View>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       {/* 🪩 Expanding FAB Stack */}
//       <>
//         {/* 🪩 Floating Mini FABs */}
//         {[
//           {
//             icon: 'qr-code-scanner',
//             onPress: () => navigate('BarcodeScannerScreen'),
//             offset: 1,
//           },
//           {icon: 'search', onPress: () => navigate('Search'), offset: 2},
//           {icon: 'add', onPress: () => navigate('AddItem'), offset: 3},
//         ].map((btn, index) => (
//           <Animated.View
//             key={index}
//             style={{
//               position: 'absolute',
//               bottom: 15 + 10 * btn.offset,
//               right: 28,
//               opacity: fabOpacity,
//               transform: [
//                 {
//                   translateY: fabAnim.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [0, -70 * (btn.offset + 0.3)],
//                   }),
//                 },
//                 {scale: fabAnim},
//               ],
//             }}>
//             <LiquidGlassCard
//               blurAmount={14}
//               blurOpacity={0.6}
//               borderRadius={26}
//               style={{
//                 shadowColor: '#000',
//                 shadowOpacity: 0.25,
//                 shadowOffset: {width: 0, height: 4},
//                 shadowRadius: 8,
//                 elevation: 8,
//                 overflow: 'hidden',
//               }}>
//               <Pressable
//                 onPress={() => {
//                   toggleFab();
//                   btn.onPress();
//                 }}
//                 style={{
//                   width: 52,
//                   height: 52,
//                   borderRadius: 26,
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                 }}>
//                 <MaterialIcons
//                   name={btn.icon}
//                   size={26}
//                   color={theme.colors.foreground}
//                 />
//               </Pressable>
//             </LiquidGlassCard>
//           </Animated.View>
//         ))}

//         {/* 🪄 Main FAB (always visible) */}
//         <Animated.View
//           style={{
//             position: 'absolute',
//             bottom: 25,
//             right: 24,
//             transform: [{translateY: fabBounce}],
//           }}>
//           <LiquidGlassCard
//             blurAmount={14}
//             blurOpacity={0.6}
//             borderRadius={32}
//             style={{
//               width: 64,
//               height: 64,
//               borderRadius: 32,
//               shadowColor: '#000',
//               shadowOpacity: 0.25,
//               shadowOffset: {width: 0, height: 6},
//               shadowRadius: 10,
//               elevation: 10,
//               overflow: 'hidden',
//             }}>
//             <Pressable
//               onPress={toggleFab}
//               style={{
//                 width: '100%',
//                 height: '100%',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//               }}>
//               <Animated.View
//                 style={{
//                   transform: [
//                     {
//                       rotate: fabAnim.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: ['0deg', '45deg'],
//                       }),
//                     },
//                   ],
//                 }}>
//                 <MaterialIcons
//                   name="add"
//                   size={32}
//                   color={theme.colors.foreground}
//                 />
//               </Animated.View>
//             </Pressable>
//           </LiquidGlassCard>
//         </Animated.View>
//       </>

//       {/* 🍏 Popover + Submenus — Moved to Bottom for Layering Fix */}
//       {menuVisible && (
//         <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'transparent',
//               zIndex: 9999,
//             }}>
//             <TouchableWithoutFeedback>
//               <>
//                 {menuView === 'main' && (
//                   <View style={styles.popover}>
//                     <TouchableOpacity
//                       style={styles.optionRow}
//                       onPress={() => {
//                         hSelect();
//                         openSubmenu('filter');
//                       }}>
//                       <MaterialIcons
//                         name="filter-list"
//                         size={24}
//                         color={theme.colors.foreground}
//                       />
//                       <Text style={styles.mainOptionText}>Filter</Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                       style={styles.optionRow}
//                       onPress={() => {
//                         hSelect();
//                         openSubmenu('sort');
//                       }}>
//                       <MaterialIcons
//                         name="sort"
//                         size={22}
//                         color={theme.colors.foreground}
//                       />
//                       <Text style={styles.mainOptionText}>Sort</Text>
//                     </TouchableOpacity>
//                   </View>
//                 )}

//                 {menuView === 'filter' && (
//                   <Animated.View
//                     style={[
//                       styles.submenu,
//                       {
//                         opacity: submenuOpacity,
//                         transform: [
//                           {
//                             scale: submenuOpacity.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.95, 1],
//                             }),
//                           },
//                         ],
//                       },
//                     ]}>
//                     <ScrollView
//                       showsVerticalScrollIndicator={false}
//                       contentContainerStyle={{paddingBottom: 8}}>
//                       {CATEGORY_META.map(cat => (
//                         <TouchableOpacity
//                           key={cat.value}
//                           onPress={() => {
//                             hSelect();
//                             setSelectedCategory(cat.value as any);
//                             setMenuVisible(false);
//                           }}
//                           style={styles.optionRow}>
//                           <MaterialIcons
//                             name={cat.icon}
//                             size={20}
//                             color={theme.colors.foreground}
//                           />
//                           <Text style={styles.optionText}>{cat.label}</Text>
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </Animated.View>
//                 )}

//                 {menuView === 'sort' && (
//                   <Animated.View
//                     style={[
//                       styles.submenu,
//                       {
//                         opacity: submenuOpacity,
//                         transform: [
//                           {
//                             scale: submenuOpacity.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.95, 1],
//                             }),
//                           },
//                         ],
//                       },
//                     ]}>
//                     <ScrollView
//                       showsVerticalScrollIndicator={false}
//                       contentContainerStyle={{paddingBottom: 8}}>
//                       {sortOptions.map(opt => (
//                         <TouchableOpacity
//                           key={opt.value}
//                           onPress={() => {
//                             hSelect();
//                             setSortOption(opt.value as any);
//                             setMenuVisible(false);
//                           }}
//                           style={styles.optionRow}>
//                           <MaterialIcons
//                             name="sort"
//                             size={20}
//                             color={theme.colors.foreground}
//                           />
//                           <Text style={styles.optionText}>{opt.label}</Text>
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </Animated.View>
//                 )}
//               </>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       )}

//       {/* ✏️ Edit Modal */}
//       {selectedItemToEdit && showEditModal && (
//         <View
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: 'rgba(0,0,0,0.5)',
//             justifyContent: 'center',
//             alignItems: 'center',
//             zIndex: 10000,
//             elevation: 30,
//           }}>
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//               }}
//             />
//           </TouchableWithoutFeedback>

//           <Animated.View
//             style={{
//               padding: 24,
//               borderRadius: 12,
//               backgroundColor: theme.colors.surface,
//               width: '90%',
//               maxWidth: 720,
//               opacity: screenFade,
//               transform: [
//                 {
//                   scale: screenFade.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [0.8, 1],
//                   }),
//                 },
//               ],
//             }}>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Name"
//               style={styles.input}
//               placeholderTextColor="#999"
//             />
//             <TextInput
//               value={editedColor}
//               onChangeText={setEditedColor}
//               placeholder="Color"
//               style={styles.input}
//               placeholderTextColor="#999"
//             />

//             <AppleTouchFeedback
//               hapticStyle="impactMedium"
//               onPress={async () => {
//                 if (selectedItemToEdit) {
//                   await fetch(
//                     `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                     {
//                       method: 'Put',
//                       headers: {'Content-Type': 'application/json'},
//                       body: JSON.stringify({
//                         name: editedName || selectedItemToEdit.name,
//                         color: editedColor || selectedItemToEdit.color,
//                       }),
//                     },
//                   );
//                   queryClient.invalidateQueries({
//                     queryKey: ['wardrobe', userId],
//                   });
//                   setShowEditModal(false);
//                   setSelectedItemToEdit(null);
//                 }
//               }}
//               style={{
//                 paddingVertical: 12,
//                 borderRadius: tokens.borderRadius.sm,
//                 alignItems: 'center',
//                 backgroundColor: theme.colors.primary,
//                 marginTop: 12,
//               }}>
//               <Text
//                 style={{
//                   fontSize: 16,
//                   fontWeight: '600',
//                   color: theme.colors.background,
//                 }}>
//                 Save Changes
//               </Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               hapticStyle="impactHeavy"
//               onPress={() => {
//                 Alert.alert(
//                   'Delete Item',
//                   'Are you sure you want to delete this item?',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Delete',
//                       style: 'destructive',
//                       onPress: () => {
//                         deleteMutation.mutate(selectedItemToEdit.id);
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       },
//                     },
//                   ],
//                 );
//               }}
//               style={{
//                 backgroundColor: '#cc0000',
//                 padding: 12,
//                 borderRadius: 8,
//                 marginTop: 16,
//               }}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   textAlign: 'center',
//                   fontWeight: '600',
//                 }}>
//                 Delete Item
//               </Text>
//             </AppleTouchFeedback>
//           </Animated.View>
//         </View>
//       )}
//     </SafeAreaView>
//     // </GradientBackground>
//   );
// }

//////////

// import React, {useState, useEffect, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   TouchableWithoutFeedback,
//   TextInput,
//   Animated,
//   Easing,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();
//   const userId = useUUID();

//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );
//   const [swipeActive, setSwipeActive] = useState(false);
//   const scrollEnabled = !swipeActive;

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');

//   // 🍏 Menu states
//   const [menuVisible, setMenuVisible] = useState(false);
//   const [menuView, setMenuView] = useState<'main' | 'filter' | 'sort'>('main'); // main or submenus

//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(50)).current;
//   // const fabBounce = useRef(new Animated.Value(100)).current;
//   const fabBounce = useRef(new Animated.Value(250)).current;

//   const submenuOpacity = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 800,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//       Animated.spring(screenTranslate, {
//         toValue: 0,
//         speed: 2,
//         bounciness: 14,
//         useNativeDriver: true,
//       }),
//     ]).start();
//     Animated.spring(fabBounce, {
//       toValue: 0,
//       delay: 900,
//       speed: 2,
//       bounciness: 14,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const {data: wardrobe = [], isLoading} = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return res.json();
//     },
//     enabled: !!userId,
//   });

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {method: 'DELETE'});
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   useEffect(() => {
//     const sub = Dimensions.addEventListener('change', ({window}) => {
//       setScreenWidth(window.width);
//     });
//     return () => {
//       // @ts-ignore
//       sub?.remove?.();
//     };
//   }, []);

//   // 🧠 Expanding FAB state (move these near your other useStates at top of ClosetScreen)
//   const [fabOpen, setFabOpen] = useState(false);
//   const fabAnim = useRef(new Animated.Value(0)).current;

//   const toggleFab = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium', {
//       enableVibrateFallback: true,
//     });
//     Animated.spring(fabAnim, {
//       toValue: fabOpen ? 0 : 1,
//       useNativeDriver: false, // ✅ FIX — bottom can now animate safely
//       friction: 6,
//       tension: 40,
//     }).start();
//     setFabOpen(!fabOpen);
//   };

//   const fabItemOffset = (index: number) =>
//     fabAnim.interpolate({
//       inputRange: [0, 1],
//       outputRange: [0, -70 * (index + 1)],
//     });

//   const fabOpacity = fabAnim.interpolate({
//     inputRange: [0, 0.6, 1],
//     outputRange: [0, 0.9, 1],
//   });

//   // const numColumns = Math.floor(screenWidth / (160 + 20.8 * 2)) || 1;
//   // const imageSize =
//   //   (screenWidth - 20.8 * (numColumns - 1) - 20.8 * 1.5) / numColumns;

//   // 🧮 Responsive grid sizing
//   const minCardWidth = 150; // your smallest comfortable card
//   const horizontalPadding = 20; // matches your section padding
//   const spacing = 12; // gap between cards

//   const numColumns = Math.max(
//     2, // ✅ Force at least 2 columns
//     Math.floor(
//       (screenWidth - horizontalPadding * 2 + spacing) /
//         (minCardWidth + spacing),
//     ),
//   );

//   const imageSize =
//     (screenWidth - horizontalPadding * 2 - spacing * (numColumns - 1)) /
//     numColumns;

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );
//       return {prev};
//     },
//     onError: (err, _, context) => {
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     popover: {
//       position: 'absolute',
//       top: 50,
//       right: 20,
//       width: 220,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 12,
//       paddingHorizontal: 14,
//       elevation: 20, // ⬅️ higher than grid cards
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999, // ⬅️ ensures it's always on top
//     },
//     submenu: {
//       position: 'absolute',
//       top: 50,
//       right: 16,
//       width: 320, // slightly wider for readability
//       maxHeight: Dimensions.get('window').height * 0.7, // ⬆️ now up to 80% of screen height
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 16, // ⬆️ a bit more breathing room inside
//       paddingHorizontal: 18,
//       elevation: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999,
//     },

//     optionRow: {
//       paddingVertical: 10,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     optionText: {
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginLeft: 8,
//     },
//     mainOptionText: {
//       fontSize: 17,
//       color: theme.colors.foreground,
//       fontWeight: '600',
//     },
//   });

//   const openSubmenu = (view: 'filter' | 'sort') => {
//     setMenuView(view);
//     submenuOpacity.setValue(0);
//     Animated.timing(submenuOpacity, {
//       toValue: 1,
//       duration: 180,
//       useNativeDriver: true,
//     }).start();
//   };

//   return (
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       {/* 🔝 Header buttons */}
//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,
//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text style={globalStyles.buttonPrimaryText}>
//                 + Build An Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           {/* 🍏 Unified Menu Trigger */}
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             style={{
//               paddingHorizontal: 7,
//               paddingVertical: 7,
//               borderRadius: 50,
//               backgroundColor: theme.colors.button1,
//               elevation: 2,
//             }}
//             onPress={() => {
//               setMenuVisible(prev => !prev);
//               setMenuView('main');
//             }}>
//             {/* <MaterialIcons name="more-vert" size={32} color="white" /> */}
//             <MaterialIcons
//               name="filter-list"
//               size={33}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {/* 🪩 Empty state */}
//       {!isLoading && wardrobe.length === 0 && (
//         <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//           <Text style={globalStyles.missingDataMessage1}>
//             No wardrobe items found.
//           </Text>
//           <View style={{alignSelf: 'flex-start'}}>
//             <TooltipBubble
//               message="You haven’t uploaded any wardrobe items yet. Tap the “Add Clothes”
//              button below to start adding your personal wardrobe inventory."
//               position="top"
//             />
//           </View>
//         </View>
//       )}

//       {/* 👕 Wardrobe Grid */}
//       <ScrollView scrollEnabled={scrollEnabled}>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Animated.Text
//               style={[
//                 globalStyles.sectionTitle5,
//                 {
//                   transform: [
//                     {
//                       translateY: screenFade.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: [20, 0],
//                       }),
//                     },
//                   ],
//                   opacity: screenFade,
//                 },
//               ]}>
//               {mainCategory}
//             </Animated.Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title3]}>{subCategory}</Text>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                   }}>
//                   {items.map(item => (
//                     <View
//                       key={item.id}
//                       style={{
//                         marginBottom: 20.8 * 0.6,
//                       }}>
//                       <AppleTouchFeedback
//                         style={globalStyles.image9}
//                         hapticStyle="impactLight"
//                         onPress={() =>
//                           navigate('ItemDetail', {itemId: item.id, item})
//                         }
//                         onLongPress={() => {
//                           setEditedName(item.name ?? '');
//                           setEditedColor(item.color ?? '');
//                           setSelectedItemToEdit(item);
//                           setShowEditModal(true);
//                         }}>
//                         <Image
//                           source={{uri: item.image_url}}
//                           style={{height: imageSize}}
//                           resizeMode="cover"
//                         />

//                         {/* ❤️ Favorite */}
//                         <View
//                           style={{
//                             position: 'absolute',
//                             top: 8,
//                             right: 8,
//                             zIndex: 10,
//                             padding: 4,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() =>
//                               favoriteMutation.mutate({
//                                 id: item.id,
//                                 favorite: !item.favorite,
//                               })
//                             }>
//                             <MaterialIcons
//                               name="favorite"
//                               size={28}
//                               color={
//                                 item.favorite ? 'red' : theme.colors.inputBorder
//                               }
//                             />
//                           </AppleTouchFeedback>
//                         </View>

//                         {/* 🏷️ Labels */}
//                         <View style={globalStyles.labelContainer}>
//                           <Text
//                             style={[globalStyles.cardLabel]}
//                             numberOfLines={1}
//                             ellipsizeMode="tail">
//                             {item.name}
//                           </Text>
//                           <Text
//                             style={[globalStyles.cardSubLabel]}
//                             numberOfLines={1}>
//                             {subCategory}
//                           </Text>
//                         </View>

//                         {/* 🪄 Try On */}
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             navigate('TryOnOverlay', {
//                               outfit: {
//                                 top: {
//                                   name: item.name,
//                                   imageUri: item.image_url,
//                                 },
//                               },
//                               userPhotoUri: Image.resolveAssetSource(
//                                 require('../assets/images/full-body-temp1.png'),
//                               ).uri,
//                             })
//                           }
//                           style={{
//                             position: 'absolute',
//                             top: 10,
//                             left: 8,
//                             backgroundColor: 'black',
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 8,
//                           }}>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               fontSize: 14,
//                               fontWeight: '500',
//                             }}>
//                             Try On
//                           </Text>
//                         </AppleTouchFeedback>
//                       </AppleTouchFeedback>
//                     </View>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       {/* 🍏 Expanding FAB Menu (fixed hooks version) */}
//       <Animated.View
//         style={{
//           transform: [{translateY: fabBounce}],
//           position: 'absolute',
//           bottom: 24,
//           right: 24,
//         }}>
//         {[
//           {
//             icon: 'qr-code-scanner',
//             onPress: () => navigate('BarcodeScannerScreen'),
//           },
//           {icon: 'search', onPress: () => navigate('Search')},
//           {icon: 'add', onPress: () => navigate('AddItem')},
//         ].map((btn, index) => (
//           <Animated.View
//             key={index}
//             style={{
//               position: 'absolute',
//               // Start above main FAB (64px base + 70px per step)
//               bottom: 64 + 70 * index,
//               opacity: fabOpacity,
//               transform: [
//                 {
//                   translateY: fabAnim.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [0, -10 * (index + 1)],
//                   }),
//                 },
//                 {scale: fabAnim},
//               ],
//             }}>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => {
//                 toggleFab();
//                 btn.onPress();
//               }}
//               style={{
//                 width: 52,
//                 height: 52,
//                 borderRadius: 26,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginBottom: 17,
//                 borderWidth: theme.borderWidth.hairline,
//                 borderColor: theme.colors.secondary,
//                 marginLeft: 6,
//               }}>
//               <MaterialIcons
//                 name={btn.icon}
//                 size={26}
//                 color={theme.colors.buttonText1}
//               />
//             </AppleTouchFeedback>
//           </Animated.View>
//         ))}

//         {/* Main FAB */}
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           onPress={toggleFab}
//           style={{
//             width: 64,
//             height: 64,
//             borderRadius: 32,
//             backgroundColor: theme.colors.button1,
//             alignItems: 'center',
//             justifyContent: 'center',
//             borderWidth: theme.borderWidth.hairline,
//             borderColor: theme.colors.secondary,
//             shadowColor: '#000',
//             shadowOpacity: 0.25,
//             shadowOffset: {width: 0, height: 6},
//             shadowRadius: 10,
//           }}>
//           <Animated.View
//             style={{
//               transform: [
//                 {
//                   rotate: fabAnim.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: ['0deg', '45deg'],
//                   }),
//                 },
//               ],
//             }}>
//             <MaterialIcons
//               name="add"
//               size={32}
//               color={theme.colors.buttonText1}
//             />
//           </Animated.View>
//         </AppleTouchFeedback>
//       </Animated.View>

//       {/* 🍏 Popover + Submenus — Moved to Bottom for Layering Fix */}
//       {menuVisible && (
//         <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'transparent',
//               zIndex: 9999,
//             }}>
//             <TouchableWithoutFeedback>
//               <>
//                 {menuView === 'main' && (
//                   <View style={styles.popover}>
//                     <TouchableOpacity
//                       style={styles.optionRow}
//                       onPress={() => {
//                         hSelect();
//                         openSubmenu('filter');
//                       }}>
//                       <MaterialIcons
//                         name="filter-list"
//                         size={266}
//                         color={theme.colors.foreground}
//                       />
//                       <Text style={styles.mainOptionText}>Filter</Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                       style={styles.optionRow}
//                       onPress={() => {
//                         hSelect();
//                         openSubmenu('sort');
//                       }}>
//                       <MaterialIcons
//                         name="sort"
//                         size={22}
//                         color={theme.colors.foreground}
//                       />
//                       <Text style={styles.mainOptionText}>Sort</Text>
//                     </TouchableOpacity>
//                   </View>
//                 )}

//                 {menuView === 'filter' && (
//                   <Animated.View
//                     style={[
//                       styles.submenu,
//                       {
//                         opacity: submenuOpacity,
//                         transform: [
//                           {
//                             scale: submenuOpacity.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.95, 1],
//                             }),
//                           },
//                         ],
//                       },
//                     ]}>
//                     <ScrollView
//                       showsVerticalScrollIndicator={false}
//                       contentContainerStyle={{paddingBottom: 8}}>
//                       {CATEGORY_META.map(cat => (
//                         <TouchableOpacity
//                           key={cat.value}
//                           onPress={() => {
//                             hSelect();
//                             setSelectedCategory(cat.value as any);
//                             setMenuVisible(false);
//                           }}
//                           style={styles.optionRow}>
//                           <MaterialIcons
//                             name={cat.icon}
//                             size={20}
//                             color={theme.colors.foreground}
//                           />
//                           <Text style={styles.optionText}>{cat.label}</Text>
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </Animated.View>
//                 )}

//                 {menuView === 'sort' && (
//                   <Animated.View
//                     style={[
//                       styles.submenu,
//                       {
//                         opacity: submenuOpacity,
//                         transform: [
//                           {
//                             scale: submenuOpacity.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.95, 1],
//                             }),
//                           },
//                         ],
//                       },
//                     ]}>
//                     <ScrollView
//                       showsVerticalScrollIndicator={false}
//                       contentContainerStyle={{paddingBottom: 8}}>
//                       {sortOptions.map(opt => (
//                         <TouchableOpacity
//                           key={opt.value}
//                           onPress={() => {
//                             hSelect();
//                             setSortOption(opt.value as any);
//                             setMenuVisible(false);
//                           }}
//                           style={styles.optionRow}>
//                           <MaterialIcons
//                             name="sort"
//                             size={20}
//                             color={theme.colors.foreground}
//                           />
//                           <Text style={styles.optionText}>{opt.label}</Text>
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </Animated.View>
//                 )}
//               </>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       )}

//       {/* ✏️ Edit Modal */}
//       {selectedItemToEdit && showEditModal && (
//         <View
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: 'rgba(0,0,0,0.5)',
//             justifyContent: 'center',
//             alignItems: 'center',
//             zIndex: 10000,
//             elevation: 30,
//           }}>
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//               }}
//             />
//           </TouchableWithoutFeedback>

//           <Animated.View
//             style={{
//               padding: 24,
//               borderRadius: 12,
//               backgroundColor: theme.colors.surface,
//               width: '90%',
//               maxWidth: 720,
//               opacity: screenFade,
//               transform: [
//                 {
//                   scale: screenFade.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [0.8, 1],
//                   }),
//                 },
//               ],
//             }}>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Name"
//               style={styles.input}
//               placeholderTextColor="#999"
//             />
//             <TextInput
//               value={editedColor}
//               onChangeText={setEditedColor}
//               placeholder="Color"
//               style={styles.input}
//               placeholderTextColor="#999"
//             />

//             <AppleTouchFeedback
//               hapticStyle="impactMedium"
//               onPress={async () => {
//                 if (selectedItemToEdit) {
//                   await fetch(
//                     `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                     {
//                       method: 'Put',
//                       headers: {'Content-Type': 'application/json'},
//                       body: JSON.stringify({
//                         name: editedName || selectedItemToEdit.name,
//                         color: editedColor || selectedItemToEdit.color,
//                       }),
//                     },
//                   );
//                   queryClient.invalidateQueries({
//                     queryKey: ['wardrobe', userId],
//                   });
//                   setShowEditModal(false);
//                   setSelectedItemToEdit(null);
//                 }
//               }}
//               style={{
//                 paddingVertical: 12,
//                 borderRadius: tokens.borderRadius.sm,
//                 alignItems: 'center',
//                 backgroundColor: theme.colors.primary,
//                 marginTop: 12,
//               }}>
//               <Text
//                 style={{
//                   fontSize: 16,
//                   fontWeight: '600',
//                   color: theme.colors.background,
//                 }}>
//                 Save Changes
//               </Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               hapticStyle="impactHeavy"
//               onPress={() => {
//                 Alert.alert(
//                   'Delete Item',
//                   'Are you sure you want to delete this item?',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Delete',
//                       style: 'destructive',
//                       onPress: () => {
//                         deleteMutation.mutate(selectedItemToEdit.id);
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       },
//                     },
//                   ],
//                 );
//               }}
//               style={{
//                 backgroundColor: '#cc0000',
//                 padding: 12,
//                 borderRadius: 8,
//                 marginTop: 16,
//               }}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   textAlign: 'center',
//                   fontWeight: '600',
//                 }}>
//                 Delete Item
//               </Text>
//             </AppleTouchFeedback>
//           </Animated.View>
//         </View>
//       )}
//     </View>
//   );
// }

////////////////////

// import React, {useState, useEffect, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   TouchableWithoutFeedback,
//   TextInput,
//   Animated,
//   Easing,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();
//   const userId = useUUID();

//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );
//   const [swipeActive, setSwipeActive] = useState(false);
//   const scrollEnabled = !swipeActive;

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');

//   // 🍏 Menu states
//   const [menuVisible, setMenuVisible] = useState(false);
//   const [menuView, setMenuView] = useState<'main' | 'filter' | 'sort'>('main'); // main or submenus

//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(50)).current;
//   // const fabBounce = useRef(new Animated.Value(100)).current;
//   const fabBounce = useRef(new Animated.Value(250)).current;

//   const submenuOpacity = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 800,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//       Animated.spring(screenTranslate, {
//         toValue: 0,
//         speed: 2,
//         bounciness: 14,
//         useNativeDriver: true,
//       }),
//     ]).start();
//     Animated.spring(fabBounce, {
//       toValue: 0,
//       delay: 900,
//       speed: 2,
//       bounciness: 14,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const {data: wardrobe = [], isLoading} = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return res.json();
//     },
//     enabled: !!userId,
//   });

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {method: 'DELETE'});
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   useEffect(() => {
//     const sub = Dimensions.addEventListener('change', ({window}) => {
//       setScreenWidth(window.width);
//     });
//     return () => {
//       // @ts-ignore
//       sub?.remove?.();
//     };
//   }, []);

//   // 🧠 Expanding FAB state (move these near your other useStates at top of ClosetScreen)
//   const [fabOpen, setFabOpen] = useState(false);
//   const fabAnim = useRef(new Animated.Value(0)).current;

//   const toggleFab = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium', {
//       enableVibrateFallback: true,
//     });
//     Animated.spring(fabAnim, {
//       toValue: fabOpen ? 0 : 1,
//       useNativeDriver: false, // ✅ FIX — bottom can now animate safely
//       friction: 6,
//       tension: 40,
//     }).start();
//     setFabOpen(!fabOpen);
//   };

//   const fabItemOffset = (index: number) =>
//     fabAnim.interpolate({
//       inputRange: [0, 1],
//       outputRange: [0, -70 * (index + 1)],
//     });

//   const fabOpacity = fabAnim.interpolate({
//     inputRange: [0, 0.6, 1],
//     outputRange: [0, 0.9, 1],
//   });

//   // const numColumns = Math.floor(screenWidth / (160 + 20.8 * 2)) || 1;
//   // const imageSize =
//   //   (screenWidth - 20.8 * (numColumns - 1) - 20.8 * 1.5) / numColumns;

//   // 🧮 Responsive grid sizing
//   const minCardWidth = 150; // your smallest comfortable card
//   const horizontalPadding = 20; // matches your section padding
//   const spacing = 12; // gap between cards

//   const numColumns = Math.max(
//     2, // ✅ Force at least 2 columns
//     Math.floor(
//       (screenWidth - horizontalPadding * 2 + spacing) /
//         (minCardWidth + spacing),
//     ),
//   );

//   const imageSize =
//     (screenWidth - horizontalPadding * 2 - spacing * (numColumns - 1)) /
//     numColumns;

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );
//       return {prev};
//     },
//     onError: (err, _, context) => {
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     popover: {
//       position: 'absolute',
//       top: 50,
//       right: 20,
//       width: 220,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 12,
//       paddingHorizontal: 14,
//       elevation: 20, // ⬅️ higher than grid cards
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999, // ⬅️ ensures it's always on top
//     },
//     submenu: {
//       position: 'absolute',
//       top: 50,
//       right: 16,
//       width: 320, // slightly wider for readability
//       maxHeight: Dimensions.get('window').height * 0.7, // ⬆️ now up to 80% of screen height
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 16, // ⬆️ a bit more breathing room inside
//       paddingHorizontal: 18,
//       elevation: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999,
//     },

//     optionRow: {
//       paddingVertical: 10,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     optionText: {
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginLeft: 8,
//     },
//     mainOptionText: {
//       fontSize: 17,
//       color: theme.colors.foreground,
//       fontWeight: '600',
//     },
//   });

//   const openSubmenu = (view: 'filter' | 'sort') => {
//     setMenuView(view);
//     submenuOpacity.setValue(0);
//     Animated.timing(submenuOpacity, {
//       toValue: 1,
//       duration: 180,
//       useNativeDriver: true,
//     }).start();
//   };

//   return (
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       {/* 🔝 Header buttons */}
//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,
//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text style={globalStyles.buttonPrimaryText}>
//                 + Build An Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           {/* 🍏 Unified Menu Trigger */}
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             style={{
//               paddingHorizontal: 7,
//               paddingVertical: 7,
//               borderRadius: 50,
//               backgroundColor: theme.colors.button1,
//               elevation: 2,
//             }}
//             onPress={() => {
//               setMenuVisible(prev => !prev);
//               setMenuView('main');
//             }}>
//             {/* <MaterialIcons name="more-vert" size={32} color="white" /> */}
//             <MaterialIcons
//               name="filter-list"
//               size={33}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {/* 🪩 Empty state */}
//       {!isLoading && wardrobe.length === 0 && (
//         <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//           <Text style={globalStyles.missingDataMessage1}>
//             No wardrobe items found.
//           </Text>
//           <View style={{alignSelf: 'flex-start'}}>
//             <TooltipBubble
//               message="You haven’t uploaded any wardrobe items yet. Tap the “Add Clothes”
//              button below to start adding your personal wardrobe inventory."
//               position="top"
//             />
//           </View>
//         </View>
//       )}

//       {/* 👕 Wardrobe Grid */}
//       <ScrollView scrollEnabled={scrollEnabled}>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Animated.Text
//               style={[
//                 globalStyles.sectionTitle5,
//                 {
//                   transform: [
//                     {
//                       translateY: screenFade.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: [20, 0],
//                       }),
//                     },
//                   ],
//                   opacity: screenFade,
//                 },
//               ]}>
//               {mainCategory}
//             </Animated.Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title3]}>{subCategory}</Text>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                   }}>
//                   {items.map(item => (
//                     <View
//                       key={item.id}
//                       style={{
//                         marginBottom: 20.8 * 0.6,
//                       }}>
//                       <AppleTouchFeedback
//                         style={{
//                           width: imageSize,
//                           marginBottom: 20.8 * 0.6,
//                           borderRadius: tokens.borderRadius.md,
//                           backgroundColor: theme.colors.surface,
//                           overflow: 'hidden',
//                           borderColor: theme.colors.surfaceBorder,
//                           borderWidth: tokens.borderWidth.md,
//                         }}
//                         hapticStyle="impactLight"
//                         onPress={() =>
//                           navigate('ItemDetail', {itemId: item.id, item})
//                         }
//                         onLongPress={() => {
//                           setEditedName(item.name ?? '');
//                           setEditedColor(item.color ?? '');
//                           setSelectedItemToEdit(item);
//                           setShowEditModal(true);
//                         }}>
//                         <Image
//                           source={{uri: item.image_url}}
//                           style={{height: imageSize}}
//                           resizeMode="cover"
//                         />

//                         {/* ❤️ Favorite */}
//                         <View
//                           style={{
//                             position: 'absolute',
//                             top: 8,
//                             right: 8,
//                             zIndex: 10,
//                             padding: 4,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() =>
//                               favoriteMutation.mutate({
//                                 id: item.id,
//                                 favorite: !item.favorite,
//                               })
//                             }>
//                             <MaterialIcons
//                               name="favorite"
//                               size={28}
//                               color={
//                                 item.favorite ? 'red' : theme.colors.inputBorder
//                               }
//                             />
//                           </AppleTouchFeedback>
//                         </View>

//                         {/* 🏷️ Labels */}
//                         <View style={globalStyles.labelContainer}>
//                           <Text
//                             style={[globalStyles.cardLabel]}
//                             numberOfLines={1}
//                             ellipsizeMode="tail">
//                             {item.name}
//                           </Text>
//                           <Text
//                             style={[globalStyles.cardSubLabel]}
//                             numberOfLines={1}>
//                             {subCategory}
//                           </Text>
//                         </View>

//                         {/* 🪄 Try On */}
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             navigate('TryOnOverlay', {
//                               outfit: {
//                                 top: {
//                                   name: item.name,
//                                   imageUri: item.image_url,
//                                 },
//                               },
//                               userPhotoUri: Image.resolveAssetSource(
//                                 require('../assets/images/full-body-temp1.png'),
//                               ).uri,
//                             })
//                           }
//                           style={{
//                             position: 'absolute',
//                             top: 10,
//                             left: 8,
//                             backgroundColor: 'black',
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 8,
//                           }}>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               fontSize: 14,
//                               fontWeight: '500',
//                             }}>
//                             Try On
//                           </Text>
//                         </AppleTouchFeedback>
//                       </AppleTouchFeedback>
//                     </View>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       {/* 🍏 Expanding FAB Menu (fixed hooks version) */}
//       <Animated.View
//         style={{
//           transform: [{translateY: fabBounce}],
//           position: 'absolute',
//           bottom: 24,
//           right: 24,
//         }}>
//         {[
//           {
//             icon: 'qr-code-scanner',
//             onPress: () => navigate('BarcodeScannerScreen'),
//           },
//           {icon: 'search', onPress: () => navigate('Search')},
//           {icon: 'add', onPress: () => navigate('AddItem')},
//         ].map((btn, index) => (
//           <Animated.View
//             key={index}
//             style={{
//               position: 'absolute',
//               // Start above main FAB (64px base + 70px per step)
//               bottom: 64 + 70 * index,
//               opacity: fabOpacity,
//               transform: [
//                 {
//                   translateY: fabAnim.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [0, -10 * (index + 1)],
//                   }),
//                 },
//                 {scale: fabAnim},
//               ],
//             }}>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => {
//                 toggleFab();
//                 btn.onPress();
//               }}
//               style={{
//                 width: 52,
//                 height: 52,
//                 borderRadius: 26,
//                 backgroundColor: theme.colors.button1,
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginBottom: 17,
//                 borderWidth: theme.borderWidth.hairline,
//                 borderColor: theme.colors.secondary,
//                 marginLeft: 6,
//               }}>
//               <MaterialIcons
//                 name={btn.icon}
//                 size={26}
//                 color={theme.colors.buttonText1}
//               />
//             </AppleTouchFeedback>
//           </Animated.View>
//         ))}

//         {/* Main FAB */}
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           onPress={toggleFab}
//           style={{
//             width: 64,
//             height: 64,
//             borderRadius: 32,
//             backgroundColor: theme.colors.button1,
//             alignItems: 'center',
//             justifyContent: 'center',
//             borderWidth: theme.borderWidth.hairline,
//             borderColor: theme.colors.secondary,
//             shadowColor: '#000',
//             shadowOpacity: 0.25,
//             shadowOffset: {width: 0, height: 6},
//             shadowRadius: 10,
//           }}>
//           <Animated.View
//             style={{
//               transform: [
//                 {
//                   rotate: fabAnim.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: ['0deg', '45deg'],
//                   }),
//                 },
//               ],
//             }}>
//             <MaterialIcons
//               name="add"
//               size={32}
//               color={theme.colors.buttonText1}
//             />
//           </Animated.View>
//         </AppleTouchFeedback>
//       </Animated.View>

//       {/* 🍏 Popover + Submenus — Moved to Bottom for Layering Fix */}
//       {menuVisible && (
//         <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'transparent',
//               zIndex: 9999,
//             }}>
//             <TouchableWithoutFeedback>
//               <>
//                 {menuView === 'main' && (
//                   <View style={styles.popover}>
//                     <TouchableOpacity
//                       style={styles.optionRow}
//                       onPress={() => {
//                         hSelect();
//                         openSubmenu('filter');
//                       }}>
//                       <MaterialIcons
//                         name="filter-list"
//                         size={24}
//                         color={theme.colors.foreground}
//                       />
//                       <Text style={styles.mainOptionText}>Filter</Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                       style={styles.optionRow}
//                       onPress={() => {
//                         hSelect();
//                         openSubmenu('sort');
//                       }}>
//                       <MaterialIcons
//                         name="sort"
//                         size={22}
//                         color={theme.colors.foreground}
//                       />
//                       <Text style={styles.mainOptionText}>Sort</Text>
//                     </TouchableOpacity>
//                   </View>
//                 )}

//                 {menuView === 'filter' && (
//                   <Animated.View
//                     style={[
//                       styles.submenu,
//                       {
//                         opacity: submenuOpacity,
//                         transform: [
//                           {
//                             scale: submenuOpacity.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.95, 1],
//                             }),
//                           },
//                         ],
//                       },
//                     ]}>
//                     <ScrollView
//                       showsVerticalScrollIndicator={false}
//                       contentContainerStyle={{paddingBottom: 8}}>
//                       {CATEGORY_META.map(cat => (
//                         <TouchableOpacity
//                           key={cat.value}
//                           onPress={() => {
//                             hSelect();
//                             setSelectedCategory(cat.value as any);
//                             setMenuVisible(false);
//                           }}
//                           style={styles.optionRow}>
//                           <MaterialIcons
//                             name={cat.icon}
//                             size={20}
//                             color={theme.colors.foreground}
//                           />
//                           <Text style={styles.optionText}>{cat.label}</Text>
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </Animated.View>
//                 )}

//                 {menuView === 'sort' && (
//                   <Animated.View
//                     style={[
//                       styles.submenu,
//                       {
//                         opacity: submenuOpacity,
//                         transform: [
//                           {
//                             scale: submenuOpacity.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.95, 1],
//                             }),
//                           },
//                         ],
//                       },
//                     ]}>
//                     <ScrollView
//                       showsVerticalScrollIndicator={false}
//                       contentContainerStyle={{paddingBottom: 8}}>
//                       {sortOptions.map(opt => (
//                         <TouchableOpacity
//                           key={opt.value}
//                           onPress={() => {
//                             hSelect();
//                             setSortOption(opt.value as any);
//                             setMenuVisible(false);
//                           }}
//                           style={styles.optionRow}>
//                           <MaterialIcons
//                             name="sort"
//                             size={20}
//                             color={theme.colors.foreground}
//                           />
//                           <Text style={styles.optionText}>{opt.label}</Text>
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </Animated.View>
//                 )}
//               </>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       )}

//       {/* ✏️ Edit Modal */}
//       {selectedItemToEdit && showEditModal && (
//         <View
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: 'rgba(0,0,0,0.5)',
//             justifyContent: 'center',
//             alignItems: 'center',
//             zIndex: 10000,
//             elevation: 30,
//           }}>
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//               }}
//             />
//           </TouchableWithoutFeedback>

//           <Animated.View
//             style={{
//               padding: 24,
//               borderRadius: 12,
//               backgroundColor: theme.colors.surface,
//               width: '90%',
//               maxWidth: 720,
//               opacity: screenFade,
//               transform: [
//                 {
//                   scale: screenFade.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [0.8, 1],
//                   }),
//                 },
//               ],
//             }}>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Name"
//               style={styles.input}
//               placeholderTextColor="#999"
//             />
//             <TextInput
//               value={editedColor}
//               onChangeText={setEditedColor}
//               placeholder="Color"
//               style={styles.input}
//               placeholderTextColor="#999"
//             />

//             <AppleTouchFeedback
//               hapticStyle="impactMedium"
//               onPress={async () => {
//                 if (selectedItemToEdit) {
//                   await fetch(
//                     `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                     {
//                       method: 'Put',
//                       headers: {'Content-Type': 'application/json'},
//                       body: JSON.stringify({
//                         name: editedName || selectedItemToEdit.name,
//                         color: editedColor || selectedItemToEdit.color,
//                       }),
//                     },
//                   );
//                   queryClient.invalidateQueries({
//                     queryKey: ['wardrobe', userId],
//                   });
//                   setShowEditModal(false);
//                   setSelectedItemToEdit(null);
//                 }
//               }}
//               style={{
//                 paddingVertical: 12,
//                 borderRadius: tokens.borderRadius.sm,
//                 alignItems: 'center',
//                 backgroundColor: theme.colors.primary,
//                 marginTop: 12,
//               }}>
//               <Text
//                 style={{
//                   fontSize: 16,
//                   fontWeight: '600',
//                   color: theme.colors.background,
//                 }}>
//                 Save Changes
//               </Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               hapticStyle="impactHeavy"
//               onPress={() => {
//                 Alert.alert(
//                   'Delete Item',
//                   'Are you sure you want to delete this item?',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Delete',
//                       style: 'destructive',
//                       onPress: () => {
//                         deleteMutation.mutate(selectedItemToEdit.id);
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       },
//                     },
//                   ],
//                 );
//               }}
//               style={{
//                 backgroundColor: '#cc0000',
//                 padding: 12,
//                 borderRadius: 8,
//                 marginTop: 16,
//               }}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   textAlign: 'center',
//                   fontWeight: '600',
//                 }}>
//                 Delete Item
//               </Text>
//             </AppleTouchFeedback>
//           </Animated.View>
//         </View>
//       )}
//     </View>
//   );
// }

///////////////////

// import React, {useState, useEffect, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   TouchableWithoutFeedback,
//   TextInput,
//   Animated,
//   Easing,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();
//   const userId = useUUID();

//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );
//   const [swipeActive, setSwipeActive] = useState(false);
//   const scrollEnabled = !swipeActive;

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');

//   // 🍏 Menu states
//   const [menuVisible, setMenuVisible] = useState(false);
//   const [menuView, setMenuView] = useState<'main' | 'filter' | 'sort'>('main'); // main or submenus

//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(50)).current;
//   const fabBounce = useRef(new Animated.Value(100)).current;

//   const submenuOpacity = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 800,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//       Animated.spring(screenTranslate, {
//         toValue: 0,
//         speed: 2,
//         bounciness: 14,
//         useNativeDriver: true,
//       }),
//     ]).start();
//     Animated.spring(fabBounce, {
//       toValue: 0,
//       delay: 900,
//       speed: 2,
//       bounciness: 14,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const {data: wardrobe = [], isLoading} = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return res.json();
//     },
//     enabled: !!userId,
//   });

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {method: 'DELETE'});
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   useEffect(() => {
//     const sub = Dimensions.addEventListener('change', ({window}) => {
//       setScreenWidth(window.width);
//     });
//     return () => {
//       // @ts-ignore
//       sub?.remove?.();
//     };
//   }, []);

//   // const numColumns = Math.floor(screenWidth / (160 + 20.8 * 2)) || 1;
//   // const imageSize =
//   //   (screenWidth - 20.8 * (numColumns - 1) - 20.8 * 1.5) / numColumns;

//   // 🧮 Responsive grid sizing
//   const minCardWidth = 150; // your smallest comfortable card
//   const horizontalPadding = 20; // matches your section padding
//   const spacing = 12; // gap between cards

//   const numColumns = Math.max(
//     2, // ✅ Force at least 2 columns
//     Math.floor(
//       (screenWidth - horizontalPadding * 2 + spacing) /
//         (minCardWidth + spacing),
//     ),
//   );

//   const imageSize =
//     (screenWidth - horizontalPadding * 2 - spacing * (numColumns - 1)) /
//     numColumns;

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );
//       return {prev};
//     },
//     onError: (err, _, context) => {
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     popover: {
//       position: 'absolute',
//       top: 50,
//       right: 20,
//       width: 220,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 12,
//       paddingHorizontal: 14,
//       elevation: 20, // ⬅️ higher than grid cards
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999, // ⬅️ ensures it's always on top
//     },
//     submenu: {
//       position: 'absolute',
//       top: 50,
//       right: 16,
//       width: 320, // slightly wider for readability
//       maxHeight: Dimensions.get('window').height * 0.7, // ⬆️ now up to 80% of screen height
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 16, // ⬆️ a bit more breathing room inside
//       paddingHorizontal: 18,
//       elevation: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999,
//     },

//     optionRow: {
//       paddingVertical: 10,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     optionText: {
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginLeft: 8,
//     },
//     mainOptionText: {
//       fontSize: 17,
//       color: theme.colors.foreground,
//       fontWeight: '600',
//     },
//   });

//   const openSubmenu = (view: 'filter' | 'sort') => {
//     setMenuView(view);
//     submenuOpacity.setValue(0);
//     Animated.timing(submenuOpacity, {
//       toValue: 1,
//       duration: 180,
//       useNativeDriver: true,
//     }).start();
//   };

//   return (
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       {/* 🔝 Header buttons */}
//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,
//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text style={globalStyles.buttonPrimaryText}>
//                 + Build An Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           {/* 🍏 Unified Menu Trigger */}
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             style={{
//               paddingHorizontal: 7,
//               paddingVertical: 7,
//               borderRadius: 50,
//               backgroundColor: theme.colors.button1,
//               elevation: 2,
//             }}
//             onPress={() => {
//               setMenuVisible(prev => !prev);
//               setMenuView('main');
//             }}>
//             <MaterialIcons name="more-vert" size={32} color="white" />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {/* 🪩 Empty state */}
//       {!isLoading && wardrobe.length === 0 && (
//         <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//           <Text style={globalStyles.missingDataMessage1}>
//             No wardrobe items found.
//           </Text>
//           <View style={{alignSelf: 'flex-start'}}>
//             <TooltipBubble
//               message="You haven’t uploaded any wardrobe items yet. Tap the “Add Clothes”
//              button below to start adding your personal wardrobe inventory."
//               position="top"
//             />
//           </View>
//         </View>
//       )}

//       {/* 👕 Wardrobe Grid */}
//       <ScrollView scrollEnabled={scrollEnabled}>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Animated.Text
//               style={[
//                 globalStyles.sectionTitle5,
//                 {
//                   transform: [
//                     {
//                       translateY: screenFade.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: [20, 0],
//                       }),
//                     },
//                   ],
//                   opacity: screenFade,
//                 },
//               ]}>
//               {mainCategory}
//             </Animated.Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title3]}>{subCategory}</Text>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                   }}>
//                   {items.map(item => (
//                     <View
//                       key={item.id}
//                       style={{
//                         marginBottom: 20.8 * 0.6,
//                       }}>
//                       <AppleTouchFeedback
//                         style={{
//                           width: imageSize,
//                           marginBottom: 20.8 * 0.6,
//                           borderRadius: tokens.borderRadius.md,
//                           backgroundColor: theme.colors.surface,
//                           overflow: 'hidden',
//                           borderColor: theme.colors.surfaceBorder,
//                           borderWidth: tokens.borderWidth.md,
//                         }}
//                         hapticStyle="impactLight"
//                         onPress={() =>
//                           navigate('ItemDetail', {itemId: item.id, item})
//                         }
//                         onLongPress={() => {
//                           setEditedName(item.name ?? '');
//                           setEditedColor(item.color ?? '');
//                           setSelectedItemToEdit(item);
//                           setShowEditModal(true);
//                         }}>
//                         <Image
//                           source={{uri: item.image_url}}
//                           style={{height: imageSize}}
//                           resizeMode="cover"
//                         />

//                         {/* ❤️ Favorite */}
//                         <View
//                           style={{
//                             position: 'absolute',
//                             top: 8,
//                             right: 8,
//                             zIndex: 10,
//                             padding: 4,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() =>
//                               favoriteMutation.mutate({
//                                 id: item.id,
//                                 favorite: !item.favorite,
//                               })
//                             }>
//                             <MaterialIcons
//                               name="favorite"
//                               size={28}
//                               color={
//                                 item.favorite ? 'red' : theme.colors.inputBorder
//                               }
//                             />
//                           </AppleTouchFeedback>
//                         </View>

//                         {/* 🏷️ Labels */}
//                         <View style={globalStyles.labelContainer}>
//                           <Text
//                             style={[globalStyles.cardLabel]}
//                             numberOfLines={1}
//                             ellipsizeMode="tail">
//                             {item.name}
//                           </Text>
//                           <Text
//                             style={[globalStyles.cardSubLabel]}
//                             numberOfLines={1}>
//                             {subCategory}
//                           </Text>
//                         </View>

//                         {/* 🪄 Try On */}
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             navigate('TryOnOverlay', {
//                               outfit: {
//                                 top: {
//                                   name: item.name,
//                                   imageUri: item.image_url,
//                                 },
//                               },
//                               userPhotoUri: Image.resolveAssetSource(
//                                 require('../assets/images/full-body-temp1.png'),
//                               ).uri,
//                             })
//                           }
//                           style={{
//                             position: 'absolute',
//                             top: 10,
//                             left: 8,
//                             backgroundColor: 'black',
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 8,
//                           }}>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               fontSize: 14,
//                               fontWeight: '500',
//                             }}>
//                             Try On
//                           </Text>
//                         </AppleTouchFeedback>
//                       </AppleTouchFeedback>
//                     </View>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       {/* ➕ Add Item FAB */}
//       <Animated.View
//         style={{
//           transform: [{translateY: fabBounce}],
//           position: 'absolute',
//           bottom: 24,
//           right: 24,
//         }}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           onPress={() => navigate('AddItem')}
//           style={{
//             width: 52,
//             height: 52,
//             borderRadius: 26,
//             backgroundColor: theme.colors.button1,
//             alignItems: 'center',
//             justifyContent: 'center',
//             borderWidth: theme.borderWidth.hairline,
//             borderColor: theme.colors.secondary,
//           }}>
//           <MaterialIcons
//             name="add"
//             size={28}
//             color={theme.colors.buttonText1}
//           />
//         </AppleTouchFeedback>
//       </Animated.View>

//       {/* 📷 Search Scanner FAB */}
//       <Animated.View
//         style={{
//           transform: [{translateY: fabBounce}],
//           position: 'absolute',
//           bottom: 170,
//           right: 24,
//         }}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           onPress={() => navigate('Search')}
//           style={{
//             width: 52,
//             height: 52,
//             borderRadius: 26,
//             backgroundColor: theme.colors.button1 ?? '#444',
//             alignItems: 'center',
//             justifyContent: 'center',
//             borderWidth: theme.borderWidth.hairline,
//             borderColor: theme.colors.secondary,
//           }}>
//           <MaterialIcons
//             name="search"
//             size={26}
//             color={theme.colors.buttonText1}
//           />
//         </AppleTouchFeedback>
//       </Animated.View>

//       {/* 📷 Barcode Scanner FAB */}
//       <Animated.View
//         style={{
//           transform: [{translateY: fabBounce}],
//           position: 'absolute',
//           bottom: 96,
//           right: 24,
//         }}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           onPress={() => navigate('BarcodeScannerScreen')}
//           style={{
//             width: 52,
//             height: 52,
//             borderRadius: 26,
//             backgroundColor: theme.colors.button1 ?? '#444',
//             alignItems: 'center',
//             justifyContent: 'center',
//             borderWidth: theme.borderWidth.hairline,
//             borderColor: theme.colors.secondary,
//           }}>
//           <MaterialIcons
//             name="qr-code-scanner"
//             size={26}
//             color={theme.colors.buttonText1}
//           />
//         </AppleTouchFeedback>
//       </Animated.View>

//       {/* 🍏 Popover + Submenus — Moved to Bottom for Layering Fix */}
//       {menuVisible && (
//         <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'transparent',
//               zIndex: 9999,
//             }}>
//             <TouchableWithoutFeedback>
//               <>
//                 {menuView === 'main' && (
//                   <View style={styles.popover}>
//                     <TouchableOpacity
//                       style={styles.optionRow}
//                       onPress={() => {
//                         hSelect();
//                         openSubmenu('filter');
//                       }}>
//                       <MaterialIcons
//                         name="filter-list"
//                         size={22}
//                         color={theme.colors.foreground}
//                       />
//                       <Text style={styles.mainOptionText}>Filter</Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                       style={styles.optionRow}
//                       onPress={() => {
//                         hSelect();
//                         openSubmenu('sort');
//                       }}>
//                       <MaterialIcons
//                         name="sort"
//                         size={22}
//                         color={theme.colors.foreground}
//                       />
//                       <Text style={styles.mainOptionText}>Sort</Text>
//                     </TouchableOpacity>
//                   </View>
//                 )}

//                 {menuView === 'filter' && (
//                   <Animated.View
//                     style={[
//                       styles.submenu,
//                       {
//                         opacity: submenuOpacity,
//                         transform: [
//                           {
//                             scale: submenuOpacity.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.95, 1],
//                             }),
//                           },
//                         ],
//                       },
//                     ]}>
//                     <ScrollView
//                       showsVerticalScrollIndicator={false}
//                       contentContainerStyle={{paddingBottom: 8}}>
//                       {CATEGORY_META.map(cat => (
//                         <TouchableOpacity
//                           key={cat.value}
//                           onPress={() => {
//                             hSelect();
//                             setSelectedCategory(cat.value as any);
//                             setMenuVisible(false);
//                           }}
//                           style={styles.optionRow}>
//                           <MaterialIcons
//                             name={cat.icon}
//                             size={20}
//                             color={theme.colors.foreground}
//                           />
//                           <Text style={styles.optionText}>{cat.label}</Text>
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </Animated.View>
//                 )}

//                 {menuView === 'sort' && (
//                   <Animated.View
//                     style={[
//                       styles.submenu,
//                       {
//                         opacity: submenuOpacity,
//                         transform: [
//                           {
//                             scale: submenuOpacity.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.95, 1],
//                             }),
//                           },
//                         ],
//                       },
//                     ]}>
//                     <ScrollView
//                       showsVerticalScrollIndicator={false}
//                       contentContainerStyle={{paddingBottom: 8}}>
//                       {sortOptions.map(opt => (
//                         <TouchableOpacity
//                           key={opt.value}
//                           onPress={() => {
//                             hSelect();
//                             setSortOption(opt.value as any);
//                             setMenuVisible(false);
//                           }}
//                           style={styles.optionRow}>
//                           <MaterialIcons
//                             name="sort"
//                             size={20}
//                             color={theme.colors.foreground}
//                           />
//                           <Text style={styles.optionText}>{opt.label}</Text>
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </Animated.View>
//                 )}
//               </>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       )}

//       {/* ✏️ Edit Modal */}
//       {selectedItemToEdit && showEditModal && (
//         <View
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: 'rgba(0,0,0,0.5)',
//             justifyContent: 'center',
//             alignItems: 'center',
//             zIndex: 10000,
//             elevation: 30,
//           }}>
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//               }}
//             />
//           </TouchableWithoutFeedback>

//           <Animated.View
//             style={{
//               padding: 24,
//               borderRadius: 12,
//               backgroundColor: theme.colors.surface,
//               width: '90%',
//               maxWidth: 720,
//               opacity: screenFade,
//               transform: [
//                 {
//                   scale: screenFade.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [0.8, 1],
//                   }),
//                 },
//               ],
//             }}>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Name"
//               style={styles.input}
//               placeholderTextColor="#999"
//             />
//             <TextInput
//               value={editedColor}
//               onChangeText={setEditedColor}
//               placeholder="Color"
//               style={styles.input}
//               placeholderTextColor="#999"
//             />

//             <AppleTouchFeedback
//               hapticStyle="impactMedium"
//               onPress={async () => {
//                 if (selectedItemToEdit) {
//                   await fetch(
//                     `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                     {
//                       method: 'Put',
//                       headers: {'Content-Type': 'application/json'},
//                       body: JSON.stringify({
//                         name: editedName || selectedItemToEdit.name,
//                         color: editedColor || selectedItemToEdit.color,
//                       }),
//                     },
//                   );
//                   queryClient.invalidateQueries({
//                     queryKey: ['wardrobe', userId],
//                   });
//                   setShowEditModal(false);
//                   setSelectedItemToEdit(null);
//                 }
//               }}
//               style={{
//                 paddingVertical: 12,
//                 borderRadius: tokens.borderRadius.sm,
//                 alignItems: 'center',
//                 backgroundColor: theme.colors.primary,
//                 marginTop: 12,
//               }}>
//               <Text
//                 style={{
//                   fontSize: 16,
//                   fontWeight: '600',
//                   color: theme.colors.background,
//                 }}>
//                 Save Changes
//               </Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               hapticStyle="impactHeavy"
//               onPress={() => {
//                 Alert.alert(
//                   'Delete Item',
//                   'Are you sure you want to delete this item?',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Delete',
//                       style: 'destructive',
//                       onPress: () => {
//                         deleteMutation.mutate(selectedItemToEdit.id);
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       },
//                     },
//                   ],
//                 );
//               }}
//               style={{
//                 backgroundColor: '#cc0000',
//                 padding: 12,
//                 borderRadius: 8,
//                 marginTop: 16,
//               }}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   textAlign: 'center',
//                   fontWeight: '600',
//                 }}>
//                 Delete Item
//               </Text>
//             </AppleTouchFeedback>
//           </Animated.View>
//         </View>
//       )}
//     </View>
//   );
// }

//////////////////

// import React, {useState, useEffect, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   TouchableWithoutFeedback,
//   TextInput,
//   Animated,
//   Easing,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();
//   const userId = useUUID();

//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );
//   const [swipeActive, setSwipeActive] = useState(false);
//   const scrollEnabled = !swipeActive;

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');

//   // 🍏 Menu states
//   const [menuVisible, setMenuVisible] = useState(false);
//   const [menuView, setMenuView] = useState<'main' | 'filter' | 'sort'>('main'); // main or submenus

//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(50)).current;
//   const fabBounce = useRef(new Animated.Value(100)).current;

//   const submenuOpacity = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 800,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//       Animated.spring(screenTranslate, {
//         toValue: 0,
//         speed: 2,
//         bounciness: 14,
//         useNativeDriver: true,
//       }),
//     ]).start();
//     Animated.spring(fabBounce, {
//       toValue: 0,
//       delay: 900,
//       speed: 2,
//       bounciness: 14,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const {data: wardrobe = [], isLoading} = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return res.json();
//     },
//     enabled: !!userId,
//   });

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {method: 'DELETE'});
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   useEffect(() => {
//     const sub = Dimensions.addEventListener('change', ({window}) => {
//       setScreenWidth(window.width);
//     });
//     return () => {
//       // @ts-ignore
//       sub?.remove?.();
//     };
//   }, []);

//   // const numColumns = Math.floor(screenWidth / (160 + 20.8 * 2)) || 1;
//   // const imageSize =
//   //   (screenWidth - 20.8 * (numColumns - 1) - 20.8 * 1.5) / numColumns;

//   // 🧮 Responsive grid sizing
//   const minCardWidth = 150; // your smallest comfortable card
//   const horizontalPadding = 20; // matches your section padding
//   const spacing = 12; // gap between cards

//   const numColumns = Math.max(
//     2, // ✅ Force at least 2 columns
//     Math.floor(
//       (screenWidth - horizontalPadding * 2 + spacing) /
//         (minCardWidth + spacing),
//     ),
//   );

//   const imageSize =
//     (screenWidth - horizontalPadding * 2 - spacing * (numColumns - 1)) /
//     numColumns;

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );
//       return {prev};
//     },
//     onError: (err, _, context) => {
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     popover: {
//       position: 'absolute',
//       top: 50,
//       right: 20,
//       width: 220,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 12,
//       paddingHorizontal: 14,
//       elevation: 20, // ⬅️ higher than grid cards
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999, // ⬅️ ensures it's always on top
//     },
//     submenu: {
//       position: 'absolute',
//       top: 50,
//       right: 16,
//       width: 320, // slightly wider for readability
//       maxHeight: Dimensions.get('window').height * 0.7, // ⬆️ now up to 80% of screen height
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 16, // ⬆️ a bit more breathing room inside
//       paddingHorizontal: 18,
//       elevation: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999,
//     },

//     optionRow: {
//       paddingVertical: 10,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     optionText: {
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginLeft: 8,
//     },
//     mainOptionText: {
//       fontSize: 17,
//       color: theme.colors.foreground,
//       fontWeight: '600',
//     },
//   });

//   const openSubmenu = (view: 'filter' | 'sort') => {
//     setMenuView(view);
//     submenuOpacity.setValue(0);
//     Animated.timing(submenuOpacity, {
//       toValue: 1,
//       duration: 180,
//       useNativeDriver: true,
//     }).start();
//   };

//   return (
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       {/* 🔝 Header buttons */}
//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,
//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text style={globalStyles.buttonPrimaryText}>
//                 + Build An Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           {/* 🍏 Unified Menu Trigger */}
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             style={{
//               paddingHorizontal: 7,
//               paddingVertical: 7,
//               borderRadius: 50,
//               backgroundColor: theme.colors.button1,
//               elevation: 2,
//             }}
//             onPress={() => {
//               setMenuVisible(prev => !prev);
//               setMenuView('main');
//             }}>
//             <MaterialIcons name="more-vert" size={32} color="white" />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {/* 🪩 Empty state */}
//       {!isLoading && wardrobe.length === 0 && (
//         <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//           <Text style={globalStyles.missingDataMessage1}>
//             No wardrobe items found.
//           </Text>
//           <View style={{alignSelf: 'flex-start'}}>
//             <TooltipBubble
//               message="You haven’t uploaded any wardrobe items yet. Tap the “Add Clothes”
//              button below to start adding your personal wardrobe inventory."
//               position="top"
//             />
//           </View>
//         </View>
//       )}

//       {/* 👕 Wardrobe Grid */}
//       <ScrollView scrollEnabled={scrollEnabled}>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Animated.Text
//               style={[
//                 globalStyles.sectionTitle5,
//                 {
//                   transform: [
//                     {
//                       translateY: screenFade.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: [20, 0],
//                       }),
//                     },
//                   ],
//                   opacity: screenFade,
//                 },
//               ]}>
//               {mainCategory}
//             </Animated.Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title3]}>{subCategory}</Text>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                   }}>
//                   {items.map(item => (
//                     <View
//                       key={item.id}
//                       style={{
//                         marginBottom: 20.8 * 0.6,
//                       }}>
//                       <AppleTouchFeedback
//                         style={{
//                           width: imageSize,
//                           marginBottom: 20.8 * 0.6,
//                           borderRadius: tokens.borderRadius.md,
//                           backgroundColor: theme.colors.surface,
//                           overflow: 'hidden',
//                           borderColor: theme.colors.surfaceBorder,
//                           borderWidth: tokens.borderWidth.md,
//                         }}
//                         hapticStyle="impactLight"
//                         onPress={() =>
//                           navigate('ItemDetail', {itemId: item.id, item})
//                         }
//                         onLongPress={() => {
//                           setEditedName(item.name ?? '');
//                           setEditedColor(item.color ?? '');
//                           setSelectedItemToEdit(item);
//                           setShowEditModal(true);
//                         }}>
//                         <Image
//                           source={{uri: item.image_url}}
//                           style={{height: imageSize}}
//                           resizeMode="cover"
//                         />

//                         {/* ❤️ Favorite */}
//                         <View
//                           style={{
//                             position: 'absolute',
//                             top: 8,
//                             right: 8,
//                             zIndex: 10,
//                             padding: 4,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() =>
//                               favoriteMutation.mutate({
//                                 id: item.id,
//                                 favorite: !item.favorite,
//                               })
//                             }>
//                             <MaterialIcons
//                               name="favorite"
//                               size={28}
//                               color={
//                                 item.favorite ? 'red' : theme.colors.inputBorder
//                               }
//                             />
//                           </AppleTouchFeedback>
//                         </View>

//                         {/* 🏷️ Labels */}
//                         <View style={globalStyles.labelContainer}>
//                           <Text
//                             style={[globalStyles.cardLabel]}
//                             numberOfLines={1}
//                             ellipsizeMode="tail">
//                             {item.name}
//                           </Text>
//                           <Text
//                             style={[globalStyles.cardSubLabel]}
//                             numberOfLines={1}>
//                             {subCategory}
//                           </Text>
//                         </View>

//                         {/* 🪄 Try On */}
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             navigate('TryOnOverlay', {
//                               outfit: {
//                                 top: {
//                                   name: item.name,
//                                   imageUri: item.image_url,
//                                 },
//                               },
//                               userPhotoUri: Image.resolveAssetSource(
//                                 require('../assets/images/full-body-temp1.png'),
//                               ).uri,
//                             })
//                           }
//                           style={{
//                             position: 'absolute',
//                             top: 10,
//                             left: 8,
//                             backgroundColor: 'black',
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 8,
//                           }}>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               fontSize: 14,
//                               fontWeight: '500',
//                             }}>
//                             Try On
//                           </Text>
//                         </AppleTouchFeedback>
//                       </AppleTouchFeedback>
//                     </View>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       {/* ➕ FAB */}
//       <Animated.View
//         style={{
//           transform: [{translateY: fabBounce}],
//           position: 'absolute',
//           bottom: 24,
//           right: 24,
//         }}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           onPress={() => navigate('AddItem')}
//           style={{
//             width: 52,
//             height: 52,
//             borderRadius: 26,
//             backgroundColor: theme.colors.button1,
//             alignItems: 'center',
//             justifyContent: 'center',
//             borderWidth: theme.borderWidth.hairline,
//             borderColor: theme.colors.secondary,
//           }}>
//           <MaterialIcons
//             name="add"
//             size={28}
//             color={theme.colors.buttonText1}
//           />
//         </AppleTouchFeedback>
//       </Animated.View>

//       {/* 🍏 Popover + Submenus — Moved to Bottom for Layering Fix */}
//       {menuVisible && (
//         <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'transparent',
//               zIndex: 9999,
//             }}>
//             <TouchableWithoutFeedback>
//               <>
//                 {menuView === 'main' && (
//                   <View style={styles.popover}>
//                     <TouchableOpacity
//                       style={styles.optionRow}
//                       onPress={() => {
//                         hSelect();
//                         openSubmenu('filter');
//                       }}>
//                       <MaterialIcons
//                         name="filter-list"
//                         size={22}
//                         color={theme.colors.foreground}
//                       />
//                       <Text style={styles.mainOptionText}>Filter</Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                       style={styles.optionRow}
//                       onPress={() => {
//                         hSelect();
//                         openSubmenu('sort');
//                       }}>
//                       <MaterialIcons
//                         name="sort"
//                         size={22}
//                         color={theme.colors.foreground}
//                       />
//                       <Text style={styles.mainOptionText}>Sort</Text>
//                     </TouchableOpacity>
//                   </View>
//                 )}

//                 {menuView === 'filter' && (
//                   <Animated.View
//                     style={[
//                       styles.submenu,
//                       {
//                         opacity: submenuOpacity,
//                         transform: [
//                           {
//                             scale: submenuOpacity.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.95, 1],
//                             }),
//                           },
//                         ],
//                       },
//                     ]}>
//                     <ScrollView
//                       showsVerticalScrollIndicator={false}
//                       contentContainerStyle={{paddingBottom: 8}}>
//                       {CATEGORY_META.map(cat => (
//                         <TouchableOpacity
//                           key={cat.value}
//                           onPress={() => {
//                             hSelect();
//                             setSelectedCategory(cat.value as any);
//                             setMenuVisible(false);
//                           }}
//                           style={styles.optionRow}>
//                           <MaterialIcons
//                             name={cat.icon}
//                             size={20}
//                             color={theme.colors.foreground}
//                           />
//                           <Text style={styles.optionText}>{cat.label}</Text>
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </Animated.View>
//                 )}

//                 {menuView === 'sort' && (
//                   <Animated.View
//                     style={[
//                       styles.submenu,
//                       {
//                         opacity: submenuOpacity,
//                         transform: [
//                           {
//                             scale: submenuOpacity.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.95, 1],
//                             }),
//                           },
//                         ],
//                       },
//                     ]}>
//                     <ScrollView
//                       showsVerticalScrollIndicator={false}
//                       contentContainerStyle={{paddingBottom: 8}}>
//                       {sortOptions.map(opt => (
//                         <TouchableOpacity
//                           key={opt.value}
//                           onPress={() => {
//                             hSelect();
//                             setSortOption(opt.value as any);
//                             setMenuVisible(false);
//                           }}
//                           style={styles.optionRow}>
//                           <MaterialIcons
//                             name="sort"
//                             size={20}
//                             color={theme.colors.foreground}
//                           />
//                           <Text style={styles.optionText}>{opt.label}</Text>
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </Animated.View>
//                 )}
//               </>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       )}

//       {/* ✏️ Edit Modal */}
//       {selectedItemToEdit && showEditModal && (
//         <View
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: 'rgba(0,0,0,0.5)',
//             justifyContent: 'center',
//             alignItems: 'center',
//             zIndex: 10000,
//             elevation: 30,
//           }}>
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//               }}
//             />
//           </TouchableWithoutFeedback>

//           <Animated.View
//             style={{
//               padding: 24,
//               borderRadius: 12,
//               backgroundColor: theme.colors.surface,
//               width: '90%',
//               maxWidth: 720,
//               opacity: screenFade,
//               transform: [
//                 {
//                   scale: screenFade.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [0.8, 1],
//                   }),
//                 },
//               ],
//             }}>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Name"
//               style={styles.input}
//               placeholderTextColor="#999"
//             />
//             <TextInput
//               value={editedColor}
//               onChangeText={setEditedColor}
//               placeholder="Color"
//               style={styles.input}
//               placeholderTextColor="#999"
//             />

//             <AppleTouchFeedback
//               hapticStyle="impactMedium"
//               onPress={async () => {
//                 if (selectedItemToEdit) {
//                   await fetch(
//                     `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                     {
//                       method: 'Put',
//                       headers: {'Content-Type': 'application/json'},
//                       body: JSON.stringify({
//                         name: editedName || selectedItemToEdit.name,
//                         color: editedColor || selectedItemToEdit.color,
//                       }),
//                     },
//                   );
//                   queryClient.invalidateQueries({
//                     queryKey: ['wardrobe', userId],
//                   });
//                   setShowEditModal(false);
//                   setSelectedItemToEdit(null);
//                 }
//               }}
//               style={{
//                 paddingVertical: 12,
//                 borderRadius: tokens.borderRadius.sm,
//                 alignItems: 'center',
//                 backgroundColor: theme.colors.primary,
//                 marginTop: 12,
//               }}>
//               <Text
//                 style={{
//                   fontSize: 16,
//                   fontWeight: '600',
//                   color: theme.colors.background,
//                 }}>
//                 Save Changes
//               </Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               hapticStyle="impactHeavy"
//               onPress={() => {
//                 Alert.alert(
//                   'Delete Item',
//                   'Are you sure you want to delete this item?',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Delete',
//                       style: 'destructive',
//                       onPress: () => {
//                         deleteMutation.mutate(selectedItemToEdit.id);
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       },
//                     },
//                   ],
//                 );
//               }}
//               style={{
//                 backgroundColor: '#cc0000',
//                 padding: 12,
//                 borderRadius: 8,
//                 marginTop: 16,
//               }}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   textAlign: 'center',
//                   fontWeight: '600',
//                 }}>
//                 Delete Item
//               </Text>
//             </AppleTouchFeedback>
//           </Animated.View>
//         </View>
//       )}
//     </View>
//   );
// }

///////////////////////

// import React, {useState, useEffect, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   TouchableWithoutFeedback,
//   TextInput,
//   Animated,
//   Easing,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();
//   const userId = useUUID();

//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );
//   const [swipeActive, setSwipeActive] = useState(false);
//   const scrollEnabled = !swipeActive;

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');

//   // 🍏 Menu states
//   const [menuVisible, setMenuVisible] = useState(false);
//   const [menuView, setMenuView] = useState<'main' | 'filter' | 'sort'>('main'); // main or submenus

//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(50)).current;
//   const fabBounce = useRef(new Animated.Value(100)).current;

//   const submenuOpacity = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 800,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//       Animated.spring(screenTranslate, {
//         toValue: 0,
//         speed: 2,
//         bounciness: 14,
//         useNativeDriver: true,
//       }),
//     ]).start();
//     Animated.spring(fabBounce, {
//       toValue: 0,
//       delay: 900,
//       speed: 2,
//       bounciness: 14,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const {data: wardrobe = [], isLoading} = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return res.json();
//     },
//     enabled: !!userId,
//   });

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {method: 'DELETE'});
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   useEffect(() => {
//     const sub = Dimensions.addEventListener('change', ({window}) => {
//       setScreenWidth(window.width);
//     });
//     return () => {
//       // @ts-ignore
//       sub?.remove?.();
//     };
//   }, []);

//   const numColumns = Math.floor(screenWidth / (160 + 20.8 * 2)) || 1;
//   const imageSize =
//     (screenWidth - 20.8 * (numColumns - 1) - 20.8 * 1.5) / numColumns;

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );
//       return {prev};
//     },
//     onError: (err, _, context) => {
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     popover: {
//       position: 'absolute',
//       top: 50,
//       right: 20,
//       width: 220,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 12,
//       paddingHorizontal: 14,
//       elevation: 20, // ⬅️ higher than grid cards
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999, // ⬅️ ensures it's always on top
//     },
//     submenu: {
//       position: 'absolute',
//       top: 50,
//       right: 16,
//       width: 280,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 12,
//       paddingHorizontal: 14,
//       elevation: 20, // ⬅️ same here
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowOffset: {width: 0, height: 4},
//       shadowRadius: 14,
//       zIndex: 9999,
//     },

//     optionRow: {
//       paddingVertical: 10,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     optionText: {
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginLeft: 8,
//     },
//     mainOptionText: {
//       fontSize: 17,
//       color: theme.colors.foreground,
//       fontWeight: '600',
//     },
//   });

//   const openSubmenu = (view: 'filter' | 'sort') => {
//     setMenuView(view);
//     submenuOpacity.setValue(0);
//     Animated.timing(submenuOpacity, {
//       toValue: 1,
//       duration: 180,
//       useNativeDriver: true,
//     }).start();
//   };

//   return (
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       {/* 🔝 Header buttons */}
//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,
//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text style={globalStyles.buttonPrimaryText}>
//                 + Build An Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           {/* 🍏 Unified Menu Trigger */}
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             style={{
//               paddingHorizontal: 7,
//               paddingVertical: 7,
//               borderRadius: 50,
//               backgroundColor: theme.colors.button1,
//               elevation: 2,
//             }}
//             onPress={() => {
//               setMenuVisible(prev => !prev);
//               setMenuView('main');
//             }}>
//             <MaterialIcons name="more-vert" size={32} color="white" />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {/* 🪩 Empty state */}
//       {!isLoading && wardrobe.length === 0 && (
//         <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//           <Text style={globalStyles.missingDataMessage1}>
//             No wardrobe items found.
//           </Text>
//           <View style={{alignSelf: 'flex-start'}}>
//             <TooltipBubble
//               message="You haven’t uploaded any wardrobe items yet. Tap the “Add Clothes”
//              button below to start adding your personal wardrobe inventory."
//               position="top"
//             />
//           </View>
//         </View>
//       )}

//       {/* 👕 Wardrobe Grid */}
//       <ScrollView scrollEnabled={scrollEnabled}>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Animated.Text
//               style={[
//                 globalStyles.sectionTitle5,
//                 {
//                   transform: [
//                     {
//                       translateY: screenFade.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: [20, 0],
//                       }),
//                     },
//                   ],
//                   opacity: screenFade,
//                 },
//               ]}>
//               {mainCategory}
//             </Animated.Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title3]}>{subCategory}</Text>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                   }}>
//                   {items.map(item => (
//                     <View
//                       key={item.id}
//                       style={{
//                         marginBottom: 20.8 * 0.6,
//                       }}>
//                       <AppleTouchFeedback
//                         style={{
//                           width: imageSize,
//                           marginBottom: 20.8 * 0.6,
//                           borderRadius: tokens.borderRadius.md,
//                           backgroundColor: theme.colors.surface,
//                           overflow: 'hidden',
//                           borderColor: theme.colors.surfaceBorder,
//                           borderWidth: tokens.borderWidth.md,
//                         }}
//                         hapticStyle="impactLight"
//                         onPress={() =>
//                           navigate('ItemDetail', {itemId: item.id, item})
//                         }
//                         onLongPress={() => {
//                           setEditedName(item.name ?? '');
//                           setEditedColor(item.color ?? '');
//                           setSelectedItemToEdit(item);
//                           setShowEditModal(true);
//                         }}>
//                         <Image
//                           source={{uri: item.image_url}}
//                           style={{height: imageSize}}
//                           resizeMode="cover"
//                         />

//                         {/* ❤️ Favorite */}
//                         <View
//                           style={{
//                             position: 'absolute',
//                             top: 8,
//                             right: 8,
//                             zIndex: 10,
//                             padding: 4,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() =>
//                               favoriteMutation.mutate({
//                                 id: item.id,
//                                 favorite: !item.favorite,
//                               })
//                             }>
//                             <MaterialIcons
//                               name="favorite"
//                               size={28}
//                               color={
//                                 item.favorite ? 'red' : theme.colors.inputBorder
//                               }
//                             />
//                           </AppleTouchFeedback>
//                         </View>

//                         {/* 🏷️ Labels */}
//                         <View style={globalStyles.labelContainer}>
//                           <Text
//                             style={[globalStyles.cardLabel]}
//                             numberOfLines={1}
//                             ellipsizeMode="tail">
//                             {item.name}
//                           </Text>
//                           <Text
//                             style={[globalStyles.cardSubLabel]}
//                             numberOfLines={1}>
//                             {subCategory}
//                           </Text>
//                         </View>

//                         {/* 🪄 Try On */}
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             navigate('TryOnOverlay', {
//                               outfit: {
//                                 top: {
//                                   name: item.name,
//                                   imageUri: item.image_url,
//                                 },
//                               },
//                               userPhotoUri: Image.resolveAssetSource(
//                                 require('../assets/images/full-body-temp1.png'),
//                               ).uri,
//                             })
//                           }
//                           style={{
//                             position: 'absolute',
//                             top: 10,
//                             left: 8,
//                             backgroundColor: 'black',
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 8,
//                           }}>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               fontSize: 14,
//                               fontWeight: '500',
//                             }}>
//                             Try On
//                           </Text>
//                         </AppleTouchFeedback>
//                       </AppleTouchFeedback>
//                     </View>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       {/* ➕ FAB */}
//       <Animated.View
//         style={{
//           transform: [{translateY: fabBounce}],
//           position: 'absolute',
//           bottom: 24,
//           right: 24,
//         }}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           onPress={() => navigate('AddItem')}
//           style={{
//             width: 52,
//             height: 52,
//             borderRadius: 26,
//             backgroundColor: theme.colors.button1,
//             alignItems: 'center',
//             justifyContent: 'center',
//             borderWidth: theme.borderWidth.hairline,
//             borderColor: theme.colors.secondary,
//           }}>
//           <MaterialIcons
//             name="add"
//             size={28}
//             color={theme.colors.buttonText1}
//           />
//         </AppleTouchFeedback>
//       </Animated.View>

//       {/* 🍏 Popover + Submenus — Moved to Bottom for Layering Fix */}
//       {menuVisible && (
//         <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'transparent',
//               zIndex: 9999,
//             }}>
//             <TouchableWithoutFeedback>
//               <>
//                 {menuView === 'main' && (
//                   <View style={styles.popover}>
//                     <TouchableOpacity
//                       style={styles.optionRow}
//                       onPress={() => {
//                         hSelect();
//                         openSubmenu('filter');
//                       }}>
//                       <MaterialIcons
//                         name="filter-list"
//                         size={22}
//                         color={theme.colors.foreground}
//                       />
//                       <Text style={styles.mainOptionText}>Filter</Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                       style={styles.optionRow}
//                       onPress={() => {
//                         hSelect();
//                         openSubmenu('sort');
//                       }}>
//                       <MaterialIcons
//                         name="sort"
//                         size={22}
//                         color={theme.colors.foreground}
//                       />
//                       <Text style={styles.mainOptionText}>Sort</Text>
//                     </TouchableOpacity>
//                   </View>
//                 )}

//                 {menuView === 'filter' && (
//                   <Animated.View
//                     style={[
//                       styles.submenu,
//                       {
//                         opacity: submenuOpacity,
//                         transform: [
//                           {
//                             scale: submenuOpacity.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.95, 1],
//                             }),
//                           },
//                         ],
//                       },
//                     ]}>
//                     {CATEGORY_META.map(cat => (
//                       <TouchableOpacity
//                         key={cat.value}
//                         onPress={() => {
//                           hSelect();
//                           setSelectedCategory(cat.value as any);
//                           setMenuVisible(false);
//                         }}
//                         style={styles.optionRow}>
//                         <MaterialIcons
//                           name={cat.icon}
//                           size={20}
//                           color={theme.colors.foreground}
//                         />
//                         <Text style={styles.optionText}>{cat.label}</Text>
//                       </TouchableOpacity>
//                     ))}
//                   </Animated.View>
//                 )}

//                 {menuView === 'sort' && (
//                   <Animated.View
//                     style={[
//                       styles.submenu,
//                       {
//                         opacity: submenuOpacity,
//                         transform: [
//                           {
//                             scale: submenuOpacity.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.95, 1],
//                             }),
//                           },
//                         ],
//                       },
//                     ]}>
//                     {sortOptions.map(opt => (
//                       <TouchableOpacity
//                         key={opt.value}
//                         onPress={() => {
//                           hSelect();
//                           setSortOption(opt.value as any);
//                           setMenuVisible(false);
//                         }}
//                         style={styles.optionRow}>
//                         <MaterialIcons
//                           name="sort"
//                           size={20}
//                           color={theme.colors.foreground}
//                         />
//                         <Text style={styles.optionText}>{opt.label}</Text>
//                       </TouchableOpacity>
//                     ))}
//                   </Animated.View>
//                 )}
//               </>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       )}

//       {/* ✏️ Edit Modal */}
//       {selectedItemToEdit && showEditModal && (
//         <View
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: 'rgba(0,0,0,0.5)',
//             justifyContent: 'center',
//             alignItems: 'center',
//             zIndex: 10000,
//             elevation: 30,
//           }}>
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//               }}
//             />
//           </TouchableWithoutFeedback>

//           <Animated.View
//             style={{
//               padding: 24,
//               borderRadius: 12,
//               backgroundColor: theme.colors.surface,
//               width: '90%',
//               maxWidth: 720,
//               opacity: screenFade,
//               transform: [
//                 {
//                   scale: screenFade.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [0.8, 1],
//                   }),
//                 },
//               ],
//             }}>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Name"
//               style={styles.input}
//               placeholderTextColor="#999"
//             />
//             <TextInput
//               value={editedColor}
//               onChangeText={setEditedColor}
//               placeholder="Color"
//               style={styles.input}
//               placeholderTextColor="#999"
//             />

//             <AppleTouchFeedback
//               hapticStyle="impactMedium"
//               onPress={async () => {
//                 if (selectedItemToEdit) {
//                   await fetch(
//                     `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                     {
//                       method: 'Put',
//                       headers: {'Content-Type': 'application/json'},
//                       body: JSON.stringify({
//                         name: editedName || selectedItemToEdit.name,
//                         color: editedColor || selectedItemToEdit.color,
//                       }),
//                     },
//                   );
//                   queryClient.invalidateQueries({
//                     queryKey: ['wardrobe', userId],
//                   });
//                   setShowEditModal(false);
//                   setSelectedItemToEdit(null);
//                 }
//               }}
//               style={{
//                 paddingVertical: 12,
//                 borderRadius: tokens.borderRadius.sm,
//                 alignItems: 'center',
//                 backgroundColor: theme.colors.primary,
//                 marginTop: 12,
//               }}>
//               <Text
//                 style={{
//                   fontSize: 16,
//                   fontWeight: '600',
//                   color: theme.colors.background,
//                 }}>
//                 Save Changes
//               </Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               hapticStyle="impactHeavy"
//               onPress={() => {
//                 Alert.alert(
//                   'Delete Item',
//                   'Are you sure you want to delete this item?',
//                   [
//                     {text: 'Cancel', style: 'cancel'},
//                     {
//                       text: 'Delete',
//                       style: 'destructive',
//                       onPress: () => {
//                         deleteMutation.mutate(selectedItemToEdit.id);
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       },
//                     },
//                   ],
//                 );
//               }}
//               style={{
//                 backgroundColor: '#cc0000',
//                 padding: 12,
//                 borderRadius: 8,
//                 marginTop: 16,
//               }}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   textAlign: 'center',
//                   fontWeight: '600',
//                 }}>
//                 Delete Item
//               </Text>
//             </AppleTouchFeedback>
//           </Animated.View>
//         </View>
//       )}
//     </View>
//   );
// }

///////////////////

// import React, {useState, useEffect, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
//   TouchableWithoutFeedback,
//   TextInput,
//   Animated,
//   Easing,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import SwipeableCard from '../components/SwipeableCard/SwipeableCard';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Canonical category list (value matches backend enums), with pretty labels
// // ─────────────────────────────────────────────────────────────────────────────
// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   // canonical value (no space) + friendly label (with space)
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const categoryIcons = Object.fromEntries(
//   CATEGORY_META.filter(c => c.value !== 'All').map(c => [c.value, c.icon]),
// ) as Partial<Record<MainCategory, string>>;

// const labelForCategory = (value: string) =>
//   CATEGORY_META.find(c => c.value === value)?.label ?? value;

// // ─────────────────────────────────────────────────────────────────────────────
// // Layout constants
// // ─────────────────────────────────────────────────────────────────────────────
// const ITEM_MARGIN = 20.8;
// const MIN_ITEM_WIDTH = 160;

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );

//   const [swipeActive, setSwipeActive] = useState(false);
//   const scrollEnabled = !swipeActive; // disable vertical scroll while swiping

//   const userId = useUUID();

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');
//   const [showFilter, setShowFilter] = useState(false);
//   const [showSort, setShowSort] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   // Dramatic animation refs
//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(50)).current;
//   const fabBounce = useRef(new Animated.Value(100)).current;

//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 800,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//       Animated.spring(screenTranslate, {
//         toValue: 0,
//         speed: 2,
//         bounciness: 14,
//         useNativeDriver: true,
//       }),
//     ]).start();

//     Animated.spring(fabBounce, {
//       toValue: 0,
//       delay: 900,
//       speed: 2,
//       bounciness: 14,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       const json = await res.json();
//       console.log('👕 LOOOOOOOK', JSON.stringify(json, null, 2));
//       return json;
//     },
//     enabled: !!userId,
//   });

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {
//         method: 'DELETE',
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Filtering + sorting
//   // ─────────────────────────────────────────────────────────────────────────────
//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   useEffect(() => {
//     const sub = Dimensions.addEventListener('change', ({window}) => {
//       setScreenWidth(window.width);
//     });
//     return () => {
//       // RN modern API returns an object with remove()
//       // @ts-ignore
//       sub?.remove?.();
//     };
//   }, []);

//   const numColumns =
//     Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;
//   const imageSize =
//     (screenWidth - ITEM_MARGIN * (numColumns - 1) - ITEM_MARGIN * 1.5) /
//     numColumns;

//   const handleDeleteItem = (itemId: string) => {
//     deleteMutation.mutate(itemId);
//   };

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );
//       return {prev};
//     },
//     onError: (err, _, context) => {
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     input: {
//       borderWidth: 1,
//       borderRadius: tokens.borderRadius.md,
//       padding: 10,
//       marginBottom: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//       borderColor: theme.colors.inputBorder,
//       backgroundColor: theme.colors.input2,
//     },
//     button: {
//       paddingVertical: 12,
//       borderRadius: tokens.borderRadius.sm,
//       alignItems: 'center',
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     iconButton: {
//       paddingHorizontal: 12,
//       paddingVertical: 7,
//       borderRadius: tokens.borderRadius.sm,
//       backgroundColor: theme.colors.button1,
//       elevation: 2,
//     },
//     gridContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     gridCard: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 0.6,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface,
//       overflow: 'hidden',
//     },
//     gridImage: {
//       height: imageSize,
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     fab: {
//       position: 'absolute',
//       bottom: 24,
//       right: 24,
//       backgroundColor: theme.colors.button1,
//       padding: 16,
//       borderRadius: 32,
//       elevation: 6,
//     },
//     modalContent: {
//       padding: 24,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       width: '90%',
//       maxWidth: 720,
//       alignSelf: 'center',
//     },
//     modalOption: {
//       paddingVertical: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     tryOnButtonText: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '500',
//     },
//   });

//   return (
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,
//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text
//                 style={globalStyles.buttonPrimaryText}
//                 numberOfLines={1}
//                 ellipsizeMode="clip"
//                 adjustsFontSizeToFit={false}>
//                 + Build An Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           <AppleTouchFeedback
//             style={{...styles.iconButton, marginRight: 8}}
//             hapticStyle="impactLight"
//             onPress={() => setShowFilter(true)}>
//             <MaterialIcons name="filter-list" size={32} color={'white'} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={{...styles.iconButton}}
//             hapticStyle="impactLight"
//             onPress={() => setShowSort(true)}>
//             <MaterialIcons name="sort" size={32} color={'white'} />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {!isLoading && wardrobe.length === 0 && (
//         <View
//           style={{
//             flexDirection: 'row',
//             alignSelf: 'center',
//           }}>
//           <Text style={globalStyles.missingDataMessage1}>
//             No wardrobe items found.
//           </Text>
//           <View style={{alignSelf: 'flex-start'}}>
//             <TooltipBubble
//               message="You haven’t uploaded any wardrobe items yet. Tap the “Add Clothes”
//              button below to start adding your personal wardrobe inventory."
//               position="top"
//             />
//           </View>
//         </View>
//       )}

//       <ScrollView scrollEnabled={scrollEnabled}>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Animated.Text
//               style={[
//                 globalStyles.sectionTitle5,
//                 {
//                   transform: [
//                     {
//                       translateY: screenFade.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: [20, 0],
//                       }),
//                     },
//                   ],
//                   opacity: screenFade,
//                 },
//               ]}>
//               {labelForCategory(mainCategory)}
//             </Animated.Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title3]}>{subCategory}</Text>

//                 <View style={[styles.gridContainer]}>
//                   {items.map((item, index) => (
//                     <View
//                       key={item.id}
//                       style={{
//                         marginBottom: ITEM_MARGIN * 0.6,
//                       }}>
//                       <AppleTouchFeedback
//                         style={[
//                           styles.gridCard,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                           },
//                         ]}
//                         hapticStyle="impactLight"
//                         onPress={() =>
//                           navigate('ItemDetail', {itemId: item.id, item})
//                         }
//                         onLongPress={() => {
//                           setEditedName(item.name ?? '');
//                           setEditedColor(item.color ?? '');
//                           setSelectedItemToEdit(item);
//                           setShowEditModal(true);
//                         }}>
//                         <Image
//                           source={{uri: item.image_url}}
//                           style={(globalStyles.image5, styles.gridImage)}
//                           resizeMode="cover"
//                         />

//                         {/* ❤️ Favorite Button */}
//                         <View
//                           style={{
//                             position: 'absolute',
//                             top: 8,
//                             right: 8,
//                             zIndex: 10,
//                             padding: 4,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() =>
//                               favoriteMutation.mutate({
//                                 id: item.id,
//                                 favorite: !item.favorite,
//                               })
//                             }>
//                             <MaterialIcons
//                               name="favorite"
//                               size={28}
//                               color={
//                                 item.favorite ? 'red' : theme.colors.inputBorder
//                               }
//                             />
//                           </AppleTouchFeedback>
//                         </View>

//                         {/* 🏷️ Name + Subcategory */}
//                         <View style={globalStyles.labelContainer}>
//                           <Text
//                             style={[globalStyles.cardLabel]}
//                             numberOfLines={1}
//                             ellipsizeMode="tail">
//                             {item.name}
//                           </Text>
//                           <Text
//                             style={[globalStyles.cardSubLabel]}
//                             numberOfLines={1}>
//                             {subCategory}
//                           </Text>
//                         </View>

//                         {/* 🪄 Try On Button */}
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             navigate('TryOnOverlay', {
//                               outfit: {
//                                 top: {
//                                   name: item.name,
//                                   imageUri: item.image_url,
//                                 },
//                               },
//                               userPhotoUri: Image.resolveAssetSource(
//                                 require('../assets/images/full-body-temp1.png'),
//                               ).uri,
//                             })
//                           }
//                           style={{
//                             position: 'absolute',
//                             top: 10,
//                             left: 8,
//                             backgroundColor: 'black',
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 8,
//                           }}>
//                           <Text style={styles.tryOnButtonText}>Try On</Text>
//                         </AppleTouchFeedback>
//                       </AppleTouchFeedback>
//                     </View>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       <Animated.View
//         style={{
//           transform: [{translateY: fabBounce}],
//           position: 'absolute',
//           bottom: 24,
//           right: 24,
//         }}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           onPress={() => navigate('AddItem')}
//           style={{
//             width: 52,
//             height: 52,
//             borderRadius: 26,
//             backgroundColor: theme.colors.button1,
//             alignItems: 'center',
//             justifyContent: 'center',
//             borderWidth: theme.borderWidth.hairline,
//             borderColor: theme.colors.secondary,
//           }}>
//           <MaterialIcons
//             name="add"
//             size={28}
//             color={theme.colors.buttonText1}
//           />
//         </AppleTouchFeedback>
//       </Animated.View>

//       {/* Filter Modal */}
//       <Modal visible={showFilter} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowFilter(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <Animated.View
//                 style={[
//                   styles.modalContent,
//                   {
//                     opacity: screenFade,
//                     transform: [
//                       {
//                         scale: screenFade.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: [0.8, 1],
//                         }),
//                       },
//                     ],
//                   },
//                 ]}>
//                 {CATEGORY_META.map(cat => (
//                   <TouchableOpacity
//                     key={cat.value}
//                     onPress={() => {
//                       hSelect();
//                       setSelectedCategory(cat.value as any);
//                       setShowFilter(false);
//                     }}
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       gap: 8,
//                     }}>
//                     <MaterialIcons
//                       name={cat.icon}
//                       size={18}
//                       color={theme.colors.foreground}
//                       style={{marginRight: 8}}
//                     />
//                     <Text style={styles.modalOption}>{cat.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </Animated.View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Sort Modal */}
//       <Modal visible={showSort} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowSort(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <Animated.View
//                 style={[
//                   styles.modalContent,
//                   {
//                     opacity: screenFade,
//                     transform: [
//                       {
//                         scale: screenFade.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: [0.8, 1],
//                         }),
//                       },
//                     ],
//                   },
//                 ]}>
//                 {sortOptions.map(opt => (
//                   <TouchableOpacity
//                     key={opt.value}
//                     onPress={() => {
//                       hSelect();
//                       setSortOption(opt.value as any);
//                       setShowSort(false);
//                     }}>
//                     <Text style={styles.modalOption}>{opt.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </Animated.View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Edit Modal */}
//       {selectedItemToEdit && (
//         <Modal visible={showEditModal} transparent animationType="slide">
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//               }}>
//               <TouchableWithoutFeedback>
//                 <Animated.View
//                   style={[
//                     styles.modalContent,
//                     {
//                       opacity: screenFade,
//                       transform: [
//                         {
//                           scale: screenFade.interpolate({
//                             inputRange: [0, 1],
//                             outputRange: [0.8, 1],
//                           }),
//                         },
//                       ],
//                     },
//                   ]}>
//                   <TextInput
//                     value={editedName}
//                     onChangeText={setEditedName}
//                     placeholder="Name"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />
//                   <TextInput
//                     value={editedColor}
//                     onChangeText={setEditedColor}
//                     placeholder="Color"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />

//                   <AppleTouchFeedback
//                     hapticStyle="impactMedium"
//                     onPress={async () => {
//                       if (selectedItemToEdit) {
//                         await fetch(
//                           `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                           {
//                             method: 'Put',
//                             headers: {'Content-Type': 'application/json'},
//                             body: JSON.stringify({
//                               name: editedName || selectedItemToEdit.name,
//                               color: editedColor || selectedItemToEdit.color,
//                             }),
//                           },
//                         );
//                         queryClient.invalidateQueries({
//                           queryKey: ['wardrobe', userId],
//                         });
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       }
//                     }}
//                     style={[
//                       styles.button,
//                       {
//                         backgroundColor: theme.colors.primary,
//                         marginTop: 12,
//                       },
//                     ]}>
//                     <Text
//                       style={[
//                         styles.buttonText,
//                         {color: theme.colors.background},
//                       ]}>
//                       Save Changes
//                     </Text>
//                   </AppleTouchFeedback>

//                   <AppleTouchFeedback
//                     hapticStyle="impactHeavy"
//                     onPress={() => {
//                       Alert.alert(
//                         'Delete Item',
//                         'Are you sure you want to delete this item?',
//                         [
//                           {text: 'Cancel', style: 'cancel'},
//                           {
//                             text: 'Delete',
//                             style: 'destructive',
//                             onPress: () => {
//                               handleDeleteItem(selectedItemToEdit.id);
//                               setShowEditModal(false);
//                               setSelectedItemToEdit(null);
//                             },
//                           },
//                         ],
//                       );
//                     }}
//                     style={{
//                       backgroundColor: '#cc0000',
//                       padding: 12,
//                       borderRadius: 8,
//                       marginTop: 16,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         textAlign: 'center',
//                         fontWeight: '600',
//                       }}>
//                       Delete Item
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animated.View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       )}
//     </View>
//   );
// }

///////////////////

// import React, {useState, useEffect, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
//   TouchableWithoutFeedback,
//   TextInput,
//   Animated,
//   Easing,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import SwipeableCard from '../components/SwipeableCard/SwipeableCard';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Canonical category list (value matches backend enums), with pretty labels
// // ─────────────────────────────────────────────────────────────────────────────
// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   // canonical value (no space) + friendly label (with space)
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const categoryIcons = Object.fromEntries(
//   CATEGORY_META.filter(c => c.value !== 'All').map(c => [c.value, c.icon]),
// ) as Partial<Record<MainCategory, string>>;

// const labelForCategory = (value: string) =>
//   CATEGORY_META.find(c => c.value === value)?.label ?? value;

// // ─────────────────────────────────────────────────────────────────────────────
// // Layout constants
// // ─────────────────────────────────────────────────────────────────────────────
// const ITEM_MARGIN = 20.8;
// const MIN_ITEM_WIDTH = 160;

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );

//   const [swipeActive, setSwipeActive] = useState(false);
//   const scrollEnabled = !swipeActive; // disable vertical scroll while swiping

//   const userId = useUUID();

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');
//   const [showFilter, setShowFilter] = useState(false);
//   const [showSort, setShowSort] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   // Dramatic animation refs
//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(50)).current;
//   const fabBounce = useRef(new Animated.Value(100)).current;

//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 800,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//       Animated.spring(screenTranslate, {
//         toValue: 0,
//         speed: 2,
//         bounciness: 14,
//         useNativeDriver: true,
//       }),
//     ]).start();

//     Animated.spring(fabBounce, {
//       toValue: 0,
//       delay: 900,
//       speed: 2,
//       bounciness: 14,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       const json = await res.json();
//       console.log('👕 LOOOOOOOK', JSON.stringify(json, null, 2));
//       return json;
//     },
//     enabled: !!userId,
//   });

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {
//         method: 'DELETE',
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Filtering + sorting
//   // ─────────────────────────────────────────────────────────────────────────────
//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   useEffect(() => {
//     const sub = Dimensions.addEventListener('change', ({window}) => {
//       setScreenWidth(window.width);
//     });
//     return () => {
//       // RN modern API returns an object with remove()
//       // @ts-ignore
//       sub?.remove?.();
//     };
//   }, []);

//   const numColumns =
//     Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;
//   const imageSize =
//     (screenWidth - ITEM_MARGIN * (numColumns - 1) - ITEM_MARGIN * 1.5) /
//     numColumns;

//   const handleDeleteItem = (itemId: string) => {
//     deleteMutation.mutate(itemId);
//   };

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );
//       return {prev};
//     },
//     onError: (err, _, context) => {
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     input: {
//       borderWidth: 1,
//       borderRadius: tokens.borderRadius.md,
//       padding: 10,
//       marginBottom: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//       borderColor: theme.colors.inputBorder,
//       backgroundColor: theme.colors.input2,
//     },
//     button: {
//       paddingVertical: 12,
//       borderRadius: tokens.borderRadius.sm,
//       alignItems: 'center',
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     iconButton: {
//       paddingHorizontal: 12,
//       paddingVertical: 7,
//       borderRadius: tokens.borderRadius.sm,
//       backgroundColor: theme.colors.button1,
//       elevation: 2,
//     },
//     gridContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     gridCard: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 0.6,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface,
//       overflow: 'hidden',
//     },
//     gridImage: {
//       height: imageSize,
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     fab: {
//       position: 'absolute',
//       bottom: 24,
//       right: 24,
//       backgroundColor: theme.colors.button1,
//       padding: 16,
//       borderRadius: 32,
//       elevation: 6,
//     },
//     modalContent: {
//       padding: 24,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       width: '90%',
//       maxWidth: 720,
//       alignSelf: 'center',
//     },
//     modalOption: {
//       paddingVertical: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     tryOnButtonText: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '500',
//     },
//   });

//   return (
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,
//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text
//                 style={globalStyles.buttonPrimaryText}
//                 numberOfLines={1}
//                 ellipsizeMode="clip"
//                 adjustsFontSizeToFit={false}>
//                 + Build An Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           <AppleTouchFeedback
//             style={{...styles.iconButton, marginRight: 8}}
//             hapticStyle="impactLight"
//             onPress={() => setShowFilter(true)}>
//             <MaterialIcons name="filter-list" size={32} color={'white'} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={{...styles.iconButton}}
//             hapticStyle="impactLight"
//             onPress={() => setShowSort(true)}>
//             <MaterialIcons name="sort" size={32} color={'white'} />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {!isLoading && wardrobe.length === 0 && (
//         <View
//           style={{
//             flexDirection: 'row',
//             alignSelf: 'center',
//           }}>
//           <Text style={globalStyles.missingDataMessage1}>
//             No wardrobe items found.
//           </Text>
//           <View style={{alignSelf: 'flex-start'}}>
//             <TooltipBubble
//               message="You haven’t uploaded any wardrobe items yet. Tap the “Add Clothes”
//              button below to start adding your personal wardrobe inventory."
//               position="top"
//             />
//           </View>
//         </View>
//       )}

//       <ScrollView scrollEnabled={scrollEnabled}>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Animated.Text
//               style={[
//                 globalStyles.sectionTitle5,
//                 {
//                   transform: [
//                     {
//                       translateY: screenFade.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: [20, 0],
//                       }),
//                     },
//                   ],
//                   opacity: screenFade,
//                 },
//               ]}>
//               {labelForCategory(mainCategory)}
//             </Animated.Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title3]}>{subCategory}</Text>

//                 <View style={[styles.gridContainer]}>
//                   {items.map((item, index) => (
//                     <SwipeableCard
//                       key={item.id}
//                       onSwipeActiveChange={setSwipeActive} // ✅ NEW: disables vertical scroll during swipe
//                       style={{
//                         opacity: screenFade,
//                         transform: [
//                           {
//                             scale: screenFade.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.9, 1],
//                             }),
//                           },
//                           {
//                             translateY: screenFade.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [40, 0],
//                             }),
//                           },
//                         ],
//                         marginBottom: ITEM_MARGIN * 0.6,
//                       }}
//                       // 🧪 Swipe Actions: Safe test mode — no DB mutations
//                       onSwipeLeft={() => {
//                         console.log(
//                           '🗑️ Swipe LEFT (delete) triggered for:',
//                           item.name,
//                         );

//                         // Hold card in place while waiting for confirmation
//                         setSwipeActive(false);

//                         Alert.alert(
//                           'Delete Item',
//                           `Are you sure you want to permanently delete "${item.name}" from your wardrobe? This action cannot be undone.`,
//                           [
//                             {text: 'Cancel', style: 'cancel'},
//                             {
//                               text: 'Delete',
//                               style: 'destructive',
//                               onPress: () => handleDeleteItem(item.id),
//                             },
//                           ],
//                         );
//                       }}>
//                       <AppleTouchFeedback
//                         style={[
//                           styles.gridCard,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                           },
//                         ]}
//                         hapticStyle="impactLight"
//                         onPress={() =>
//                           navigate('ItemDetail', {itemId: item.id, item})
//                         }
//                         onLongPress={() => {
//                           setEditedName(item.name ?? '');
//                           setEditedColor(item.color ?? '');
//                           setSelectedItemToEdit(item);
//                           setShowEditModal(true);
//                         }}>
//                         <Image
//                           source={{uri: item.image_url}}
//                           style={(globalStyles.image5, styles.gridImage)}
//                           resizeMode="cover"
//                         />

//                         <View
//                           style={{
//                             position: 'absolute',
//                             top: 8,
//                             right: 8,
//                             zIndex: 10,
//                             padding: 4,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() =>
//                               favoriteMutation.mutate({
//                                 id: item.id,
//                                 favorite: !item.favorite,
//                               })
//                             }>
//                             <MaterialIcons
//                               name="favorite"
//                               size={28}
//                               color={
//                                 item.favorite ? 'red' : theme.colors.inputBorder
//                               }
//                             />
//                           </AppleTouchFeedback>
//                         </View>

//                         <View style={globalStyles.labelContainer}>
//                           <Text
//                             style={[globalStyles.cardLabel]}
//                             numberOfLines={1}
//                             ellipsizeMode="tail">
//                             {item.name}
//                           </Text>
//                           <Text
//                             style={[globalStyles.cardSubLabel]}
//                             numberOfLines={1}>
//                             {subCategory}
//                           </Text>
//                         </View>

//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             navigate('TryOnOverlay', {
//                               outfit: {
//                                 top: {
//                                   name: item.name,
//                                   imageUri: item.image_url,
//                                 },
//                               },
//                               userPhotoUri: Image.resolveAssetSource(
//                                 require('../assets/images/full-body-temp1.png'),
//                               ).uri,
//                             })
//                           }
//                           style={{
//                             position: 'absolute',
//                             top: 10,
//                             left: 8,
//                             backgroundColor: 'black',
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 8,
//                             transform: [
//                               {
//                                 scale: screenFade.interpolate({
//                                   inputRange: [0, 1],
//                                   outputRange: [0.7, 1],
//                                 }),
//                               },
//                             ],
//                           }}>
//                           <Text style={styles.tryOnButtonText}>Try On</Text>
//                         </AppleTouchFeedback>
//                       </AppleTouchFeedback>
//                     </SwipeableCard>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       <Animated.View
//         style={{
//           transform: [{translateY: fabBounce}],
//           position: 'absolute',
//           bottom: 24,
//           right: 24,
//         }}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           onPress={() => navigate('AddItem')}
//           style={{
//             width: 52,
//             height: 52,
//             borderRadius: 26,
//             backgroundColor: theme.colors.button1,
//             alignItems: 'center',
//             justifyContent: 'center',
//             borderWidth: theme.borderWidth.hairline,
//             borderColor: theme.colors.secondary,
//           }}>
//           <MaterialIcons
//             name="add"
//             size={28}
//             color={theme.colors.buttonText1}
//           />
//         </AppleTouchFeedback>
//       </Animated.View>

//       {/* Filter Modal */}
//       <Modal visible={showFilter} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowFilter(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <Animated.View
//                 style={[
//                   styles.modalContent,
//                   {
//                     opacity: screenFade,
//                     transform: [
//                       {
//                         scale: screenFade.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: [0.8, 1],
//                         }),
//                       },
//                     ],
//                   },
//                 ]}>
//                 {CATEGORY_META.map(cat => (
//                   <TouchableOpacity
//                     key={cat.value}
//                     onPress={() => {
//                       hSelect();
//                       setSelectedCategory(cat.value as any);
//                       setShowFilter(false);
//                     }}
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       gap: 8,
//                     }}>
//                     <MaterialIcons
//                       name={cat.icon}
//                       size={18}
//                       color={theme.colors.foreground}
//                       style={{marginRight: 8}}
//                     />
//                     <Text style={styles.modalOption}>{cat.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </Animated.View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Sort Modal */}
//       <Modal visible={showSort} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowSort(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <Animated.View
//                 style={[
//                   styles.modalContent,
//                   {
//                     opacity: screenFade,
//                     transform: [
//                       {
//                         scale: screenFade.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: [0.8, 1],
//                         }),
//                       },
//                     ],
//                   },
//                 ]}>
//                 {sortOptions.map(opt => (
//                   <TouchableOpacity
//                     key={opt.value}
//                     onPress={() => {
//                       hSelect();
//                       setSortOption(opt.value as any);
//                       setShowSort(false);
//                     }}>
//                     <Text style={styles.modalOption}>{opt.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </Animated.View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Edit Modal */}
//       {selectedItemToEdit && (
//         <Modal visible={showEditModal} transparent animationType="slide">
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//               }}>
//               <TouchableWithoutFeedback>
//                 <Animated.View
//                   style={[
//                     styles.modalContent,
//                     {
//                       opacity: screenFade,
//                       transform: [
//                         {
//                           scale: screenFade.interpolate({
//                             inputRange: [0, 1],
//                             outputRange: [0.8, 1],
//                           }),
//                         },
//                       ],
//                     },
//                   ]}>
//                   <TextInput
//                     value={editedName}
//                     onChangeText={setEditedName}
//                     placeholder="Name"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />
//                   <TextInput
//                     value={editedColor}
//                     onChangeText={setEditedColor}
//                     placeholder="Color"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />

//                   <AppleTouchFeedback
//                     hapticStyle="impactMedium"
//                     onPress={async () => {
//                       if (selectedItemToEdit) {
//                         await fetch(
//                           `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                           {
//                             method: 'Put',
//                             headers: {'Content-Type': 'application/json'},
//                             body: JSON.stringify({
//                               name: editedName || selectedItemToEdit.name,
//                               color: editedColor || selectedItemToEdit.color,
//                             }),
//                           },
//                         );
//                         queryClient.invalidateQueries({
//                           queryKey: ['wardrobe', userId],
//                         });
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       }
//                     }}
//                     style={[
//                       styles.button,
//                       {
//                         backgroundColor: theme.colors.primary,
//                         marginTop: 12,
//                       },
//                     ]}>
//                     <Text
//                       style={[
//                         styles.buttonText,
//                         {color: theme.colors.background},
//                       ]}>
//                       Save Changes
//                     </Text>
//                   </AppleTouchFeedback>

//                   <AppleTouchFeedback
//                     hapticStyle="impactHeavy"
//                     onPress={() => {
//                       Alert.alert(
//                         'Delete Item',
//                         'Are you sure you want to delete this item?',
//                         [
//                           {text: 'Cancel', style: 'cancel'},
//                           {
//                             text: 'Delete',
//                             style: 'destructive',
//                             onPress: () => {
//                               handleDeleteItem(selectedItemToEdit.id);
//                               setShowEditModal(false);
//                               setSelectedItemToEdit(null);
//                             },
//                           },
//                         ],
//                       );
//                     }}
//                     style={{
//                       backgroundColor: '#cc0000',
//                       padding: 12,
//                       borderRadius: 8,
//                       marginTop: 16,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         textAlign: 'center',
//                         fontWeight: '600',
//                       }}>
//                       Delete Item
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animated.View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       )}
//     </View>
//   );
// }

//////////////////////

// import React, {useState, useEffect, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
//   TouchableWithoutFeedback,
//   TextInput,
//   Animated,
//   Easing,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import SwipeableCard from '../components/SwipeableCard/SwipeableCard';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Canonical category list (value matches backend enums), with pretty labels
// // ─────────────────────────────────────────────────────────────────────────────
// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   // canonical value (no space) + friendly label (with space)
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const categoryIcons = Object.fromEntries(
//   CATEGORY_META.filter(c => c.value !== 'All').map(c => [c.value, c.icon]),
// ) as Partial<Record<MainCategory, string>>;

// const labelForCategory = (value: string) =>
//   CATEGORY_META.find(c => c.value === value)?.label ?? value;

// // ─────────────────────────────────────────────────────────────────────────────
// // Layout constants
// // ─────────────────────────────────────────────────────────────────────────────
// const ITEM_MARGIN = 20.8;
// const MIN_ITEM_WIDTH = 160;

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );

//   const [swipeActive, setSwipeActive] = useState(false);
//   const scrollEnabled = !swipeActive; // disable vertical scroll while swiping

//   const userId = useUUID();

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');
//   const [showFilter, setShowFilter] = useState(false);
//   const [showSort, setShowSort] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   // Dramatic animation refs
//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(50)).current;
//   const fabBounce = useRef(new Animated.Value(100)).current;

//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 800,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//       Animated.spring(screenTranslate, {
//         toValue: 0,
//         speed: 2,
//         bounciness: 14,
//         useNativeDriver: true,
//       }),
//     ]).start();

//     Animated.spring(fabBounce, {
//       toValue: 0,
//       delay: 900,
//       speed: 2,
//       bounciness: 14,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       const json = await res.json();
//       console.log('👕 LOOOOOOOK', JSON.stringify(json, null, 2));
//       return json;
//     },
//     enabled: !!userId,
//   });

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {
//         method: 'DELETE',
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Filtering + sorting
//   // ─────────────────────────────────────────────────────────────────────────────
//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   useEffect(() => {
//     const sub = Dimensions.addEventListener('change', ({window}) => {
//       setScreenWidth(window.width);
//     });
//     return () => {
//       // RN modern API returns an object with remove()
//       // @ts-ignore
//       sub?.remove?.();
//     };
//   }, []);

//   const numColumns =
//     Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;
//   const imageSize =
//     (screenWidth - ITEM_MARGIN * (numColumns - 1) - ITEM_MARGIN * 1.5) /
//     numColumns;

//   const handleDeleteItem = (itemId: string) => {
//     deleteMutation.mutate(itemId);
//   };

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );
//       return {prev};
//     },
//     onError: (err, _, context) => {
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     input: {
//       borderWidth: 1,
//       borderRadius: tokens.borderRadius.md,
//       padding: 10,
//       marginBottom: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//       borderColor: theme.colors.inputBorder,
//       backgroundColor: theme.colors.input2,
//     },
//     button: {
//       paddingVertical: 12,
//       borderRadius: tokens.borderRadius.sm,
//       alignItems: 'center',
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     iconButton: {
//       paddingHorizontal: 12,
//       paddingVertical: 7,
//       borderRadius: tokens.borderRadius.sm,
//       backgroundColor: theme.colors.button1,
//       elevation: 2,
//     },
//     gridContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     gridCard: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 0.6,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface,
//       overflow: 'hidden',
//     },
//     gridImage: {
//       height: imageSize,
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     fab: {
//       position: 'absolute',
//       bottom: 24,
//       right: 24,
//       backgroundColor: theme.colors.button1,
//       padding: 16,
//       borderRadius: 32,
//       elevation: 6,
//     },
//     modalContent: {
//       padding: 24,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       width: '90%',
//       maxWidth: 720,
//       alignSelf: 'center',
//     },
//     modalOption: {
//       paddingVertical: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     tryOnButtonText: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '500',
//     },
//   });

//   return (
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,
//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text
//                 style={globalStyles.buttonPrimaryText}
//                 numberOfLines={1}
//                 ellipsizeMode="clip"
//                 adjustsFontSizeToFit={false}>
//                 + Build An Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           <AppleTouchFeedback
//             style={{...styles.iconButton, marginRight: 8}}
//             hapticStyle="impactLight"
//             onPress={() => setShowFilter(true)}>
//             <MaterialIcons name="filter-list" size={32} color={'white'} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={{...styles.iconButton}}
//             hapticStyle="impactLight"
//             onPress={() => setShowSort(true)}>
//             <MaterialIcons name="sort" size={32} color={'white'} />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {!isLoading && wardrobe.length === 0 && (
//         <View
//           style={{
//             flexDirection: 'row',
//             alignSelf: 'center',
//           }}>
//           <Text style={globalStyles.missingDataMessage1}>
//             No wardrobe items found.
//           </Text>
//           <View style={{alignSelf: 'flex-start'}}>
//             <TooltipBubble
//               message="You haven’t uploaded any wardrobe items yet. Tap the “Add Clothes”
//              button below to start adding your personal wardrobe inventory."
//               position="top"
//             />
//           </View>
//         </View>
//       )}

//       <ScrollView scrollEnabled={scrollEnabled}>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Animated.Text
//               style={[
//                 globalStyles.sectionTitle5,
//                 {
//                   transform: [
//                     {
//                       translateY: screenFade.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: [20, 0],
//                       }),
//                     },
//                   ],
//                   opacity: screenFade,
//                 },
//               ]}>
//               {labelForCategory(mainCategory)}
//             </Animated.Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title3]}>{subCategory}</Text>

//                 <View style={[styles.gridContainer]}>
//                   {items.map((item, index) => (
//                     <SwipeableCard
//                       key={item.id}
//                       onSwipeActiveChange={setSwipeActive} // ✅ NEW: disables vertical scroll during swipe
//                       style={{
//                         opacity: screenFade,
//                         transform: [
//                           {
//                             scale: screenFade.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.9, 1],
//                             }),
//                           },
//                           {
//                             translateY: screenFade.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [40, 0],
//                             }),
//                           },
//                         ],
//                         marginBottom: ITEM_MARGIN * 0.6,
//                       }}
//                       // 🧪 Swipe Actions: Safe test mode — no DB mutations
//                       onSwipeLeft={() => {
//                         console.log(
//                           '🗑️ Swipe LEFT (delete) triggered for:',
//                           item.name,
//                         );

//                         // Hold card in place while waiting for confirmation
//                         setSwipeActive(false);

//                         Alert.alert(
//                           'Delete Item',
//                           `Are you sure you want to permanently delete "${item.name}" from your wardrobe? This action cannot be undone.`,
//                           [
//                             {text: 'Cancel', style: 'cancel'},
//                             {
//                               text: 'Delete',
//                               style: 'destructive',
//                               onPress: () => handleDeleteItem(item.id),
//                             },
//                           ],
//                         );
//                       }}>
//                       <AppleTouchFeedback
//                         style={[
//                           styles.gridCard,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                           },
//                         ]}
//                         hapticStyle="impactLight"
//                         onPress={() =>
//                           navigate('ItemDetail', {itemId: item.id, item})
//                         }
//                         onLongPress={() => {
//                           setEditedName(item.name ?? '');
//                           setEditedColor(item.color ?? '');
//                           setSelectedItemToEdit(item);
//                           setShowEditModal(true);
//                         }}>
//                         <Image
//                           source={{uri: item.image_url}}
//                           style={(globalStyles.image5, styles.gridImage)}
//                           resizeMode="cover"
//                         />

//                         <View
//                           style={{
//                             position: 'absolute',
//                             top: 8,
//                             right: 8,
//                             zIndex: 10,
//                             padding: 4,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() =>
//                               favoriteMutation.mutate({
//                                 id: item.id,
//                                 favorite: !item.favorite,
//                               })
//                             }>
//                             <MaterialIcons
//                               name="favorite"
//                               size={28}
//                               color={
//                                 item.favorite ? 'red' : theme.colors.inputBorder
//                               }
//                             />
//                           </AppleTouchFeedback>
//                         </View>

//                         <View style={globalStyles.labelContainer}>
//                           <Text
//                             style={[globalStyles.cardLabel]}
//                             numberOfLines={1}
//                             ellipsizeMode="tail">
//                             {item.name}
//                           </Text>
//                           <Text
//                             style={[globalStyles.cardSubLabel]}
//                             numberOfLines={1}>
//                             {subCategory}
//                           </Text>
//                         </View>

//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             navigate('TryOnOverlay', {
//                               outfit: {
//                                 top: {
//                                   name: item.name,
//                                   imageUri: item.image_url,
//                                 },
//                               },
//                               userPhotoUri: Image.resolveAssetSource(
//                                 require('../assets/images/full-body-temp1.png'),
//                               ).uri,
//                             })
//                           }
//                           style={{
//                             position: 'absolute',
//                             top: 10,
//                             left: 8,
//                             backgroundColor: 'black',
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 8,
//                             transform: [
//                               {
//                                 scale: screenFade.interpolate({
//                                   inputRange: [0, 1],
//                                   outputRange: [0.7, 1],
//                                 }),
//                               },
//                             ],
//                           }}>
//                           <Text style={styles.tryOnButtonText}>Try On</Text>
//                         </AppleTouchFeedback>
//                       </AppleTouchFeedback>
//                     </SwipeableCard>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       <Animated.View
//         style={{
//           transform: [{translateY: fabBounce}],
//           position: 'absolute',
//           bottom: 24,
//           right: 24,
//         }}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {...styles.fab, marginRight: 16, width: 130},
//           ]}
//           onPress={() => navigate('AddItem')}>
//           <Text
//             style={{
//               color: theme.colors.buttonText1,
//               // fontSize: 16,
//               fontWeight: '600',
//             }}>
//             Add Clothes +
//           </Text>
//         </AppleTouchFeedback>
//       </Animated.View>

//       {/* Filter Modal */}
//       <Modal visible={showFilter} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowFilter(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <Animated.View
//                 style={[
//                   styles.modalContent,
//                   {
//                     opacity: screenFade,
//                     transform: [
//                       {
//                         scale: screenFade.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: [0.8, 1],
//                         }),
//                       },
//                     ],
//                   },
//                 ]}>
//                 {CATEGORY_META.map(cat => (
//                   <TouchableOpacity
//                     key={cat.value}
//                     onPress={() => {
//                       hSelect();
//                       setSelectedCategory(cat.value as any);
//                       setShowFilter(false);
//                     }}
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       gap: 8,
//                     }}>
//                     <MaterialIcons
//                       name={cat.icon}
//                       size={18}
//                       color={theme.colors.foreground}
//                       style={{marginRight: 8}}
//                     />
//                     <Text style={styles.modalOption}>{cat.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </Animated.View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Sort Modal */}
//       <Modal visible={showSort} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowSort(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <Animated.View
//                 style={[
//                   styles.modalContent,
//                   {
//                     opacity: screenFade,
//                     transform: [
//                       {
//                         scale: screenFade.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: [0.8, 1],
//                         }),
//                       },
//                     ],
//                   },
//                 ]}>
//                 {sortOptions.map(opt => (
//                   <TouchableOpacity
//                     key={opt.value}
//                     onPress={() => {
//                       hSelect();
//                       setSortOption(opt.value as any);
//                       setShowSort(false);
//                     }}>
//                     <Text style={styles.modalOption}>{opt.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </Animated.View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Edit Modal */}
//       {selectedItemToEdit && (
//         <Modal visible={showEditModal} transparent animationType="slide">
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//               }}>
//               <TouchableWithoutFeedback>
//                 <Animated.View
//                   style={[
//                     styles.modalContent,
//                     {
//                       opacity: screenFade,
//                       transform: [
//                         {
//                           scale: screenFade.interpolate({
//                             inputRange: [0, 1],
//                             outputRange: [0.8, 1],
//                           }),
//                         },
//                       ],
//                     },
//                   ]}>
//                   <TextInput
//                     value={editedName}
//                     onChangeText={setEditedName}
//                     placeholder="Name"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />
//                   <TextInput
//                     value={editedColor}
//                     onChangeText={setEditedColor}
//                     placeholder="Color"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />

//                   <AppleTouchFeedback
//                     hapticStyle="impactMedium"
//                     onPress={async () => {
//                       if (selectedItemToEdit) {
//                         await fetch(
//                           `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                           {
//                             method: 'Put',
//                             headers: {'Content-Type': 'application/json'},
//                             body: JSON.stringify({
//                               name: editedName || selectedItemToEdit.name,
//                               color: editedColor || selectedItemToEdit.color,
//                             }),
//                           },
//                         );
//                         queryClient.invalidateQueries({
//                           queryKey: ['wardrobe', userId],
//                         });
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       }
//                     }}
//                     style={[
//                       styles.button,
//                       {
//                         backgroundColor: theme.colors.primary,
//                         marginTop: 12,
//                       },
//                     ]}>
//                     <Text
//                       style={[
//                         styles.buttonText,
//                         {color: theme.colors.background},
//                       ]}>
//                       Save Changes
//                     </Text>
//                   </AppleTouchFeedback>

//                   <AppleTouchFeedback
//                     hapticStyle="impactHeavy"
//                     onPress={() => {
//                       Alert.alert(
//                         'Delete Item',
//                         'Are you sure you want to delete this item?',
//                         [
//                           {text: 'Cancel', style: 'cancel'},
//                           {
//                             text: 'Delete',
//                             style: 'destructive',
//                             onPress: () => {
//                               handleDeleteItem(selectedItemToEdit.id);
//                               setShowEditModal(false);
//                               setSelectedItemToEdit(null);
//                             },
//                           },
//                         ],
//                       );
//                     }}
//                     style={{
//                       backgroundColor: '#cc0000',
//                       padding: 12,
//                       borderRadius: 8,
//                       marginTop: 16,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         textAlign: 'center',
//                         fontWeight: '600',
//                       }}>
//                       Delete Item
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animated.View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       )}
//     </View>
//   );
// }

////////////

// import React, {useState, useEffect, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
//   TouchableWithoutFeedback,
//   TextInput,
//   Animated,
//   Easing,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Canonical category list (value matches backend enums), with pretty labels
// // ─────────────────────────────────────────────────────────────────────────────
// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   // canonical value (no space) + friendly label (with space)
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const categoryIcons = Object.fromEntries(
//   CATEGORY_META.filter(c => c.value !== 'All').map(c => [c.value, c.icon]),
// ) as Partial<Record<MainCategory, string>>;

// const labelForCategory = (value: string) =>
//   CATEGORY_META.find(c => c.value === value)?.label ?? value;

// // ─────────────────────────────────────────────────────────────────────────────
// // Layout constants
// // ─────────────────────────────────────────────────────────────────────────────
// const ITEM_MARGIN = 20.8;
// const MIN_ITEM_WIDTH = 160;

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );

//   const userId = useUUID();

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');
//   const [showFilter, setShowFilter] = useState(false);
//   const [showSort, setShowSort] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   // Dramatic animation refs
//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(50)).current;
//   const fabBounce = useRef(new Animated.Value(100)).current;

//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 800,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//       Animated.spring(screenTranslate, {
//         toValue: 0,
//         speed: 2,
//         bounciness: 14,
//         useNativeDriver: true,
//       }),
//     ]).start();

//     Animated.spring(fabBounce, {
//       toValue: 0,
//       delay: 900,
//       speed: 2,
//       bounciness: 14,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       const json = await res.json();
//       console.log('👕 LOOOOOOOK', JSON.stringify(json, null, 2));
//       return json;
//     },
//     enabled: !!userId,
//   });

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {
//         method: 'DELETE',
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Filtering + sorting
//   // ─────────────────────────────────────────────────────────────────────────────
//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   useEffect(() => {
//     const sub = Dimensions.addEventListener('change', ({window}) => {
//       setScreenWidth(window.width);
//     });
//     return () => {
//       // RN modern API returns an object with remove()
//       // @ts-ignore
//       sub?.remove?.();
//     };
//   }, []);

//   const numColumns =
//     Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;
//   const imageSize =
//     (screenWidth - ITEM_MARGIN * (numColumns - 1) - ITEM_MARGIN * 1.5) /
//     numColumns;

//   const handleDeleteItem = (itemId: string) => {
//     deleteMutation.mutate(itemId);
//   };

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );
//       return {prev};
//     },
//     onError: (err, _, context) => {
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     input: {
//       borderWidth: 1,
//       borderRadius: tokens.borderRadius.md,
//       padding: 10,
//       marginBottom: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//       borderColor: theme.colors.inputBorder,
//       backgroundColor: theme.colors.input2,
//     },
//     button: {
//       paddingVertical: 12,
//       borderRadius: tokens.borderRadius.sm,
//       alignItems: 'center',
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     iconButton: {
//       paddingHorizontal: 12,
//       paddingVertical: 7,
//       borderRadius: tokens.borderRadius.sm,
//       backgroundColor: theme.colors.button1,
//       elevation: 2,
//     },
//     gridContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     gridCard: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 0.6,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface,
//       overflow: 'hidden',
//     },
//     gridImage: {
//       height: imageSize,
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     fab: {
//       position: 'absolute',
//       bottom: 24,
//       right: 24,
//       backgroundColor: theme.colors.button1,
//       padding: 16,
//       borderRadius: 32,
//       elevation: 6,
//     },
//     modalContent: {
//       padding: 24,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       width: '90%',
//       maxWidth: 720,
//       alignSelf: 'center',
//     },
//     modalOption: {
//       paddingVertical: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     tryOnButtonText: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '500',
//     },
//   });

//   return (
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,
//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text
//                 style={globalStyles.buttonPrimaryText}
//                 numberOfLines={1}
//                 ellipsizeMode="clip"
//                 adjustsFontSizeToFit={false}>
//                 + Build An Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           <AppleTouchFeedback
//             style={{...styles.iconButton, marginRight: 8}}
//             hapticStyle="impactLight"
//             onPress={() => setShowFilter(true)}>
//             <MaterialIcons name="filter-list" size={32} color={'white'} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={{...styles.iconButton}}
//             hapticStyle="impactLight"
//             onPress={() => setShowSort(true)}>
//             <MaterialIcons name="sort" size={32} color={'white'} />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {!isLoading && wardrobe.length === 0 && (
//         <View
//           style={{
//             flexDirection: 'row',
//             alignSelf: 'center',
//           }}>
//           <Text style={globalStyles.missingDataMessage1}>
//             No wardrobe items found.
//           </Text>
//           <View style={{alignSelf: 'flex-start'}}>
//             <TooltipBubble
//               message="You haven’t uploaded any wardrobe items yet. Tap the “Add Clothes”
//              button below to start adding your personal wardrobe inventory."
//               position="top"
//             />
//           </View>
//         </View>
//       )}

//       <ScrollView>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Animated.Text
//               style={[
//                 globalStyles.sectionTitle5,
//                 {
//                   transform: [
//                     {
//                       translateY: screenFade.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: [20, 0],
//                       }),
//                     },
//                   ],
//                   opacity: screenFade,
//                 },
//               ]}>
//               {labelForCategory(mainCategory)}
//             </Animated.Text>
//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title3]}>{subCategory}</Text>

//                 <View style={[styles.gridContainer]}>
//                   {items.map((item, index) => (
//                     <Animated.View
//                       key={item.id}
//                       style={{
//                         opacity: screenFade,
//                         transform: [
//                           {
//                             scale: screenFade.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.9, 1],
//                             }),
//                           },
//                           {
//                             translateY: screenFade.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [40, 0],
//                             }),
//                           },
//                         ],
//                       }}>
//                       <AppleTouchFeedback
//                         style={[
//                           styles.gridCard,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                           },
//                         ]}
//                         hapticStyle="impactLight"
//                         onPress={() =>
//                           navigate('ItemDetail', {itemId: item.id, item})
//                         }
//                         onLongPress={() => {
//                           setEditedName(item.name ?? '');
//                           setEditedColor(item.color ?? '');
//                           setSelectedItemToEdit(item);
//                           setShowEditModal(true);
//                         }}>
//                         <Image
//                           source={{uri: item.image_url}}
//                           style={(globalStyles.image5, styles.gridImage)}
//                           resizeMode="cover"
//                         />

//                         <View
//                           style={{
//                             position: 'absolute',
//                             top: 8,
//                             right: 8,
//                             zIndex: 10,
//                             padding: 4,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() =>
//                               favoriteMutation.mutate({
//                                 id: item.id,
//                                 favorite: !item.favorite,
//                               })
//                             }>
//                             <MaterialIcons
//                               name="favorite"
//                               size={28}
//                               color={
//                                 item.favorite ? 'red' : theme.colors.inputBorder
//                               }
//                             />
//                           </AppleTouchFeedback>
//                         </View>

//                         <View style={globalStyles.labelContainer}>
//                           <Text
//                             style={[globalStyles.cardLabel]}
//                             numberOfLines={1}
//                             ellipsizeMode="tail">
//                             {item.name}
//                           </Text>
//                           <Text
//                             style={[globalStyles.cardSubLabel]}
//                             numberOfLines={1}>
//                             {subCategory}
//                           </Text>
//                         </View>

//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             navigate('TryOnOverlay', {
//                               outfit: {
//                                 top: {
//                                   name: item.name,
//                                   imageUri: item.image_url,
//                                 },
//                               },
//                               userPhotoUri: Image.resolveAssetSource(
//                                 require('../assets/images/full-body-temp1.png'),
//                               ).uri,
//                             })
//                           }
//                           style={{
//                             position: 'absolute',
//                             top: 10,
//                             left: 8,
//                             backgroundColor: 'black',
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 8,
//                             transform: [
//                               {
//                                 scale: screenFade.interpolate({
//                                   inputRange: [0, 1],
//                                   outputRange: [0.7, 1],
//                                 }),
//                               },
//                             ],
//                           }}>
//                           <Text style={styles.tryOnButtonText}>Try On</Text>
//                         </AppleTouchFeedback>
//                       </AppleTouchFeedback>
//                     </Animated.View>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       <Animated.View
//         style={{
//           transform: [{translateY: fabBounce}],
//           position: 'absolute',
//           bottom: 24,
//           right: 24,
//         }}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {...styles.fab, marginRight: 16, width: 130},
//           ]}
//           onPress={() => navigate('AddItem')}>
//           <Text
//             style={{
//               color: theme.colors.buttonText1,
//               // fontSize: 16,
//               fontWeight: '600',
//             }}>
//             Add Clothes +
//           </Text>
//         </AppleTouchFeedback>
//       </Animated.View>

//       {/* Filter Modal */}
//       <Modal visible={showFilter} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowFilter(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <Animated.View
//                 style={[
//                   styles.modalContent,
//                   {
//                     opacity: screenFade,
//                     transform: [
//                       {
//                         scale: screenFade.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: [0.8, 1],
//                         }),
//                       },
//                     ],
//                   },
//                 ]}>
//                 {CATEGORY_META.map(cat => (
//                   <TouchableOpacity
//                     key={cat.value}
//                     onPress={() => {
//                       hSelect();
//                       setSelectedCategory(cat.value as any);
//                       setShowFilter(false);
//                     }}
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       gap: 8,
//                     }}>
//                     <MaterialIcons
//                       name={cat.icon}
//                       size={18}
//                       color={theme.colors.foreground}
//                       style={{marginRight: 8}}
//                     />
//                     <Text style={styles.modalOption}>{cat.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </Animated.View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Sort Modal */}
//       <Modal visible={showSort} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowSort(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <Animated.View
//                 style={[
//                   styles.modalContent,
//                   {
//                     opacity: screenFade,
//                     transform: [
//                       {
//                         scale: screenFade.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: [0.8, 1],
//                         }),
//                       },
//                     ],
//                   },
//                 ]}>
//                 {sortOptions.map(opt => (
//                   <TouchableOpacity
//                     key={opt.value}
//                     onPress={() => {
//                       hSelect();
//                       setSortOption(opt.value as any);
//                       setShowSort(false);
//                     }}>
//                     <Text style={styles.modalOption}>{opt.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </Animated.View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Edit Modal */}
//       {selectedItemToEdit && (
//         <Modal visible={showEditModal} transparent animationType="slide">
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//               }}>
//               <TouchableWithoutFeedback>
//                 <Animated.View
//                   style={[
//                     styles.modalContent,
//                     {
//                       opacity: screenFade,
//                       transform: [
//                         {
//                           scale: screenFade.interpolate({
//                             inputRange: [0, 1],
//                             outputRange: [0.8, 1],
//                           }),
//                         },
//                       ],
//                     },
//                   ]}>
//                   <TextInput
//                     value={editedName}
//                     onChangeText={setEditedName}
//                     placeholder="Name"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />
//                   <TextInput
//                     value={editedColor}
//                     onChangeText={setEditedColor}
//                     placeholder="Color"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />

//                   <AppleTouchFeedback
//                     hapticStyle="impactMedium"
//                     onPress={async () => {
//                       if (selectedItemToEdit) {
//                         await fetch(
//                           `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                           {
//                             method: 'Put',
//                             headers: {'Content-Type': 'application/json'},
//                             body: JSON.stringify({
//                               name: editedName || selectedItemToEdit.name,
//                               color: editedColor || selectedItemToEdit.color,
//                             }),
//                           },
//                         );
//                         queryClient.invalidateQueries({
//                           queryKey: ['wardrobe', userId],
//                         });
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       }
//                     }}
//                     style={[
//                       styles.button,
//                       {
//                         backgroundColor: theme.colors.primary,
//                         marginTop: 12,
//                       },
//                     ]}>
//                     <Text
//                       style={[
//                         styles.buttonText,
//                         {color: theme.colors.background},
//                       ]}>
//                       Save Changes
//                     </Text>
//                   </AppleTouchFeedback>

//                   <AppleTouchFeedback
//                     hapticStyle="impactHeavy"
//                     onPress={() => {
//                       Alert.alert(
//                         'Delete Item',
//                         'Are you sure you want to delete this item?',
//                         [
//                           {text: 'Cancel', style: 'cancel'},
//                           {
//                             text: 'Delete',
//                             style: 'destructive',
//                             onPress: () => {
//                               handleDeleteItem(selectedItemToEdit.id);
//                               setShowEditModal(false);
//                               setSelectedItemToEdit(null);
//                             },
//                           },
//                         ],
//                       );
//                     }}
//                     style={{
//                       backgroundColor: '#cc0000',
//                       padding: 12,
//                       borderRadius: 8,
//                       marginTop: 16,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         textAlign: 'center',
//                         fontWeight: '600',
//                       }}>
//                       Delete Item
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animated.View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       )}
//     </View>
//   );
// }

///////////////////

// import React, {useState, useEffect, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
//   TouchableWithoutFeedback,
//   TextInput,
//   Animated,
//   Easing,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Canonical category list (value matches backend enums), with pretty labels
// // ─────────────────────────────────────────────────────────────────────────────
// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   // canonical value (no space) + friendly label (with space)
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const categoryIcons = Object.fromEntries(
//   CATEGORY_META.filter(c => c.value !== 'All').map(c => [c.value, c.icon]),
// ) as Partial<Record<MainCategory, string>>;

// const labelForCategory = (value: string) =>
//   CATEGORY_META.find(c => c.value === value)?.label ?? value;

// // ─────────────────────────────────────────────────────────────────────────────
// // Layout constants
// // ─────────────────────────────────────────────────────────────────────────────
// const ITEM_MARGIN = 20.8;
// const MIN_ITEM_WIDTH = 160;

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );

//   const userId = useUUID();

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');
//   const [showFilter, setShowFilter] = useState(false);
//   const [showSort, setShowSort] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   // Dramatic animation refs
//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(50)).current;
//   const fabBounce = useRef(new Animated.Value(100)).current;

//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 800,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//       Animated.spring(screenTranslate, {
//         toValue: 0,
//         speed: 2,
//         bounciness: 14,
//         useNativeDriver: true,
//       }),
//     ]).start();

//     Animated.spring(fabBounce, {
//       toValue: 0,
//       delay: 900,
//       speed: 2,
//       bounciness: 14,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       const json = await res.json();
//       console.log('👕 LOOOOOOOK', JSON.stringify(json, null, 2));
//       return json;
//     },
//     enabled: !!userId,
//   });

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {
//         method: 'DELETE',
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Filtering + sorting
//   // ─────────────────────────────────────────────────────────────────────────────
//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   useEffect(() => {
//     const sub = Dimensions.addEventListener('change', ({window}) => {
//       setScreenWidth(window.width);
//     });
//     return () => {
//       // RN modern API returns an object with remove()
//       // @ts-ignore
//       sub?.remove?.();
//     };
//   }, []);

//   const numColumns =
//     Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;
//   const imageSize =
//     (screenWidth - ITEM_MARGIN * (numColumns - 1) - ITEM_MARGIN * 1.5) /
//     numColumns;

//   const handleDeleteItem = (itemId: string) => {
//     deleteMutation.mutate(itemId);
//   };

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );
//       return {prev};
//     },
//     onError: (err, _, context) => {
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     input: {
//       borderWidth: 1,
//       borderRadius: tokens.borderRadius.md,
//       padding: 10,
//       marginBottom: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//       borderColor: theme.colors.inputBorder,
//       backgroundColor: theme.colors.input2,
//     },
//     button: {
//       paddingVertical: 12,
//       borderRadius: tokens.borderRadius.sm,
//       alignItems: 'center',
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     iconButton: {
//       paddingHorizontal: 12,
//       paddingVertical: 7,
//       borderRadius: tokens.borderRadius.sm,
//       backgroundColor: theme.colors.button1,
//       elevation: 2,
//     },
//     gridContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     gridCard: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 0.6,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface,
//       overflow: 'hidden',
//     },
//     gridImage: {
//       height: imageSize,
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     fab: {
//       position: 'absolute',
//       bottom: 24,
//       right: 24,
//       backgroundColor: theme.colors.button1,
//       padding: 16,
//       borderRadius: 32,
//       elevation: 6,
//     },
//     modalContent: {
//       padding: 24,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       width: '90%',
//       maxWidth: 720,
//       alignSelf: 'center',
//     },
//     modalOption: {
//       paddingVertical: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     tryOnButtonText: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '500',
//     },
//   });

//   return (
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,
//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text
//                 style={globalStyles.buttonPrimaryText}
//                 numberOfLines={1}
//                 ellipsizeMode="clip"
//                 adjustsFontSizeToFit={false}>
//                 + Build An Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           <AppleTouchFeedback
//             style={{...styles.iconButton, marginRight: 8}}
//             hapticStyle="impactLight"
//             onPress={() => setShowFilter(true)}>
//             <MaterialIcons name="filter-list" size={32} color={'white'} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={{...styles.iconButton}}
//             hapticStyle="impactLight"
//             onPress={() => setShowSort(true)}>
//             <MaterialIcons name="sort" size={32} color={'white'} />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       <ScrollView>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Animated.Text
//               style={[
//                 globalStyles.sectionTitle5,
//                 {
//                   transform: [
//                     {
//                       translateY: screenFade.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: [20, 0],
//                       }),
//                     },
//                   ],
//                   opacity: screenFade,
//                 },
//               ]}>
//               {labelForCategory(mainCategory)}
//             </Animated.Text>
//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title3]}>{subCategory}</Text>

//                 <View style={[styles.gridContainer]}>
//                   {items.map((item, index) => (
//                     <Animated.View
//                       key={item.id}
//                       style={{
//                         opacity: screenFade,
//                         transform: [
//                           {
//                             scale: screenFade.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [0.9, 1],
//                             }),
//                           },
//                           {
//                             translateY: screenFade.interpolate({
//                               inputRange: [0, 1],
//                               outputRange: [40, 0],
//                             }),
//                           },
//                         ],
//                       }}>
//                       <AppleTouchFeedback
//                         style={[
//                           styles.gridCard,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                           },
//                         ]}
//                         hapticStyle="impactLight"
//                         onPress={() =>
//                           navigate('ItemDetail', {itemId: item.id, item})
//                         }
//                         onLongPress={() => {
//                           setEditedName(item.name ?? '');
//                           setEditedColor(item.color ?? '');
//                           setSelectedItemToEdit(item);
//                           setShowEditModal(true);
//                         }}>
//                         <Image
//                           source={{uri: item.image_url}}
//                           style={(globalStyles.image5, styles.gridImage)}
//                           resizeMode="cover"
//                         />

//                         <View
//                           style={{
//                             position: 'absolute',
//                             top: 8,
//                             right: 8,
//                             zIndex: 10,
//                             padding: 4,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() =>
//                               favoriteMutation.mutate({
//                                 id: item.id,
//                                 favorite: !item.favorite,
//                               })
//                             }>
//                             <MaterialIcons
//                               name="favorite"
//                               size={32}
//                               color={
//                                 item.favorite ? 'red' : theme.colors.inputBorder
//                               }
//                             />
//                           </AppleTouchFeedback>
//                         </View>

//                         <View style={globalStyles.labelContainer}>
//                           <Text
//                             style={[globalStyles.cardLabel]}
//                             numberOfLines={1}
//                             ellipsizeMode="tail">
//                             {item.name}
//                           </Text>
//                           <Text
//                             style={[globalStyles.cardSubLabel]}
//                             numberOfLines={1}>
//                             {subCategory}
//                           </Text>
//                         </View>

//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             navigate('TryOnOverlay', {
//                               outfit: {
//                                 top: {
//                                   name: item.name,
//                                   imageUri: item.image_url,
//                                 },
//                               },
//                               userPhotoUri: Image.resolveAssetSource(
//                                 require('../assets/images/full-body-temp1.png'),
//                               ).uri,
//                             })
//                           }
//                           style={{
//                             position: 'absolute',
//                             top: 10,
//                             left: 8,
//                             backgroundColor: 'black',
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 8,
//                             transform: [
//                               {
//                                 scale: screenFade.interpolate({
//                                   inputRange: [0, 1],
//                                   outputRange: [0.7, 1],
//                                 }),
//                               },
//                             ],
//                           }}>
//                           <Text style={styles.tryOnButtonText}>Try On</Text>
//                         </AppleTouchFeedback>
//                       </AppleTouchFeedback>
//                     </Animated.View>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       <Animated.View
//         style={{
//           transform: [{translateY: fabBounce}],
//           position: 'absolute',
//           bottom: 24,
//           right: 24,
//         }}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {...styles.fab, marginRight: 16, width: 130},
//           ]}
//           onPress={() => navigate('AddItem')}>
//           <Text style={{color: theme.colors.buttonText1, fontWeight: '600'}}>
//             Add Clothes +
//           </Text>
//         </AppleTouchFeedback>
//       </Animated.View>

//       {/* Filter Modal */}
//       <Modal visible={showFilter} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowFilter(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <Animated.View
//                 style={[
//                   styles.modalContent,
//                   {
//                     opacity: screenFade,
//                     transform: [
//                       {
//                         scale: screenFade.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: [0.8, 1],
//                         }),
//                       },
//                     ],
//                   },
//                 ]}>
//                 {CATEGORY_META.map(cat => (
//                   <TouchableOpacity
//                     key={cat.value}
//                     onPress={() => {
//                       hSelect();
//                       setSelectedCategory(cat.value as any);
//                       setShowFilter(false);
//                     }}
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       gap: 8,
//                     }}>
//                     <MaterialIcons
//                       name={cat.icon}
//                       size={18}
//                       color={theme.colors.foreground}
//                       style={{marginRight: 8}}
//                     />
//                     <Text style={styles.modalOption}>{cat.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </Animated.View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Sort Modal */}
//       <Modal visible={showSort} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowSort(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <Animated.View
//                 style={[
//                   styles.modalContent,
//                   {
//                     opacity: screenFade,
//                     transform: [
//                       {
//                         scale: screenFade.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: [0.8, 1],
//                         }),
//                       },
//                     ],
//                   },
//                 ]}>
//                 {sortOptions.map(opt => (
//                   <TouchableOpacity
//                     key={opt.value}
//                     onPress={() => {
//                       hSelect();
//                       setSortOption(opt.value as any);
//                       setShowSort(false);
//                     }}>
//                     <Text style={styles.modalOption}>{opt.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </Animated.View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Edit Modal */}
//       {selectedItemToEdit && (
//         <Modal visible={showEditModal} transparent animationType="slide">
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//               }}>
//               <TouchableWithoutFeedback>
//                 <Animated.View
//                   style={[
//                     styles.modalContent,
//                     {
//                       opacity: screenFade,
//                       transform: [
//                         {
//                           scale: screenFade.interpolate({
//                             inputRange: [0, 1],
//                             outputRange: [0.8, 1],
//                           }),
//                         },
//                       ],
//                     },
//                   ]}>
//                   <TextInput
//                     value={editedName}
//                     onChangeText={setEditedName}
//                     placeholder="Name"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />
//                   <TextInput
//                     value={editedColor}
//                     onChangeText={setEditedColor}
//                     placeholder="Color"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />

//                   <AppleTouchFeedback
//                     hapticStyle="impactMedium"
//                     onPress={async () => {
//                       if (selectedItemToEdit) {
//                         await fetch(
//                           `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                           {
//                             method: 'Put',
//                             headers: {'Content-Type': 'application/json'},
//                             body: JSON.stringify({
//                               name: editedName || selectedItemToEdit.name,
//                               color: editedColor || selectedItemToEdit.color,
//                             }),
//                           },
//                         );
//                         queryClient.invalidateQueries({
//                           queryKey: ['wardrobe', userId],
//                         });
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       }
//                     }}
//                     style={[
//                       styles.button,
//                       {
//                         backgroundColor: theme.colors.primary,
//                         marginTop: 12,
//                       },
//                     ]}>
//                     <Text
//                       style={[
//                         styles.buttonText,
//                         {color: theme.colors.background},
//                       ]}>
//                       Save Changes
//                     </Text>
//                   </AppleTouchFeedback>

//                   <AppleTouchFeedback
//                     hapticStyle="impactHeavy"
//                     onPress={() => {
//                       Alert.alert(
//                         'Delete Item',
//                         'Are you sure you want to delete this item?',
//                         [
//                           {text: 'Cancel', style: 'cancel'},
//                           {
//                             text: 'Delete',
//                             style: 'destructive',
//                             onPress: () => {
//                               handleDeleteItem(selectedItemToEdit.id);
//                               setShowEditModal(false);
//                               setSelectedItemToEdit(null);
//                             },
//                           },
//                         ],
//                       );
//                     }}
//                     style={{
//                       backgroundColor: '#cc0000',
//                       padding: 12,
//                       borderRadius: 8,
//                       marginTop: 16,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         textAlign: 'center',
//                         fontWeight: '600',
//                       }}>
//                       Delete Item
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animated.View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       )}
//     </View>
//   );
// }

//////////////////////

// import React, {useState, useEffect, useMemo} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
//   TouchableWithoutFeedback,
//   TextInput,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {Alert} from 'react-native';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Canonical category list (value matches backend enums), with pretty labels
// // ─────────────────────────────────────────────────────────────────────────────
// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   // canonical value (no space) + friendly label (with space)
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const categoryIcons = Object.fromEntries(
//   CATEGORY_META.filter(c => c.value !== 'All').map(c => [c.value, c.icon]),
// ) as Partial<Record<MainCategory, string>>;

// const labelForCategory = (value: string) =>
//   CATEGORY_META.find(c => c.value === value)?.label ?? value;

// // ─────────────────────────────────────────────────────────────────────────────
// // Layout constants
// // ─────────────────────────────────────────────────────────────────────────────
// const ITEM_MARGIN = 20.8;
// const MIN_ITEM_WIDTH = 160;

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );

//   const userId = useUUID();

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');
//   const [showFilter, setShowFilter] = useState(false);
//   const [showSort, setShowSort] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       const json = await res.json();
//       console.log('👕 LOOOOOOOK', JSON.stringify(json, null, 2));
//       return json;
//     },
//     enabled: !!userId,
//   });

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {
//         method: 'DELETE',
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Filtering + sorting
//   // Use saved main_category first; fall back to inference
//   // ─────────────────────────────────────────────────────────────────────────────
//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   // Group by main/sub for display (use saved first then inferred)
//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   // Responsive columns
//   useEffect(() => {
//     const sub = Dimensions.addEventListener('change', ({window}) => {
//       setScreenWidth(window.width);
//     });
//     return () => {
//       // RN modern API returns an object with remove()
//       // @ts-ignore
//       sub?.remove?.();
//     };
//   }, []);

//   const numColumns =
//     Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;
//   const imageSize =
//     (screenWidth - ITEM_MARGIN * (numColumns - 1) - ITEM_MARGIN * 1.5) /
//     numColumns;

//   const handleDeleteItem = (itemId: string) => {
//     deleteMutation.mutate(itemId);
//   };

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       // Cancel any outgoing queries
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});

//       // Snapshot previous value
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);

//       // Optimistically update
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );

//       return {prev};
//     },
//     onError: (err, _, context) => {
//       // Rollback on error
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       // Always refetch to sync with backend
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     input: {
//       borderWidth: 1,
//       borderRadius: tokens.borderRadius.md,
//       padding: 10,
//       marginBottom: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//       borderColor: theme.colors.inputBorder,
//       backgroundColor: theme.colors.input2,
//     },
//     button: {
//       paddingVertical: 12,
//       borderRadius: tokens.borderRadius.sm,
//       alignItems: 'center',
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     iconButton: {
//       paddingHorizontal: 12,
//       paddingVertical: 7,
//       borderRadius: tokens.borderRadius.sm,
//       backgroundColor: theme.colors.button1,
//       elevation: 2,
//     },
//     gridContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     gridCard: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 0.6,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface,
//       overflow: 'hidden',
//     },
//     gridImage: {
//       height: imageSize,
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     fab: {
//       position: 'absolute',
//       bottom: 24,
//       right: 24,
//       backgroundColor: theme.colors.button1,
//       padding: 16,
//       borderRadius: 32,
//       elevation: 6,
//     },
//     modalContent: {
//       padding: 24,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       width: '90%',
//       maxWidth: 720,
//       alignSelf: 'center',
//     },
//     modalOption: {
//       paddingVertical: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     tryOnButtonText: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '500',
//     },
//   });

//   return (
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,
//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text
//                 style={globalStyles.buttonPrimaryText}
//                 numberOfLines={1}
//                 ellipsizeMode="clip"
//                 adjustsFontSizeToFit={false}>
//                 + Build An Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           <AppleTouchFeedback
//             style={{...styles.iconButton, marginRight: 8}}
//             hapticStyle="impactLight"
//             onPress={() => setShowFilter(true)}>
//             <MaterialIcons name="filter-list" size={32} color={'white'} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={{...styles.iconButton}}
//             hapticStyle="impactLight"
//             onPress={() => setShowSort(true)}>
//             <MaterialIcons name="sort" size={32} color={'white'} />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       <ScrollView>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle5]}>
//               {labelForCategory(mainCategory)}
//             </Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title3]}>{subCategory}</Text>

//                 <View style={[styles.gridContainer]}>
//                   {items.map(item => (
//                     <AppleTouchFeedback
//                       key={item.id}
//                       style={[
//                         styles.gridCard,
//                         {
//                           borderColor: theme.colors.surfaceBorder,
//                           borderWidth: tokens.borderWidth.md,
//                         },
//                       ]}
//                       hapticStyle="impactLight"
//                       onPress={() =>
//                         navigate('ItemDetail', {itemId: item.id, item})
//                       }
//                       onLongPress={() => {
//                         setEditedName(item.name ?? '');
//                         setEditedColor(item.color ?? '');
//                         setSelectedItemToEdit(item);
//                         setShowEditModal(true);
//                       }}>
//                       <Image
//                         source={{uri: item.image_url}}
//                         style={(globalStyles.image5, styles.gridImage)}
//                         resizeMode="cover"
//                       />

//                       <View
//                         style={{
//                           position: 'absolute',
//                           top: 8,
//                           right: 8,
//                           zIndex: 10,
//                           padding: 4,
//                         }}>
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             favoriteMutation.mutate({
//                               id: item.id,
//                               favorite: !item.favorite,
//                             })
//                           }>
//                           <MaterialIcons
//                             name="favorite"
//                             size={32}
//                             color={
//                               item.favorite ? 'red' : theme.colors.inputBorder
//                             }
//                           />
//                         </AppleTouchFeedback>
//                       </View>

//                       <View style={globalStyles.labelContainer}>
//                         <Text
//                           style={[globalStyles.cardLabel]}
//                           numberOfLines={1}
//                           ellipsizeMode="tail">
//                           {item.name}
//                         </Text>
//                         <Text
//                           style={[globalStyles.cardSubLabel]}
//                           numberOfLines={1}>
//                           {subCategory}
//                         </Text>
//                       </View>

//                       <AppleTouchFeedback
//                         hapticStyle="impactLight"
//                         onPress={() =>
//                           navigate('TryOnOverlay', {
//                             outfit: {
//                               top: {
//                                 name: item.name,
//                                 imageUri: item.image_url,
//                               },
//                             },
//                             userPhotoUri: Image.resolveAssetSource(
//                               require('../assets/images/full-body-temp1.png'),
//                             ).uri,
//                           })
//                         }
//                         style={{
//                           position: 'absolute',
//                           top: 10,
//                           left: 8,
//                           backgroundColor: 'black',
//                           paddingHorizontal: 10,
//                           paddingVertical: 4,
//                           borderRadius: 8,
//                         }}>
//                         <Text style={styles.tryOnButtonText}>Try On</Text>
//                       </AppleTouchFeedback>
//                     </AppleTouchFeedback>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       <AppleTouchFeedback
//         hapticStyle="impactHeavy"
//         style={[
//           globalStyles.buttonPrimary,
//           {...styles.fab, marginRight: 16, width: 130},
//         ]}
//         onPress={() => navigate('AddItem')}>
//         <Text style={{color: theme.colors.buttonText1, fontWeight: '600'}}>
//           Add Clothes +
//         </Text>
//         {/* <MaterialIcons name="add" size={28} color="#fff" /> */}
//       </AppleTouchFeedback>

//       {/* Filter Modal */}
//       <Modal visible={showFilter} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowFilter(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <View style={[styles.modalContent]}>
//                 {CATEGORY_META.map(cat => (
//                   <TouchableOpacity
//                     key={cat.value}
//                     onPress={() => {
//                       hSelect();
//                       setSelectedCategory(cat.value as any);
//                       setShowFilter(false);
//                     }}
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       gap: 8,
//                     }}>
//                     <MaterialIcons
//                       name={cat.icon}
//                       size={18}
//                       color={theme.colors.foreground}
//                       style={{marginRight: 8}}
//                     />
//                     <Text style={styles.modalOption}>{cat.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Sort Modal */}
//       <Modal visible={showSort} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowSort(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <View style={[styles.modalContent]}>
//                 {sortOptions.map(opt => (
//                   <TouchableOpacity
//                     key={opt.value}
//                     onPress={() => {
//                       hSelect();
//                       setSortOption(opt.value as any);
//                       setShowSort(false);
//                     }}>
//                     <Text style={styles.modalOption}>{opt.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Edit Modal */}
//       {selectedItemToEdit && (
//         <Modal visible={showEditModal} transparent animationType="slide">
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//               }}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.modalContent}>
//                   <TextInput
//                     value={editedName}
//                     onChangeText={setEditedName}
//                     placeholder="Name"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />
//                   <TextInput
//                     value={editedColor}
//                     onChangeText={setEditedColor}
//                     placeholder="Color"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />

//                   <AppleTouchFeedback
//                     hapticStyle="impactMedium"
//                     onPress={async () => {
//                       if (selectedItemToEdit) {
//                         await fetch(
//                           `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                           {
//                             method: 'Put',
//                             headers: {'Content-Type': 'application/json'},
//                             body: JSON.stringify({
//                               name: editedName || selectedItemToEdit.name,
//                               color: editedColor || selectedItemToEdit.color,
//                             }),
//                           },
//                         );
//                         queryClient.invalidateQueries({
//                           queryKey: ['wardrobe', userId],
//                         });
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       }
//                     }}
//                     style={[
//                       styles.button,
//                       {
//                         backgroundColor: theme.colors.primary,
//                         marginTop: 12,
//                       },
//                     ]}>
//                     <Text
//                       style={[
//                         styles.buttonText,
//                         {color: theme.colors.background},
//                       ]}>
//                       Save Changes
//                     </Text>
//                   </AppleTouchFeedback>

//                   <AppleTouchFeedback
//                     hapticStyle="impactHeavy"
//                     onPress={() => {
//                       Alert.alert(
//                         'Delete Item',
//                         'Are you sure you want to delete this item?',
//                         [
//                           {text: 'Cancel', style: 'cancel'},
//                           {
//                             text: 'Delete',
//                             style: 'destructive',
//                             onPress: () => {
//                               handleDeleteItem(selectedItemToEdit.id);
//                               setShowEditModal(false);
//                               setSelectedItemToEdit(null);
//                             },
//                           },
//                         ],
//                       );
//                     }}
//                     style={{
//                       backgroundColor: '#cc0000',
//                       padding: 12,
//                       borderRadius: 8,
//                       marginTop: 16,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         textAlign: 'center',
//                         fontWeight: '600',
//                       }}>
//                       Delete Item
//                     </Text>
//                   </AppleTouchFeedback>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       )}
//     </View>
//   );
// }

/////////////////////

// import React, {useState, useEffect, useMemo} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
//   TouchableWithoutFeedback,
//   TextInput,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {Alert} from 'react-native';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Canonical category list (value matches backend enums), with pretty labels
// // ─────────────────────────────────────────────────────────────────────────────
// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   // canonical value (no space) + friendly label (with space)
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const categoryIcons = Object.fromEntries(
//   CATEGORY_META.filter(c => c.value !== 'All').map(c => [c.value, c.icon]),
// ) as Partial<Record<MainCategory, string>>;

// const labelForCategory = (value: string) =>
//   CATEGORY_META.find(c => c.value === value)?.label ?? value;

// // ─────────────────────────────────────────────────────────────────────────────
// // Layout constants
// // ─────────────────────────────────────────────────────────────────────────────
// const ITEM_MARGIN = 20.8;
// const MIN_ITEM_WIDTH = 160;

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );

//   const userId = useUUID();

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');
//   const [showFilter, setShowFilter] = useState(false);
//   const [showSort, setShowSort] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       const json = await res.json();
//       console.log('👕 LOOOOOOOK', JSON.stringify(json, null, 2));
//       return json;
//     },
//     enabled: !!userId,
//   });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {
//         method: 'DELETE',
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Filtering + sorting
//   // Use saved main_category first; fall back to inference
//   // ─────────────────────────────────────────────────────────────────────────────
//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   // Group by main/sub for display (use saved first then inferred)
//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   // Responsive columns
//   useEffect(() => {
//     const sub = Dimensions.addEventListener('change', ({window}) => {
//       setScreenWidth(window.width);
//     });
//     return () => {
//       // RN modern API returns an object with remove()
//       // @ts-ignore
//       sub?.remove?.();
//     };
//   }, []);

//   const numColumns =
//     Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;
//   const imageSize =
//     (screenWidth - ITEM_MARGIN * (numColumns - 1) - ITEM_MARGIN * 1.5) /
//     numColumns;

//   const handleDeleteItem = (itemId: string) => {
//     deleteMutation.mutate(itemId);
//   };

//   // const favoriteMutation = useMutation({
//   //   mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//   //     await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//   //       method: 'PATCH',
//   //       headers: {'Content-Type': 'application/json'},
//   //       body: JSON.stringify({favorite}),
//   //     });
//   //   },
//   //   onSuccess: () => {
//   //     queryClient.invalidateQueries({
//   //       queryKey: ['wardrobe', userId],
//   //     });
//   //   },
//   // });

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       // Cancel any outgoing queries
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});

//       // Snapshot previous value
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);

//       // Optimistically update
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );

//       return {prev};
//     },
//     onError: (err, _, context) => {
//       // Rollback on error
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       // Always refetch to sync with backend
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     input: {
//       borderWidth: 1,
//       borderRadius: tokens.borderRadius.md,
//       padding: 10,
//       marginBottom: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//       borderColor: theme.colors.inputBorder,
//       backgroundColor: theme.colors.input2,
//     },
//     button: {
//       paddingVertical: 12,
//       borderRadius: tokens.borderRadius.sm,
//       alignItems: 'center',
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     iconButton: {
//       paddingHorizontal: 12,
//       paddingVertical: 7,
//       borderRadius: tokens.borderRadius.sm,
//       backgroundColor: theme.colors.button1,
//       elevation: 2,
//     },
//     gridContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     gridCard: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 0.6,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface,
//       overflow: 'hidden',
//     },
//     gridImage: {
//       width: '100%',
//       height: imageSize,
//       borderTopLeftRadius: 10,
//       borderTopRightRadius: 10,
//       backgroundColor: theme.colors.foreground,
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     fab: {
//       position: 'absolute',
//       bottom: 24,
//       right: 24,
//       backgroundColor: theme.colors.button1,
//       padding: 16,
//       borderRadius: 32,
//       elevation: 6,
//     },
//     modalContent: {
//       padding: 24,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       width: '90%',
//       maxWidth: 720,
//       alignSelf: 'center',
//     },
//     modalOption: {
//       paddingVertical: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     tryOnButtonText: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '500',
//     },
//   });

//   return (
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,
//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text
//                 style={globalStyles.buttonPrimaryText}
//                 numberOfLines={1}
//                 ellipsizeMode="clip"
//                 adjustsFontSizeToFit={false}>
//                 + Build An Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           <AppleTouchFeedback
//             style={{...styles.iconButton, marginRight: 8}}
//             hapticStyle="impactLight"
//             onPress={() => setShowFilter(true)}>
//             <MaterialIcons
//               name="filter-list"
//               size={28}
//               color={theme.colors.foreground}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={{...styles.iconButton}}
//             hapticStyle="impactLight"
//             onPress={() => setShowSort(true)}>
//             <MaterialIcons
//               name="sort"
//               size={28}
//               color={theme.colors.foreground}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       <ScrollView>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle2]}>
//               {labelForCategory(mainCategory)}
//             </Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title2]}>{subCategory}</Text>

//                 <View style={[styles.gridContainer]}>
//                   {items.map(item => (
//                     <AppleTouchFeedback
//                       key={item.id}
//                       style={[
//                         styles.gridCard,
//                         {
//                           borderColor: theme.colors.surfaceBorder,
//                           borderWidth: tokens.borderWidth.md,
//                         },
//                       ]}
//                       hapticStyle="impactLight"
//                       onPress={() =>
//                         navigate('ItemDetail', {itemId: item.id, item})
//                       }
//                       onLongPress={() => {
//                         setEditedName(item.name ?? '');
//                         setEditedColor(item.color ?? '');
//                         setSelectedItemToEdit(item);
//                         setShowEditModal(true);
//                       }}>
//                       <Image
//                         source={{uri: item.image_url}}
//                         style={styles.gridImage}
//                         resizeMode="cover"
//                       />

//                       <View
//                         style={{
//                           position: 'absolute',
//                           top: 8,
//                           right: 8,
//                           zIndex: 10,
//                           padding: 4,
//                         }}>
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             favoriteMutation.mutate({
//                               id: item.id,
//                               favorite: !item.favorite,
//                             })
//                           }>
//                           <MaterialIcons
//                             name="favorite"
//                             size={22}
//                             color={
//                               item.favorite ? 'red' : theme.colors.inputBorder
//                             }
//                           />
//                         </AppleTouchFeedback>
//                       </View>

//                       <View style={globalStyles.labelContainer}>
//                         <Text
//                           style={[globalStyles.cardLabel]}
//                           numberOfLines={1}
//                           ellipsizeMode="tail">
//                           {item.name}
//                         </Text>
//                         <Text
//                           style={[globalStyles.cardSubLabel]}
//                           numberOfLines={1}>
//                           {subCategory}
//                         </Text>
//                       </View>

//                       <TouchableOpacity
//                         onPress={() =>
//                           navigate('TryOnOverlay', {
//                             outfit: {
//                               top: {
//                                 name: item.name,
//                                 imageUri: item.image_url,
//                               },
//                             },
//                             userPhotoUri: Image.resolveAssetSource(
//                               require('../assets/images/full-body-temp1.png'),
//                             ).uri,
//                           })
//                         }
//                         style={{
//                           position: 'absolute',
//                           top: 10,
//                           left: 8,
//                           backgroundColor: 'black',
//                           paddingHorizontal: 10,
//                           paddingVertical: 4,
//                           borderRadius: 8,
//                         }}>
//                         <Text style={styles.tryOnButtonText}>Try On</Text>
//                       </TouchableOpacity>
//                     </AppleTouchFeedback>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       <AppleTouchFeedback
//         style={[
//           globalStyles.buttonPrimary,
//           {...styles.fab, marginRight: 16, width: 127},
//         ]}
//         onPress={() => navigate('AddItem')}>
//         <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
//           Add Clothes +
//         </Text>
//         {/* <MaterialIcons name="add" size={28} color="#fff" /> */}
//       </AppleTouchFeedback>

//       {/* Filter Modal */}
//       <Modal visible={showFilter} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowFilter(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <View style={[styles.modalContent]}>
//                 {CATEGORY_META.map(cat => (
//                   <TouchableOpacity
//                     key={cat.value}
//                     onPress={() => {
//                       setSelectedCategory(cat.value as any);
//                       setShowFilter(false);
//                     }}
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       gap: 8,
//                     }}>
//                     <MaterialIcons
//                       name={cat.icon}
//                       size={18}
//                       color={theme.colors.foreground}
//                       style={{marginRight: 8}}
//                     />
//                     <Text style={styles.modalOption}>{cat.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Sort Modal */}
//       <Modal visible={showSort} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowSort(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <View style={[styles.modalContent]}>
//                 {sortOptions.map(opt => (
//                   <TouchableOpacity
//                     key={opt.value}
//                     onPress={() => {
//                       setSortOption(opt.value as any);
//                       setShowSort(false);
//                     }}>
//                     <Text style={styles.modalOption}>{opt.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Edit Modal */}
//       {selectedItemToEdit && (
//         <Modal visible={showEditModal} transparent animationType="slide">
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//               }}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.modalContent}>
//                   <TextInput
//                     value={editedName}
//                     onChangeText={setEditedName}
//                     placeholder="Name"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />
//                   <TextInput
//                     value={editedColor}
//                     onChangeText={setEditedColor}
//                     placeholder="Color"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />

//                   <AppleTouchFeedback
//                     hapticStyle="impactMedium"
//                     onPress={async () => {
//                       if (selectedItemToEdit) {
//                         await fetch(
//                           `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                           {
//                             method: 'Put',
//                             headers: {'Content-Type': 'application/json'},
//                             body: JSON.stringify({
//                               name: editedName || selectedItemToEdit.name,
//                               color: editedColor || selectedItemToEdit.color,
//                             }),
//                           },
//                         );
//                         queryClient.invalidateQueries({
//                           queryKey: ['wardrobe', userId],
//                         });
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       }
//                     }}
//                     style={[
//                       styles.button,
//                       {
//                         backgroundColor: theme.colors.primary,
//                         marginTop: 12,
//                       },
//                     ]}>
//                     <Text
//                       style={[
//                         styles.buttonText,
//                         {color: theme.colors.background},
//                       ]}>
//                       Save Changes
//                     </Text>
//                   </AppleTouchFeedback>

//                   <AppleTouchFeedback
//                     hapticStyle="impactHeavy"
//                     onPress={() => {
//                       Alert.alert(
//                         'Delete Item',
//                         'Are you sure you want to delete this item?',
//                         [
//                           {text: 'Cancel', style: 'cancel'},
//                           {
//                             text: 'Delete',
//                             style: 'destructive',
//                             onPress: () => {
//                               handleDeleteItem(selectedItemToEdit.id);
//                               setShowEditModal(false);
//                               setSelectedItemToEdit(null);
//                             },
//                           },
//                         ],
//                       );
//                     }}
//                     style={{
//                       backgroundColor: '#cc0000',
//                       padding: 12,
//                       borderRadius: 8,
//                       marginTop: 16,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         textAlign: 'center',
//                         fontWeight: '600',
//                       }}>
//                       Delete Item
//                     </Text>
//                   </AppleTouchFeedback>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       )}
//     </View>
//   );
// }

///////////////////

// import React, {useState, useEffect, useMemo} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
//   TouchableWithoutFeedback,
//   TextInput,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import {Alert} from 'react-native';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: MainCategory | string;
//   subcategory?: Subcategory | string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Canonical category list (value matches backend enums), with pretty labels
// // ─────────────────────────────────────────────────────────────────────────────
// const CATEGORY_META: Array<{
//   value: MainCategory | 'All';
//   label: string;
//   icon: string;
// }> = [
//   {value: 'All', label: 'All', icon: 'category'},
//   {value: 'Tops', label: 'Tops', icon: 'checkroom'},
//   {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
//   {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
//   {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
//   {value: 'Accessories', label: 'Accessories', icon: 'watch'},
//   {value: 'Undergarments', label: 'Undergarments', icon: 'layers'},
//   {value: 'Activewear', label: 'Activewear', icon: 'fitness-center'},
//   {value: 'Formalwear', label: 'Formalwear', icon: 'work'},
//   {value: 'Loungewear', label: 'Loungewear', icon: 'weekend'},
//   {value: 'Sleepwear', label: 'Sleepwear', icon: 'hotel'},
//   {value: 'Swimwear', label: 'Swimwear', icon: 'pool'},
//   {value: 'Maternity', label: 'Maternity', icon: 'pregnant-woman'},
//   {value: 'Unisex', label: 'Unisex', icon: 'wc'},
//   {value: 'Costumes', label: 'Costumes', icon: 'theater-comedy'},
//   // canonical value (no space) + friendly label (with space)
//   {value: 'TraditionalWear', label: 'Traditional Wear', icon: 'festival'},
// ];

// const categoryIcons = Object.fromEntries(
//   CATEGORY_META.filter(c => c.value !== 'All').map(c => [c.value, c.icon]),
// ) as Partial<Record<MainCategory, string>>;

// const labelForCategory = (value: string) =>
//   CATEGORY_META.find(c => c.value === value)?.label ?? value;

// // ─────────────────────────────────────────────────────────────────────────────
// // Layout constants
// // ─────────────────────────────────────────────────────────────────────────────
// const ITEM_MARGIN = 20.8;
// const MIN_ITEM_WIDTH = 160;

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );

//   const userId = useUUID();

//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');
//   const [showFilter, setShowFilter] = useState(false);
//   const [showSort, setShowSort] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       const json = await res.json();
//       console.log('👕 LOOOOOOOK', JSON.stringify(json, null, 2));
//       return json;
//     },
//     enabled: !!userId,
//   });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {
//         method: 'DELETE',
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Filtering + sorting
//   // Use saved main_category first; fall back to inference
//   // ─────────────────────────────────────────────────────────────────────────────
//   const filtered = useMemo(() => {
//     return (wardrobe as WardrobeItem[])
//       .map(item => {
//         const inferred = getInferredCategory(item.name);
//         const effectiveMain: MainCategory | undefined =
//           (item.main_category as MainCategory) ?? inferred?.main;
//         return {...item, inferredCategory: inferred, effectiveMain};
//       })
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.effectiveMain === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   // Group by main/sub for display (use saved first then inferred)
//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         (item.main_category as string) ||
//         (item as any).inferredCategory?.main ||
//         'Uncategorized';
//       const sub =
//         (item.subcategory as string) ||
//         (item as any).inferredCategory?.sub ||
//         'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

//   // Responsive columns
//   useEffect(() => {
//     const sub = Dimensions.addEventListener('change', ({window}) => {
//       setScreenWidth(window.width);
//     });
//     return () => {
//       // RN modern API returns an object with remove()
//       // @ts-ignore
//       sub?.remove?.();
//     };
//   }, []);

//   const numColumns =
//     Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;
//   const imageSize =
//     (screenWidth - ITEM_MARGIN * (numColumns - 1) - ITEM_MARGIN * 1.5) /
//     numColumns;

//   const handleDeleteItem = (itemId: string) => {
//     deleteMutation.mutate(itemId);
//   };

//   // const favoriteMutation = useMutation({
//   //   mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//   //     await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//   //       method: 'PATCH',
//   //       headers: {'Content-Type': 'application/json'},
//   //       body: JSON.stringify({favorite}),
//   //     });
//   //   },
//   //   onSuccess: () => {
//   //     queryClient.invalidateQueries({
//   //       queryKey: ['wardrobe', userId],
//   //     });
//   //   },
//   // });

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
//         method: 'Put',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onMutate: async ({id, favorite}) => {
//       // Cancel any outgoing queries
//       await queryClient.cancelQueries({queryKey: ['wardrobe', userId]});

//       // Snapshot previous value
//       const prev = queryClient.getQueryData<WardrobeItem[]>([
//         'wardrobe',
//         userId,
//       ]);

//       // Optimistically update
//       queryClient.setQueryData<WardrobeItem[]>(
//         ['wardrobe', userId],
//         old =>
//           old?.map(item => (item.id === id ? {...item, favorite} : item)) || [],
//       );

//       return {prev};
//     },
//     onError: (err, _, context) => {
//       // Rollback on error
//       if (context?.prev) {
//         queryClient.setQueryData(['wardrobe', userId], context.prev);
//       }
//     },
//     onSettled: () => {
//       // Always refetch to sync with backend
//       queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
//     },
//   });

//   const styles = StyleSheet.create({
//     input: {
//       borderWidth: 1,
//       borderRadius: tokens.borderRadius.md,
//       padding: 10,
//       marginBottom: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//       borderColor: theme.colors.inputBorder,
//       backgroundColor: theme.colors.input2,
//     },
//     button: {
//       paddingVertical: 12,
//       borderRadius: tokens.borderRadius.sm,
//       alignItems: 'center',
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     iconButton: {
//       paddingHorizontal: 12,
//       paddingVertical: 7,
//       borderRadius: tokens.borderRadius.sm,
//       backgroundColor: theme.colors.button1,
//       elevation: 2,
//     },
//     gridContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     gridCard: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 0.6,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface,
//       overflow: 'hidden',
//     },
//     gridImage: {
//       width: '100%',
//       height: imageSize,
//       borderTopLeftRadius: 10,
//       borderTopRightRadius: 10,
//       backgroundColor: '#e5e5e5',
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     fab: {
//       position: 'absolute',
//       bottom: 24,
//       right: 24,
//       backgroundColor: theme.colors.button1,
//       padding: 16,
//       borderRadius: 32,
//       elevation: 6,
//     },
//     modalContent: {
//       padding: 24,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       width: '90%',
//       maxWidth: 720,
//       alignSelf: 'center',
//     },
//     modalOption: {
//       paddingVertical: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     tryOnButtonText: {
//       color: 'white',
//       fontSize: 14,
//       fontWeight: '500',
//     },
//   });

//   return (
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,
//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text
//                 style={globalStyles.buttonPrimaryText}
//                 numberOfLines={1}
//                 ellipsizeMode="clip"
//                 adjustsFontSizeToFit={false}>
//                 + Build An Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           <AppleTouchFeedback
//             style={{...styles.iconButton, marginRight: 8}}
//             hapticStyle="impactLight"
//             onPress={() => setShowFilter(true)}>
//             <MaterialIcons
//               name="filter-list"
//               size={24}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={{...styles.iconButton}}
//             hapticStyle="impactLight"
//             onPress={() => setShowSort(true)}>
//             <MaterialIcons name="sort" size={24} color={theme.colors.primary} />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       <ScrollView>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle2]}>
//               {labelForCategory(mainCategory)}
//             </Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title2]}>{subCategory}</Text>

//                 <View style={[styles.gridContainer]}>
//                   {items.map(item => (
//                     <AppleTouchFeedback
//                       key={item.id}
//                       style={styles.gridCard}
//                       hapticStyle="impactLight"
//                       onPress={() =>
//                         navigate('ItemDetail', {itemId: item.id, item})
//                       }
//                       onLongPress={() => {
//                         setEditedName(item.name ?? '');
//                         setEditedColor(item.color ?? '');
//                         setSelectedItemToEdit(item); // ✅ open correct item
//                         setShowEditModal(true); // ✅ show modal
//                       }}>
//                       <Image
//                         source={{uri: item.image_url}}
//                         style={styles.gridImage}
//                         resizeMode="cover"
//                       />

//                       <View
//                         style={{
//                           position: 'absolute',
//                           top: 8,
//                           right: 8,
//                           zIndex: 10,
//                           padding: 4,
//                         }}>
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             favoriteMutation.mutate({
//                               id: item.id,
//                               favorite: !item.favorite,
//                             })
//                           }>
//                           <MaterialIcons
//                             name={item.favorite ? 'star' : 'star-border'}
//                             size={22}
//                             color={item.favorite ? '#FFD700' : '#999'} // gold yellow when true
//                           />
//                         </AppleTouchFeedback>
//                       </View>

//                       <View style={globalStyles.labelContainer}>
//                         <Text
//                           style={[globalStyles.cardLabel]}
//                           numberOfLines={1}
//                           ellipsizeMode="tail">
//                           {item.name}
//                         </Text>
//                         <Text
//                           style={[globalStyles.cardSubLabel]}
//                           numberOfLines={1}>
//                           {subCategory}
//                         </Text>
//                       </View>

//                       <TouchableOpacity
//                         onPress={() =>
//                           navigate('TryOnOverlay', {
//                             outfit: {
//                               top: {
//                                 name: item.name,
//                                 imageUri: item.image_url,
//                               },
//                             },
//                             userPhotoUri: Image.resolveAssetSource(
//                               require('../assets/images/full-body-temp1.png'),
//                             ).uri,
//                           })
//                         }
//                         style={{
//                           position: 'absolute',
//                           top: 10,
//                           left: 8,
//                           backgroundColor: 'black',
//                           paddingHorizontal: 10,
//                           paddingVertical: 4,
//                           borderRadius: 8,
//                         }}>
//                         <Text style={styles.tryOnButtonText}>Try On</Text>
//                       </TouchableOpacity>
//                     </AppleTouchFeedback>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       <AppleTouchFeedback
//         style={{...styles.fab, marginRight: 16}}
//         // style={[
//         //   globalStyles.buttonPrimary,
//         //   {
//         //     paddingHorizontal: 28,
//         //     minWidth: 210,
//         //     alignSelf: 'center',
//         //     flexShrink: 0,
//         //   },
//         // ]}
//         onPress={() => navigate('AddItem')}>
//         <Text style={{color: 'white', fontWeight: '600'}}>Add Clothes +</Text>
//         {/* <MaterialIcons name="add" size={28} color="#fff" /> */}
//       </AppleTouchFeedback>

//       {/* Filter Modal */}
//       <Modal visible={showFilter} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowFilter(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <View style={[styles.modalContent]}>
//                 {CATEGORY_META.map(cat => (
//                   <TouchableOpacity
//                     key={cat.value}
//                     onPress={() => {
//                       setSelectedCategory(cat.value as any);
//                       setShowFilter(false);
//                     }}
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       gap: 8,
//                     }}>
//                     <MaterialIcons
//                       name={cat.icon}
//                       size={18}
//                       color={theme.colors.foreground}
//                       style={{marginRight: 8}}
//                     />
//                     <Text style={styles.modalOption}>{cat.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Sort Modal */}
//       <Modal visible={showSort} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowSort(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <View style={[styles.modalContent]}>
//                 {sortOptions.map(opt => (
//                   <TouchableOpacity
//                     key={opt.value}
//                     onPress={() => {
//                       setSortOption(opt.value as any);
//                       setShowSort(false);
//                     }}>
//                     <Text style={styles.modalOption}>{opt.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {/* Edit Modal */}
//       {selectedItemToEdit && (
//         <Modal visible={showEditModal} transparent animationType="slide">
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//               }}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.modalContent}>
//                   <TextInput
//                     value={editedName}
//                     onChangeText={setEditedName}
//                     placeholder="Name"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />
//                   <TextInput
//                     value={editedColor}
//                     onChangeText={setEditedColor}
//                     placeholder="Color"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />

//                   <AppleTouchFeedback
//                     hapticStyle="impactMedium"
//                     onPress={async () => {
//                       if (selectedItemToEdit) {
//                         await fetch(
//                           `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
//                           {
//                             method: 'Put',
//                             headers: {'Content-Type': 'application/json'},
//                             body: JSON.stringify({
//                               name: editedName || selectedItemToEdit.name,
//                               color: editedColor || selectedItemToEdit.color,
//                             }),
//                           },
//                         );
//                         queryClient.invalidateQueries({
//                           queryKey: ['wardrobe', userId],
//                         });
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       }
//                     }}
//                     style={[
//                       styles.button,
//                       {
//                         backgroundColor: theme.colors.primary,
//                         marginTop: 12,
//                       },
//                     ]}>
//                     <Text
//                       style={[
//                         styles.buttonText,
//                         {color: theme.colors.background},
//                       ]}>
//                       Save Changes
//                     </Text>
//                   </AppleTouchFeedback>

//                   <AppleTouchFeedback
//                     hapticStyle="impactHeavy"
//                     onPress={() => {
//                       Alert.alert(
//                         'Delete Item',
//                         'Are you sure you want to delete this item?',
//                         [
//                           {text: 'Cancel', style: 'cancel'},
//                           {
//                             text: 'Delete',
//                             style: 'destructive',
//                             onPress: () => {
//                               handleDeleteItem(selectedItemToEdit.id);
//                               setShowEditModal(false);
//                               setSelectedItemToEdit(null);
//                             },
//                           },
//                         ],
//                       );
//                     }}
//                     style={{
//                       backgroundColor: '#cc0000',
//                       padding: 12,
//                       borderRadius: 8,
//                       marginTop: 16,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         textAlign: 'center',
//                         fontWeight: '600',
//                       }}>
//                       Delete Item
//                     </Text>
//                   </AppleTouchFeedback>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       )}
//     </View>
//   );
// }
