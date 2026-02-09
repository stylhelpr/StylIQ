import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';
import {
  DayWeather,
  TripActivity,
  PackingGroup,
} from '../../types/trips';

type CoverageItem = {
  label: string;
  covered: boolean;
};

type Props = {
  weather: DayWeather[];
  activities: TripActivity[];
  packingList: PackingGroup[];
};

function computeCoverage(
  weather: DayWeather[],
  activities: TripActivity[],
  packingList: PackingGroup[],
): CoverageItem[] {
  const items: CoverageItem[] = [];
  const allCategories = new Set(packingList.map(g => g.category));
  const hasOuterwear = allCategories.has('Outerwear');

  const isCold = weather.some(d => d.lowF < 55);
  const hasRain = weather.some(d => d.rainChance > 50);
  const isHot = weather.some(d => d.highF > 85);
  const hasSnow = weather.some(d => d.condition === 'snowy');

  if (isCold) {
    items.push({label: 'Cold weather', covered: hasOuterwear});
  }
  if (hasRain) {
    items.push({label: 'Rain', covered: hasOuterwear});
  }
  if (isHot) {
    items.push({label: 'Heat', covered: allCategories.has('Tops') || allCategories.has('Dresses')});
  }
  if (hasSnow) {
    items.push({label: 'Snow', covered: hasOuterwear && allCategories.has('Shoes')});
  }

  const allItems = packingList.flatMap(g => g.items);

  for (const activity of activities) {
    switch (activity) {
      case 'Business':
        items.push({label: 'Business', covered: allItems.some(i => i.mainCategory === 'Tops' || i.mainCategory === 'Dresses')});
        break;
      case 'Dinner':
        items.push({label: 'Dinners', covered: allItems.some(i => i.mainCategory === 'Tops' || i.mainCategory === 'Dresses')});
        break;
      case 'Formal':
        items.push({label: 'Formal events', covered: allItems.some(i => i.mainCategory === 'Tops' || i.mainCategory === 'Dresses')});
        break;
      case 'Beach':
        items.push({
          label: 'Beach',
          covered: allItems.some(
            i => i.subCategory?.toLowerCase().includes('swim') || i.mainCategory === 'Swimwear',
          ),
        });
        break;
      case 'Active':
        items.push({label: 'Workouts', covered: allItems.some(i => i.mainCategory === 'Tops')});
        break;
      case 'Sightseeing':
        items.push({label: 'Walking', covered: allCategories.has('Shoes')});
        break;
      case 'Casual':
        items.push({label: 'Casual outings', covered: allCategories.has('Tops') || allCategories.has('Dresses')});
        break;
      case 'Cold Weather':
        if (!isCold) {
          items.push({label: 'Cold weather', covered: hasOuterwear});
        }
        break;
    }
  }

  return items;
}

const ConfidenceSummary = ({weather, activities, packingList}: Props) => {
  const {theme} = useAppTheme();

  const coverage = useMemo(
    () => computeCoverage(weather, activities, packingList),
    [weather, activities, packingList],
  );

  if (coverage.length === 0) return null;

  const allCovered = coverage.every(c => c.covered);

  const styles = StyleSheet.create({
    container: {
      marginHorizontal: tokens.spacing.md,
      marginTop: tokens.spacing.sm,
      padding: 14,
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.lg,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginBottom: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    label: {
      fontSize: 13,
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {allCovered ? 'You\'re covered' : 'Coverage'}
      </Text>
      {coverage.map((item, idx) => (
        <View key={idx} style={styles.row}>
          <Icon
            name={item.covered ? 'check-circle' : 'warning'}
            size={16}
            color={item.covered ? '#34C759' : '#FF9500'}
          />
          <Text
            style={[
              styles.label,
              {color: item.covered ? theme.colors.foreground : '#FF9500'},
            ]}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

export default ConfidenceSummary;
