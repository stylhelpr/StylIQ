// import React from 'react';
// import {View, StyleSheet} from 'react-native';
// import GlobalHeader from '../GlobalHeader/GlobalHeader';
// import type {Screen} from '../../navigation/types';
// import type {Animated} from 'react-native';

// type Props = {
//   children: React.ReactNode;
//   navigate?: (screen: Screen) => void;
//   showSettings?: boolean;
//   scrollY?: Animated.Value; // ✅ add this
// };

// export default function LayoutWrapper({
//   children,
//   navigate,
//   showSettings,
//   scrollY,
// }: Props) {
//   return (
//     <View style={styles.wrapper}>
//       {navigate && (
//         <GlobalHeader
//           navigate={navigate}
//           showSettings={showSettings}
//           scrollY={scrollY} // ✅ pass down
//         />
//       )}
//       {children}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   wrapper: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
// });

////////////////

import React from 'react';
import {View, StyleSheet} from 'react-native';
import GlobalHeader from '../GlobalHeader/GlobalHeader';
import type {Screen} from '../../navigation/types';

type Props = {
  children: React.ReactNode;
  navigate?: (screen: Screen) => void;
  showSettings?: boolean;
  hideHeader?: boolean;
};

export default function LayoutWrapper({
  children,
  navigate,
  showSettings,
  hideHeader,
}: Props) {
  return (
    <View style={styles.wrapper}>
      {navigate && !hideHeader && (
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
