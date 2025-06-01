import React, {useState, useRef} from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Platform,
  PermissionsAndroid,
  ToastAndroid,
  Alert,
} from 'react-native';
import OverlayItem from '../components/OverlayItem/OverlayItem';
import OutfitCarousel from '../components/OutfitCarousel/OutfitCarousel';
import ViewShot from 'react-native-view-shot';
import CameraRoll from '@react-native-camera-roll/camera-roll';
import {Image as RNImage} from 'react-native';

import stripedShirt from '../assets/images/striped-shirt1.png'; // ✅ your local shirt
// import userPhoto from '../assets/images/full-body-temp1.png'; // not needed if coming from props

type WardrobeItem = {
  name: string;
  imageUri: string;
};

type Outfit = {
  top?: WardrobeItem;
  bottom?: WardrobeItem;
  shoes?: WardrobeItem;
};

type Props = {
  userPhotoUri: string;
  outfit: Outfit;
  outfitOptions?: Outfit[];
};

const {width: screenWidth} = Dimensions.get('window');

export default function TryOnOverlayScreen({
  userPhotoUri,
  outfit,
  outfitOptions,
}: Props) {
  const [currentOutfit, setCurrentOutfit] = useState(outfit);
  const viewRef = useRef(null);

  const captureImage = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission required',
            'Storage permission is needed to save images.',
          );
          return;
        }
      }

      const uri = await (viewRef.current as any).capture();
      await CameraRoll.save(uri, {type: 'photo'});

      if (Platform.OS === 'android') {
        ToastAndroid.show('Look saved to gallery!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Saved', 'Your look has been saved to Photos.');
      }
    } catch (e) {
      console.error('Save failed:', e);
      Alert.alert('Error', 'Failed to save image.');
    }
  };

  return (
    <View style={styles.container}>
      <ViewShot
        ref={viewRef}
        style={StyleSheet.absoluteFill}
        options={{format: 'jpg', quality: 0.9}}>
        {/* 📸 User full-body photo */}
        <Image source={{uri: userPhotoUri}} style={styles.userImage} />

        {/* 🧥 Hardcoded local shirt overlay test */}
        <OverlayItem
          imageUri={RNImage.resolveAssetSource(stripedShirt).uri}
          defaultStyle={{
            position: 'absolute',
            top: '23%',
            left: '10%',
            width: screenWidth * 0.8,
            height: screenWidth * 0.6,
          }}
        />

        {/* 🧠 Outfit overlays */}
        {currentOutfit.top && (
          <OverlayItem
            imageUri={currentOutfit.top.imageUri}
            defaultStyle={styles.topOverlay}
          />
        )}
        {currentOutfit.bottom && (
          <OverlayItem
            imageUri={currentOutfit.bottom.imageUri}
            defaultStyle={styles.bottomOverlay}
          />
        )}
        {currentOutfit.shoes && (
          <OverlayItem
            imageUri={currentOutfit.shoes.imageUri}
            defaultStyle={styles.shoesOverlay}
          />
        )}
      </ViewShot>

      {outfitOptions && outfitOptions.length > 1 && (
        <OutfitCarousel outfits={outfitOptions} onSelect={setCurrentOutfit} />
      )}

      <TouchableOpacity style={styles.captureButton} onPress={captureImage}>
        <Text style={styles.captureText}>Save Look</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  userImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  topOverlay: {
    position: 'absolute',
    top: '25%',
    left: '20%',
    width: screenWidth * 0.6,
    height: screenWidth * 0.3,
  },
  bottomOverlay: {
    position: 'absolute',
    top: '50%',
    left: '22%',
    width: screenWidth * 0.55,
    height: screenWidth * 0.35,
  },
  shoesOverlay: {
    position: 'absolute',
    bottom: '5%',
    left: '30%',
    width: screenWidth * 0.4,
    height: screenWidth * 0.15,
  },
  captureButton: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  captureText: {
    color: '#fff',
    fontWeight: '600',
  },
});
