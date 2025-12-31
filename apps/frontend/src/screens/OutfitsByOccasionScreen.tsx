import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../context/ThemeContext';
import {useUUID} from '../context/UUIDContext';
import {apiClient} from '../lib/apiClient';
import {Screen} from '../navigation/types';

type OutfitOccasion =
  | 'Work'
  | 'DateNight'
  | 'Casual'
  | 'Formal'
  | 'Travel'
  | 'Gym'
  | 'Weekend'
  | 'Party'
  | 'Interview'
  | 'Brunch';

const OCCASION_CONFIG: Record<
  OutfitOccasion,
  {color: string; icon: string; label: string}
> = {
  Work: {color: '#3B82F6', icon: 'work', label: 'Work'},
  DateNight: {color: '#EC4899', icon: 'favorite', label: 'Date Night'},
  Casual: {color: '#22C55E', icon: 'weekend', label: 'Casual'},
  Formal: {color: '#F59E0B', icon: 'star', label: 'Formal'},
  Travel: {color: '#14B8A6', icon: 'flight', label: 'Travel'},
  Gym: {color: '#F97316', icon: 'fitness-center', label: 'Gym'},
  Weekend: {color: '#8B5CF6', icon: 'wb-sunny', label: 'Weekend'},
  Party: {color: '#EF4444', icon: 'celebration', label: 'Party'},
  Interview: {color: '#6366F1', icon: 'business-center', label: 'Interview'},
  Brunch: {color: '#F472B6', icon: 'brunch-dining', label: 'Brunch'},
};

interface OutfitItem {
  id: string;
  name: string;
  occasion: OutfitOccasion | null;
  type: 'custom' | 'ai';
}

interface Props {
  navigate: (screen: Screen, params?: any) => void;
}

export default function OutfitsByOccasionScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const uuid = useUUID();
  const [outfits, setOutfits] = useState<OutfitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<Animatable.View & View>(null);

  const handleClose = async () => {
    if (containerRef.current) {
      await (containerRef.current as any).fadeOutDown(300);
    }
    navigate('SavedOutfits');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      marginTop: 45,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: '#fff',
    },
    closeButton: {
      padding: 8,
      borderRadius: 20,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 12,
      borderLeftWidth: 3,
      marginBottom: 8,
      gap: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      flex: 1,
    },
    countBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    countText: {
      fontSize: 14,
      fontWeight: '600',
    },
    outfitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginLeft: 12,
      borderLeftWidth: 2,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    outfitName: {
      fontSize: 15,
      color: '#fff',
      flex: 1,
      marginRight: 12,
    },
    outfitType: {
      fontSize: 12,
      color: '#888',
      textTransform: 'uppercase',
    },
    empty: {
      fontSize: 16,
      textAlign: 'center',
      marginTop: 40,
    },
  });

  useEffect(() => {
    if (!uuid) return;

    const fetchOutfits = async () => {
      try {
        const [aiRes, customRes] = await Promise.all([
          apiClient.get('/outfit/suggestions'),
          apiClient.get('/outfit/custom'),
        ]);

        const aiData = Array.isArray(aiRes.data) ? aiRes.data : [];
        const customData = Array.isArray(customRes.data) ? customRes.data : [];

        const allOutfits: OutfitItem[] = [
          ...aiData.map((o: any) => ({
            id: o.id,
            name: o.name || 'Unnamed Outfit',
            occasion: o.occasion || null,
            type: 'ai' as const,
          })),
          ...customData.map((o: any) => ({
            id: o.id,
            name: o.name || 'Unnamed Outfit',
            occasion: o.occasion || null,
            type: 'custom' as const,
          })),
        ];

        setOutfits(allOutfits);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch outfits:', err);
        setLoading(false);
      }
    };

    fetchOutfits();
  }, [uuid]);

  // Group outfits by occasion
  const groupedOutfits = React.useMemo(() => {
    const groups: Record<string, OutfitItem[]> = {};

    // Initialize all occasion groups
    Object.keys(OCCASION_CONFIG).forEach(key => {
      groups[key] = [];
    });
    groups['Uncategorized'] = [];

    // Sort outfits into groups
    outfits.forEach(outfit => {
      if (outfit.occasion && OCCASION_CONFIG[outfit.occasion]) {
        groups[outfit.occasion].push(outfit);
      } else {
        groups['Uncategorized'].push(outfit);
      }
    });

    return groups;
  }, [outfits]);

  const renderOccasionSection = (occasionKey: string, sectionIndex: number) => {
    const items = groupedOutfits[occasionKey];
    if (items.length === 0) return null;

    const isUncategorized = occasionKey === 'Uncategorized';
    const config = isUncategorized
      ? {color: '#666', icon: 'help-outline', label: 'Uncategorized'}
      : OCCASION_CONFIG[occasionKey as OutfitOccasion];

    return (
      <Animatable.View
        key={occasionKey}
        animation="fadeInUp"
        delay={sectionIndex * 80}
        duration={500}
        useNativeDriver
        style={styles.section}>
        <View style={[styles.sectionHeader, {borderLeftColor: config.color}]}>
          <MaterialIcons
            name={config.icon as any}
            size={20}
            color={config.color}
          />
          <Text style={[styles.sectionTitle, {color: config.color}]}>
            {config.label}
          </Text>
          <View
            style={[styles.countBadge, {backgroundColor: `${config.color}30`}]}>
            <Text style={[styles.countText, {color: config.color}]}>
              {items.length}
            </Text>
          </View>
        </View>
        {items.map((outfit, idx) => (
          <Animatable.View
            key={outfit.id}
            animation="fadeIn"
            delay={sectionIndex * 80 + idx * 30}
            duration={300}
            useNativeDriver>
            <Pressable
              onPress={() => navigate('SavedOutfits')}
              style={[styles.outfitRow, {borderLeftColor: config.color}]}>
              <Text style={styles.outfitName} numberOfLines={1}>
                {outfit.name}
              </Text>
              <Text style={styles.outfitType}>
                {outfit.type === 'ai' ? 'AI' : 'Custom'}
              </Text>
            </Pressable>
          </Animatable.View>
        ))}
      </Animatable.View>
    );
  };

  // Get visible sections for proper indexing
  const visibleSections = [...Object.keys(OCCASION_CONFIG), 'Uncategorized'].filter(
    key => groupedOutfits[key]?.length > 0,
  );

  return (
    <Animatable.View
      ref={containerRef}
      animation="fadeIn"
      duration={300}
      useNativeDriver
      style={{flex: 1}}>
      <SafeAreaView
        style={[styles.container, {backgroundColor: theme.colors.background}]}
        edges={['top']}>
        <Animatable.View
          animation="fadeInDown"
          duration={500}
          useNativeDriver
          style={styles.header}>
          <Animatable.Text
            animation="fadeInLeft"
            delay={100}
            duration={600}
            useNativeDriver
            style={[styles.title, {color: theme.colors.foreground}]}>
            Outfits by Occasion
          </Animatable.Text>
          <Animatable.View animation="fadeIn" delay={200} duration={400} useNativeDriver>
            <TouchableOpacity
              onPress={handleClose}
              style={[
                styles.closeButton,
                {backgroundColor: theme.colors.buttonText1},
              ]}>
              <MaterialIcons
                name="close"
                size={24}
                color={theme.colors.background}
              />
            </TouchableOpacity>
          </Animatable.View>
        </Animatable.View>

      {loading ? (
        <Animatable.View animation="fadeIn" duration={300} useNativeDriver>
          <ActivityIndicator
            color={theme.colors.primary}
            style={{marginTop: 40}}
          />
        </Animatable.View>
      ) : outfits.length === 0 ? (
        <Animatable.Text
          animation="fadeIn"
          delay={300}
          duration={500}
          useNativeDriver
          style={[styles.empty, {color: theme.colors.foreground3}]}>
          No outfits saved yet
        </Animatable.Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {visibleSections.map((key, index) => renderOccasionSection(key, index))}
        </ScrollView>
      )}
      </SafeAreaView>
    </Animatable.View>
  );
}
