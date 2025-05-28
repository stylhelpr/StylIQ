export type Screen = 'Home' | 'Profile' | 'Explore' | 'Closet' | 'Settings';

export type NavigateFunction = (
  screen: Screen,
  params?: {userId?: string},
) => void;
