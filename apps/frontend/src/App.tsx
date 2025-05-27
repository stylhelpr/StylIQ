import React from 'react';
import {QueryClientProvider} from '@tanstack/react-query';
import {queryClient} from './lib/queryClient';
import {ThemeProvider} from './context/ThemeContext';
import MainApp from './MainApp';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

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
