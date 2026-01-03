import React, {useEffect, useRef, useState} from 'react';
import {Text, StyleSheet, Animated, View} from 'react-native';
import Video from 'react-native-video';
import {allVideos} from '../assets/data/video-urls';

type Props = {
  onReady: () => void;
};

const FIRST_VIDEO_URL = allVideos[0];

export default function SplashScreen({onReady}: Props) {
  const logoFade = useRef(new Animated.Value(0)).current;
  const screenFade = useRef(new Animated.Value(1)).current;
  const [videoPreloaded, setVideoPreloaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    Animated.timing(logoFade, {
      toValue: 1,
      duration: 0,
      useNativeDriver: true,
    }).start();

    // Minimum splash time of 1 second
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [logoFade]);

  // Navigate when both video is preloaded AND minimum time has elapsed
  useEffect(() => {
    if (videoPreloaded && minTimeElapsed) {
      Animated.timing(screenFade, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        onReady();
      });
    }
  }, [videoPreloaded, minTimeElapsed, screenFade, onReady]);

  return (
    <Animated.View style={[styles.container, {opacity: screenFade}]}>
      <Animated.View style={[styles.content, {opacity: logoFade}]}>
        <Text style={styles.logo}>StylHelpr</Text>
      </Animated.View>

      {/* Hidden video preloader */}
      <View style={styles.hiddenVideo}>
        <Video
          source={{uri: FIRST_VIDEO_URL}}
          paused={true}
          onLoad={() => setVideoPreloaded(true)}
          style={{width: 1, height: 1}}
        />
      </View>
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
  hiddenVideo: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
