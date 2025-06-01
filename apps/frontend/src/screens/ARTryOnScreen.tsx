import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';

const ARTryOnScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AR Try-On Preview</Text>
      <Image
        source={require('../assets/ar-placeholder.png')} // Add a mock AR overlay image
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.caption}>
        This is a placeholder for future AR try-on functionality.
      </Text>
    </View>
  );
};

export default ARTryOnScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  caption: {
    marginTop: 16,
    color: 'gray',
    fontSize: 14,
    textAlign: 'center',
  },
});
