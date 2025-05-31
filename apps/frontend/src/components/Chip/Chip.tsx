import React, {useState} from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  label: string;
  onPress?: (selected: boolean) => void;
};

export const Chip = ({label, onPress}: Props) => {
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const [selected, setSelected] = useState(false);

  const handlePress = () => {
    setSelected(prev => !prev);
    onPress?.(!selected);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}>
      <Text
        style={[
          styles.text,
          {color: selected ? colors.background : colors.foreground},
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
