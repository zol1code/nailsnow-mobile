import { Stack, useRouter } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '../lib/supabase';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    // Checks if Supabase already has a saved login session
    // when the app opens.
    const restoreSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return;
      }

      // Reads the user's account type from the profiles table.
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.log('Session profile error:', error.message);
        return;
      }
      // Signs out old accounts that do not have a profile record yet.
if (!profile) {
  await supabase.auth.signOut();
  return;
}

      // Sends the saved user directly to the correct area.
      if (profile.user_type === 'designer') {
        router.replace('/designer-dashboard');
      } else if (profile.user_type === 'customer') {
        router.replace('/customer-feed');
      }
    };

    restoreSession();
  }, [router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: 'Modal' }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}