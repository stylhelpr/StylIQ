import React, {useState, useEffect, useCallback, useRef} from 'react';
import {Trip, TripsScreen} from '../../types/trips';
import {apiClient} from '../../lib/apiClient';
import TripsHomeScreen from './TripsHomeScreen';
import CreateTripScreen from './CreateTripScreen';
import TripCapsuleScreen from './TripCapsuleScreen';

type Props = {
  navigate: (screen: string, params?: any) => void;
  wardrobe: any[];
  userGenderPresentation?: string;
};

const TripsNavigator = ({navigate, wardrobe, userGenderPresentation}: Props) => {
  const [screen, setScreen] = useState<TripsScreen>('home');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Cache the last valid trip for capsule screen so refreshTrips() can't nuke it
  const capsuleTripRef = useRef<Trip | null>(null);

  const refreshTrips = useCallback(() => {
    apiClient.get('/trips').then(res => {
      const normalized = (res.data ?? []).map((t: any): Trip => ({
        ...t,
        activities: t.activities ?? [],
        weather: t.weather ?? [],
        capsule: t.capsule
          ? {
              ...t.capsule,
              outfits: t.capsule.outfits ?? [],
              packingList: t.capsule.packingList ?? [],
            }
          : null,
      }));
      setTrips(normalized);
    }).catch(() => {
      setTrips([]);
    });
  }, []);

  useEffect(() => {
    refreshTrips();
  }, [refreshTrips]);

  const goToCreate = useCallback(() => {
    setScreen('create');
  }, []);

  const goToHome = useCallback(() => {
    capsuleTripRef.current = null;
    setSelectedTripId(null);
    setScreen('home');
    refreshTrips();
  }, [refreshTrips]);

  const goToCapsule = useCallback(
    (tripId: string) => {
      setSelectedTripId(tripId);
      refreshTrips();
      setScreen('capsule');
    },
    [refreshTrips],
  );

  const selectedTrip = trips.find(t => t.id === selectedTripId) || null;

  switch (screen) {
    case 'home':
      return (
        <TripsHomeScreen
          trips={trips}
          onNewTrip={goToCreate}
          onTripPress={goToCapsule}
          onRefresh={refreshTrips}
        />
      );
    case 'create':
      return (
        <CreateTripScreen
          wardrobe={wardrobe}
          onBack={goToHome}
          onTripCreated={trip => {
            setTrips(prev => [trip, ...prev]);
            setSelectedTripId(trip.id);
            setScreen('capsule');
          }}
          userGenderPresentation={userGenderPresentation}
        />
      );
    case 'capsule': {
      // Use cached trip as fallback when refreshTrips temporarily clears the list
      if (selectedTrip) {
        capsuleTripRef.current = selectedTrip;
      }
      const capsuleTrip = selectedTrip ?? capsuleTripRef.current;
      if (!capsuleTrip) {
        console.log('[Trips] selectedTrip null — HOLD (no auto navigation)');
        return null;
      }
      return (
        <TripCapsuleScreen
          trip={capsuleTrip}
          wardrobe={wardrobe}
          onBack={goToHome}
          onRefresh={refreshTrips}
          userGenderPresentation={userGenderPresentation}
        />
      );
    }
    default:
      return null;
  }
};

export default TripsNavigator;
