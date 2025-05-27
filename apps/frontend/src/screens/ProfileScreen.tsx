import React from 'react';
import {View, Text, StyleSheet, Image, ScrollView, Button} from 'react-native';
import type {Screen, NavigateFunction} from '../navigation/types'; // if you have it

type Props = {
  navigate: (screen: Screen) => void;
};

export default function ProfileScreen({navigate}: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>👤 Profile Screen</Text>

      <Image
        style={styles.avatar}
        source={{uri: 'https://placekitten.com/300/300'}}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Me</Text>
        <Text style={styles.sectionText}>
          Hi! I'm a fashion-savvy React Native dev. I love building style and
          AI-driven apps!
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorite Brands</Text>
        <Text style={styles.sectionText}>
          👞 Ferragamo, 🧥 Eton, 👕 GOBI, 👖 Amiri
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Style Tags</Text>
        <Text style={styles.sectionText}>
          #Modern #Tailored #NeutralTones #Luxury
        </Text>
      </View>

      <Button title="Back to Home" onPress={() => navigate('Home')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fdfdfd',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subheading: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 15,
    color: '#333',
  },
});

/////////////////

// import React from 'react';
// import {View, Text, StyleSheet, Image, ScrollView, Button} from 'react-native';

// type Props = {};

// export default function ProfileScreen({}: Props) {
//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <Text style={styles.heading}>👤 Profile Screen</Text>

//       <Image
//         style={styles.avatar}
//         source={{uri: 'https://placekitten.com/300/300'}}
//       />

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>About Me</Text>
//         <Text style={styles.sectionText}>
//           Hi! I'm a fashion-savvy React Native dev. I love building style and
//           AI-driven apps!
//         </Text>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Favorite Brands</Text>
//         <Text style={styles.sectionText}>
//           👞 Ferragamo, 🧥 Eton, 👕 GOBI, 👖 Amiri
//         </Text>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Style Tags</Text>
//         <Text style={styles.sectionText}>
//           #Modern #Tailored #NeutralTones #Luxury
//         </Text>
//       </View>

//       <Button title="Edit Profile (stub)" onPress={() => {}} />
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: 24,
//     backgroundColor: '#fdfdfd',
//   },
//   heading: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     marginBottom: 12,
//   },
//   subheading: {
//     fontSize: 16,
//     color: '#666',
//     marginBottom: 20,
//   },
//   avatar: {
//     width: 150,
//     height: 150,
//     borderRadius: 75,
//     alignSelf: 'center',
//     marginBottom: 20,
//   },
//   section: {
//     marginBottom: 24,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     marginBottom: 6,
//   },
//   sectionText: {
//     fontSize: 15,
//     color: '#333',
//   },
// });
