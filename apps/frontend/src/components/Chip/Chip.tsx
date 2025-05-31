import React, {useState, useEffect} from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: (selected: boolean) => void;
};

export const Chip = ({label, selected = false, onPress}: Props) => {
  const {theme} = useAppTheme();
  const colors = theme.colors;

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
        styles.chip,
        {
          backgroundColor: isSelected ? colors.primary : colors.surface,
          borderColor: isSelected ? colors.primary : colors.surface,
        },
      ]}>
      <Text
        style={[
          styles.text,
          {color: isSelected ? colors.background : colors.foreground},
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});
