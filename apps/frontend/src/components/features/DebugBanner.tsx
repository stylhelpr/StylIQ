// DebugBanner.tsx
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

interface Props {
  label: string;
  color?: string;
}

const DebugBanner: React.FC<Props> = ({label, color = '#00FFAA'}) => {
  return (
    <View style={[styles.container, {backgroundColor: color}]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    paddingVertical: 6,
    alignItems: 'center',
    zIndex: 9999,
    opacity: 0.85,
  },
  text: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default DebugBanner;
