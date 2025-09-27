import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  LayoutRectangle,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';

type TooltipBubbleProps = {
  message: string;
  position?: 'top' | 'bottom';
};

export const TooltipBubble: React.FC<TooltipBubbleProps> = ({
  message,
  position = 'top',
}) => {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const [visible, setVisible] = useState(false);
  const [iconLayout, setIconLayout] = useState<LayoutRectangle | null>(null);
  const iconRef = useRef<View>(null);

  const styles = StyleSheet.create({
    infoIcon: {
      marginHorizontal: 8,
    },
    fullscreenOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
    },
    tooltip: {
      position: 'absolute',
      minWidth: 180,
      maxWidth: 250,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
      zIndex: 999,
      marginTop: -38,
      marginLeft: -22.6,
    },
    tooltipText: {
      fontSize: 14,
      textAlign: 'left',
      flexShrink: 1,
      flexWrap: 'wrap',
      lineHeight: 20,
    },
    arrow: {
      position: 'absolute',
      left: '50%',
      marginLeft: -6,
      width: 0,
      height: 0,
      borderLeftWidth: 6,
      borderRightWidth: 6,
      borderStyle: 'solid',
    },
    arrowTop: {
      top: -6,
      borderBottomWidth: 6,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
    },
    arrowBottom: {
      bottom: -6,
      borderTopWidth: 6,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
    },
  });

  const openTooltip = () => {
    iconRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      const tooltipWidth = 180;
      const horizontalMargin = 8;

      // Base position centered above icon
      let tooltipX = x + width / 2 - tooltipWidth / 2;
      let tooltipY = y - 10 - 50;

      // ✅ Clamp horizontally so it never goes off-screen
      if (tooltipX < horizontalMargin) {
        tooltipX = horizontalMargin;
      }
      if (tooltipX + tooltipWidth > screenWidth - horizontalMargin) {
        tooltipX = screenWidth - tooltipWidth - horizontalMargin;
      }

      // ✅ Also clamp vertically if it would go off-screen top (rare)
      if (tooltipY < horizontalMargin) {
        tooltipY = y + height + 10; // flip below if not enough space above
      }

      setIconLayout({x: tooltipX, y: tooltipY, width, height});
      setVisible(true);
    });
  };

  return (
    <View style={{position: 'relative'}}>
      <TouchableOpacity
        ref={iconRef}
        activeOpacity={0.7}
        onPress={openTooltip}
        style={styles.infoIcon}>
        <Icon name="info-outline" size={26} color={theme.colors.button4} />
      </TouchableOpacity>

      {/* ✅ Modal with absolute tooltip positioning */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <Pressable
          style={styles.fullscreenOverlay}
          onPress={() => setVisible(false)}
        />
        {iconLayout && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View
              style={[
                styles.tooltip,
                {
                  backgroundColor: theme.colors.surface3,
                  borderColor: theme.colors.buttonText1,
                  borderWidth: theme.borderWidth.md,
                  top: iconLayout.y,
                  left: iconLayout.x,
                },
              ]}>
              <Text
                style={[styles.tooltipText, {color: theme.colors.foreground}]}>
                {message}
              </Text>
              <View />
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
};

///////////////

// import React, {useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Modal,
//   Pressable,
//   LayoutRectangle,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// type TooltipBubbleProps = {
//   message: string;
//   position?: 'top' | 'bottom';
// };

// export const TooltipBubble: React.FC<TooltipBubbleProps> = ({
//   message,
//   position = 'top',
// }) => {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [visible, setVisible] = useState(false);
//   const [iconLayout, setIconLayout] = useState<LayoutRectangle | null>(null);
//   const iconRef = useRef<View>(null);

//   const styles = StyleSheet.create({
//     infoIcon: {
//       marginHorizontal: 8,
//     },
//     fullscreenOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'transparent',
//     },
//     tooltip: {
//       position: 'absolute',
//       minWidth: 180,
//       maxWidth: 250,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 12,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 8,
//       elevation: 5,
//       zIndex: 999,
//       marginTop: -38,
//       marginLeft: -22.6,
//     },
//     tooltipText: {
//       fontSize: 14,
//       textAlign: 'left',
//       flexShrink: 1,
//       flexWrap: 'wrap',
//       lineHeight: 20,
//     },
//     arrow: {
//       position: 'absolute',
//       left: '50%',
//       marginLeft: -6,
//       width: 0,
//       height: 0,
//       borderLeftWidth: 6,
//       borderRightWidth: 6,
//       borderStyle: 'solid',
//     },
//     arrowTop: {
//       top: -6,
//       borderBottomWidth: 6,
//       borderLeftColor: 'transparent',
//       borderRightColor: 'transparent',
//     },
//     arrowBottom: {
//       bottom: -6,
//       borderTopWidth: 6,
//       borderLeftColor: 'transparent',
//       borderRightColor: 'transparent',
//     },
//   });

//   const openTooltip = () => {
//     iconRef.current?.measureInWindow((x, y, width, height) => {
//       setIconLayout({x, y, width, height});
//       setVisible(true);
//     });
//   };

//   return (
//     <View style={{position: 'relative'}}>
//       <TouchableOpacity
//         ref={iconRef}
//         activeOpacity={0.7}
//         onPress={openTooltip}
//         style={styles.infoIcon}>
//         <Icon name="info-outline" size={26} color={theme.colors.button4} />
//       </TouchableOpacity>

//       {/* ✅ Modal with absolute tooltip positioning */}
//       <Modal
//         visible={visible}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setVisible(false)}>
//         <Pressable
//           style={styles.fullscreenOverlay}
//           onPress={() => setVisible(false)}
//         />
//         {iconLayout && (
//           <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
//             <View
//               style={[
//                 styles.tooltip,
//                 {
//                   backgroundColor: theme.colors.surface3,
//                   borderColor: theme.colors.buttonText1,
//                   borderWidth: theme.borderWidth.md,
//                   top: iconLayout.y - 10 - 50,
//                   left: iconLayout.x + iconLayout.width / 2 - 90,
//                 },
//               ]}>
//               <Text
//                 style={[styles.tooltipText, {color: theme.colors.foreground}]}>
//                 {message}
//               </Text>
//               <View />
//             </View>
//           </View>
//         )}
//       </Modal>
//     </View>
//   );
// };

////////////////////////

// import React, {useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Modal,
//   Pressable,
//   LayoutRectangle,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// type TooltipBubbleProps = {
//   message: string;
//   position?: 'top' | 'bottom';
// };

// export const TooltipBubble: React.FC<TooltipBubbleProps> = ({
//   message,
//   position = 'top',
// }) => {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [visible, setVisible] = useState(false);
//   const [iconLayout, setIconLayout] = useState<LayoutRectangle | null>(null);
//   const iconRef = useRef<View>(null);

//   const styles = StyleSheet.create({
//     infoIcon: {
//       marginHorizontal: 8,
//     },
//     fullscreenOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'transparent',
//     },
//     tooltip: {
//       position: 'absolute',
//       minWidth: 180,
//       maxWidth: 250,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 12,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 8,
//       elevation: 5,
//       zIndex: 999,
//       marginTop: -38,
//       marginLeft: -22.6,
//     },
//     tooltipText: {
//       fontSize: 14,
//       textAlign: 'left',
//       flexShrink: 1,
//       flexWrap: 'wrap',
//       lineHeight: 20,
//     },
//     arrow: {
//       position: 'absolute',
//       left: '50%',
//       marginLeft: -6,
//       width: 0,
//       height: 0,
//       borderLeftWidth: 6,
//       borderRightWidth: 6,
//       borderStyle: 'solid',
//     },
//     arrowTop: {
//       top: -6,
//       borderBottomWidth: 6,
//       borderLeftColor: 'transparent',
//       borderRightColor: 'transparent',
//     },
//     arrowBottom: {
//       bottom: -6,
//       borderTopWidth: 6,
//       borderLeftColor: 'transparent',
//       borderRightColor: 'transparent',
//     },
//   });

//   const openTooltip = () => {
//     iconRef.current?.measureInWindow((x, y, width, height) => {
//       setIconLayout({x, y, width, height});
//       setVisible(true);
//     });
//   };

//   return (
//     <View style={{position: 'relative'}}>
//       <TouchableOpacity
//         ref={iconRef}
//         activeOpacity={0.7}
//         onPress={openTooltip}
//         style={styles.infoIcon}>
//         <Icon name="info-outline" size={26} color={theme.colors.button4} />
//       </TouchableOpacity>

//       {/* ✅ Modal with absolute tooltip positioning */}
//       <Modal
//         visible={visible}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setVisible(false)}>
//         <Pressable
//           style={styles.fullscreenOverlay}
//           onPress={() => setVisible(false)}
//         />

//         {iconLayout && (
//           <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
//             <View
//               style={[
//                 styles.tooltip,
//                 {
//                   backgroundColor: theme.colors.surface3,
//                   borderColor: theme.colors.buttonText1,
//                   borderWidth: theme.borderWidth.md,
//                   top:
//                     position === 'top'
//                       ? iconLayout.y - 50
//                       : iconLayout.y + iconLayout.height + 8,
//                   left: iconLayout.x - 90 + iconLayout.width / 2,
//                 },
//               ]}>
//               <Text
//                 style={[styles.tooltipText, {color: theme.colors.foreground}]}>
//                 {message}
//               </Text>
//               <View
//               // style={[
//               //   styles.arrow,
//               //   position === 'top'
//               //     ? {
//               //         ...styles.arrowBottom,
//               //         borderTopColor: theme.colors.surface,
//               //       }
//               //     : {
//               //         ...styles.arrowTop,
//               //         borderBottomColor: theme.colors.surface,
//               //       },
//               // ]}
//               />
//             </View>
//           </View>
//         )}
//       </Modal>
//     </View>
//   );
// };

/////////////////////

// import React, {useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Modal,
//   Pressable,
//   LayoutRectangle,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// type TooltipBubbleProps = {
//   message: string;
//   position?: 'top' | 'bottom';
// };

// export const TooltipBubble: React.FC<TooltipBubbleProps> = ({
//   message,
//   position = 'top',
// }) => {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [visible, setVisible] = useState(false);
//   const [iconLayout, setIconLayout] = useState<LayoutRectangle | null>(null);
//   const iconRef = useRef<View>(null);

//   const styles = StyleSheet.create({
//     infoIcon: {
//       marginTop: 2,
//       marginHorizontal: 12,
//     },
//     fullscreenOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'transparent',
//     },
//     tooltip: {
//       position: 'absolute',
//       minWidth: 180,
//       maxWidth: 260,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 12,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 8,
//       elevation: 5,
//       zIndex: 999,
//       marginTop: -38,
//       marginLeft: -22.6,
//     },
//     tooltipText: {
//       fontSize: 14,
//       textAlign: 'left',
//       flexShrink: 1,
//       flexWrap: 'wrap',
//       lineHeight: 20,
//     },
//     arrow: {
//       position: 'absolute',
//       left: '50%',
//       marginLeft: -6,
//       width: 0,
//       height: 0,
//       borderLeftWidth: 6,
//       borderRightWidth: 6,
//       borderStyle: 'solid',
//     },
//     arrowTop: {
//       top: -6,
//       borderBottomWidth: 6,
//       borderLeftColor: 'transparent',
//       borderRightColor: 'transparent',
//     },
//     arrowBottom: {
//       bottom: -6,
//       borderTopWidth: 6,
//       borderLeftColor: 'transparent',
//       borderRightColor: 'transparent',
//     },
//   });

//   const openTooltip = () => {
//     iconRef.current?.measureInWindow((x, y, width, height) => {
//       setIconLayout({x, y, width, height});
//       setVisible(true);
//     });
//   };

//   return (
//     <View style={{position: 'relative'}}>
//       <TouchableOpacity
//         ref={iconRef}
//         activeOpacity={0.7}
//         onPress={openTooltip}
//         style={styles.infoIcon}>
//         <Icon name="info-outline" size={20} color={theme.colors.button1} />
//       </TouchableOpacity>

//       {/* ✅ Modal with absolute tooltip positioning */}
//       <Modal
//         visible={visible}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setVisible(false)}>
//         <Pressable
//           style={styles.fullscreenOverlay}
//           onPress={() => setVisible(false)}
//         />

//         {iconLayout && (
//           <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
//             <View
//               style={[
//                 styles.tooltip,
//                 {
//                   backgroundColor: theme.colors.surface3,
//                   //   borderColor: theme.colors.buttonText1,
//                   //   borderWidth: theme.borderWidth.hairline,
//                   top:
//                     position === 'top'
//                       ? iconLayout.y - 50
//                       : iconLayout.y + iconLayout.height + 8,
//                   left: iconLayout.x - 90 + iconLayout.width / 2,
//                 },
//               ]}>
//               <Text
//                 style={[styles.tooltipText, {color: theme.colors.foreground}]}>
//                 {message}
//               </Text>
//               <View
//                 style={[
//                   styles.arrow,
//                   position === 'top'
//                     ? {
//                         ...styles.arrowBottom,
//                         borderTopColor: theme.colors.surface,
//                       }
//                     : {
//                         ...styles.arrowTop,
//                         borderBottomColor: theme.colors.surface,
//                       },
//                 ]}
//               />
//             </View>
//           </View>
//         )}
//       </Modal>
//     </View>
//   );
// };
