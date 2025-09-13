import React from 'react';
import {View, ActivityIndicator} from 'react-native';
import {useAuth0} from 'react-native-auth0';
import LoginScreen from 'screens/LoginScreen';

type Props = {
  children: React.ReactNode;
};

export default function AuthGate({children}: Props) {
  const {user, isLoading} = useAuth0();

  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}

//////////////////

// import React from 'react';
// import {View, ActivityIndicator} from 'react-native';
// import {useAuth0} from 'react-native-auth0';
// import LoginScreen from 'screens/LoginScreen';

// type Props = {
//   children: React.ReactNode;
// };

// export default function AuthGate({children}: Props) {
//   const {user, isLoading} = useAuth0();

//   if (isLoading) {
//     return (
//       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   if (!user) {
//     return <LoginScreen />;
//   }

//   return <>{children}</>;
// }
