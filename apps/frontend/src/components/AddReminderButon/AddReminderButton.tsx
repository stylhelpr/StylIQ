import React, {useState} from 'react';
import {View, Button, Platform, Text, Alert} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNCalendarEvents from 'react-native-calendar-events';

export default function AddReminderButton() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (_: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const addReminder = async () => {
    const start = date;
    const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min later

    try {
      const permission = await RNCalendarEvents.requestPermissions();
      if (permission !== 'authorized') {
        Alert.alert('Permission denied', 'Cannot access calendar.');
        return;
      }

      const eventId = await RNCalendarEvents.saveEvent(
        '🧥 Style Reminder: Try New Look',
        {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          alarms: [{date: 0}], // Alert at start time
          notes: 'Pair outfit with brown Ferragamo loafers.',
          description: 'Your outfit reminder from StylIQ.',
        },
      );

      console.log('📅 Event added:', eventId);
      Alert.alert(
        '✅ Reminder Added',
        'You will be notified at the event time.',
      );
    } catch (err) {
      console.warn('❌ Calendar error:', err);
      Alert.alert('Error', 'Could not add calendar reminder.');
    }
  };

  return (
    <View style={{padding: 20}}>
      <Button title="Pick Date & Time" onPress={() => setShowPicker(true)} />
      <Text style={{marginVertical: 10}}>
        Selected: {date.toLocaleString()}
      </Text>
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
        />
      )}
      <Button title="Add Calendar Reminder" onPress={addReminder} />
    </View>
  );
}

//////////////

// import React, {useState} from 'react';
// import {View, Button, Text, Platform} from 'react-native';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import * as AddCalendarEvent from 'react-native-add-calendar-event';

// export default function AddReminderButton() {
//   const [date, setDate] = useState(new Date());
//   const [showPicker, setShowPicker] = useState(false);

//   const handleChange = (_: any, selectedDate?: Date) => {
//     setShowPicker(Platform.OS === 'ios');
//     if (selectedDate) {
//       setDate(selectedDate);
//     }
//   };

//   const handleAddReminder = () => {
//     const startDate = date.toISOString();
//     const endDate = new Date(date.getTime() + 30 * 60 * 1000).toISOString(); // +30min

//     const eventConfig = {
//       title: 'Style Reminder: Try new look',
//       startDate,
//       endDate,
//       notes: 'Pair outfit with brown Ferragamo loafers.',
//       alarms: [{relativeOffset: 0, method: 'alert'}],
//     };

//     AddCalendarEvent.presentEventCreatingDialog(eventConfig)
//       .then(eventInfo => {
//         if (eventInfo?.action === 'SAVED') {
//           console.log('📅 Event added to calendar:', eventInfo);
//         } else {
//           console.log('ℹ️ Event creation cancelled or failed');
//         }
//       })
//       .catch(err => {
//         console.warn('❌ Failed to add calendar event:', err);
//       });
//   };

//   return (
//     <View style={{padding: 20}}>
//       <Button title="Pick Date & Time" onPress={() => setShowPicker(true)} />
//       <Text style={{marginVertical: 10}}>
//         Selected: {date.toLocaleString()}
//       </Text>
//       {showPicker && (
//         <DateTimePicker
//           value={date}
//           mode="datetime"
//           display={Platform.OS === 'ios' ? 'inline' : 'default'}
//           onChange={handleChange}
//         />
//       )}
//       <Button title="Add Calendar Reminder" onPress={handleAddReminder} />
//     </View>
//   );
// }
