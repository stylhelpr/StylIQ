import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import MapView, {Marker, Region, PROVIDER_DEFAULT} from 'react-native-maps';
import Geolocation, {
  GeoError,
  GeoPosition,
} from 'react-native-geolocation-service';
import {ensureLocationPermission} from '../../utils/permissions';

type Props = {
  height?: number;
  useCustomPin?: boolean; // optional extra pin on top of the blue dot
};

export default function LiveLocationMap({
  height = 220,
  useCustomPin = false,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const [coord, setCoord] = useState<{lat: number; lng: number} | null>(null);
  const [region, setRegion] = useState<Region>({
    // Default to South Bay LA so initial render isn’t ocean
    latitude: 33.89,
    longitude: -118.31,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  });

  const centerOn = useCallback((pos: GeoPosition) => {
    const {latitude, longitude} = pos.coords;
    const next: Region = {
      latitude,
      longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };
    setCoord({lat: latitude, lng: longitude});
    setRegion(next);
    mapRef.current?.animateToRegion(next, 500);
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const ok = await ensureLocationPermission();
      if (!ok || !mounted) return;

      // Initial fix
      Geolocation.getCurrentPosition(
        pos => {
          if (!mounted) return;
          centerOn(pos);
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_err: GeoError) => {},
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 2000},
      );

      // Live updates
      watchIdRef.current = Geolocation.watchPosition(
        pos => {
          if (!mounted) return;
          centerOn(pos);
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_err: GeoError) => {},
        {
          enableHighAccuracy: true,
          distanceFilter: 5, // meters; tune for battery/smoothness
          interval: 5000, // Android
          fastestInterval: 2000, // Android
        },
      );
    })();

    return () => {
      mounted = false;
      if (watchIdRef.current != null)
        Geolocation.clearWatch(watchIdRef.current);
      Geolocation.stopObserving();
    };
  }, [centerOn]);

  return (
    <View style={[styles.container, {height}]}>
      <MapView
        ref={r => (mapRef.current = r)}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        showsUserLocation
        followsUserLocation
        showsCompass
        rotateEnabled={false}
        initialRegion={region}
        onMapReady={() => mapRef.current?.animateToRegion(region, 250)}
      />
      {useCustomPin && coord ? (
        <Marker
          coordinate={{latitude: coord.lat, longitude: coord.lng}}
          title="You"
          description="Current location"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
});

//////////////////

// // components/LiveLocationMap.tsx
// import React, {useEffect, useRef, useState, useCallback} from 'react';
// import {Alert, Platform, StyleSheet, View} from 'react-native';
// import MapView, {Marker, Region, PROVIDER_DEFAULT} from 'react-native-maps';
// import Geolocation, {
//   GeoError,
//   GeoPosition,
// } from 'react-native-geolocation-service';
// import {ensureLocationPermission} from 'utils/permissions';
// import {API_BASE_URL} from '../../config/api';
// // If you plan to auth-protect the heartbeat endpoint, wire your token here.
// // import { useAuth0 } from 'react-native-auth0';

// type Props = {
//   height?: number;
//   useCustomPin?: boolean;
//   postHeartbeat?: boolean; // defaults false; enable after your endpoint is ready
// };

// const THROTTLE_MS = 15000;

// export default function LiveLocationMap({
//   height = 220,
//   useCustomPin = false,
//   postHeartbeat = false,
// }: Props) {
//   const mapRef = useRef<MapView | null>(null);
//   const watchIdRef = useRef<number | null>(null);
//   const lastPostRef = useRef<number>(0);

//   const [coord, setCoord] = useState<{lat: number; lng: number} | null>(null);
//   const [region, setRegion] = useState<Region>({
//     // Default to LA area so it doesn't start in the ocean
//     latitude: 33.89,
//     longitude: -118.31,
//     latitudeDelta: 0.015,
//     longitudeDelta: 0.015,
//   });

//   const centerOn = useCallback((pos: GeoPosition) => {
//     const {latitude, longitude} = pos.coords;
//     const next: Region = {
//       latitude,
//       longitude,
//       latitudeDelta: 0.015,
//       longitudeDelta: 0.015,
//     };
//     setCoord({lat: latitude, lng: longitude});
//     setRegion(next);
//     mapRef.current?.animateToRegion(next, 500);
//   }, []);

//   const postHeartbeat = useCallback(
//     async (pos: GeoPosition) => {
//       if (!postHeartbeat) return;
//       const now = Date.now();
//       if (now - lastPostRef.current < THROTTLE_MS) return;
//       lastPostRef.current = now;

//       try {
//         await fetch(`${API_BASE_URL}/location/heartbeat`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           // Add Authorization header if your endpoint is behind JWT:
//           // headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` }
//           body: JSON.stringify({
//             lat: pos.coords.latitude,
//             lng: pos.coords.longitude,
//             accuracy: pos.coords.accuracy,
//             heading: pos.coords.heading,
//             speed: pos.coords.speed,
//             timestamp: new Date(pos.timestamp).toISOString(),
//           }),
//         });
//       } catch {
//         // heartbeat is best-effort; no noisy errors
//       }
//     },
//     [postHeartbeat],
//   );

//   useEffect(() => {
//     let mounted = true;

//     (async () => {
//       // Try without prompting again — you already call ensureLocationPermission in HomeScreen
//       let ok = true;
//       try {
//         await new Promise<GeoPosition>((resolve, reject) => {
//           Geolocation.getCurrentPosition(resolve, reject, {
//             enableHighAccuracy: true,
//             timeout: 8000,
//             maximumAge: 2000,
//           });
//         });
//       } catch {
//         // If it fails (e.g., first launch), request once here as fallback
//         ok = await ensureLocationPermission();
//       }
//       if (!ok || !mounted) return;

//       // Initial fix
//       Geolocation.getCurrentPosition(
//         pos => {
//           if (!mounted) return;
//           centerOn(pos);
//           postHeartbeat(pos);
//         },
//         (err: GeoError) => {
//           Alert.alert(
//             'Location error',
//             err?.message ?? 'Failed to get location.',
//           );
//         },
//         {enableHighAccuracy: true, timeout: 15000, maximumAge: 2000},
//       );

//       // Live updates
//       watchIdRef.current = Geolocation.watchPosition(
//         pos => {
//           if (!mounted) return;
//           centerOn(pos);
//           postHeartbeat(pos);
//         },
//         // eslint-disable-next-line @typescript-eslint/no-unused-vars
//         (_err: GeoError) => {
//           /* ignore noisy watch errors after first fix */
//         },
//         {
//           enableHighAccuracy: true,
//           distanceFilter: 5, // meters
//           interval: 5000, // Android
//           fastestInterval: 2000,
//         },
//       );
//     })();

//     return () => {
//       mounted = false;
//       if (watchIdRef.current != null)
//         Geolocation.clearWatch(watchIdRef.current);
//       Geolocation.stopObserving();
//     };
//   }, [centerOn, postHeartbeat]);

//   return (
//     <View style={[styles.container, {height}]}>
//       <MapView
//         ref={r => (mapRef.current = r)}
//         style={StyleSheet.absoluteFill}
//         provider={PROVIDER_DEFAULT}
//         showsUserLocation
//         followsUserLocation
//         showsCompass
//         rotateEnabled={false}
//         initialRegion={region}
//         onMapReady={() => {
//           // Ensure the camera snaps to region on mount
//           mapRef.current?.animateToRegion(region, 250);
//         }}
//       />
//       {useCustomPin && coord ? (
//         <Marker
//           coordinate={{latitude: coord.lat, longitude: coord.lng}}
//           title="You"
//           description="Current location"
//         />
//       ) : null}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     width: '100%',
//     borderRadius: 16,
//     overflow: 'hidden',
//   },
// });
