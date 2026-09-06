import { Ionicons } from '@expo/vector-icons';
// Stores appointments locally so they remain available after closing the app
import AsyncStorage from '@react-native-async-storage/async-storage';
// Stores appointments locally so they remain available after closing the app
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
// React hooks used to store and restore appointment data
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const COLORS = {
  background: '#FDF5EF',
  foreground: '#1C0B12',
  card: '#FFFFFF',
  primary: '#C4637A',
  muted: '#F0E6E9',
  mutedForeground: '#8B6472',
  destructive: '#D4183D',
  border: 'rgba(196, 99, 122, 0.14)',
};

const img = (id: string, width = 200, height = 200) =>
  `https://images.unsplash.com/photo-${id}?w=${width}&h=${height}&fit=crop&auto=format`;

const P = {
  a1: '1580489944761-15a19d654956',
  a2: '1662850886700-4ec19bd30d11',
  a3: '1489278353717-f64c6ee8a4d2',
  a4: '1562337404-3044c84ac061',
  a5: '1607569708758-0270aa4651bd',
};

const DESIGNERS = [
  {
    id: 1,
    name: 'Sofia Mendes',
    avatar: img(P.a1),
  },
  {
    id: 2,
    name: 'Priya Kapoor',
    avatar: img(P.a2),
  },
  {
    id: 3,
    name: 'Camille Dubois',
    avatar: img(P.a3),
  },
  {
    id: 4,
    name: 'Alicia Vega',
    avatar: img(P.a4),
  },
  {
    id: 5,
    name: 'Mia Santos',
    avatar: img(P.a5),
  },
];

export default function AppointmentsScreen() {
  const params = useLocalSearchParams();
// Stores appointment data loaded from the device.
// It will be used when the screen is opened without route parameters.
const [savedAppointment, setSavedAppointment] = useState<{
  designerId: number;
  service: string;
  date: string;
  time: string;
} | null>(null);
// Loads a previously saved appointment when this screen opens.
// This allows the appointment to remain available after closing the app.
useEffect(() => {
  const loadSavedAppointment = async () => {
    const storedAppointment = await AsyncStorage.getItem(
      'customerAppointment'
    );

    // Restores the saved appointment if one exists on the device
    if (storedAppointment) {
      setSavedAppointment(JSON.parse(storedAppointment));
    }
  };

  loadSavedAppointment();
}, []);
// Uses route parameters when available.
// If the screen is opened directly, it falls back to the saved appointment.
const designerId = Number(
  params.id ?? savedAppointment?.designerId ?? 0
);

const service = String(
  params.service ?? savedAppointment?.service ?? ''
);

const date = String(
  params.date ?? savedAppointment?.date ?? ''
);

const time = String(
  params.time ?? savedAppointment?.time ?? ''
);
// Saves a new appointment when this screen receives booking data by route.
// This allows the appointment to remain available after closing the app.
useEffect(() => {
  const saveAppointment = async () => {
    const routeDesignerId = Number(params.id ?? 0);
    const routeService = String(params.service ?? '');
    const routeDate = String(params.date ?? '');
    const routeTime = String(params.time ?? '');

    // Only saves when a complete appointment was received
    if (
      routeDesignerId &&
      routeService &&
      routeDate &&
      routeTime
    ) {
      const appointmentToSave = {
        designerId: routeDesignerId,
        service: routeService,
        date: routeDate,
        time: routeTime,
      };

      await AsyncStorage.setItem(
        'customerAppointment',
        JSON.stringify(appointmentToSave)
      );

      setSavedAppointment(appointmentToSave);
    }
  };

  saveAppointment();
}, [params.id, params.service, params.date, params.time]);
  const designer =
  DESIGNERS.find((item) => item.id === designerId) ?? DESIGNERS[0];

  const hasAppointment =
  Boolean(designerId && service && date && time);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={COLORS.foreground}
          />
        </Pressable>

        <Text style={styles.title}>
          My Appointments
        </Text>
      </View>

      <View style={styles.content}>
        {!hasAppointment ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="calendar-outline"
              size={56}
              color="rgba(139, 100, 114, 0.30)"
            />

            <Text style={styles.emptyTitle}>
              No appointments yet
            </Text>

            <Text style={styles.emptySubtitle}>
              Browse nail artists and book your first appointment!
            </Text>

            <Pressable
              style={styles.browseButton}
              onPress={() => router.push('/customer-feed')}
            >
              <Text style={styles.browseButtonText}>
                Browse Artists
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <View style={styles.confirmedBadge}>
                <View style={styles.statusDot} />

                <Text style={styles.confirmedText}>
                  Confirmed
                </Text>
              </View>

              <Text style={styles.upcoming}>
                Upcoming
              </Text>
            </View>

            <View style={styles.designerRow}>
              <Image
                source={designer.avatar}
                style={styles.avatar}
                contentFit="cover"
              />

              <View>
                <Text style={styles.designerName}>
                  {designer.name}
                </Text>

                <Text style={styles.serviceName}>
                  {service}
                </Text>
              </View>
            </View>

            <View style={styles.dateTimeRow}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>
                  Date
                </Text>

                <Text style={styles.infoValue}>
                  {date}
                </Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>
                  Time
                </Text>

                <Text style={styles.infoValue}>
                  {time}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                style={styles.chatButton}
                onPress={() =>
                  router.push({
                    pathname: '/chat',
                    params: {
                      id: designer.id.toString(),
                    },
                  })
                }
              >
                <Text style={styles.chatButtonText}>
                  Chat with Artist
                </Text>
              </Pressable>

              <Pressable
  style={styles.cancelButton}
  onPress={async () => {
    // Removes the saved appointment from the device
    await AsyncStorage.removeItem('customerAppointment');

    // Removes the appointment from the screen immediately
    setSavedAppointment(null);
  }}
>
  <Text style={styles.cancelButtonText}>
    Cancel
  </Text>
</Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontFamily: 'serif',
    fontSize: 20,
    color: COLORS.foreground,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 70,
  },

  emptyTitle: {
    marginTop: 16,
    marginBottom: 4,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foreground,
  },

  emptySubtitle: {
    maxWidth: 280,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.mutedForeground,
  },

  browseButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },

  browseButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },

  confirmedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },

  upcoming: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  designerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },

  designerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  serviceName: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  dateTimeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },

  infoBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.muted,
  },

  infoLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: COLORS.mutedForeground,
  },

  infoValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  actions: {
    flexDirection: 'row',
    gap: 8,
  },

  chatButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },

  chatButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(212, 24, 61, 0.60)',
  },

  cancelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.destructive,
  },
});