// components/ResponsiveContainer.tsx
import React from 'react';
import {View, useWindowDimensions, StyleSheet} from 'react-native';

export default function ResponsiveContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const {width} = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: isTablet ? 32 : 16,
          width: '100%',
          maxWidth: '100%',
        },
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: 'transparent', // or add 'red' temporarily for debug
  },
});
