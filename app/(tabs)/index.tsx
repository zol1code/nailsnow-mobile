import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COLORS = {
  background: '#FDF5EF',
  foreground: '#1C0B12',
  primary: '#C4637A',
  secondary: '#F5E4E8',
  mutedForeground: '#8B6472',
  accent: '#E07A5F',
  white: '#FFFFFF',
};

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      {/* Decorative circles */}
      <View style={[styles.circle, styles.circleTopRight]} />
      <View style={[styles.circle, styles.circleTopLeft]} />
      <View style={[styles.circle, styles.circleBottomRight]} />
      <View style={[styles.circle, styles.circleBottomLeft]} />

      {/* Logo */}
      <View style={styles.logoSection}>
        <Text style={styles.logo}>NailsNow</Text>

        <Text style={styles.subtitle}>
          Connect with certified nail artists near you — or grow your nail business safely.
        </Text>
      </View>

      {/* Nail art photos */}
      <View style={styles.photoRow}>
        <Image
          source="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&h=300&fit=crop"
          style={[styles.photo, { marginTop: 0 }]}
          contentFit="cover"
        />

        <Image
          source="https://images.unsplash.com/photo-1571290274554-6a2eaa771e5f?w=300&h=300&fit=crop"
          style={[styles.photo, { marginTop: 24 }]}
          contentFit="cover"
        />

        <Image
          source="https://images.unsplash.com/photo-1519014816548-bf5fe9f3c8bb?w=300&h=300&fit=crop"
          style={[styles.photo, { marginTop: -16 }]}
          contentFit="cover"
        />

        <Image
          source="https://images.unsplash.com/photo-1588015810531-dd522c9c8bbb?w=300&h=300&fit=crop"
          style={[styles.photo, { marginTop: -16 }]}
          contentFit="cover"
        />
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        <Text style={styles.iAm}>I AM A...</Text>

        <TouchableOpacity
  style={styles.primaryButton}
  onPress={() =>
    router.push({
      pathname: '/auth',
      params: { userType: 'customer' },
    })
  }
>
          <Text style={styles.primaryButtonText}>
            Customer — Find a Nail Artist
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
  style={styles.secondaryButton}
  onPress={() =>
    router.push({
      pathname: '/auth',
      params: { userType: 'designer' },
    })
  }
>
          <Text style={styles.secondaryButtonText}>
            Nail Artist — Find Clients
          </Text>
        </TouchableOpacity>

        <Text style={styles.loginText}>
          Already have an account?{' '}
          <Text style={styles.loginLink}>Log in</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    position: 'relative',
    overflow: 'hidden',
    paddingTop: 72,
  },

  circle: {
    position: 'absolute',
    borderRadius: 999,
  },

  circleTopRight: {
    width: 208,
    height: 208,
    backgroundColor: '#C4637A1A',
    top: -70,
    right: -70,
  },

  circleTopLeft: {
    width: 96,
    height: 96,
    backgroundColor: '#E07A5F26',
    top: 100,
    left: -32,
  },

  circleBottomRight: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: '#C4637A33',
    bottom: 160,
    right: 24,
  },

  circleBottomLeft: {
    width: 32,
    height: 32,
    backgroundColor: '#C4637A33',
    bottom: 80,
    left: 32,
  },

  logoSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 2,
  },

  logo: {
    fontSize: 48,
    color: COLORS.foreground,
    fontFamily: 'serif',
    lineHeight: 52,
  },

  subtitle: {
    marginTop: 12,
    maxWidth: 280,
    textAlign: 'center',
    color: COLORS.mutedForeground,
    fontSize: 14,
    lineHeight: 21,
  },

  photoRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 32,
    height: 160,
    zIndex: 2,
  },

  photo: {
    flex: 1,
    height: 144,
    borderRadius: 20,
  },

  ctaSection: {
    marginTop: 'auto',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
    zIndex: 2,
  },

  iAm: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.mutedForeground,
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },

  loginText: {
    textAlign: 'center',
    color: COLORS.mutedForeground,
    fontSize: 12,
    marginTop: 8,
  },

  loginLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});