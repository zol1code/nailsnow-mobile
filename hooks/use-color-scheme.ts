import { useColorScheme as useNativeColorScheme } from 'react-native';

// Always returns a supported theme, even when the system
// reports an unspecified color scheme.
export function useColorScheme(): 'light' | 'dark' {
  const colorScheme = useNativeColorScheme();

  return colorScheme === 'dark' ? 'dark' : 'light';
}