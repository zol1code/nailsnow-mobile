import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

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
  onPress={() => {
   if (isDesigner) {
  router.push('/designer-dashboard');
} else {
  router.push('/customer-feed');
}
  }}
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