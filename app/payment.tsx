import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
// Supabase client used to load the real designer information.
import { supabase } from '../lib/supabase';

const COLORS = {
  background: '#FDF5EF',
  foreground: '#1C0B12',
  card: '#FFFFFF',
  primary: '#C4637A',
  muted: '#F0E6E9',
  mutedForeground: '#8B6472',
  inputBackground: '#F5EBEE',
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
// Converts YYYY-MM-DD into a friendly date for the customer.
function formatAppointmentDate(value: string) {
  if (!value) return '';

  const [year, month, day] = value.split('-').map(Number);

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('en-IE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Converts PostgreSQL time (14:00:00) into 2:00 PM.
function formatAppointmentTime(value: string) {
  if (!value) return '';

  const [hours, minutes] = value.split(':').map(Number);

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
}

export default function PaymentScreen() {
  const params = useLocalSearchParams();

// ID of the real designer received from the Booking screen.
// Supabase designer IDs are UUID strings.
const designerId = String(params.id ?? '');

// Keeps the mock designer temporarily for the visual information
// while the Payment screen is being migrated to Supabase.
const designer = DESIGNERS[0];
// Stores the real designer information loaded from Supabase.
const [realDesigner, setRealDesigner] = useState<{
  name: string | null;
  avatar_url: string | null;
} | null>(null);

// Loads the real designer using the UUID received from Booking.
useEffect(() => {
  const loadDesigner = async () => {
    if (!designerId) {
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', designerId)
      .maybeSingle();

    if (error) {
      console.log('Payment designer error:', error.message);
      return;
    }

    setRealDesigner(data);
  };

  loadDesigner();
}, [designerId]);
const serviceId = Number(params.serviceId ?? 0);

  const service = String(params.service ?? '');
  const price = Number(params.price ?? 0);
  // Receives the service duration from the booking screen
const duration = Number(params.duration ?? 0);
  const date = String(params.date ?? '');
  const time = String(params.time ?? '');

  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');

  const total = price + 2.99;

  function formatCard(value: string) {
    return value
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(.{4})/g, '$1 ')
      .trim();
  }

  function formatExpiry(value: string) {
    const numbers = value.replace(/\D/g, '').slice(0, 4);

    if (numbers.length > 2) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    }

    return numbers;
  }

  async function confirmBooking() {
  // Gets the customer currently logged into the app.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log(
      'Create appointment error: customer not logged in'
    );
    return;
  }

  // Creates the real appointment in Supabase.
  const { data: createdAppointment, error } = await supabase
    .from('appointments')
    .insert({
      customer_id: user.id,
      designer_id: designerId,
      service_id: serviceId,
      service_name: service,
      price,
      duration_minutes: duration,
      appointment_date: date,
      appointment_time: time,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.log(
      'Create appointment error:',
      error.message
    );
    return;
  }

  // Opens the confirmation screen only after
  // Supabase successfully creates the appointment.
  router.push({
    pathname: '/confirmed',
    params: {
      id: designerId,

      // Real appointment ID created by Supabase.
      appointmentId: createdAppointment.id,

      service,
      price: price.toString(),
      duration: duration.toString(),
      date,
      time,
    },
  });
}

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

        <View>
          <Text style={styles.title}>
            Payment
          </Text>

          <Text style={styles.subtitle}>
            Secure, encrypted checkout
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.summaryCard}>
          <Image
            source={realDesigner?.avatar_url || designer.avatar}
            style={styles.avatar}
            contentFit="cover"
          />

          <View style={styles.summaryInfo}>
            <Text
              style={styles.serviceName}
              numberOfLines={1}
            >
              {service}
            </Text>

           <Text style={styles.appointmentInfo}>
  {realDesigner?.name || designer.name} · {formatAppointmentDate(date)} at{' '}
  {formatAppointmentTime(time)}
</Text>
          </View>

          <Text style={styles.summaryPrice}>
  €{price.toFixed(2)}
</Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>
            Card Details
          </Text>

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>
                Cardholder Name
              </Text>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Sofia Mendes"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.input}
              />
            </View>

            <View>
              <Text style={styles.label}>
                Card Number
              </Text>

              <View style={styles.cardInputWrapper}>
                <Ionicons
                  name="card-outline"
                  size={18}
                  color={COLORS.mutedForeground}
                />

                <TextInput
                  value={card}
                  onChangeText={(value) =>
                    setCard(formatCard(value))
                  }
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={COLORS.mutedForeground}
                  keyboardType="number-pad"
                  style={styles.cardInput}
                />
              </View>
            </View>

            <View style={styles.twoColumns}>
              <View style={styles.half}>
                <Text style={styles.label}>
                  Expiry
                </Text>

                <TextInput
                  value={expiry}
                  onChangeText={(value) =>
                    setExpiry(formatExpiry(value))
                  }
                  placeholder="MM/YY"
                  placeholderTextColor={COLORS.mutedForeground}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>

              <View style={styles.half}>
                <Text style={styles.label}>
                  CVV
                </Text>

                <TextInput
                  value={cvv}
                  onChangeText={(value) =>
                    setCvv(
                      value
                        .replace(/\D/g, '')
                        .slice(0, 3)
                    )
                  }
                  placeholder="•••"
                  placeholderTextColor={COLORS.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.breakdownCard}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              {service}
            </Text>

            <Text style={styles.breakdownValue}>
              ${price.toFixed(2)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Service fee
            </Text>

            <Text style={styles.breakdownValue}>
              $2.99
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Total
            </Text>

            <Text style={styles.totalValue}>
              ${total.toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={styles.payButton}
          onPress={confirmBooking}
        >
          <Text style={styles.payText}>
            Pay ${total.toFixed(2)} · Confirm Booking
          </Text>
        </Pressable>
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

  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 130,
    gap: 20,
  },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(196, 99, 122, 0.20)',
    backgroundColor: 'rgba(196, 99, 122, 0.08)',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },

  summaryInfo: {
    flex: 1,
  },

  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  appointmentInfo: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  summaryPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },

  sectionTitle: {
    marginBottom: 12,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    color: COLORS.mutedForeground,
  },

  form: {
    gap: 12,
  },

  label: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.mutedForeground,
  },

  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.inputBackground,
    fontSize: 14,
    color: COLORS.foreground,
  },

  cardInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.inputBackground,
  },

  cardInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.foreground,
  },

  twoColumns: {
    flexDirection: 'row',
    gap: 12,
  },

  half: {
    flex: 1,
  },

  breakdownCard: {
    padding: 16,
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  breakdownLabel: {
    fontSize: 14,
    color: COLORS.mutedForeground,
  },

  breakdownValue: {
    fontSize: 14,
    color: COLORS.foreground,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },

  payButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },

  payText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});