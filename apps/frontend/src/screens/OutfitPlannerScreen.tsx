import React, {useEffect, useState} from 'react';
import {View, Text, ScrollView} from 'react-native';
import axios from 'axios';
import {useAuth0} from 'react-native-auth0';
import {useAppTheme} from '../context/ThemeContext';
import {CalendarOutfit} from '../types/calendarTypes';

export default function OutfitPlannerScreen() {
  const {theme} = useAppTheme();
  const {user} = useAuth0();
  const userId = user?.sub || '';

  const [calendarData, setCalendarData] = useState<CalendarOutfit[]>([]);

  useEffect(() => {
    if (!userId) return;

    const fetchScheduledOutfits = async () => {
      try {
        const LOCAL_IP = '192.168.0.106';
        const PORT = 3001;
        const BASE_URL = `http://${LOCAL_IP}:${PORT}/scheduled-outfits`;

        const response = await axios.get(`${BASE_URL}/${userId}`);
        console.log('Fetched scheduled outfits:', response.data);

        const data: CalendarOutfit[] = response.data.map((item: any) => ({
          id: item.id,
          name: item.outfit_name || 'Unnamed Outfit',
          notes: item.notes || '',
          rating: item.rating,
          scheduled_for: item.scheduled_for,
          createdAt: item.created_at,
          // you can add `top`, `bottom`, `shoes` here if your API sends them
        }));

        setCalendarData(data);
      } catch (error) {
        console.error('Error fetching scheduled outfits:', error);
      }
    };

    fetchScheduledOutfits();
  }, [userId]);

  console.log('Rendering calendarData:', calendarData);

  return (
    <ScrollView
      style={{backgroundColor: '#eee', padding: 16, flex: 1}}
      contentContainerStyle={{paddingBottom: 40}}>
      {calendarData.length === 0 ? (
        <Text style={{color: 'black', textAlign: 'center', marginTop: 20}}>
          No planned outfits yet.
        </Text>
      ) : (
        calendarData
          .sort(
            (a, b) =>
              new Date(b.scheduled_for).getTime() -
              new Date(a.scheduled_for).getTime(),
          )
          .map(outfit => (
            <View
              key={outfit.id}
              style={{
                marginBottom: 16,
                padding: 12,
                backgroundColor: 'white',
                borderRadius: 10,
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}>
              <Text style={{color: 'black', fontWeight: '600', fontSize: 16}}>
                {outfit.name}
              </Text>
              <Text style={{color: '#666', fontSize: 12}}>
                {new Date(outfit.scheduled_for).toLocaleDateString()}
              </Text>
              {outfit.notes ? (
                <Text
                  style={{
                    color: '#333',
                    fontStyle: 'italic',
                    marginTop: 6,
                    fontSize: 14,
                  }}>
                  {outfit.notes}
                </Text>
              ) : null}
              {typeof outfit.rating === 'number' && (
                <View style={{flexDirection: 'row', marginTop: 6}}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Text key={i} style={{fontSize: 16}}>
                      {i <= outfit.rating ? '⭐' : '☆'}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))
      )}
    </ScrollView>
  );
}

///////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {getAllPlannedOutfits} from '../utils/calendarStorage';
// import {CalendarOutfit} from '../types/calendarTypes';
// import {useAppTheme} from '../context/ThemeContext';

// export default function OutfitPlannerScreen() {
//   const {theme} = useAppTheme();
//   const [calendarData, setCalendarData] = useState<{
//     [date: string]: CalendarOutfit;
//   }>({});

//   useEffect(() => {
//     getAllPlannedOutfits().then(setCalendarData);
//   }, []);

//   return (
//     <ScrollView style={{backgroundColor: theme.colors.background, padding: 16}}>
//       {Object.entries(calendarData).length === 0 ? (
//         <Text style={{color: theme.colors.foreground}}>
//           No planned outfits yet.
//         </Text>
//       ) : (
//         Object.entries(calendarData)
//           .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
//           .map(([date, outfit]) => (
//             <View
//               key={outfit.id}
//               style={{
//                 marginBottom: 16,
//                 padding: 12,
//                 backgroundColor: theme.colors.surface,
//                 borderRadius: 10,
//               }}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
//                 {outfit.name || 'Unnamed Outfit'}
//               </Text>
//               <Text style={{color: '#888', fontSize: 12}}>{date}</Text>
//               {outfit.notes ? (
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontStyle: 'italic',
//                     marginTop: 6,
//                   }}>
//                   {outfit.notes}
//                 </Text>
//               ) : null}
//               {typeof outfit.rating === 'number' && (
//                 <View style={{flexDirection: 'row', marginTop: 6}}>
//                   {[1, 2, 3, 4, 5].map(i => (
//                     <Text key={i}>{i <= outfit.rating ? '⭐' : '☆'}</Text>
//                   ))}
//                 </View>
//               )}
//             </View>
//           ))
//       )}
//     </ScrollView>
//   );
// }
