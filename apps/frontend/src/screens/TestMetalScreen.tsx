import React from 'react';
import {Text} from 'react-native';
import MetalCanvas from '../components/MetalCanvas';
import {SafeAreaView} from 'react-native-safe-area-context';

export default function TestMetalScreen() {
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: 'black'}}>
      <Text style={{color: 'white', textAlign: 'center', marginTop: 20}}>
        Metal Shader Test
      </Text>
      <MetalCanvas />
    </SafeAreaView>
  );
}
