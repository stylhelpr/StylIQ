import DateTimePicker from '@react-native-community/datetimepicker';
import React, {useState} from 'react';
import {Button, Platform, View, Text} from 'react-native';
import * as AddCalendarEvent from 'react-native-add-calendar-event';

export default function AddReminderButton() {
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);

  const handleChange = (event: any, selectedDate?: Date) => {
    setShow(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const addReminder = () => {
    const startDate = date.toISOString();
    const endDate = new Date(date.getTime() + 30 * 60 * 1000).toISOString();

    const eventConfig = {
      title: 'Style Reminder: Try new look',
      startDate,
      endDate,
      notes: 'Pair outfit with brown Ferragamo loafers.',
      alarms: [{relativeOffset: 0, method: 'alert'}],
    };

    AddCalendarEvent.presentEventCreatingDialog(eventConfig)
      .then(info => {
        console.log('📅 Event added:', info);
      })
      .catch(err => {
        console.warn('❌ Calendar error:', err);
      });
  };

  return (
    <View style={{padding: 20}}>
      <Button title="Pick Time" onPress={() => setShow(true)} />
      <Text style={{marginVertical: 10}}>
        Selected time: {date.toLocaleString()}
      </Text>
      {show && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          onChange={handleChange}
        />
      )}
      <Button title="Add Style Reminder to Calendar" onPress={addReminder} />
    </View>
  );
}
