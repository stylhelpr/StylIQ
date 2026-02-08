import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';
import {Trip} from '../../types/trips';
import {deleteTrip} from '../../lib/trips/tripsStorage';
import TripCard from '../../components/Trips/TripCard';
import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';

type Props = {
  trips: Trip[];
  onNewTrip: () => void;
  onTripPress: (tripId: string) => void;
  onRefresh: () => void;
};

const TripsHomeScreen = ({trips, onNewTrip, onTripPress, onRefresh}: Props) => {
  const {theme} = useAppTheme();

  const handleDelete = (trip: Trip) => {
    Alert.alert(
      'Delete Trip',
      `Remove "${trip.destination}" trip?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTrip(trip.id);
            onRefresh();
          },
        },
      ],
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
          marginTop: 100,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.lg,
      paddingTop: tokens.spacing.md,
      paddingBottom: tokens.spacing.lg,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.foreground,
    },
    newBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.button1,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: tokens.borderRadius.full,
    },
    newBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    listContent: {
      paddingHorizontal: tokens.spacing.lg,
      paddingBottom: 120,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      paddingTop: 80,
    },
    emptyIcon: {
      marginBottom: 20,
      opacity: 0.3,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 15,
      color: theme.colors.foreground2,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 28,
    },
    emptyCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.button1,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: tokens.borderRadius.full,
    },
    emptyCtaText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon
        name="flight-takeoff"
        size={64}
        color={theme.colors.foreground}
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyTitle}>Plan Your First Trip</Text>
      <Text style={styles.emptySubtitle}>
        Create a capsule wardrobe for your next adventure. Pack smarter, look
        great.
      </Text>
      <AppleTouchFeedback onPress={onNewTrip} hapticStyle="impactMedium">
        <View style={styles.emptyCta}>
          <Icon name="add" size={20} color="#FFFFFF" />
          <Text style={styles.emptyCtaText}>New Trip</Text>
        </View>
      </AppleTouchFeedback>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trips</Text>
        {trips.length > 0 && (
          <AppleTouchFeedback onPress={onNewTrip} hapticStyle="impactMedium">
            <View style={styles.newBtn}>
              <Icon name="add" size={18} color="#FFFFFF" />
              <Text style={styles.newBtnText}>New Trip</Text>
            </View>
          </AppleTouchFeedback>
        )}
      </View>

      {trips.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({item}) => (
            <TripCard
              trip={item}
              onPress={() => onTripPress(item.id)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}
    </View>
  );
};

export default TripsHomeScreen;
