// src/screens/SettingsScreen.tsx

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Switch,
  useColorScheme,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import type {ThemeType} from '../context/ThemeContext';

const skinOptions: {
  key: ThemeType | 'system';
  label: string;
  color: string;
}[] = [
  {key: 'system', label: 'System Default', color: '#888888'},
  {key: 'modernDark', label: 'Modern Dark', color: '#00050e'},
  {key: 'modernDark2', label: 'Modern Dark 2', color: '#121212'},
  {key: 'modernLight', label: 'Modern Light', color: '#f5f5f5'},
  {key: 'retro', label: 'Retro', color: '#FDEDDC'},
  {key: 'minimal', label: 'Minimal', color: '#FFFFFF'},
  {key: 'vibrant', label: 'Vibrant', color: '#1B0032'},
  {key: 'nord', label: 'Nord', color: '#2E3440'},
  {key: 'dracula', label: 'Dracula', color: '#282A36'},
  {key: 'oneDark', label: 'One Dark', color: '#282C34'},
  {key: 'solarizedLight', label: 'Solarized Light', color: '#FDF6E3'},
  {key: 'solarizedDark', label: 'Solarized Dark', color: '#002B36'},
  {key: 'pastelPop', label: 'Pastel Pop', color: '#FFE5EC'},
  {key: 'cyberpunk', label: 'Cyberpunk', color: '#0D0221'},
  {key: 'monokai', label: 'Monokai', color: '#272822'},
];

export default function SettingsScreen() {
  const {theme, mode, setSkin} = useAppTheme();
  const systemScheme = useColorScheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const colors = theme.colors;

  const currentLabel =
    skinOptions.find(s => s.key === mode)?.label || 'Unknown';

  const handleSkinSelect = (skin: ThemeType | 'system') => {
    if (skin === 'system') {
      const fallback = systemScheme === 'dark' ? 'dark' : 'light';
      setSkin(fallback);
    } else {
      setSkin(skin);
    }
    setModalVisible(false);
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.background}]}
      contentContainerStyle={{paddingBottom: 40}}>
      <Text style={[styles.title, {color: colors.primary}]}>⚙️ Settings</Text>

      {/* 🔔 Notifications toggle */}
      <View style={styles.row}>
        <Text style={[styles.label, {color: colors.foreground}]}>
          Enable Notifications
        </Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
        />
      </View>

      {/* 🎨 Skin select */}
      <Text style={[styles.label, {color: colors.foreground}]}>
        App Color Theme
      </Text>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={[styles.selectButton, {backgroundColor: colors.surface}]}>
        <Text style={{color: colors.foreground}}>{currentLabel}</Text>
      </TouchableOpacity>

      {/* 🔽 Skin dropdown modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}>
          <View
            style={[styles.modalContent, {backgroundColor: colors.surface}]}>
            {skinOptions.map(option => (
              <TouchableOpacity
                key={option.key}
                onPress={() => handleSkinSelect(option.key as ThemeType)}
                style={[
                  styles.optionRow,
                  {
                    backgroundColor:
                      mode === option.key ? colors.primary : 'transparent',
                  },
                ]}>
                <View
                  style={[styles.colorSwatch, {backgroundColor: option.color}]}
                />
                <Text
                  style={{
                    color:
                      mode === option.key
                        ? colors.background
                        : colors.foreground,
                  }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
  },
  selectButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 30,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderRadius: 12,
    padding: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  colorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
});
