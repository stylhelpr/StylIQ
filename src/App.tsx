// App.tsx
import React from 'react';
import { ThemeProvider } from '../src/context/ThemeContext';
import MainApp from '../src/MainApp'; 

const App = () => {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
};

export default App;