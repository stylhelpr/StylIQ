import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  onAddPhoto: () => void;
  onAddBio: () => void;
};

const AddPhotoAndBioSection: React.FC<Props> = ({onAddPhoto, onAddBio}) => {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 24, // increased gap for more spacing
      marginBottom: 20,
    },
    card: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.foreground2,
      borderRadius: 16,
      paddingVertical: 24,
      paddingHorizontal: 12,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      marginHorizontal: 6, // slight horizontal margin to add spacing between cards
    },
    iconPlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    iconText: {
      color: theme.colors.primary,
      fontSize: 28,
      fontWeight: '700',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.primary,
      marginBottom: 6,
    },
    cardSubtitle: {
      fontSize: 14,
      color: theme.colors.foreground,
      textAlign: 'center',
    },
    button: {
      marginTop: 12,
      backgroundColor: '#405de6',
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 24,
    },
    buttonText: {
      color: theme.colors.onPrimary,
      fontWeight: '700',
      fontSize: 16,
    },
  });

  return (
    <View style={styles.row}>
      {/* Add Profile Photo Card */}
      <TouchableOpacity style={styles.card} onPress={onAddPhoto}>
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>👤</Text>
        </View>
        <Text style={styles.cardTitle}>Add a profile photo</Text>
        <Text style={styles.cardSubtitle}>
          Choose a photo to represent yourself on the app.
        </Text>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Add photo</Text>
        </View>
      </TouchableOpacity>

      {/* Add Bio Card */}
      <TouchableOpacity style={styles.card} onPress={onAddBio}>
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>💬</Text>
        </View>
        <Text style={styles.cardTitle}>Add a bio</Text>
        <Text style={styles.cardSubtitle}>
          Tell others a little bit about yourself.
        </Text>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Add bio</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default AddPhotoAndBioSection;
