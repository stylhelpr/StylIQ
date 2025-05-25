// App.tsx
import React from 'react';
import {ThemeProvider} from './context/ThemeContext';
import MainApp from './MainApp';

const App = () => {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
};

export default App;
