import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {Calendar} from 'react-native-calendars';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, date: string) => void;
};

export default function OutfitNameModal({visible, onClose, onSave}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCalendar, setShowCalendar] = useState(false);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), date);
      setName('');
      setDate(new Date().toISOString().split('T')[0]);
      setShowCalendar(false);
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modal: {
      borderRadius: tokens.borderRadius.md,
      padding: 20,
      width: '100%',
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      marginBottom: 12,
      textAlign: 'center',
      color: theme.colors.foreground,
    },
    input: {
      borderWidth: theme.borderWidth.md,
      padding: 12,
      fontSize: 17,
      backgroundColor: theme.colors.surface3,
      borderRadius: tokens.borderRadius.md,
    },
    calendarWrapper: {
      marginTop: 10,
      borderRadius: 12,
      overflow: 'hidden',
    },
    buttons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 16,
      marginBottom: 2,
    },
    button: {
      marginLeft: 12,
      backgroundColor: theme.colors.button1,
    },
    buttonText: {
      fontWeight: '600',
      color: theme.colors.buttonText1,
      fontSize: 16,
    },
  });

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.title, {color: theme.colors.foreground}]}>
            Save This Outfit
          </Text>

          <TextInput
            placeholder='"Give it a good name here"'
            placeholderTextColor={theme.colors.muted}
            value={name}
            onChangeText={setName}
            style={[
              styles.input,
              {
                color: theme.colors.foreground,
                borderColor: theme.colors.surface,
              },
            ]}
          />

          <TouchableOpacity
            onPress={() => setShowCalendar(prev => !prev)}
            style={{marginTop: 16}}>
            <Text
              style={{
                color: theme.colors.foreground,
                fontSize: 17,
                fontWeight: '500',
              }}>
              📅 {new Date(date).toDateString()}
            </Text>
          </TouchableOpacity>

          {showCalendar && (
            <View style={styles.calendarWrapper}>
              <Calendar
                onDayPress={(day: {
                  dateString: React.SetStateAction<string>;
                }) => {
                  setDate(day.dateString);
                  setShowCalendar(false);
                }}
                markedDates={{
                  [date]: {
                    selected: true,
                    selectedColor: theme.colors.foreground,
                  },
                }}
                theme={{
                  backgroundColor: theme.colors.surface,
                  calendarBackground: theme.colors.surface,
                  textSectionTitleColor: theme.colors.foreground,
                  selectedDayBackgroundColor: theme.colors.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: theme.colors.primary,
                  dayTextColor: theme.colors.foreground,
                  textDisabledColor: theme.colors.muted,
                  monthTextColor: theme.colors.foreground,
                  arrowColor: theme.colors.primary,
                }}
              />
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={onClose}
              style={[
                globalStyles.buttonPrimary,
                {paddingHorizontal: 28, backgroundColor: theme.colors.surface3},
              ]}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[
                globalStyles.buttonPrimary,
                {paddingHorizontal: 28, marginLeft: 12},
              ]}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
