import React from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

type Props = {
  imageUri: string;
  onBack: () => void;
};

export default function TryOnPreviewScreen({imageUri, onBack}: Props) {
  const {theme} = useAppTheme();

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Icon name="arrow-back" size={24} color={theme.colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, {color: theme.colors.foreground}]}>
          Try-On Preview
        </Text>
      </View>

      <Image
        source={{uri: imageUri}}
        style={styles.image}
        resizeMode="contain"
      />

      <Text style={[styles.placeholderText, {color: theme.colors.surface}]}>
        👁️ AR Try-On Coming Soon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
  },
  image: {
    width: '90%',
    height: 300,
    borderRadius: 12,
    marginBottom: 24,
  },
  placeholderText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
});
