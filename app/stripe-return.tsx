import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function StripeReturn() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const refreshPayments = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          if (active) router.replace('/auth');
          return;
        }

        const { error } = await supabase.functions.invoke(
          'create-connect-account'
        );

        if (error) {
          console.error('Stripe status refresh failed:', error.message);
        }
      } catch (error) {
        console.error('Stripe return error:', error);
      } finally {
        if (active) {
          router.replace('/designer-dashboard');
        }
      }
    };

    refreshPayments();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#C4637A" />
      <Text style={styles.text}>
        Checking your Stripe payment setup...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
  },
});