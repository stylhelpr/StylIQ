import 'styled-components';

declare module 'styled-components/native' {
  export interface DefaultTheme {
    colors: {
      primary: string;
      text: string;
      textSecondary: string;
      background: string;
      card: string;
      secondaryBackground: string;
    };
    spacing: {
      xxs: number;
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
      xxxl: number;
    };
    fontSize: {
      xxs: number;
      xs: number;
      sm: number;
      md: number;
      base: number;
      lg: number;
      xl: number;
      xxl: number;
      '2xl': number;
    };
    borderRadius: {
      none: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      '2xl': number;
      full: number;
      default: number;
    };
  }
}
