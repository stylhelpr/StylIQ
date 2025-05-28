import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../context/ThemeContext';

const HomeScreen = () => {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      paddingVertical: 0,
      paddingHorizontal: 20,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    greeting: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    iconRow: {
      flexDirection: 'row',
      gap: 10,
    },
    iconCircle: {
      backgroundColor: theme.colors.surface,
      padding: 8,
      marginLeft: 10,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressBox: {
      backgroundColor: theme.colors.secondaryBackground,
      padding: 16,
      borderRadius: 16,
      marginVertical: 24,
    },
    progressContent: {},
    progressText: {
      fontSize: 16,
      marginBottom: 8,
      color: theme.colors.foreground,
    },
    progressButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    progressButtonText: {
      color: theme.colors.buttonText,
    },
    progressFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      gap: 12,
    },
    progressCount: {
      color: theme.colors.subtleText,
    },
    progressBar: {
      flex: 1,
      height: 4,
      backgroundColor: theme.colors.muted,
      borderRadius: 8,
      overflow: 'hidden',
    },
    progressFill: {
      width: '3.3%',
      height: 4,
      backgroundColor: theme.colors.primary,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '500',
      marginBottom: 12,
      color: theme.colors.foreground,
    },
    askBox: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: 'center',
      marginBottom: 16,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.foreground,
    },
    sendButton: {
      backgroundColor: theme.colors.accent,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendArrow: {
      color: '#fff',
      fontSize: 16,
    },
    rowButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    actionCardBlue: {
      backgroundColor: theme.colors.accent,
      flex: 1,
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    actionCardGray: {
      backgroundColor: theme.colors.surface,
      flex: 1,
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    rowItems: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    itemCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plus: {
      fontSize: 28,
      color: theme.colors.subtleText,
    },
    itemImage: {
      width: 64,
      height: 80,
      borderRadius: 12,
    },
    bottomNav: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 12,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      backgroundColor: theme.colors.background,
    },
    navItem: {
      alignItems: 'center',
      flex: 1,
    },
    navText: {
      fontSize: 12,
      color: theme.colors.foreground,
      marginTop: 4,
    },
    navTextDisabled: {
      fontSize: 12,
      color: theme.colors.subtleText,
      marginTop: 4,
    },
    navCenter: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -20,
    },
  });

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{paddingBottom: 90}}>
        <View style={styles.topRow}>
          <Text style={styles.greeting}>Hello, Guest</Text>
          <View style={styles.iconRow}>
            <TouchableOpacity style={styles.iconCircle}>
              <MaterialIcons
                name="notifications"
                size={20}
                color={theme.colors.icon}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle}>
              <MaterialIcons
                name="person"
                size={20}
                color={theme.colors.icon}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.progressBox}>
          <View style={styles.progressContent}>
            <Text style={styles.progressText}>
              Add 30 items and get outfits for tomorrow!
            </Text>
            <TouchableOpacity style={styles.progressButton}>
              <Text style={styles.progressButtonText}>Add items</Text>
            </TouchableOpacity>
            <View style={styles.progressFooter}>
              <Text style={styles.progressCount}>1/30</Text>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Stylist</Text>
          <View style={styles.askBox}>
            <TextInput
              placeholder="Ask anything about fashion!"
              style={styles.input}
              placeholderTextColor={theme.colors.subtleText}
            />
            <TouchableOpacity style={styles.sendButton}>
              <Text style={styles.sendArrow}>➔</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rowButtons}>
            <TouchableOpacity style={styles.actionCardBlue}>
              <Text style={styles.cardText}>Start styling</Text>
              <MaterialIcons name="keyboard-voice" size={26} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCardGray}>
              <Text style={styles.cardText}>History</Text>
              <MaterialIcons
                name="access-time"
                size={26}
                color={theme.colors.icon}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Added Items</Text>
          <View style={styles.rowItems}>
            <TouchableOpacity style={styles.itemCircle}>
              <Text style={styles.plus}>+</Text>
            </TouchableOpacity>
            <Image
              source={{uri: 'https://via.placeholder.com/80x100'}}
              style={styles.itemImage}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today’s Suggestion</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;

////////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   TextInput,
//   ScrollView,
//   Image,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import Feather from 'react-native-vector-icons/Feather';

// const HomeScreen = () => {
//   return (
//     <ScrollView style={styles.container}>
//       {/* Header */}
//       <View style={styles.topRow}>
//         <Text style={styles.greeting}>Hello, Guest</Text>
//         <View style={styles.iconRow}>
//           <TouchableOpacity style={styles.iconCircle}>
//             <MaterialIcons name="notifications-none" size={18} color="#333" />
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.iconCircle}>
//             <MaterialIcons name="person-outline" size={18} color="#333" />
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Progress Box */}
//       <View style={styles.progressBox}>
//         <View style={styles.progressContent}>
//           <Text style={styles.progressText}>
//             Add 30 items and get outfits for tomorrow!
//           </Text>
//           <TouchableOpacity style={styles.progressButton}>
//             <Text style={styles.progressButtonText}>Add items</Text>
//           </TouchableOpacity>
//           <View style={styles.progressFooter}>
//             <Text style={styles.progressCount}>1/30</Text>
//             <View style={styles.progressBar}>
//               <View style={styles.progressFill} />
//             </View>
//           </View>
//         </View>
//       </View>

//       {/* AI Stylist */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>AI Stylist</Text>
//         <View style={styles.askBox}>
//           <TextInput
//             placeholder="Ask anything about fashion!"
//             style={styles.input}
//             placeholderTextColor="#888"
//           />
//           <TouchableOpacity style={styles.sendButton}>
//             <Text style={styles.sendArrow}>➔</Text>
//           </TouchableOpacity>
//         </View>

//         <View style={styles.rowButtons}>
//           <TouchableOpacity style={styles.actionCardBlue}>
//             <Text style={styles.cardText}>Start styling</Text>
//             <Feather name="mic" size={26} color="#fff" />
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.actionCardGray}>
//             <Text style={styles.cardText}>History</Text>
//             <Feather name="clock" size={26} color="#666" />
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Recently Added */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Recently Added Items</Text>
//         <View style={styles.rowItems}>
//           <TouchableOpacity style={styles.itemCircle}>
//             <Text style={styles.plus}>+</Text>
//           </TouchableOpacity>
//           <Image
//             source={{uri: 'https://via.placeholder.com/80x100'}}
//             style={styles.itemImage}
//           />
//         </View>
//       </View>

//       {/* Suggestion */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Today’s Suggestion</Text>
//       </View>
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {padding: 20, backgroundColor: '#fff'},
//   topRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   greeting: {fontSize: 24, fontWeight: '600'},
//   iconRow: {flexDirection: 'row', gap: 10},
//   iconCircle: {
//     backgroundColor: '#f1f1f1',
//     padding: 8,
//     borderRadius: 24,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   progressBox: {
//     backgroundColor: '#f3ecff',
//     padding: 16,
//     borderRadius: 16,
//     marginVertical: 24,
//   },
//   progressContent: {},
//   progressText: {fontSize: 16, marginBottom: 8},
//   progressButton: {
//     backgroundColor: '#000',
//     paddingVertical: 8,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     alignSelf: 'flex-start',
//   },
//   progressButtonText: {color: '#fff'},
//   progressFooter: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 12,
//     gap: 12,
//   },
//   progressCount: {color: '#999'},
//   progressBar: {
//     flex: 1,
//     height: 4,
//     backgroundColor: '#ddd',
//     borderRadius: 8,
//     overflow: 'hidden',
//   },
//   progressFill: {
//     width: '3.3%',
//     height: 4,
//     backgroundColor: '#000',
//   },
//   section: {marginBottom: 24},
//   sectionTitle: {fontSize: 18, fontWeight: '500', marginBottom: 12},
//   askBox: {
//     flexDirection: 'row',
//     backgroundColor: '#f8f8f8',
//     borderRadius: 999,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   input: {flex: 1, fontSize: 16, color: '#000'},
//   sendButton: {
//     backgroundColor: '#007aff',
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   sendArrow: {color: '#fff', fontSize: 16},
//   rowButtons: {flexDirection: 'row', gap: 12},
//   actionCardBlue: {
//     backgroundColor: '#007aff',
//     flex: 1,
//     padding: 16,
//     borderRadius: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   actionCardGray: {
//     backgroundColor: '#f2f2f2',
//     flex: 1,
//     padding: 16,
//     borderRadius: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   cardText: {fontSize: 16, fontWeight: '500', color: '#000'},
//   rowItems: {flexDirection: 'row', alignItems: 'center', gap: 16},
//   itemCircle: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     backgroundColor: '#f0f0f0',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   plus: {fontSize: 28, color: '#aaa'},
//   itemImage: {width: 64, height: 80, borderRadius: 12},
// });

// export default HomeScreen;

//////////

// // screens/HomeScreen.tsx (modernized look)
// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   TouchableOpacity,
// } from 'react-native';
// import {theme} from '../styles/tokens/theme';
// import VoiceControlButton from '../components/VoiceControlButton/VoiceControlButton';
// import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';

// const HomeScreen = () => {
//   return (
//     <ScrollView style={styles.container}>
//       <Text style={styles.header}>Welcome to StylIQ</Text>

//       {/* <Image
//         source={require('./assets/images/kitten.jpeg')}
//         style={styles.heroImage}
//       /> */}

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Your Wardrobe</Text>
//         <ImagePickerGrid />
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>AI Assistant</Text>
//         <VoiceControlButton />
//       </View>
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: theme.light.colors.background,
//     padding: 16,
//   },
//   header: {fontSize: 32, fontWeight: '600', marginVertical: 20},
//   heroImage: {width: '100%', height: 200, borderRadius: 20, marginBottom: 24},
//   section: {marginBottom: 32},
//   sectionTitle: {fontSize: 20, fontWeight: '500', marginBottom: 12},
// });

// export default HomeScreen;

////////////

// import React from 'react';
// import {ScrollView, Text, StyleSheet} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import QuickActions from '../components/home/QuckActions';
// import WeatherRecommendation from '../components/home/WeatherRecommendation';
// import WardrobePreviewGrid from '../components/home/WardrobePreviewGrid';
// import VoiceInputWidget from '../components/home/VoiceInputWidget';
// import {useVoiceControl} from '../hooks/useVoiceControl';

// type Screen = 'Home' | 'Profile' | 'Explore' | 'Closet' | 'Settings';

// interface HomeScreenProps {
//   navigate: (screen: Screen) => void;
// }

// const HomeScreen: React.FC<HomeScreenProps> = ({navigate}) => {
//   const {theme} = useAppTheme();
//   const {speech, startListening} = useVoiceControl(); // ✅ hook

//   return (
//     <ScrollView
//       style={{...styles.container, backgroundColor: theme.colors.background}}>
//       <Text style={{...styles.header, color: theme.colors.primary}}>
//         Welcome back, Mike
//       </Text>

//       {/* 🔥 Pass the startListening to QuickActions */}
//       <QuickActions onAskAI={startListening} navigate={navigate} />

//       <WeatherRecommendation />
//       <WardrobePreviewGrid />
//       <VoiceInputWidget text={speech} />
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 24,
//   },
//   header: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 16,
//   },
// });

// export default HomeScreen;

/////////

// import React, {useState} from 'react';
// import {View, Button} from 'react-native';
// import MainHome from '../MainHome';

// // Declare allowed screens
// type Screen = 'Home' | 'Profile' | 'Explore' | 'Closet' | 'Settings';

// // Props for this screen
// type Props = {
//   navigate: (screen: Screen, params?: {userId?: string}) => void;
// };

// export default function HomeScreen({navigate}: Props) {
//   const [weather, setWeather] = useState<any>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [contacts, setContacts] = useState<any[]>([]);
//   const [selectedImage, setSelectedImage] = useState<string | null>(null);

//   return (
//     <View style={{flex: 1}}>
//       <Button
//         title="Go to Profile"
//         onPress={() => navigate('Profile', {userId: '123'})}
//       />
//       <MainHome
//         weather={weather}
//         error={error}
//         contacts={contacts}
//         selectedImage={selectedImage}
//         setSelectedImage={setSelectedImage}
//         toggleTheme={() => {}}
//       />
//     </View>
//   );
// }
