import React from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

export default function TrendChips({
  items,
  onTap,
}: {
  items: string[];
  onTap?: (s: string) => void;
}) {
  if (!items?.length) return null;
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {items.map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => onTap?.(t)}
            activeOpacity={0.8}
            style={styles.chip}>
            <Text style={styles.label}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#000'},
  row: {gap: 8, paddingHorizontal: 4},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  label: {color: '#fff', fontWeight: '600'},
});
