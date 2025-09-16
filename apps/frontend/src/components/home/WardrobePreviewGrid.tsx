import React from 'react';
import {ScrollView, View, Image, StyleSheet} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';

const wardrobeItems = [
  {id: '1', uri: 'https://via.placeholder.com/100'},
  {id: '2', uri: 'https://via.placeholder.com/100'},
  {id: '3', uri: 'https://via.placeholder.com/100'},
  {id: '4', uri: 'https://via.placeholder.com/100'},
  {id: '5', uri: 'https://via.placeholder.com/100'},
  {id: '6', uri: 'https://via.placeholder.com/100'},
];

const WardrobePreviewGrid = () => {
  const {theme} = useAppTheme();

  return (
    <View style={{marginBottom: theme.spacing.lg}}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {wardrobeItems.map(item => (
          <Image
            key={item.id}
            source={{uri: item.uri}}
            style={{
              width: 100,
              height: 100,
              borderRadius: theme.borderRadius.md,
              marginRight: theme.spacing.lg,
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default WardrobePreviewGrid;
