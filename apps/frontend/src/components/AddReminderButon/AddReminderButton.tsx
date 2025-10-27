import React, {useState} from 'react';
import {View, Button, Platform, Text, Alert} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNCalendarEvents from 'react-native-calendar-events';
import {API_BASE_URL} from '../../config/api';
import {useUUID} from '../../context/UUIDContext';

export default function AddReminderButton() {
  const userId = useUUID(); // ✅ must be inside component
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 📅 Handle date selection
  const handleChange = (_: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  // ─────────────────────────────────────────────────────────────
  // 🧥 Add an outbound calendar reminder (WRITE)
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
          alarms: [{date: 0}], // alert at start
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

  // ─────────────────────────────────────────────────────────────
  // 🔍 Read upcoming events from native iOS calendar (READ)
  const readUpcomingEvents = async () => {
    try {
      let permission = await RNCalendarEvents.checkPermissions();
      if (permission !== 'authorized') {
        const newPerm = await RNCalendarEvents.requestPermissions();
        if (newPerm !== 'authorized') {
          Alert.alert('Permission denied', 'Cannot read calendar events.');
          return;
        }
      }

      const now = new Date();
      const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const events = await RNCalendarEvents.fetchAllEvents(
        now.toISOString(),
        twoWeeksLater.toISOString(),
        [], // all calendars
      );

      const simplified = events.map(e => ({
        id: e.id,
        title: e.title || '(no title)',
        startDate: e.startDate,
        endDate: e.endDate,
        location: e.location || '',
        notes: e.notes || '',
      }));

      console.log('🗓️ Upcoming events found:', simplified.length);

      // 🔄 Send to backend for AI reasoning
      if (!userId) {
        Alert.alert('User not found', 'Cannot sync events without a user ID.');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/calendar/sync-native`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          userId,
          events: simplified,
        }),
      });

      if (!res.ok) throw new Error('Failed to sync with backend');

      Alert.alert('✅ Synced', `${simplified.length} events sent to backend`);
    } catch (err) {
      console.error('❌ Calendar read error:', err);
      Alert.alert('Error', 'Could not read calendar events.');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 🧭 Render
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

      <View style={{height: 12}} />

      <Button
        title="Sync Upcoming Calendar Events"
        color={Platform.OS === 'ios' ? '#007AFF' : undefined}
        onPress={readUpcomingEvents}
      />
    </View>
  );
}

///////////////

// import React, {useState} from 'react';
// import {View, Button, Platform, Text, Alert} from 'react-native';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import RNCalendarEvents from 'react-native-calendar-events';

// export default function AddReminderButton() {
//   const [date, setDate] = useState(new Date());
//   const [showPicker, setShowPicker] = useState(false);

//   const handleChange = (_: any, selectedDate?: Date) => {
//     setShowPicker(Platform.OS === 'ios');
//     if (selectedDate) setDate(selectedDate);
//   };

//   const addReminder = async () => {
//     const start = date;
//     const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min later

//     try {
//       const permission = await RNCalendarEvents.requestPermissions();
//       if (permission !== 'authorized') {
//         Alert.alert('Permission denied', 'Cannot access calendar.');
//         return;
//       }

//       const eventId = await RNCalendarEvents.saveEvent(
//         '🧥 Style Reminder: Try New Look',
//         {
//           startDate: start.toISOString(),
//           endDate: end.toISOString(),
//           alarms: [{date: 0}], // Alert at start time
//           notes: 'Pair outfit with brown Ferragamo loafers.',
//           description: 'Your outfit reminder from StylIQ.',
//         },
//       );

//       console.log('📅 Event added:', eventId);
//       Alert.alert(
//         '✅ Reminder Added',
//         'You will be notified at the event time.',
//       );
//     } catch (err) {
//       console.warn('❌ Calendar error:', err);
//       Alert.alert('Error', 'Could not add calendar reminder.');
//     }
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
//       <Button title="Add Calendar Reminder" onPress={addReminder} />
//     </View>
//   );
// }
