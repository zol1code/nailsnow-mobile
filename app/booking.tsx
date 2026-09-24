import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
const COLORS = {
  background: '#FDF5EF',
  foreground: '#1C0B12',
  card: '#FFFFFF',
  primary: '#C4637A',
  muted: '#F0E6E9',
  mutedForeground: '#8B6472',
  border: 'rgba(196, 99, 122, 0.14)',
};

type Service = {
  id: number;
  name: string;
  duration: number;
  price: number;
};
const DESIGNERS = [
  {
    id: 1,
    name: 'Sofia Mendes',
    services: [
      { name: 'Classic Manicure', duration: '45 min', price: 35 },
      { name: 'Gel Polish', duration: '60 min', price: 55 },
      { name: 'Gel Extensions', duration: '90 min', price: 95 },
      { name: 'Nail Art Design', duration: '20 min', price: 15 },
      { name: 'Nail Removal', duration: '30 min', price: 25 },
    ],
  },
  {
    id: 2,
    name: 'Priya Kapoor',
    services: [
      { name: 'Classic Manicure', duration: '45 min', price: 35 },
      { name: 'French Manicure', duration: '60 min', price: 50 },
      { name: 'Gel Polish', duration: '60 min', price: 50 },
      { name: 'Pedicure', duration: '60 min', price: 55 },
      { name: 'Mani + Pedi Combo', duration: '2 hrs', price: 80 },
    ],
  },
  {
    id: 3,
    name: 'Camille Dubois',
    services: [
      { name: 'Custom Press-On Set', duration: '2 hrs', price: 75 },
      { name: 'Acrylic Full Set', duration: '90 min', price: 85 },
      { name: 'Acrylic Fill', duration: '60 min', price: 50 },
      { name: 'Nail Art Add-On', duration: '30 min', price: 20 },
      { name: 'Soak-Off Removal', duration: '30 min', price: 25 },
    ],
  },
  {
    id: 4,
    name: 'Alicia Vega',
    services: [
      { name: 'Natural Manicure', duration: '40 min', price: 30 },
      { name: 'Strengthening Treatment', duration: '45 min', price: 40 },
      { name: 'Paraffin Wax Treatment', duration: '75 min', price: 60 },
      { name: 'Nail Repair', duration: '20 min', price: 15 },
      { name: 'Spa Pedicure', duration: '75 min', price: 65 },
    ],
  },
  {
    id: 5,
    name: 'Mia Santos',
    services: [
      { name: 'Gel Manicure (Color)', duration: '60 min', price: 55 },
      { name: '3D Nail Art', duration: '2 hrs', price: 110 },
      { name: 'Ombre Gel', duration: '75 min', price: 70 },
      { name: 'Chrome Powder Add-On', duration: '15 min', price: 15 },
      { name: 'Gel Extension + Art', duration: '2.5 hrs', price: 130 },
    ],
  },
];

// Generates the next 7 available calendar days dynamically.
const DAYS = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();

  // Starts with today and generates the following days.
  date.setDate(date.getDate() + index);

  return {
    // Used only for displaying the date to the customer.
    label: date.toLocaleDateString('en-IE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),

    // ISO date sent to Supabase, e.g. 2026-09-24.
    value: [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-'),
  };
});

// Appointment times.
// label = what the customer sees.
// value = PostgreSQL-compatible time sent to Supabase.
const TIME_SLOTS = [
  { label: '9:00 AM', value: '09:00:00' },
  { label: '10:00 AM', value: '10:00:00' },
  { label: '11:00 AM', value: '11:00:00' },
  { label: '12:00 PM', value: '12:00:00' },
  { label: '2:00 PM', value: '14:00:00' },
  { label: '3:00 PM', value: '15:00:00' },
  { label: '4:00 PM', value: '16:00:00' },
  { label: '5:00 PM', value: '17:00:00' },
];

export default function BookingScreen() {
  const params = useLocalSearchParams();

// ID received from the Designer Profile.
// Real Supabase designer IDs are UUID strings.
const designerId = String(params.id ?? '');
console.log('BOOKING DESIGNER ID:', designerId);
// Keeps the mock designer temporarily as a visual fallback
// while the Booking screen is being migrated to Supabase.
const designer = DESIGNERS[0];

// Structure of a real service loaded from Supabase.
type RealService = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
};

  const [service, setService] = useState<Service | null>(null);
  // Stores the real services of the selected designer.
const [realServices, setRealServices] = useState<RealService[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
// Loads the selected designer's real services from Supabase.
useEffect(() => {
  const loadDesignerServices = async () => {
    if (!designerId) {
      return;
    }

    const { data, error } = await supabase
      .from('designer_services')
      .select(
        'id, name, description, price, duration_minutes'
      )
      .eq('designer_id', designerId)
      .order('created_at', { ascending: true });

    if (error) {
      console.log(
        'Booking services error:',
        error.message
      );
      return;
    }

    setRealServices(data ?? []);
  };

  loadDesignerServices();
}, [designerId]);
  const ready = Boolean(service && date && time);

  function continueToPayment() {
    if (!service || !date || !time) {
      return;
    }

    router.push({
      pathname: '/payment',
     params: {
  id: designerId,

  // ID of the real service in designer_services.
  serviceId: service.id.toString(),

  service: service.name,
  price: service.price.toString(),

  // Passes the service duration to the payment flow.
  duration: service.duration.toString(),

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
            Book Appointment
          </Text>

          <Text style={styles.subtitle}>
            with {designer.name}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View>
          <Text style={styles.sectionTitle}>
            Select Service
          </Text>

          <View style={styles.serviceList}>
           {realServices.map((item) => {
  const selected = service?.name === item.name;

  return (
    <Pressable
      key={item.id}
      style={[
        styles.serviceCard,
        selected && styles.serviceCardSelected,
      ]}
    onPress={() =>
  setService({
    id: item.id,
    name: item.name,
    price: Number(item.price),
    duration: item.duration_minutes,
  })
}
    >
      <View>
        <Text style={styles.serviceName}>
          {item.name}
        </Text>

        <View style={styles.durationRow}>
          <Ionicons
            name="time-outline"
            size={13}
            color={COLORS.mutedForeground}
          />

          <Text style={styles.durationText}>
            {item.duration_minutes} min
          </Text>
        </View>
      </View>

      <Text style={styles.price}>
        €{Number(item.price).toFixed(2)}
      </Text>
    </Pressable>
  );
})}
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>
            Select Date
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
          >
           {DAYS.map((item) => {
  // Separates the visual label into weekday and date.
  const labelParts = item.label.replace(',', '').split(' ');
  const day = labelParts[0];
  const rest = labelParts.slice(1).join(' ');

  // The selected value is the ISO date stored in item.value.
  const selected = date === item.value;

  return (
    <Pressable
      key={item.value}
      style={[
        styles.dateCard,
        selected && styles.dateCardSelected,
      ]}
      onPress={() => setDate(item.value)}
    >
      <Text
        style={[
          styles.dateDay,
          selected && styles.dateTextSelected,
        ]}
      >
        {day}
      </Text>

      <Text
        style={[
          styles.dateNumber,
          selected && styles.dateTextSelected,
        ]}
      >
        {rest}
      </Text>
    </Pressable>
  );
})}
          </ScrollView>
        </View>

        <View>
          <Text style={styles.sectionTitle}>
            Select Time
          </Text>

          <View style={styles.timeGrid}>
  {TIME_SLOTS.map((item) => {
    // Compares the PostgreSQL-compatible time value.
    const selected = time === item.value;

    return (
      <Pressable
        key={item.value}
        style={[
          styles.timeButton,
          selected && styles.timeButtonSelected,
        ]}
        // Stores the database-compatible time.
        onPress={() => setTime(item.value)}
      >
        <Text
          style={[
            styles.timeText,
            selected && styles.timeTextSelected,
          ]}
        >
          {/* Shows the friendly time to the customer. */}
          {item.label}
        </Text>
      </Pressable>
    );
  })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {service && (
          <View style={styles.summary}>
            <View>
              <Text style={styles.summaryName}>
                {service.name}
              </Text>

              <Text style={styles.summaryDetails}>
  {DAYS.find((item) => item.value === date)?.label ?? date}
  {time
    ? ` · ${TIME_SLOTS.find((item) => item.value === time)?.label ?? time}`
    : ''}
</Text>
            </View>

            <Text style={styles.summaryPrice}>
  €{Number(service.price).toFixed(2)}
</Text>
          </View>
        )}

        <Pressable
          style={[
            styles.continueButton,
            !ready && styles.continueButtonDisabled,
          ]}
          disabled={!ready}
          onPress={continueToPayment}
        >
          <Text style={styles.continueText}>
            Continue to Payment
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
    paddingBottom: 180,
    gap: 24,
  },

  sectionTitle: {
    marginBottom: 12,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    color: COLORS.mutedForeground,
  },

  serviceList: {
    gap: 8,
  },

  serviceCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  serviceCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FBF1F3',
  },

  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foreground,
  },

  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },

  durationText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  price: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },

  dateRow: {
    gap: 8,
    paddingBottom: 2,
  },

  dateCard: {
    minWidth: 70,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  dateCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  dateDay: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: COLORS.mutedForeground,
  },

  dateNumber: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  dateTextSelected: {
    color: '#FFFFFF',
  },

  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  timeButton: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  timeButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.foreground,
  },

  timeTextSelected: {
    color: '#FFFFFF',
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

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  summaryName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  summaryDetails: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  summaryPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },

  continueButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },

  continueButtonDisabled: {
    opacity: 0.4,
  },

  continueText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});