import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View, AppState} from 'react-native';
import MapView, {Marker, Region, PROVIDER_DEFAULT} from 'react-native-maps';
import Geolocation, {
  GeoError,
  GeoPosition,
} from 'react-native-geolocation-service';
import {ensureLocationPermission} from '../../utils/permissions';

type Props = {
  height?: number;
  useCustomPin?: boolean;
  enabled?: boolean;
};

export default function LiveLocationMap({
  height = 220,
  useCustomPin = false,
  enabled = true,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const appState = useRef(AppState.currentState);

  const [coord, setCoord] = useState<{lat: number; lng: number} | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 33.89,
    longitude: -118.31,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  });

  // Track whether user has manually zoomed/panned
  const userHasInteracted = useRef(false);

  const centerOn = useCallback(
    (pos: GeoPosition, isInitial = false) => {
      const {latitude, longitude} = pos.coords;
      // console.log('📍 Position fix:', latitude, longitude);

      // For initial position or if user hasn't interacted, animate to default zoom
      if (isInitial || !userHasInteracted.current) {
        const next: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        };
        setCoord({lat: latitude, lng: longitude});
        setRegion(next);
        mapRef.current?.animateToRegion(next, 500);
      } else {
        // User has interacted - only update coordinates, preserve their zoom level
        setCoord({lat: latitude, lng: longitude});
        // Just update the center without changing zoom
        mapRef.current?.animateCamera(
          {center: {latitude, longitude}},
          {duration: 500},
        );
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    if (!enabled) {
      // console.log('🛑 Location tracking disabled — clearing all watchers');
      if (watchIdRef.current != null) {
        Geolocation.clearWatch(watchIdRef.current);
        // console.log('🧹 Cleared watch ID:', watchIdRef.current);
        watchIdRef.current = null;
      }
      Geolocation.stopObserving();
      // console.log('🧩 Observers stopped.');
      return;
    }

    // console.log('✅ Location tracking enabled — requesting permission');
    (async () => {
      const ok = await ensureLocationPermission();
      if (!ok || !mounted) {
        // console.log('⚠️ Permission denied or component unmounted early');
        return;
      }

      Geolocation.getCurrentPosition(
        pos => {
          if (!mounted) return;
          // console.log('📍 Initial position received');
          centerOn(pos, true);
        },
        (err: GeoError) => console.warn('❌ getCurrentPosition error:', err),
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 2000},
      );

      watchIdRef.current = Geolocation.watchPosition(
        pos => {
          if (!mounted) return;
          // console.log(
          //   '🛰️ watchPosition update:',
          //   pos.coords.latitude,
          //   pos.coords.longitude,
          // );
          centerOn(pos);
        },
        (err: GeoError) => console.warn('❌ watchPosition error:', err),
        {
          enableHighAccuracy: true,
          distanceFilter: 10,
          interval: 8000,
          fastestInterval: 4000,
          showsBackgroundLocationIndicator: false,
        },
      );
      // console.log('🎯 Geolocation watcher started, ID:', watchIdRef.current);
    })();

    // optional: stop updates when app backgrounded
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active' && watchIdRef.current != null) {
        // console.log('📴 App backgrounded — stopping GPS updates');
        Geolocation.clearWatch(watchIdRef.current);
        Geolocation.stopObserving();
        watchIdRef.current = null;
      }
      appState.current = state;
    });

    return () => {
      mounted = false;
      if (watchIdRef.current != null) {
        // console.log('🧹 Cleanup → clearing watcher ID:', watchIdRef.current);
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // console.log('🧩 Cleanup → stopping all observers.');
      Geolocation.stopObserving();
      sub.remove();
    };
  }, [centerOn, enabled]);

  return (
    <View style={[styles.container, {height}]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        showsUserLocation={enabled}
        followsUserLocation={false}
        showsCompass
        rotateEnabled={false}
        initialRegion={region}
        onMapReady={() => mapRef.current?.animateToRegion(region, 250)}
        onRegionChangeComplete={() => {
          // Mark that user has interacted with the map (zoomed/panned)
          userHasInteracted.current = true;
        }}
      />
      {enabled && useCustomPin && coord ? (
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

//////////////////////

// // src/components/LiveLocationMap/LiveLocationMap.tsx
// // -----------------------------------------------------------------------------
// // 🗺️ LiveLocationMap — Power-optimized, toggleable live GPS map
// // -----------------------------------------------------------------------------
// // • Fully disables GPS tracking when `enabled` = false
// // • Uses safe cleanup for both watch + observing
// // • Gracefully handles permissions
// // • Animates to region on fix
// // -----------------------------------------------------------------------------

// import React, {useCallback, useEffect, useRef, useState} from 'react';
// import {StyleSheet, View} from 'react-native';
// import MapView, {Marker, Region, PROVIDER_DEFAULT} from 'react-native-maps';
// import Geolocation, {
//   GeoError,
//   GeoPosition,
// } from 'react-native-geolocation-service';
// import {ensureLocationPermission} from '../../utils/permissions';

// type Props = {
//   height?: number;
//   useCustomPin?: boolean; // optional extra pin on top of the blue dot
//   enabled?: boolean; // ✅ NEW: toggle to completely disable location updates
// };

// export default function LiveLocationMap({
//   height = 220,
//   useCustomPin = false,
//   enabled = true,
// }: Props) {
//   const mapRef = useRef<MapView | null>(null);
//   const watchIdRef = useRef<number | null>(null);

//   const [coord, setCoord] = useState<{lat: number; lng: number} | null>(null);
//   const [region, setRegion] = useState<Region>({
//     // Default to South Bay LA so initial render isn’t ocean
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

//   useEffect(() => {
//     let mounted = true;

//     // ✅ When toggle is OFF, clear any existing watchers and bail out early
//     if (!enabled) {
//       if (watchIdRef.current != null) {
//         Geolocation.clearWatch(watchIdRef.current);
//         watchIdRef.current = null;
//       }
//       Geolocation.stopObserving();
//       return;
//     }

//     (async () => {
//       const ok = await ensureLocationPermission();
//       if (!ok || !mounted) return;

//       // 🔹 One-time initial fix
//       Geolocation.getCurrentPosition(
//         pos => {
//           if (!mounted) return;
//           centerOn(pos);
//         },
//         (_err: GeoError) => {},
//         {enableHighAccuracy: true, timeout: 15000, maximumAge: 2000},
//       );

//       // 🔹 Continuous updates
//       watchIdRef.current = Geolocation.watchPosition(
//         pos => {
//           if (!mounted) return;
//           centerOn(pos);
//         },
//         (_err: GeoError) => {},
//         {
//           enableHighAccuracy: true,
//           distanceFilter: 10, // 🔧 adjust for balance (5–25m typical)
//           interval: 8000, // Android: update every 8s
//           fastestInterval: 4000, // Android min interval
//           showsBackgroundLocationIndicator: false,
//         },
//       );
//     })();

//     // ✅ Cleanup: clear watcher + stop observer
//     return () => {
//       mounted = false;
//       if (watchIdRef.current != null) {
//         Geolocation.clearWatch(watchIdRef.current);
//         watchIdRef.current = null;
//       }
//       Geolocation.stopObserving();
//     };
//   }, [centerOn, enabled]);

//   return (
//     <View style={[styles.container, {height}]}>
//       <MapView
//         ref={r => (mapRef.current = r)}
//         style={StyleSheet.absoluteFill}
//         provider={PROVIDER_DEFAULT}
//         showsUserLocation={enabled} // ✅ only show blue dot when active
//         followsUserLocation={enabled}
//         showsCompass
//         rotateEnabled={false}
//         initialRegion={region}
//         onMapReady={() => mapRef.current?.animateToRegion(region, 250)}
//       />

//       {/* Optional user pin */}
//       {enabled && useCustomPin && coord ? (
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

//////////////////

// import React, {useCallback, useEffect, useRef, useState} from 'react';
// import {StyleSheet, View} from 'react-native';
// import MapView, {Marker, Region, PROVIDER_DEFAULT} from 'react-native-maps';
// import Geolocation, {
//   GeoError,
//   GeoPosition,
// } from 'react-native-geolocation-service';
// import {ensureLocationPermission} from '../../utils/permissions';

// type Props = {
//   height?: number;
//   useCustomPin?: boolean; // optional extra pin on top of the blue dot
// };

// export default function LiveLocationMap({
//   height = 220,
//   useCustomPin = false,
// }: Props) {
//   const mapRef = useRef<MapView | null>(null);
//   const watchIdRef = useRef<number | null>(null);

//   const [coord, setCoord] = useState<{lat: number; lng: number} | null>(null);
//   const [region, setRegion] = useState<Region>({
//     // Default to South Bay LA so initial render isn’t ocean
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

//   useEffect(() => {
//     let mounted = true;

//     (async () => {
//       const ok = await ensureLocationPermission();
//       if (!ok || !mounted) return;

//       // Initial fix
//       Geolocation.getCurrentPosition(
//         pos => {
//           if (!mounted) return;
//           centerOn(pos);
//         },
//         // eslint-disable-next-line @typescript-eslint/no-unused-vars
//         (_err: GeoError) => {},
//         {enableHighAccuracy: true, timeout: 15000, maximumAge: 2000},
//       );

//       // Live updates
//       watchIdRef.current = Geolocation.watchPosition(
//         pos => {
//           if (!mounted) return;
//           centerOn(pos);
//         },
//         // eslint-disable-next-line @typescript-eslint/no-unused-vars
//         (_err: GeoError) => {},
//         {
//           enableHighAccuracy: true,
//           distanceFilter: 5, // meters; tune for battery/smoothness
//           interval: 5000, // Android
//           fastestInterval: 2000, // Android
//         },
//       );
//     })();

//     return () => {
//       mounted = false;
//       if (watchIdRef.current != null)
//         Geolocation.clearWatch(watchIdRef.current);
//       Geolocation.stopObserving();
//     };
//   }, [centerOn]);

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
//         onMapReady={() => mapRef.current?.animateToRegion(region, 250)}
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
