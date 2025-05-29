export type Screen =
  | 'Home'
  | 'Profile'
  | 'Explore'
  | 'Closet'
  | 'Settings'
  | 'Search';

export type NavigateFunction = (
  screen: Screen,
  params?: {userId?: string},
) => void;
