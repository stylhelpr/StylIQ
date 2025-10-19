import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';

export default function OutfitCard({outfit}) {
  return (
    <View key={outfit.id} style={styles.card}>
      <Text style={styles.title}>{outfit.name}</Text>

      <View style={styles.imagesRow}>
        {outfit.top?.imageUrl ? (
          <Image source={{uri: outfit.top.imageUrl}} style={styles.image} />
        ) : null}
        {outfit.bottom?.imageUrl ? (
          <Image source={{uri: outfit.bottom.imageUrl}} style={styles.image} />
        ) : null}
        {outfit.shoes?.imageUrl ? (
          <Image source={{uri: outfit.shoes.imageUrl}} style={styles.image} />
        ) : null}
      </View>

      {outfit.notes ? <Text style={styles.notes}>{outfit.notes}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1c1c1c',
    borderColor: '#333',
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  imagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  image: {
    width: 100,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  notes: {
    color: '#ccc',
    fontSize: 14,
  },
});
