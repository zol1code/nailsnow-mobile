import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

const COLORS = {
  background: '#FDF5EF',
  foreground: '#1C0B12',
  primary: '#C4637A',
  muted: '#F0E6E9',
  mutedForeground: '#8B6472',
  inputBackground: '#F5EBEE',
};

export default function AuthScreen() {
  
  const params = useLocalSearchParams();
  const userType = params.userType;

  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isDesigner = userType === 'designer';
 // Handles both account creation and login using Supabase.
async function handleAuth() {
  // Stops the process if email or password are empty.
  if (!email.trim() || !password.trim()) {
    return;
  }

  // Starts with the account type selected during sign up.
  let authenticatedUserType = isDesigner ? 'designer' : 'customer';

  if (isLogin) {
    // Logs in an existing user and returns the authenticated account.
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.log('Login error:', error.message);
      return;
    }

   // Reads the account type saved when the account was created.
// Reads the user's profile from the database.
// The profiles table is now the official source for the account type.
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('user_type')
  .eq('id', data.user.id)
  .single();

if (profileError) {
  console.log('Profile read error:', profileError.message);
  return;
}

const savedUserType = profile.user_type;

// Only accepts accounts that already have a valid user type.
// Older accounts without user_type are blocked so the app
// does not accidentally send them to the wrong dashboard.
if (savedUserType === 'designer' || savedUserType === 'customer') {
  authenticatedUserType = savedUserType;
} else {
  console.log('Login error: this account has no user_type');
  return;
}
  } else {
    // Creates a new Supabase account.
    // Creates the authentication account and keeps the new user data
// so we can use the same user ID when creating the profile.
const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
          user_type: authenticatedUserType,
        },
      },
    });

    if (error) {
      console.log('Sign up error:', error.message);
      return;
    }
    // Creates the user's profile using the same ID from Supabase Auth.
if (data.user) {
  

  

  // Creates the user's profile using the same ID from Supabase Auth.
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: data.user.id,
      name: name.trim(),
      user_type: authenticatedUserType,
    });

  if (profileError) {
    console.log('Profile creation error:', profileError.message);
    return;
  }
}
  }
  

  // Sends the authenticated user to the correct area
  // based on the account type stored in Supabase.
  if (authenticatedUserType === 'designer') {
    router.push('/designer-dashboard');
  } else {
    router.push('/customer-feed');
  }
}

return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>

        <View>
          <Text style={styles.title}>
            {isLogin
              ? 'Welcome back'
              : isDesigner
                ? 'Join as Artist'
                : 'Create Account'}
          </Text>

          <Text style={styles.subtitle}>
            {isDesigner
              ? 'Build your nail art business'
              : 'Find your perfect nail artist'}
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        {!isLogin && (
          <View>
            <Text style={styles.label}>FULL NAME</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Sofia Mendes"
              placeholderTextColor="#A98994"
              style={styles.input}
            />
          </View>
        )}

        <View>
          <Text style={styles.label}>EMAIL</Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#A98994"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
        </View>

        <View>
          <Text style={styles.label}>PASSWORD</Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#A98994"
            secureTextEntry
            style={styles.input}
          />
        </View>

        {isDesigner && !isLogin && (
          <View style={styles.subscriptionBox}>
            <Text style={styles.subscriptionTitle}>
              Artist Pro Subscription
            </Text>

            <Text style={styles.subscriptionText}>
              $19.99/month — unlimited client discovery, booking management,
              and analytics. First 14 days free.
            </Text>
          </View>
        )}

        <Pressable
  style={styles.mainButton}
onPress={handleAuth}
>
          <Text style={styles.mainButtonText}>
            {isLogin
              ? 'Log In'
              : isDesigner
                ? 'Start Free Trial'
                : 'Create Account'}
          </Text>
        </Pressable>

        <View style={styles.switchRow}>
  <Text style={styles.switchText}>
    {isLogin ? 'No account yet? ' : 'Already have an account? '}
  </Text>

  <Pressable onPress={() => setIsLogin(!isLogin)}>
    <Text style={styles.link}>
      {isLogin ? 'Sign up' : 'Log in'}
    </Text>
  </Pressable>
</View>

        <Text style={styles.terms}>
          By continuing you agree to our{' '}
          <Text style={styles.link}>Terms</Text>
          {' '}and{' '}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 32,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  backArrow: {
    fontSize: 30,
    color: COLORS.foreground,
    lineHeight: 32,
    marginTop: -2,
  },

  title: {
    fontSize: 24,
    color: COLORS.foreground,
    fontFamily: 'serif',
    lineHeight: 29,
  },

  subtitle: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },

  form: {
    gap: 16,
    flex: 1,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.mutedForeground,
    letterSpacing: 1,
    marginBottom: 8,
  },

  input: {
    width: '100%',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: COLORS.foreground,
  },

  subscriptionBox: {
    backgroundColor: '#C4637A14',
    borderWidth: 1,
    borderColor: '#C4637A33',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },

  subscriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },

  subscriptionText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    lineHeight: 18,
  },

  mainButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },

  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  switchText: {
  fontSize: 14,
  color: COLORS.mutedForeground,
},

  link: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  terms: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.mutedForeground,
    lineHeight: 18,
  },

  switchRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
},
});