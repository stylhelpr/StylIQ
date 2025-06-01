import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useAppTheme} from '../context/ThemeContext';
import {CalendarOutfit} from '../types/calendarTypes';

const CALENDAR_KEY = 'calendarOutfits';

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CalendarPlannerScreen() {
  const {theme, mode} = useAppTheme();
  const [calendarMap, setCalendarMap] = useState<{
    [date: string]: CalendarOutfit;
  }>({});
  const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
  const [newDate, setNewDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadCalendar();
  }, []);

  const loadCalendar = async () => {
    const data = await AsyncStorage.getItem(CALENDAR_KEY);
    if (data) {
      setCalendarMap(JSON.parse(data));
    }
  };

  const handleChangeDate = async (oldDateKey: string, selectedDate: Date) => {
    const newDateKey = getLocalDateString(selectedDate); // ⬅️ use local date
    if (oldDateKey === newDateKey) {
      setShowDatePicker(false);
      setEditingDateKey(null);
      return;
    }

    const updatedMap = {...calendarMap};
    if (updatedMap[newDateKey]) {
      Alert.alert('Another outfit is already planned on this date.');
      setShowDatePicker(false);
      setEditingDateKey(null);
      return;
    }

    updatedMap[newDateKey] = updatedMap[oldDateKey];
    delete updatedMap[oldDateKey];

    await AsyncStorage.setItem(CALENDAR_KEY, JSON.stringify(updatedMap));
    setCalendarMap(updatedMap);
    setShowDatePicker(false);
    setEditingDateKey(null);
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      padding: 16,
      flex: 1,
    },
    card: {
      marginBottom: 16,
      padding: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
    },
    dateText: {
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    nameText: {
      color: theme.colors.foreground,
      marginTop: 2,
      marginBottom: 8,
    },
    imageRow: {
      flexDirection: 'row',
      marginBottom: 10,
    },
    image: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 8,
    },
    changeButton: {
      backgroundColor: '#007AFF',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    changeButtonText: {
      color: '#000',
      fontWeight: '600',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 12,
      color: theme.colors.foreground,
    },
    emptyText: {
      color: theme.colors.foreground,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📅 Outfit Planner</Text>

      {Object.keys(calendarMap).length === 0 ? (
        <Text style={styles.emptyText}>No planned outfits yet.</Text>
      ) : (
        Object.entries(calendarMap).map(([date, outfit]) => (
          <View key={date} style={styles.card}>
            <Text style={styles.dateText}>{date}</Text>
            <Text style={styles.nameText}>
              {outfit.name || 'Unnamed Outfit'}
            </Text>

            <View style={styles.imageRow}>
              {[outfit.top, outfit.bottom, outfit.shoes].map(item =>
                item?.image ? (
                  <Image
                    key={item.id}
                    source={{uri: item.image}}
                    style={styles.image}
                  />
                ) : null,
              )}
            </View>

            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => {
                setEditingDateKey(date);
                setNewDate(new Date(date));
                setShowDatePicker(true);
              }}>
              <Text style={styles.changeButtonText}>Change Date</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {showDatePicker && editingDateKey && (
        <DateTimePicker
          value={newDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          themeVariant={mode === 'dark' ? 'dark' : 'light'}
          onChange={(_, selected) => {
            if (selected) {
              handleChangeDate(editingDateKey, selected);
            } else {
              setShowDatePicker(false);
              setEditingDateKey(null);
            }
          }}
        />
      )}
    </ScrollView>
  );
}

////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   Platform,
//   Alert,
// } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import {useAppTheme} from '../context/ThemeContext';
// import {CalendarOutfit} from '../types/calendarTypes';

// const CALENDAR_KEY = 'calendarOutfits';

// export default function CalendarPlannerScreen() {
//   const {theme} = useAppTheme();
//   const [calendarMap, setCalendarMap] = useState<{
//     [date: string]: CalendarOutfit;
//   }>({});
//   const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
//   const [newDate, setNewDate] = useState(new Date());
//   const [showDatePicker, setShowDatePicker] = useState(false);

//   useEffect(() => {
//     loadCalendar();
//   }, []);

//   const loadCalendar = async () => {
//     const data = await AsyncStorage.getItem(CALENDAR_KEY);
//     if (data) {
//       setCalendarMap(JSON.parse(data));
//     }
//   };

//   const handleChangeDate = async (oldDateKey: string, selectedDate: Date) => {
//     const newDateKey = selectedDate.toISOString().split('T')[0];
//     if (oldDateKey === newDateKey) {
//       setShowDatePicker(false);
//       setEditingDateKey(null);
//       return;
//     }

//     const updatedMap = {...calendarMap};
//     if (updatedMap[newDateKey]) {
//       Alert.alert('Another outfit is already planned on this date.');
//       setShowDatePicker(false);
//       setEditingDateKey(null);
//       return;
//     }

//     updatedMap[newDateKey] = updatedMap[oldDateKey];
//     delete updatedMap[oldDateKey];

//     await AsyncStorage.setItem(CALENDAR_KEY, JSON.stringify(updatedMap));
//     setCalendarMap(updatedMap);
//     setShowDatePicker(false);
//     setEditingDateKey(null);
//   };

//   const styles = StyleSheet.create({
//     container: {
//       backgroundColor: theme.colors.background,
//       padding: 16,
//       flex: 1,
//     },
//     card: {
//       marginBottom: 16,
//       padding: 12,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 10,
//     },
//     dateText: {
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     nameText: {
//       color: theme.colors.foreground,
//       marginTop: 2,
//       marginBottom: 8,
//     },
//     imageRow: {
//       flexDirection: 'row',
//       marginBottom: 10,
//     },
//     image: {
//       width: 60,
//       height: 60,
//       borderRadius: 8,
//       marginRight: 8,
//     },
//     changeButton: {
//       backgroundColor: theme.colors.primary,
//       paddingVertical: 6,
//       paddingHorizontal: 12,
//       borderRadius: 8,
//       alignSelf: 'flex-start',
//     },
//     changeButtonText: {
//       color: '#000',
//       fontWeight: '600',
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: 'bold',
//       marginBottom: 12,
//       color: theme.colors.foreground,
//     },
//     emptyText: {
//       color: theme.colors.foreground,
//     },
//   });

//   return (
//     <ScrollView style={styles.container}>
//       <Text style={styles.title}>📅 Outfit Planner</Text>

//       {Object.keys(calendarMap).length === 0 ? (
//         <Text style={styles.emptyText}>No planned outfits yet.</Text>
//       ) : (
//         Object.entries(calendarMap).map(([date, outfit]) => (
//           <View key={date} style={styles.card}>
//             <Text style={styles.dateText}>{date}</Text>
//             <Text style={styles.nameText}>
//               {outfit.name || 'Unnamed Outfit'}
//             </Text>

//             <View style={styles.imageRow}>
//               {[outfit.top, outfit.bottom, outfit.shoes].map(item =>
//                 item?.image ? (
//                   <Image
//                     key={item.id}
//                     source={{uri: item.image}}
//                     style={styles.image}
//                   />
//                 ) : null,
//               )}
//             </View>

//             <TouchableOpacity
//               style={styles.changeButton}
//               onPress={() => {
//                 setEditingDateKey(date);
//                 setNewDate(new Date(date));
//                 setShowDatePicker(true);
//               }}>
//               <Text style={styles.changeButtonText}>Change Date</Text>
//             </TouchableOpacity>
//           </View>
//         ))
//       )}

//       {showDatePicker && editingDateKey && (
//         <DateTimePicker
//           value={newDate}
//           mode="date"
//           display={Platform.OS === 'ios' ? 'inline' : 'default'}
//           onChange={(_, selected) => {
//             if (selected) {
//               handleChangeDate(editingDateKey, selected);
//             } else {
//               setShowDatePicker(false);
//               setEditingDateKey(null);
//             }
//           }}
//         />
//       )}
//     </ScrollView>
//   );
// }

///////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView, Image} from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAppTheme} from '../context/ThemeContext';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type CalendarOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
// };

// const CALENDAR_KEY = 'calendarOutfits';

// export default function CalendarPlannerScreen() {
//   const {theme} = useAppTheme();
//   const [calendarMap, setCalendarMap] = useState<{
//     [date: string]: CalendarOutfit;
//   }>({});

//   useEffect(() => {
//     loadCalendar();
//   }, []);

//   const loadCalendar = async () => {
//     const data = await AsyncStorage.getItem(CALENDAR_KEY);
//     if (data) {
//       setCalendarMap(JSON.parse(data));
//     }
//   };

//   const styles = StyleSheet.create({
//     container: {
//       backgroundColor: theme.colors.background,
//       padding: 16,
//     },
//     card: {
//       marginBottom: 12,
//       padding: 12,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 10,
//     },
//     dateText: {
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     nameText: {
//       color: theme.colors.foreground,
//       marginBottom: 8,
//     },
//     imageRow: {
//       flexDirection: 'row',
//       gap: 8,
//     },
//     image: {
//       width: 60,
//       height: 60,
//       borderRadius: 8,
//       marginRight: 6,
//     },
//     emptyText: {
//       color: theme.colors.foreground,
//     },
//     header: {
//       fontSize: 24,
//       fontWeight: 'bold',
//       marginBottom: 12,
//       color: theme.colors.foreground,
//     },
//   });

//   return (
//     <ScrollView style={styles.container}>
//       <Text style={styles.header}>📅 Outfit Planner</Text>

//       {Object.keys(calendarMap).length === 0 ? (
//         <Text style={styles.emptyText}>No planned outfits yet.</Text>
//       ) : (
//         Object.entries(calendarMap)
//           .sort(([a], [b]) => a.localeCompare(b)) // Optional: sort by date
//           .map(([date, outfit]) => (
//             <View key={date} style={styles.card}>
//               <Text style={styles.dateText}>{date}</Text>
//               <Text style={styles.nameText}>
//                 {outfit.name || 'Unnamed Outfit'}
//               </Text>
//               <View style={styles.imageRow}>
//                 {[outfit.top, outfit.bottom, outfit.shoes].map(i => (
//                   <Image
//                     key={i.id}
//                     source={{uri: i.image}}
//                     style={styles.image}
//                   />
//                 ))}
//               </View>
//             </View>
//           ))
//       )}
//     </ScrollView>
//   );
// }
