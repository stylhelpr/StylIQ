import React from 'react';
import {View, StyleSheet} from 'react-native';
import GlobalHeader from '../GlobalHeader/GlobalHeader';
import type {Screen} from '../../navigation/types';

type Props = {
  children: React.ReactNode;
  navigate?: (screen: Screen) => void;
  showSettings?: boolean;
};

export default function LayoutWrapper({
  children,
  navigate,
  showSettings,
}: Props) {
  return (
    <View style={styles.wrapper}>
      {navigate && (
        <GlobalHeader navigate={navigate} showSettings={showSettings} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
});
