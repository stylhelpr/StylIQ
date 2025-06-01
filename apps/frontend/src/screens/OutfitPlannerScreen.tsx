import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {getAllPlannedOutfits} from '../utils/calendarStorage';
import {CalendarOutfit} from '../types/calendarTypes';
import {useAppTheme} from '../context/ThemeContext';

export default function OutfitPlannerScreen() {
  const {theme} = useAppTheme();
  const [calendarData, setCalendarData] = useState<{
    [date: string]: CalendarOutfit;
  }>({});

  useEffect(() => {
    getAllPlannedOutfits().then(setCalendarData);
  }, []);

  return (
    <ScrollView style={{backgroundColor: theme.colors.background, padding: 16}}>
      {Object.entries(calendarData).length === 0 ? (
        <Text style={{color: theme.colors.foreground}}>
          No planned outfits yet.
        </Text>
      ) : (
        Object.entries(calendarData)
          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
          .map(([date, outfit]) => (
            <View
              key={outfit.id}
              style={{
                marginBottom: 16,
                padding: 12,
                backgroundColor: theme.colors.surface,
                borderRadius: 10,
              }}>
              <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
                {outfit.name || 'Unnamed Outfit'}
              </Text>
              <Text style={{color: '#888', fontSize: 12}}>{date}</Text>
              {outfit.notes ? (
                <Text
                  style={{
                    color: theme.colors.foreground,
                    fontStyle: 'italic',
                    marginTop: 6,
                  }}>
                  {outfit.notes}
                </Text>
              ) : null}
              {typeof outfit.rating === 'number' && (
                <View style={{flexDirection: 'row', marginTop: 6}}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Text key={i}>{i <= outfit.rating ? '⭐' : '☆'}</Text>
                  ))}
                </View>
              )}
            </View>
          ))
      )}
    </ScrollView>
  );
}
