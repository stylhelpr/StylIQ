import React, {useEffect, useRef} from 'react';
import {Text, StyleSheet, Animated} from 'react-native';

type Props = {
  onReady: () => void;
};

export default function SplashScreen({onReady}: Props) {
  const logoFade = useRef(new Animated.Value(0)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(logoFade, {
      toValue: 1,
      duration: 0,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(screenFade, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onReady();
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [onReady, logoFade, screenFade]);

  return (
    <Animated.View style={[styles.container, {opacity: screenFade}]}>
      <Animated.View style={[styles.content, {opacity: logoFade}]}>
        <Text style={styles.logo}>StylHelpr</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(144, 0, 255, 1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 65,
    fontWeight: '900',
    color: '#fff',
  },
});
