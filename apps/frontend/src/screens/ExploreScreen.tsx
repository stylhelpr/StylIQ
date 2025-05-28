import React from 'react';
import {View, Text, StyleSheet, Image, Button} from 'react-native';
import type {Screen, NavigateFunction} from '../navigation/types';
import {useAppTheme} from '../context/ThemeContext';

type Props = {
  navigate: NavigateFunction;
};

export default function ExploreScreen({navigate}: Props) {
  const {mode, theme, toggleTheme} = useAppTheme();
  const colors = theme.colors;
  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <Text style={styles.title}>🌍 Explore Styles</Text>
      <Image
        style={styles.image}
        source={{uri: 'https://placekitten.com/400/200'}}
      />
      <Text style={styles.text}>
        Discover trending outfits and fashion inspiration tailored to your
        taste.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: 20},
  title: {fontSize: 24, fontWeight: 'bold', marginBottom: 10},
  image: {width: '100%', height: 200, marginBottom: 10},
  text: {fontSize: 16, color: '#444'},
});
