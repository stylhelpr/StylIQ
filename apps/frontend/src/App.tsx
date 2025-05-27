// src/App.tsx
import React from 'react';
import {createAppContainer} from 'react-navigation';
import {createStackNavigator} from 'react-navigation-stack';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import {QueryClientProvider} from '@tanstack/react-query';
import {queryClient} from './lib/queryClient';
import {ThemeProvider} from './context/ThemeContext';

const AppNavigator = createStackNavigator(
  {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
  {
    initialRouteName: 'Home',
  },
);

const AppContainer = createAppContainer(AppNavigator);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContainer />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

//////////

// // App.tsx
// import React from 'react';
// import {ThemeProvider} from './context/ThemeContext';
// import MainApp from './MainApp';

// const App = () => {
//   return (
//     <ThemeProvider>
//       <MainApp />
//     </ThemeProvider>
//   );
// };

// export default App;
