import {create} from 'zustand';

type Screen = 'Home' | 'Profile';

type NavigationState = {
  currentScreen: Screen;
  params?: any;
  navigate: (screen: Screen, params?: any) => void;
};

export const useNavigationState = create<NavigationState>(set => ({
  currentScreen: 'Home',
  params: undefined,
  navigate: (screen, params) => set({currentScreen: screen, params}),
}));
