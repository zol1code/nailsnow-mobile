// Adds URL support required by Supabase in React Native.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Reads the public Supabase configuration from the .env file.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Creates the Supabase client used throughout the NailsNow app.
export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      // Keeps the user's login session saved on the device.
      storage: AsyncStorage,

      // Automatically refreshes the login token when necessary.
      autoRefreshToken: true,

      // Keeps the user logged in after closing and reopening the app.
      persistSession: true,

      // React Native does not use browser URL sessions.
      detectSessionInUrl: false,
    },
  }
);