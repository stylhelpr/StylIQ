// src/components/LocationOverlay/LocationOverlay.tsx
import React, {useEffect, useState, useRef} from 'react';
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import MapView, {Marker, Region, PROVIDER_DEFAULT} from 'react-native-maps';
import {tokens} from '../../styles/tokens/tokens';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {fontScale, moderateScale} from '../../utils/scale';
import {useAppTheme} from '../../context/ThemeContext';
import {VoiceBus} from '../../utils/VoiceUtils/VoiceBus';

type LocationData = {
  latitude: number;
  longitude: number;
  city?: string;
  address?: string;
};

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

export default function LocationOverlay() {
  const {theme} = useAppTheme();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [visible, setVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const overlayRef = useRef<Animatable.View & View>(null);
  const containerRef = useRef<Animatable.View & View>(null);

  const styles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.81)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999999,
    },
    container: {
      width: SCREEN_WIDTH * 0.9,
      maxHeight: SCREEN_HEIGHT * 0.7,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 20,
      shadowOffset: {width: 0, height: 10},
      elevation: 10,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md1,
    },
    title: {
      fontSize: fontScale(tokens.fontSize.lg),
      fontWeight: '700',
    },
    closeButton: {
      paddingHorizontal: tokens.spacing.md1,
      paddingVertical: tokens.spacing.sm,
    },
    closeText: {
      fontSize: fontScale(tokens.fontSize.sm),
      fontWeight: '500',
    },
    mapContainer: {
      width: '100%',
      height: 300,
      overflow: 'hidden',
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
    infoContainer: {
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md1,
    },
    infoText: {
      fontSize: fontScale(tokens.fontSize.sm),
      fontWeight: '400',
      textAlign: 'center',
      paddingVertical: 0,
      lineHeight: 20,
    },
  });

  useEffect(() => {
    const handler = (data: LocationData) => {
      setLocation(data);
      setVisible(true);
    };

    VoiceBus.on('location', handler);
    return () => VoiceBus.off('location', handler);
  }, []);

  const handleClose = async () => {
    if (isAnimatingOut) return;
    setIsAnimatingOut(true);

    // Animate out both views
    await Promise.all([
      containerRef.current?.animate('slideOutDown', 300),
      overlayRef.current?.animate('fadeOut', 300),
    ]);

    setVisible(false);
    setIsAnimatingOut(false);
    setTimeout(() => setLocation(null), 50);
  };

  if ((!visible && !isAnimatingOut) || !location) return null;

  const region: Region = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <Animatable.View
      ref={overlayRef}
      animation="fadeIn"
      duration={300}
      style={styles.overlay}>
      <Animatable.View
        ref={containerRef}
        animation="slideInUp"
        duration={400}
        easing="ease-out-quart"
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.muted,
            borderRadius: tokens.borderRadius['4xl'],
            borderWidth: tokens.borderWidth.hairline,
          },
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, {color: theme.colors.foreground}]}>
            Your Location
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={[styles.closeText, {color: theme.colors.foreground}]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={region}
            showsUserLocation
            showsCompass
            rotateEnabled={false}
            onMapReady={() => mapRef.current?.animateToRegion(region, 300)}>
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="You are here"
              description={location.address || location.city || ''}
            />
          </MapView>
        </View>

        {/* Location info */}
        {(location.city || location.address) && (
          <View style={styles.infoContainer}>
            <Text style={[styles.infoText, {color: theme.colors.foreground}]}>
              {location.address || location.city}
            </Text>
          </View>
        )}
      </Animatable.View>
    </Animatable.View>
  );
}

///////////////

// // src/components/LocationOverlay/LocationOverlay.tsx
// import React, {useEffect, useState, useRef} from 'react';
// import {
//   Text,
//   StyleSheet,
//   View,
//   TouchableOpacity,
//   Dimensions,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MapView, {Marker, Region, PROVIDER_DEFAULT} from 'react-native-maps';
// import {tokens} from '../../styles/tokens/tokens';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {fontScale, moderateScale} from '../../utils/scale';
// import {useAppTheme} from '../../context/ThemeContext';
// import {VoiceBus} from '../../utils/VoiceUtils/VoiceBus';

// type LocationData = {
//   latitude: number;
//   longitude: number;
//   city?: string;
//   address?: string;
// };

// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// export default function LocationOverlay() {
//   const {theme} = useAppTheme();
//   const [location, setLocation] = useState<LocationData | null>(null);
//   const [visible, setVisible] = useState(false);
//   const mapRef = useRef<MapView | null>(null);

//   const styles = StyleSheet.create({
//     overlay: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       backgroundColor: 'rgba(0, 0, 0, 0.81)',
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 999999,
//     },
//     container: {
//       width: SCREEN_WIDTH * 0.9,
//       maxHeight: SCREEN_HEIGHT * 0.7,
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 20,
//       shadowOffset: {width: 0, height: 10},
//       elevation: 10,
//     },
//     header: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingHorizontal: tokens.spacing.lg,
//       paddingVertical: tokens.spacing.md1,
//     },
//     title: {
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: '700',
//     },
//     closeButton: {
//       paddingHorizontal: tokens.spacing.md1,
//       paddingVertical: tokens.spacing.sm,
//     },
//     closeText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: '500',
//     },
//     mapContainer: {
//       width: '100%',
//       height: 300,
//       overflow: 'hidden',
//     },
//     map: {
//       ...StyleSheet.absoluteFillObject,
//     },
//     infoContainer: {
//       paddingHorizontal: tokens.spacing.lg,
//       paddingVertical: tokens.spacing.md1,
//     },
//     infoText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: '400',
//       textAlign: 'center',
//       paddingVertical: 0,
//       lineHeight: 20,
//     },
//   });

//   useEffect(() => {
//     const handler = (data: LocationData) => {
//       setLocation(data);
//       setVisible(true);
//     };

//     VoiceBus.on('location', handler);
//     return () => VoiceBus.off('location', handler);
//   }, []);

//   const handleClose = () => {
//     setVisible(false);
//     setTimeout(() => setLocation(null), 300);
//   };

//   if (!visible || !location) return null;

//   const region: Region = {
//     latitude: location.latitude,
//     longitude: location.longitude,
//     latitudeDelta: 0.01,
//     longitudeDelta: 0.01,
//   };

//   return (
//     <Animatable.View animation="fadeIn" duration={300} style={styles.overlay}>
//       <Animatable.View
//         animation="slideInUp"
//         duration={400}
//         style={[
//           styles.container,
//           {
//             backgroundColor: theme.colors.surface,
//             borderColor: theme.colors.muted,
//             borderRadius: tokens.borderRadius['4xl'],
//             borderWidth: tokens.borderWidth.hairline,
//           },
//         ]}>
//         {/* Header */}
//         <View style={styles.header}>
//           <Text style={[styles.title, {color: theme.colors.foreground}]}>
//             Your Location
//           </Text>
//           <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
//             <Text style={[styles.closeText, {color: theme.colors.foreground}]}>
//               Done
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {/* Map */}
//         <View style={styles.mapContainer}>
//           <MapView
//             ref={mapRef}
//             style={styles.map}
//             provider={PROVIDER_DEFAULT}
//             initialRegion={region}
//             showsUserLocation
//             showsCompass
//             rotateEnabled={false}
//             onMapReady={() => mapRef.current?.animateToRegion(region, 300)}>
//             <Marker
//               coordinate={{
//                 latitude: location.latitude,
//                 longitude: location.longitude,
//               }}
//               title="You are here"
//               description={location.address || location.city || ''}
//             />
//           </MapView>
//         </View>

//         {/* Location info */}
//         {(location.city || location.address) && (
//           <View style={styles.infoContainer}>
//             <Text style={[styles.infoText, {color: theme.colors.foreground}]}>
//               {location.address || location.city}
//             </Text>
//           </View>
//         )}
//       </Animatable.View>
//     </Animatable.View>
//   );
// }

/////////////////

// // src/components/LocationOverlay/LocationOverlay.tsx
// import React, {useEffect, useState, useRef} from 'react';
// import {
//   Text,
//   StyleSheet,
//   View,
//   TouchableOpacity,
//   Dimensions,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MapView, {Marker, Region, PROVIDER_DEFAULT} from 'react-native-maps';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {VoiceBus} from '../../utils/VoiceUtils/VoiceBus';

// type LocationData = {
//   latitude: number;
//   longitude: number;
//   city?: string;
//   address?: string;
// };

// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// export default function LocationOverlay() {
//   const {theme} = useAppTheme();
//   const [location, setLocation] = useState<LocationData | null>(null);
//   const [visible, setVisible] = useState(false);
//   const mapRef = useRef<MapView | null>(null);

//   useEffect(() => {
//     const handler = (data: LocationData) => {
//       setLocation(data);
//       setVisible(true);
//     };

//     VoiceBus.on('location', handler);
//     return () => VoiceBus.off('location', handler);
//   }, []);

//   const handleClose = () => {
//     setVisible(false);
//     setTimeout(() => setLocation(null), 300);
//   };

//   if (!visible || !location) return null;

//   const region: Region = {
//     latitude: location.latitude,
//     longitude: location.longitude,
//     latitudeDelta: 0.01,
//     longitudeDelta: 0.01,
//   };

//   return (
//     <Animatable.View
//       animation="fadeIn"
//       duration={300}
//       style={styles.overlay}>
//       <Animatable.View
//         animation="slideInUp"
//         duration={400}
//         style={[
//           styles.container,
//           {
//             backgroundColor: theme.colors.surface2,
//             borderColor: theme.colors.surfaceBorder,
//           },
//         ]}>
//         {/* Header */}
//         <View style={styles.header}>
//           <Text style={[styles.title, {color: theme.colors.foreground}]}>
//             Your Location
//           </Text>
//           <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
//             <Text style={[styles.closeText, {color: theme.colors.foreground}]}>
//               Done
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {/* Map */}
//         <View style={styles.mapContainer}>
//           <MapView
//             ref={mapRef}
//             style={styles.map}
//             provider={PROVIDER_DEFAULT}
//             initialRegion={region}
//             showsUserLocation
//             showsCompass
//             rotateEnabled={false}
//             onMapReady={() => mapRef.current?.animateToRegion(region, 300)}>
//             <Marker
//               coordinate={{
//                 latitude: location.latitude,
//                 longitude: location.longitude,
//               }}
//               title="You are here"
//               description={location.address || location.city || ''}
//             />
//           </MapView>
//         </View>

//         {/* Location info */}
//         {(location.city || location.address) && (
//           <View style={styles.infoContainer}>
//             <Text style={[styles.infoText, {color: theme.colors.foreground}]}>
//               {location.address || location.city}
//             </Text>
//           </View>
//         )}
//       </Animatable.View>
//     </Animatable.View>
//   );
// }

// const styles = StyleSheet.create({
//   overlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 999999,
//   },
//   container: {
//     width: SCREEN_WIDTH * 0.9,
//     maxHeight: SCREEN_HEIGHT * 0.7,
//     borderRadius: tokens.borderRadius.lg,
//     borderWidth: tokens.borderWidth.hairline,
//     overflow: 'hidden',
//     shadowColor: '#000',
//     shadowOpacity: 0.25,
//     shadowRadius: 20,
//     shadowOffset: {width: 0, height: 10},
//     elevation: 10,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: tokens.spacing.lg,
//     paddingVertical: tokens.spacing.md1,
//   },
//   title: {
//     fontSize: 18,
//     fontWeight: '600',
//   },
//   closeButton: {
//     paddingHorizontal: tokens.spacing.md1,
//     paddingVertical: tokens.spacing.sm,
//   },
//   closeText: {
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   mapContainer: {
//     width: '100%',
//     height: 300,
//     overflow: 'hidden',
//   },
//   map: {
//     ...StyleSheet.absoluteFillObject,
//   },
//   infoContainer: {
//     paddingHorizontal: tokens.spacing.lg,
//     paddingVertical: tokens.spacing.md1,
//   },
//   infoText: {
//     fontSize: 14,
//     textAlign: 'center',
//   },
// });
