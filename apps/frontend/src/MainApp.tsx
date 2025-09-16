import React from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';

const MainApp = () => (
  <SafeAreaView style={{flex: 1}} edges={['top', 'bottom']}>
    <RootNavigator />
  </SafeAreaView>
);

export default MainApp;
