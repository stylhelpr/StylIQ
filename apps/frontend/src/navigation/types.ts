export type Screen =
  | 'Home'
  | 'Profile'
  | 'Explore'
  | 'Closet'
  | 'Settings'
  | 'Search'
  | 'Notifications';

export type NavigateFunction = (
  screen: Screen,
  params?: {userId?: string},
) => void;
