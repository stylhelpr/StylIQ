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

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, date: string) => void;
};

export default function OutfitNameModal({visible, onClose, onSave}: Props) {
  const {theme} = useAppTheme();
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

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.title, {color: theme.colors.foreground}]}>
            Name this outfit
          </Text>

          <TextInput
            placeholder="e.g. Date Night"
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
            style={{marginTop: 12}}>
            <Text style={{color: theme.colors.primary}}>
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
                    selectedColor: theme.colors.primary,
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
            <TouchableOpacity onPress={onClose} style={styles.button}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.button}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
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
  },
  button: {
    marginLeft: 12,
  },
  buttonText: {
    fontWeight: '600',
    color: '#007AFF',
    fontSize: 16,
  },
});
