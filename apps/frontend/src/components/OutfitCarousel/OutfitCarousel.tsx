import React from 'react';
import {FlatList, Image, Pressable, StyleSheet, View} from 'react-native';

type WardrobeItem = {
  name: string;
  imageUri: string;
};

type Outfit = {
  top?: WardrobeItem;
  bottom?: WardrobeItem;
  shoes?: WardrobeItem;
};

type Props = {
  outfits: Outfit[];
  onSelect: (outfit: Outfit) => void;
};

export default function OutfitCarousel({outfits, onSelect}: Props) {
  return (
    <View style={styles.container}>
      <FlatList
        data={outfits}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({item}) => {
          const thumbUri =
            item.top?.imageUri || item.bottom?.imageUri || item.shoes?.imageUri;
          return (
            <Pressable style={styles.item} onPress={() => onSelect(item)}>
              <Image
                source={{uri: thumbUri}}
                style={styles.image}
                resizeMode="contain"
              />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    paddingHorizontal: 10,
  },
  item: {
    marginHorizontal: 8,
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 4,
  },
  image: {
    width: 60,
    height: 60,
  },
});
