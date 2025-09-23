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

  return (
    <View style={[styles.header]}>
      <AppleTouchFeedback
        onPress={onBack}
        hapticStyle="impactMedium"
        style={styles.iconWrapper}>
        <Icon name="arrow-back" size={24} color={theme.colors.button3} />
      </AppleTouchFeedback>
      <Text style={[styles.title, {color: theme.colors.button3}]}>{title}</Text>
    </View>
  );
}
