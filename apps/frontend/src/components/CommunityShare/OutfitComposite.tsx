import React, {forwardRef} from 'react';
import {View, Image, StyleSheet, Dimensions} from 'react-native';
import ViewShot from 'react-native-view-shot';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 43) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

type OutfitItem = {
  id: string;
  image: string;
  [key: string]: any;
};

type Props = {
  top?: OutfitItem | null;
  bottom?: OutfitItem | null;
  shoes?: OutfitItem | null;
  width?: number;
  height?: number;
};

const OutfitComposite = forwardRef<ViewShot, Props>(
  ({top, bottom, shoes, width = CARD_WIDTH, height = CARD_HEIGHT}, ref) => {
    // Calculate section heights (40% / 40% / 20%)
    const topHeight = height * 0.4;
    const bottomHeight = height * 0.4;
    const shoesHeight = height * 0.2;

    return (
      <ViewShot
        ref={ref}
        options={{format: 'png', quality: 0.95}}
        style={[styles.container, {width, height}]}>
        {/* Top Section - 40% */}
        <View style={[styles.section, {height: topHeight}]}>
          {top?.image ? (
            <Image
              source={{uri: top.image}}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {/* Bottom Section - 40% */}
        <View style={[styles.section, {height: bottomHeight}]}>
          {bottom?.image ? (
            <Image
              source={{uri: bottom.image}}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {/* Shoes Section - 20% */}
        <View style={[styles.section, {height: shoesHeight}]}>
          {shoes?.image ? (
            <Image
              source={{uri: shoes.image}}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </ViewShot>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  section: {
    width: '100%',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
});

export default OutfitComposite;
