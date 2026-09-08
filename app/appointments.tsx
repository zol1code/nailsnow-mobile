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
  ScrollView,
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
// Represents one customer booking stored in the app.
// This type will also be used when supporting multiple appointments.
type CustomerAppointment = {
  designerId: number;
  service: string;
  date: string;
  time: string;
};
export default function AppointmentsScreen() {
  const params = useLocalSearchParams();
// Stores appointment data loaded from the device.
// It will be used when the screen is opened without route parameters.
// Stores one appointment loaded from the device
const [savedAppointment, setSavedAppointment] =
  useState<CustomerAppointment | null>(null);
// Stores all customer appointments.
// This will replace the single savedAppointment flow gradually.
const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);  

// Stores the current booking status set by the designer
const [appointmentStatus, setAppointmentStatus] = useState<
  'pending' | 'accepted' | 'declined'
>('pending');

// Loads a previously saved appointment when this screen opens.
// This allows the appointment to remain available after closing the app.

 useEffect(() => {
  const loadSavedAppointment = async () => {
    // Loads the old single appointment from the device
    const storedAppointment = await AsyncStorage.getItem(
      'customerAppointment'
    );

    // Loads the new list containing all customer appointments
    const storedAppointments = await AsyncStorage.getItem(
      'customerAppointments'
    );

    // If the new appointments list already exists,
    // restore all appointments from it.
    if (storedAppointments) {
      const parsedAppointments: CustomerAppointment[] =
        JSON.parse(storedAppointments);

      setAppointments(parsedAppointments);
    }

    // Restores the old single appointment.
    // We still keep this temporarily for compatibility with the current flow.
    if (storedAppointment) {
      const parsedAppointment: CustomerAppointment =
        JSON.parse(storedAppointment);

      setSavedAppointment(parsedAppointment);

      // If the new list does not exist yet,
      // use the old appointment as the first item in the list.
      if (!storedAppointments) {
        setAppointments([parsedAppointment]);
      }
    }
  };

  loadSavedAppointment();
}, []);
// Loads the current appointment status saved by the designer
useEffect(() => {
  const loadAppointmentStatus = async () => {
    const savedStatus = await AsyncStorage.getItem(
      'customerAppointmentStatus'
    );

    // Restores the booking status if one was previously saved
    if (
      savedStatus === 'accepted' ||
      savedStatus === 'declined'
    ) {
      setAppointmentStatus(savedStatus);
    }
  };

  loadAppointmentStatus();
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

      // Saves the newest appointment in the old storage key.
// We keep this temporarily so the current app flow continues working.
await AsyncStorage.setItem(
  'customerAppointment',
  JSON.stringify(appointmentToSave)
);

// Adds the new appointment to the appointments list
// instead of replacing the previous appointment.
setAppointments((prev) => {
  const updatedAppointments = [...prev, appointmentToSave];

  // Saves all appointments locally on the device.
  AsyncStorage.setItem(
    'customerAppointments',
    JSON.stringify(updatedAppointments)
  );

  return updatedAppointments;
});

// Keeps the old single-appointment state working for now
setSavedAppointment(appointmentToSave);
    }
  };

  saveAppointment();
}, [params.id, params.service, params.date, params.time]);


 // Checks whether the customer has at least one appointment.
// It supports both the old single-booking flow and the new appointments list.
const hasAppointment =
  appointments.length > 0 ||
  Boolean(designerId && service && date && time);

  // Uses the first appointment from the new list when available.
// Falls back to the old single-appointment flow while the migration is in progress.
const activeAppointment =
  appointments[0] ??
  (hasAppointment
    ? {
        designerId,
        service,
        date,
        time,
      }
    : null);

    // Finds the designer connected to the appointment currently shown
const designer =
  DESIGNERS.find(
    (item) =>
      item.id ===
      (activeAppointment?.designerId ?? designerId)
  ) ?? DESIGNERS[0];
// Finds the correct nail artist for each appointment.
// This will be used when multiple appointment cards are displayed.
const getDesignerForAppointment = (
  appointment: CustomerAppointment
) => {
  return (
    DESIGNERS.find(
      (item) => item.id === appointment.designerId
    ) ?? DESIGNERS[0]
  );
};
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

      <ScrollView
  style={styles.content}
  contentContainerStyle={{ paddingBottom: 40 }}
  showsVerticalScrollIndicator={false}
>
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
         <>
  {appointments.map((appointment, index) => {
    // Finds the correct nail artist for this specific appointment
    const appointmentDesigner =
      getDesignerForAppointment(appointment);

    return (
      <View
        key={`${appointment.designerId}-${appointment.date}-${appointment.time}-${index}`}
        style={styles.card}
      >
        <View style={styles.statusRow}>
          <View style={styles.confirmedBadge}>
            <View style={styles.statusDot} />

            <Text style={styles.confirmedText}>
              {appointmentStatus === 'accepted'
                ? 'Accepted'
                : appointmentStatus === 'declined'
                ? 'Declined'
                : 'Pending'}
            </Text>
          </View>

          <Text style={styles.upcoming}>
            Upcoming
          </Text>
        </View>

        <View style={styles.designerRow}>
          <Image
            source={appointmentDesigner.avatar}
            style={styles.avatar}
            contentFit="cover"
          />

          <View>
            <Text style={styles.designerName}>
              {appointmentDesigner.name}
            </Text>

            <Text style={styles.serviceName}>
              {appointment.service}
            </Text>
          </View>
        </View>

        <View style={styles.dateTimeRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>
              Date
            </Text>

            <Text style={styles.infoValue}>
              {appointment.date}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>
              Time
            </Text>

            <Text style={styles.infoValue}>
              {appointment.time}
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
                  id: appointmentDesigner.id.toString(),
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
  // Creates a new list without the appointment the customer cancelled
  const updatedAppointments = appointments.filter(
    (_, appointmentIndex) => appointmentIndex !== index
  );

  // Saves the updated appointments list on the device
  await AsyncStorage.setItem(
    'customerAppointments',
    JSON.stringify(updatedAppointments)
  );

  // Updates the screen immediately
  setAppointments(updatedAppointments);

  // If no appointments remain, also clears the old compatibility storage
  if (updatedAppointments.length === 0) {
    await AsyncStorage.removeItem('customerAppointment');
    await AsyncStorage.removeItem('customerAppointmentStatus');

    setSavedAppointment(null);
    setAppointmentStatus('pending');
  }
}}
          >
            <Text style={styles.cancelButtonText}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    );
  })}
</>
)}
      </ScrollView>
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