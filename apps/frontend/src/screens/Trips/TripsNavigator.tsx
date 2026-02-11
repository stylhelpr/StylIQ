import React, {useState, useEffect, useCallback} from 'react';
import {Trip, TripsScreen} from '../../types/trips';
import {getTrips} from '../../lib/trips/tripsStorage';
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

  const refreshTrips = useCallback(() => {
    getTrips().then(setTrips);
  }, []);

  useEffect(() => {
    refreshTrips();
  }, [refreshTrips]);

  const goToCreate = useCallback(() => {
    setScreen('create');
  }, []);

  const goToHome = useCallback(() => {
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
          onTripCreated={trip => goToCapsule(trip.id)}
          userGenderPresentation={userGenderPresentation}
        />
      );
    case 'capsule':
      if (!selectedTrip) {
        goToHome();
        return null;
      }
      return (
        <TripCapsuleScreen
          trip={selectedTrip}
          wardrobe={wardrobe}
          onBack={goToHome}
          onRefresh={refreshTrips}
          userGenderPresentation={userGenderPresentation}
        />
      );
    default:
      return null;
  }
};

export default TripsNavigator;
