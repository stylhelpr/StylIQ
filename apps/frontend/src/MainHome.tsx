import React, {useEffect, useState, useRef} from 'react';
import {
  Text,
  Pressable,
  View,
  Image,
  ScrollView,
  Alert,
  Button,
  Platform,
  StyleSheet,
} from 'react-native';

import {
  getMessaging,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import * as Animatable from 'react-native-animatable';
import Geolocation from 'react-native-geolocation-service';
import Contacts from 'react-native-contacts';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAppTheme} from './context/ThemeContext';
import {ensureLocationPermission} from './utils/permissions';
import {OPENWEATHER_API_KEY} from '@env';
import {fetchWeather} from './utils/travelWeather';
import MapScreen from './components/MapScreen/MapScreen';
import VoiceControlComponent from './components/VoiceControlComponent/VoiceControlComponent';
import ImagePickerGrid from './components/ImagePickerGrid/ImagePickerGrid';
import AddReminderButton from './components/AddReminderButon/AddReminderButton';
import {theme} from './styles/tokens/theme';
import {SafeAreaView} from 'react-native-safe-area-context';
import ResponsiveContainer from './components/ResponsiveContainer';
import RootNavigator from './navigation/RootNavigator';
import GestureImage from './components/GestureImage/GestureImage';
import './lib/firebaseConfig';

type NotificationPayload = {
  title?: string;
  message?: string;
  userInfo?: any;
  data?: any;
  [key: string]: any;
};

type Props = {
  weather: any;
  error: string | null;
  contacts: any[];
  selectedImage: string | null;
  setSelectedImage: (uri: string | null) => void;
  toggleTheme: () => void;
};

const MainHome = ({
  weather,
  error,
  contacts,
  selectedImage,
  setSelectedImage,
}: Props) => {
  const {theme: currentTheme, toggleTheme} = useAppTheme();

  useEffect(() => {
    PushNotification.configure({
      onNotification: (notification: NotificationPayload) => {
        console.log('🔔 Local Notification:', notification);
      },
      requestPermissions: Platform.OS === 'ios',
    });

    PushNotification.createChannel(
      {
        channelId: 'style-channel',
        channelName: 'Style Reminders',
      },
      created => console.log(`🛠 Notification channel created: ${created}`),
    );
  }, []);

  useEffect(() => {
    const setupPush = async () => {
      const authStatus = await getMessaging().requestPermission();
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;
      if (enabled) {
        const token = await getMessaging().getToken();
        console.log('📱 FCM Token:', token);
      }
    };
    setupPush();
  }, []);

  useEffect(() => {
    const unsubscribe = getMessaging().onMessage(async remoteMessage => {
      Alert.alert(
        remoteMessage.notification?.title || 'Notification',
        remoteMessage.notification?.body || 'You have a new message.',
      );
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchLocationAndWeather = async () => {
      const hasPermission = await ensureLocationPermission();
      if (!hasPermission) return setError('Location permission denied');

      Geolocation.getCurrentPosition(
        async pos => {
          try {
            const data = await fetchWeather(
              pos.coords.latitude,
              pos.coords.longitude,
            );
            weather(data);
          } catch {
            setError('Failed to fetch weather');
          }
        },
        err => setError('Failed to get location'),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 1000,
        },
      );
    };
    fetchLocationAndWeather();
  }, []);

  const loadContacts = async () => {
    try {
      const permission = await Contacts.requestPermission();
      if (permission === 'authorized') {
        const allContacts = await Contacts.getAll();
        console.log('📒 Contacts:', allContacts); // log or use elsewhere
      } else {
        console.warn('❌ Contacts permission denied');
      }
    } catch (err) {
      console.warn('❌ Failed to load contacts:', err);
    }
  };

  const saveReminder = async () => {
    try {
      await AsyncStorage.setItem('lastReminder', 'brown-suede-loafers');
      console.log('✅ Saved reminder');
    } catch (err) {
      console.warn('❌ Save error', err);
    }
  };

  const loadReminder = async () => {
    try {
      const reminder = await AsyncStorage.getItem('lastReminder');
      console.log('📦 Loaded reminder:', reminder);
    } catch (err) {
      console.warn('❌ Load error', err);
    }
  };

  return (
    <SafeAreaView
      style={{flex: 1, backgroundColor: currentTheme.colors.background}}>
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{flexGrow: 1}}
        showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <VoiceControlComponent />

          <View style={styles.imagePickerContainer}>
            <ImagePickerGrid onSelectImage={uri => setSelectedImage(uri)} />
          </View>

          {weather ? (
            <View style={styles.weatherBlock}>
              <Text
                style={[
                  styles.weatherLocation,
                  {color: currentTheme.colors.primary},
                ]}>
                📍 {weather.celsius.name}
              </Text>
              <Text
                style={[
                  styles.weatherDescription,
                  {color: currentTheme.colors.secondary},
                ]}>
                🌡️ {weather.fahrenheit.main.temp}°F —{' '}
                {weather.celsius.weather[0].description}
              </Text>
            </View>
          ) : error ? (
            <Text style={{color: currentTheme.colors.error}}>{error}</Text>
          ) : (
            <Text style={{color: currentTheme.colors.primary}}>
              Loading weather...
            </Text>
          )}

          <View style={styles.mapContainer}>
            <MapScreen />
          </View>

          <Pressable onPress={toggleTheme} style={styles.toggleButton}>
            <Text style={styles.toggleButtonText}>Toggle Theme</Text>
          </Pressable>

          <View style={styles.reminderButtonWrapper}>
            <AddReminderButton />
          </View>

          {selectedImage && <GestureImage uri={selectedImage} />}
        </ResponsiveContainer>
      </ScrollView>

      <Button title="Save Reminder" onPress={saveReminder} />
      <Button title="Load Reminder" onPress={loadReminder} />
      <Button title="Load Contacts" onPress={loadContacts} />

      {contacts.length > 0 && (
        <View style={styles.contactList}>
          <Text
            style={[styles.contactTitle, {color: currentTheme.colors.primary}]}>
            Sample Contacts:
          </Text>
          {contacts.slice(0, 5).map(contact => (
            <Text
              key={contact.recordID}
              style={[
                styles.contactItem,
                {color: currentTheme.colors.secondary},
              ]}>
              • {contact.givenName} {contact.familyName}
            </Text>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  imagePickerContainer: {
    height: 300,
  },
  weatherBlock: {
    marginTop: theme.light.spacing.lg,
  },
  weatherLocation: {
    fontSize: theme.light.fontSize.lg,
  },
  weatherDescription: {
    fontSize: theme.light.fontSize.md,
  },
  mapContainer: {
    height: 300,
    marginTop: theme.light.spacing.lg,
  },
  toggleButton: {
    marginTop: theme.light.spacing.xl,
    backgroundColor: theme.light.colors.surface,
    padding: theme.light.spacing.md,
    borderRadius: theme.light.borderRadius.md,
  },
  toggleButtonText: {
    color: theme.light.colors.primary,
    textAlign: 'center',
  },
  reminderButtonWrapper: {
    marginTop: theme.light.spacing.xxl,
    backgroundColor: theme.light.colors.primary,
    padding: theme.light.spacing.md,
    borderRadius: theme.light.borderRadius.md,
  },
  contactList: {
    marginTop: theme.light.spacing.xl,
  },
  contactTitle: {
    fontSize: theme.light.fontSize.md,
  },
  contactItem: {
    fontSize: theme.light.fontSize.sm,
  },
});

export default MainHome;

function setError(arg0: string) {
  throw new Error('Function not implemented.');
}
