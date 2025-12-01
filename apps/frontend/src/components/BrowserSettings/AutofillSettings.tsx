import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import {useShoppingStore} from '../../../../../store/shoppingStore';
import {tokens} from '../../styles/tokens/tokens';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type TabType = 'passwords' | 'addresses' | 'cards';

export default function AutofillSettings({visible, onClose}: Props) {
  const {theme} = useAppTheme();
  const {
    savedPasswords,
    addPassword,
    removePassword,
    savedAddresses,
    addAddress,
    removeAddress,
    savedCards,
    addCard,
    removeCard,
  } = useShoppingStore();

  const [activeTab, setActiveTab] = useState<TabType>('passwords');
  const [showAddForm, setShowAddForm] = useState(false);

  // Password form
  const [pwdDomain, setPwdDomain] = useState('');
  const [pwdUsername, setPwdUsername] = useState('');
  const [pwdPassword, setPwdPassword] = useState('');

  // Address form
  const [addrName, setAddrName] = useState('');
  const [addrFullName, setAddrFullName] = useState('');
  const [addrEmail, setAddrEmail] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrZip, setAddrZip] = useState('');
  const [addrCountry, setAddrCountry] = useState('');

  // Card form
  const [cardName, setCardName] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardLastFour, setCardLastFour] = useState('');
  const [cardMonth, setCardMonth] = useState('');
  const [cardYear, setCardYear] = useState('');

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
    },
    tabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      alignItems: 'center',
    },
    tabActive: {
      borderBottomColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
    },
    tabTextActive: {
      color: theme.colors.primary,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    item: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
    },
    itemText: {
      flex: 1,
      fontSize: 14,
      fontWeight: tokens.fontWeight.medium,
      color: theme.colors.foreground,
    },
    itemSubtext: {
      fontSize: 12,
      color: theme.colors.foreground,
      marginTop: 4,
    },
    addButton: {
      backgroundColor: theme.colors.button1,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 16,
    },
    addButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: tokens.fontWeight.semiBold,
    },
    form: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
      color: theme.colors.foreground,
      fontSize: 14,
    },
    formButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    formButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
    },
    submitButtonText: {
      backgroundColor: theme.colors.foreground,
      color: theme.colors.button1,
      fontWeight: tokens.fontWeight.semiBold,
    },
    cancelButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
    },
    cancelButtonText: {
      color: theme.colors.foreground,
      fontWeight: tokens.fontWeight.semiBold,
    },
    emptyText: {
      textAlign: 'center',
      color: theme.colors.foreground,
      marginTop: 32,
    },
  });

  const handleAddPassword = () => {
    if (!pwdDomain || !pwdUsername || !pwdPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    addPassword(pwdDomain, pwdUsername, pwdPassword);
    setPwdDomain('');
    setPwdUsername('');
    setPwdPassword('');
    setShowAddForm(false);
  };

  const handleAddAddress = () => {
    if (!addrFullName || !addrEmail) {
      Alert.alert('Error', 'At least name and email required');
      return;
    }
    addAddress({
      name: addrName || addrFullName,
      fullName: addrFullName,
      email: addrEmail,
      phone: addrPhone,
      street: addrStreet,
      city: addrCity,
      state: addrState,
      zipCode: addrZip,
      country: addrCountry,
    });
    setAddrName('');
    setAddrFullName('');
    setAddrEmail('');
    setAddrPhone('');
    setAddrStreet('');
    setAddrCity('');
    setAddrState('');
    setAddrZip('');
    setAddrCountry('');
    setShowAddForm(false);
  };

  const handleAddCard = () => {
    if (!cardName || !cardholderName || !cardLastFour) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    addCard({
      name: cardName,
      lastFour: cardLastFour.slice(-4),
      cardholderName,
      expiryMonth: parseInt(cardMonth) || 1,
      expiryYear: parseInt(cardYear) || new Date().getFullYear(),
    });
    setCardName('');
    setCardholderName('');
    setCardLastFour('');
    setCardMonth('');
    setCardYear('');
    setShowAddForm(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Auto-fill Settings</Text>
          <AppleTouchFeedback onPress={onClose}>
            <MaterialIcons
              name="close"
              size={24}
              color={theme.colors.foreground}
            />
          </AppleTouchFeedback>
        </View>

        <View style={styles.tabs}>
          {(['passwords', 'addresses', 'cards'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => {
                setActiveTab(tab);
                setShowAddForm(false);
              }}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}>
                {tab === 'passwords'
                  ? 'Passwords'
                  : tab === 'addresses'
                  ? 'Addresses'
                  : 'Cards'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(!showAddForm)}>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>
              Add{' '}
              {activeTab === 'passwords'
                ? 'Password'
                : activeTab === 'addresses'
                ? 'Address'
                : 'Card'}
            </Text>
          </TouchableOpacity>

          {showAddForm && activeTab === 'passwords' && (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Domain (e.g., amazon.com)"
                placeholderTextColor={theme.colors.foreground}
                value={pwdDomain}
                onChangeText={setPwdDomain}
              />
              <TextInput
                style={styles.input}
                placeholder="Username/Email"
                placeholderTextColor={theme.colors.foreground}
                value={pwdUsername}
                onChangeText={setPwdUsername}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={theme.colors.foreground}
                value={pwdPassword}
                onChangeText={setPwdPassword}
                secureTextEntry
              />
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.formButton, styles.submitButton]}
                  onPress={handleAddPassword}>
                  <Text style={styles.submitButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={() => setShowAddForm(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'passwords' &&
            (savedPasswords.length === 0 ? (
              <Text style={styles.emptyText}>No saved passwords</Text>
            ) : (
              savedPasswords.map((pwd: any) => (
                <View key={pwd.id} style={styles.item}>
                  <View style={{flex: 1}}>
                    <Text style={styles.itemText}>{pwd.domain}</Text>
                    <Text style={styles.itemSubtext}>{pwd.username}</Text>
                  </View>
                  <AppleTouchFeedback
                    onPress={() => removePassword(pwd.id)}
                    hapticStyle="impactLight">
                    <MaterialIcons
                      name="delete"
                      size={20}
                      color={theme.colors.foreground}
                    />
                  </AppleTouchFeedback>
                </View>
              ))
            ))}

          {showAddForm && activeTab === 'addresses' && (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Address Label (e.g., Home)"
                placeholderTextColor={theme.colors.foreground}
                value={addrName}
                onChangeText={setAddrName}
              />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={theme.colors.foreground}
                value={addrFullName}
                onChangeText={setAddrFullName}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={theme.colors.foreground}
                value={addrEmail}
                onChangeText={setAddrEmail}
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Phone"
                placeholderTextColor={theme.colors.foreground}
                value={addrPhone}
                onChangeText={setAddrPhone}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Street Address"
                placeholderTextColor={theme.colors.foreground}
                value={addrStreet}
                onChangeText={setAddrStreet}
              />
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor={theme.colors.foreground}
                value={addrCity}
                onChangeText={setAddrCity}
              />
              <TextInput
                style={styles.input}
                placeholder="State"
                placeholderTextColor={theme.colors.foreground}
                value={addrState}
                onChangeText={setAddrState}
              />
              <TextInput
                style={styles.input}
                placeholder="Zip Code"
                placeholderTextColor={theme.colors.foreground}
                value={addrZip}
                onChangeText={setAddrZip}
              />
              <TextInput
                style={styles.input}
                placeholder="Country"
                placeholderTextColor={theme.colors.foreground}
                value={addrCountry}
                onChangeText={setAddrCountry}
              />
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.formButton, styles.submitButton]}
                  onPress={handleAddAddress}>
                  <Text style={styles.submitButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={() => setShowAddForm(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'addresses' &&
            (savedAddresses.length === 0 ? (
              <Text style={styles.emptyText}>No saved addresses</Text>
            ) : (
              savedAddresses.map((addr: any) => (
                <View key={addr.id} style={styles.item}>
                  <View style={{flex: 1}}>
                    <Text style={styles.itemText}>{addr.name}</Text>
                    <Text style={styles.itemSubtext}>{addr.fullName}</Text>
                    <Text style={styles.itemSubtext}>{addr.street}</Text>
                  </View>
                  <AppleTouchFeedback
                    onPress={() => removeAddress(addr.id)}
                    hapticStyle="impactLight">
                    <MaterialIcons
                      name="delete"
                      size={20}
                      color={theme.colors.foreground}
                    />
                  </AppleTouchFeedback>
                </View>
              ))
            ))}

          {showAddForm && activeTab === 'cards' && (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Card Name (e.g., Visa)"
                placeholderTextColor={theme.colors.foreground}
                value={cardName}
                onChangeText={setCardName}
              />
              <TextInput
                style={styles.input}
                placeholder="Cardholder Name"
                placeholderTextColor={theme.colors.foreground}
                value={cardholderName}
                onChangeText={setCardholderName}
              />
              <TextInput
                style={styles.input}
                placeholder="Last 4 Digits"
                placeholderTextColor={theme.colors.foreground}
                value={cardLastFour}
                onChangeText={setCardLastFour}
                keyboardType="number-pad"
                maxLength={4}
              />
              <View style={{flexDirection: 'row', gap: 12}}>
                <TextInput
                  style={[styles.input, {flex: 1}]}
                  placeholder="MM"
                  placeholderTextColor={theme.colors.foreground}
                  value={cardMonth}
                  onChangeText={setCardMonth}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <TextInput
                  style={[styles.input, {flex: 1}]}
                  placeholder="YYYY"
                  placeholderTextColor={theme.colors.foreground}
                  value={cardYear}
                  onChangeText={setCardYear}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.formButton, styles.submitButton]}
                  onPress={handleAddCard}>
                  <Text style={styles.submitButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={() => setShowAddForm(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'cards' &&
            (savedCards.length === 0 ? (
              <Text style={styles.emptyText}>No saved cards</Text>
            ) : (
              savedCards.map((card: any) => (
                <View key={card.id} style={styles.item}>
                  <View style={{flex: 1}}>
                    <Text style={styles.itemText}>{card.name}</Text>
                    <Text style={styles.itemSubtext}>
                      •••• •••• •••• {card.lastFour}
                    </Text>
                    <Text style={styles.itemSubtext}>
                      {card.cardholderName}
                    </Text>
                  </View>
                  <AppleTouchFeedback
                    onPress={() => removeCard(card.id)}
                    hapticStyle="impactLight">
                    <MaterialIcons
                      name="delete"
                      size={20}
                      color={theme.colors.foreground}
                    />
                  </AppleTouchFeedback>
                </View>
              ))
            ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

/////////////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   Alert,
//   Modal,
//   TextInput,
//   TouchableOpacity,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useShoppingStore} from '../../../../../store/shoppingStore';
// import {tokens} from '../../styles/tokens/tokens';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
// };

// type TabType = 'passwords' | 'addresses' | 'cards';

// export default function AutofillSettings({visible, onClose}: Props) {
//   const {theme} = useAppTheme();
//   const {
//     savedPasswords,
//     addPassword,
//     removePassword,
//     savedAddresses,
//     addAddress,
//     removeAddress,
//     savedCards,
//     addCard,
//     removeCard,
//   } = useShoppingStore();

//   const [activeTab, setActiveTab] = useState<TabType>('passwords');
//   const [showAddForm, setShowAddForm] = useState(false);

//   // Password form
//   const [pwdDomain, setPwdDomain] = useState('');
//   const [pwdUsername, setPwdUsername] = useState('');
//   const [pwdPassword, setPwdPassword] = useState('');

//   // Address form
//   const [addrName, setAddrName] = useState('');
//   const [addrFullName, setAddrFullName] = useState('');
//   const [addrEmail, setAddrEmail] = useState('');
//   const [addrPhone, setAddrPhone] = useState('');
//   const [addrStreet, setAddrStreet] = useState('');
//   const [addrCity, setAddrCity] = useState('');
//   const [addrState, setAddrState] = useState('');
//   const [addrZip, setAddrZip] = useState('');
//   const [addrCountry, setAddrCountry] = useState('');

//   // Card form
//   const [cardName, setCardName] = useState('');
//   const [cardholderName, setCardholderName] = useState('');
//   const [cardLastFour, setCardLastFour] = useState('');
//   const [cardMonth, setCardMonth] = useState('');
//   const [cardYear, setCardYear] = useState('');

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.surface,
//     },
//     header: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     title: {
//       fontSize: 20,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//     },
//     tabs: {
//       flexDirection: 'row',
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     tab: {
//       flex: 1,
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       borderBottomWidth: 2,
//       borderBottomColor: 'transparent',
//       alignItems: 'center',
//     },
//     tabActive: {
//       borderBottomColor: theme.colors.primary,
//     },
//     tabText: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     tabTextActive: {
//       color: theme.colors.primary,
//     },
//     content: {
//       flex: 1,
//       padding: 16,
//     },
//     item: {
//       backgroundColor: theme.colors.background,
//       borderRadius: 8,
//       padding: 12,
//       marginBottom: 12,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     itemText: {
//       flex: 1,
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.medium,
//       color: theme.colors.foreground,
//     },
//     itemSubtext: {
//       fontSize: 12,
//       color: theme.colors.foreground,
//       marginTop: 4,
//     },
//     addButton: {
//       backgroundColor: theme.colors.primary,
//       borderRadius: 8,
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'center',
//       gap: 8,
//       marginBottom: 16,
//     },
//     addButtonText: {
//       color: '#fff',
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.semiBold,
//     },
//     form: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 16,
//     },
//     input: {
//       backgroundColor: theme.colors.background,
//       borderRadius: 8,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       marginBottom: 12,
//       color: theme.colors.foreground,
//       fontSize: 14,
//     },
//     formButtons: {
//       flexDirection: 'row',
//       gap: 12,
//     },
//     formButton: {
//       flex: 1,
//       paddingVertical: 10,
//       borderRadius: 8,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     submitButton: {
//       backgroundColor: theme.colors.primary,
//     },
//     submitButtonText: {
//       color: '#fff',
//       fontWeight: tokens.fontWeight.semiBold,
//     },
//     cancelButton: {
//       backgroundColor: theme.colors.background,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     cancelButtonText: {
//       color: theme.colors.foreground,
//       fontWeight: tokens.fontWeight.semiBold,
//     },
//     emptyText: {
//       textAlign: 'center',
//       color: theme.colors.foreground,
//       marginTop: 32,
//     },
//   });

//   const handleAddPassword = () => {
//     if (!pwdDomain || !pwdUsername || !pwdPassword) {
//       Alert.alert('Error', 'Please fill all fields');
//       return;
//     }
//     addPassword(pwdDomain, pwdUsername, pwdPassword);
//     setPwdDomain('');
//     setPwdUsername('');
//     setPwdPassword('');
//     setShowAddForm(false);
//   };

//   const handleAddAddress = () => {
//     if (!addrFullName || !addrEmail) {
//       Alert.alert('Error', 'At least name and email required');
//       return;
//     }
//     addAddress({
//       name: addrName || addrFullName,
//       fullName: addrFullName,
//       email: addrEmail,
//       phone: addrPhone,
//       street: addrStreet,
//       city: addrCity,
//       state: addrState,
//       zipCode: addrZip,
//       country: addrCountry,
//     });
//     setAddrName('');
//     setAddrFullName('');
//     setAddrEmail('');
//     setAddrPhone('');
//     setAddrStreet('');
//     setAddrCity('');
//     setAddrState('');
//     setAddrZip('');
//     setAddrCountry('');
//     setShowAddForm(false);
//   };

//   const handleAddCard = () => {
//     if (!cardName || !cardholderName || !cardLastFour) {
//       Alert.alert('Error', 'Please fill all fields');
//       return;
//     }
//     addCard({
//       name: cardName,
//       lastFour: cardLastFour.slice(-4),
//       cardholderName,
//       expiryMonth: parseInt(cardMonth) || 1,
//       expiryYear: parseInt(cardYear) || new Date().getFullYear(),
//     });
//     setCardName('');
//     setCardholderName('');
//     setCardLastFour('');
//     setCardMonth('');
//     setCardYear('');
//     setShowAddForm(false);
//   };

//   return (
//     <Modal
//       visible={visible}
//       animationType="slide"
//       presentationStyle="pageSheet">
//       <View style={styles.container}>
//         <View style={styles.header}>
//           <Text style={styles.title}>Auto-fill Settings</Text>
//           <AppleTouchFeedback onPress={onClose}>
//             <MaterialIcons
//               name="close"
//               size={24}
//               color={theme.colors.foreground}
//             />
//           </AppleTouchFeedback>
//         </View>

//         <View style={styles.tabs}>
//           {(['passwords', 'addresses', 'cards'] as const).map(tab => (
//             <TouchableOpacity
//               key={tab}
//               style={[styles.tab, activeTab === tab && styles.tabActive]}
//               onPress={() => {
//                 setActiveTab(tab);
//                 setShowAddForm(false);
//               }}>
//               <Text
//                 style={[
//                   styles.tabText,
//                   activeTab === tab && styles.tabTextActive,
//                 ]}>
//                 {tab === 'passwords'
//                   ? 'Passwords'
//                   : tab === 'addresses'
//                   ? 'Addresses'
//                   : 'Cards'}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//         <ScrollView style={styles.content}>
//           <TouchableOpacity
//             style={styles.addButton}
//             onPress={() => setShowAddForm(!showAddForm)}>
//             <MaterialIcons name="add" size={20} color="#fff" />
//             <Text style={styles.addButtonText}>
//               Add{' '}
//               {activeTab === 'passwords'
//                 ? 'Password'
//                 : activeTab === 'addresses'
//                 ? 'Address'
//                 : 'Card'}
//             </Text>
//           </TouchableOpacity>

//           {showAddForm && activeTab === 'passwords' && (
//             <View style={styles.form}>
//               <TextInput
//                 style={styles.input}
//                 placeholder="Domain (e.g., amazon.com)"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={pwdDomain}
//                 onChangeText={setPwdDomain}
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Username/Email"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={pwdUsername}
//                 onChangeText={setPwdUsername}
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Password"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={pwdPassword}
//                 onChangeText={setPwdPassword}
//                 secureTextEntry
//               />
//               <View style={styles.formButtons}>
//                 <TouchableOpacity
//                   style={[styles.formButton, styles.submitButton]}
//                   onPress={handleAddPassword}>
//                   <Text style={styles.submitButtonText}>Save</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   style={[styles.formButton, styles.cancelButton]}
//                   onPress={() => setShowAddForm(false)}>
//                   <Text style={styles.cancelButtonText}>Cancel</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}

//           {activeTab === 'passwords' &&
//             (savedPasswords.length === 0 ? (
//               <Text style={styles.emptyText}>No saved passwords</Text>
//             ) : (
//               savedPasswords.map((pwd: any) => (
//                 <View key={pwd.id} style={styles.item}>
//                   <View style={{flex: 1}}>
//                     <Text style={styles.itemText}>{pwd.domain}</Text>
//                     <Text style={styles.itemSubtext}>{pwd.username}</Text>
//                   </View>
//                   <AppleTouchFeedback
//                     onPress={() => removePassword(pwd.id)}
//                     hapticStyle="impactLight">
//                     <MaterialIcons
//                       name="delete"
//                       size={20}
//                       color={theme.colors.foreground}
//                     />
//                   </AppleTouchFeedback>
//                 </View>
//               ))
//             ))}

//           {showAddForm && activeTab === 'addresses' && (
//             <View style={styles.form}>
//               <TextInput
//                 style={styles.input}
//                 placeholder="Address Label (e.g., Home)"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={addrName}
//                 onChangeText={setAddrName}
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Full Name"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={addrFullName}
//                 onChangeText={setAddrFullName}
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Email"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={addrEmail}
//                 onChangeText={setAddrEmail}
//                 keyboardType="email-address"
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Phone"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={addrPhone}
//                 onChangeText={setAddrPhone}
//                 keyboardType="phone-pad"
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Street Address"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={addrStreet}
//                 onChangeText={setAddrStreet}
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="City"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={addrCity}
//                 onChangeText={setAddrCity}
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="State"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={addrState}
//                 onChangeText={setAddrState}
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Zip Code"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={addrZip}
//                 onChangeText={setAddrZip}
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Country"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={addrCountry}
//                 onChangeText={setAddrCountry}
//               />
//               <View style={styles.formButtons}>
//                 <TouchableOpacity
//                   style={[styles.formButton, styles.submitButton]}
//                   onPress={handleAddAddress}>
//                   <Text style={styles.submitButtonText}>Save</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   style={[styles.formButton, styles.cancelButton]}
//                   onPress={() => setShowAddForm(false)}>
//                   <Text style={styles.cancelButtonText}>Cancel</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}

//           {activeTab === 'addresses' &&
//             (savedAddresses.length === 0 ? (
//               <Text style={styles.emptyText}>No saved addresses</Text>
//             ) : (
//               savedAddresses.map((addr: any) => (
//                 <View key={addr.id} style={styles.item}>
//                   <View style={{flex: 1}}>
//                     <Text style={styles.itemText}>{addr.name}</Text>
//                     <Text style={styles.itemSubtext}>{addr.fullName}</Text>
//                     <Text style={styles.itemSubtext}>{addr.street}</Text>
//                   </View>
//                   <AppleTouchFeedback
//                     onPress={() => removeAddress(addr.id)}
//                     hapticStyle="impactLight">
//                     <MaterialIcons
//                       name="delete"
//                       size={20}
//                       color={theme.colors.foreground}
//                     />
//                   </AppleTouchFeedback>
//                 </View>
//               ))
//             ))}

//           {showAddForm && activeTab === 'cards' && (
//             <View style={styles.form}>
//               <TextInput
//                 style={styles.input}
//                 placeholder="Card Name (e.g., Visa)"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={cardName}
//                 onChangeText={setCardName}
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Cardholder Name"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={cardholderName}
//                 onChangeText={setCardholderName}
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Last 4 Digits"
//                 placeholderTextColor={theme.colors.foreground}
//                 value={cardLastFour}
//                 onChangeText={setCardLastFour}
//                 keyboardType="number-pad"
//                 maxLength={4}
//               />
//               <View style={{flexDirection: 'row', gap: 12}}>
//                 <TextInput
//                   style={[styles.input, {flex: 1}]}
//                   placeholder="MM"
//                   placeholderTextColor={theme.colors.foreground}
//                   value={cardMonth}
//                   onChangeText={setCardMonth}
//                   keyboardType="number-pad"
//                   maxLength={2}
//                 />
//                 <TextInput
//                   style={[styles.input, {flex: 1}]}
//                   placeholder="YYYY"
//                   placeholderTextColor={theme.colors.foreground}
//                   value={cardYear}
//                   onChangeText={setCardYear}
//                   keyboardType="number-pad"
//                   maxLength={4}
//                 />
//               </View>
//               <View style={styles.formButtons}>
//                 <TouchableOpacity
//                   style={[styles.formButton, styles.submitButton]}
//                   onPress={handleAddCard}>
//                   <Text style={styles.submitButtonText}>Save</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   style={[styles.formButton, styles.cancelButton]}
//                   onPress={() => setShowAddForm(false)}>
//                   <Text style={styles.cancelButtonText}>Cancel</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}

//           {activeTab === 'cards' &&
//             (savedCards.length === 0 ? (
//               <Text style={styles.emptyText}>No saved cards</Text>
//             ) : (
//               savedCards.map((card: any) => (
//                 <View key={card.id} style={styles.item}>
//                   <View style={{flex: 1}}>
//                     <Text style={styles.itemText}>{card.name}</Text>
//                     <Text style={styles.itemSubtext}>
//                       •••• •••• •••• {card.lastFour}
//                     </Text>
//                     <Text style={styles.itemSubtext}>
//                       {card.cardholderName}
//                     </Text>
//                   </View>
//                   <AppleTouchFeedback
//                     onPress={() => removeCard(card.id)}
//                     hapticStyle="impactLight">
//                     <MaterialIcons
//                       name="delete"
//                       size={20}
//                       color={theme.colors.foreground}
//                     />
//                   </AppleTouchFeedback>
//                 </View>
//               ))
//             ))}
//         </ScrollView>
//       </View>
//     </Modal>
//   );
// }
