import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';
import {TripActivity} from '../../types/trips';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

const ACTIVITY_CONFIG: {activity: TripActivity; icon: string; label: string}[] =
  [
    {activity: 'Business', icon: 'business-center', label: 'Business'},
    {activity: 'Dinner', icon: 'restaurant', label: 'Dinner'},
    {activity: 'Casual', icon: 'weekend', label: 'Casual'},
    {activity: 'Beach', icon: 'beach-access', label: 'Beach'},
    {activity: 'Active', icon: 'fitness-center', label: 'Active'},
    {activity: 'Formal', icon: 'stars', label: 'Formal'},
    {activity: 'Sightseeing', icon: 'photo-camera', label: 'Sightseeing'},
    {activity: 'Cold Weather', icon: 'ac-unit', label: 'Cold Weather'},
  ];

type Props = {
  selected: TripActivity[];
  onToggle: (activity: TripActivity) => void;
};

const ActivityChips = ({selected, onToggle}: Props) => {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: tokens.borderRadius.full,
      borderWidth: 1.5,
    },
    chipActive: {
      backgroundColor: theme.colors.button1,
      borderColor: theme.colors.button1,
    },
    chipInactive: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.surfaceBorder,
    },
    chipLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    labelActive: {
      color: '#FFFFFF',
    },
    labelInactive: {
      color: theme.colors.foreground2,
    },
  });

  return (
    <View style={styles.container}>
      {ACTIVITY_CONFIG.map(({activity, icon, label}) => {
        const isActive = selected.includes(activity);
        return (
          <AppleTouchFeedback
            key={activity}
            onPress={() => onToggle(activity)}
            hapticStyle="impactLight">
            <View
              style={[
                styles.chip,
                isActive ? styles.chipActive : styles.chipInactive,
              ]}>
              <Icon
                name={icon}
                size={16}
                color={isActive ? '#FFFFFF' : theme.colors.foreground2}
              />
              <Text
                style={[
                  styles.chipLabel,
                  isActive ? styles.labelActive : styles.labelInactive,
                ]}>
                {label}
              </Text>
            </View>
          </AppleTouchFeedback>
        );
      })}
    </View>
  );
};

export default ActivityChips;
