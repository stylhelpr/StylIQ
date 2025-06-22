import React, {useState, useEffect} from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: (selected: boolean) => void;
};

export const Chip = ({label, selected = false, onPress}: Props) => {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const [isSelected, setIsSelected] = useState(selected);

  useEffect(() => {
    setIsSelected(selected);
  }, [selected]);

  const handlePress = () => {
    const newValue = !isSelected;
    setIsSelected(newValue);
    onPress?.(newValue);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        globalStyles.pill,
        {
          marginBottom: 12,
          backgroundColor: isSelected ? colors.primary : colors.background,
          borderColor: isSelected ? colors.primary : colors.surface,
        },
      ]}>
      <Text
        style={[
          globalStyles.pillText,
          {color: isSelected ? colors.background : colors.foreground},
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};
