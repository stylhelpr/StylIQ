export type Screen =
  | 'Home'
  | 'Profile'
  | 'Explore'
  | 'Closet'
  | 'Settings'
  | 'Search'
  | 'Login'
  | 'Notifications';

export type NavigateFunction = (
  screen: Screen,
  params?: {userId?: string},
) => void;
