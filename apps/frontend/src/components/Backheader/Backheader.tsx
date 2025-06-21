import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  title: string;
  onBack: () => void;
};

export default function BackHeader({title, onBack}: Props) {
  const {theme} = useAppTheme();

  return (
    <View style={[styles.header, {backgroundColor: theme.colors.background}]}>
      <AppleTouchFeedback
        onPress={onBack}
        hapticStyle="impactMedium"
        style={styles.iconWrapper}>
        <Icon name="arrow-back" size={24} color={theme.colors.primary} />
      </AppleTouchFeedback>
      <Text style={[styles.title, {color: theme.colors.primary}]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconWrapper: {
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
