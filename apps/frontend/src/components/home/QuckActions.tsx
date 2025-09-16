import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';

type Screen = 'Home' | 'Profile' | 'Explore' | 'Closet' | 'Settings';

type QuickActionsProps = {
  navigate: (screen: Screen) => void;
  onAskAI: () => void;
};

const QuickActions: React.FC<QuickActionsProps> = ({navigate, onAskAI}) => {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigate('Closet')}>
        <Text style={styles.label}>👕 Closet</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onAskAI}>
        <Text style={styles.label}>🎤 Ask AI</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigate('Explore')}>
        <Text style={styles.label}>🔍 Explore</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    backgroundColor: '#eee',
    borderRadius: 12,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QuickActions;
