import React from 'react';
import {QueryClientProvider} from '@tanstack/react-query';
import {queryClient} from './lib/queryClient';
import {ThemeProvider} from './context/ThemeContext';
import MainApp from './MainApp';

// ✅ Add this:
import {initializeNotifications} from './utils/notificationService';
initializeNotifications(); // MUST be outside the component

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

///////////////

// import React from 'react';
// import {QueryClientProvider} from '@tanstack/react-query';
// import {queryClient} from './lib/queryClient';
// import {ThemeProvider} from './context/ThemeContext';
// import MainApp from './MainApp';

// const App = () => (
//   <QueryClientProvider client={queryClient}>
//     <ThemeProvider>
//       <MainApp />
//     </ThemeProvider>
//   </QueryClientProvider>
// );

// export default App;
