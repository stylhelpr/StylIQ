import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import type {AppNotification} from '../../storage/notifications';

const iconFor = (c?: AppNotification['category']) => {
  switch (c) {
    case 'news':
      return '📰';
    case 'outfit':
      return '👗';
    case 'weather':
      return '☔';
    case 'care':
      return '🧼';
    default:
      return '🔔';
  }
};

export default function NotificationCard({
  n,
  onPress,
}: {
  n: AppNotification;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.card, !n.read && styles.cardUnread]}>
      <View style={styles.left}>
        <Text style={styles.icon}>{iconFor(n.category)}</Text>
      </View>
      <View style={styles.center}>
        {n.title ? (
          <Text numberOfLines={1} style={styles.title}>
            {n.title}
          </Text>
        ) : null}
        <Text numberOfLines={2} style={styles.message}>
          {n.message}
        </Text>
        <Text style={styles.time}>
          {new Date(n.timestamp).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: '#111214',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  cardUnread: {
    backgroundColor: '#15161a',
    borderColor: 'rgba(99,102,241,0.4)',
  },
  left: {width: 28, alignItems: 'center', paddingTop: 2},
  icon: {fontSize: 18},
  center: {flex: 1},
  title: {color: '#fff', fontWeight: '800', fontSize: 15, marginBottom: 2},
  message: {color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 18},
  time: {color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 6},
});
