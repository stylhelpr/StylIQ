import React, {useState} from 'react';
import {View, Button} from 'react-native';
import MainHome from '../MainHome';

// Declare allowed screens
type Screen = 'Home' | 'Profile' | 'Explore' | 'Closet' | 'Settings';

// Props for this screen
type Props = {
  navigate: (screen: Screen, params?: {userId?: string}) => void;
};

export default function HomeScreen({navigate}: Props) {
  const [weather, setWeather] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <View style={{flex: 1}}>
      <Button
        title="Go to Profile"
        onPress={() => navigate('Profile', {userId: '123'})}
      />
      <MainHome
        weather={weather}
        error={error}
        contacts={contacts}
        selectedImage={selectedImage}
        setSelectedImage={setSelectedImage}
        toggleTheme={() => {}}
      />
    </View>
  );
}
