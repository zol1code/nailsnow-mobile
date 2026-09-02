import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
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
  mutedForeground: '#8B6472',
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
    specialty: 'Gel Extensions & Nail Art',
    avatar: img(P.a1),
  },
  {
    id: 2,
    name: 'Priya Kapoor',
    specialty: 'Minimalist & French Nails',
    avatar: img(P.a2),
  },
  {
    id: 3,
    name: 'Camille Dubois',
    specialty: 'Press-Ons & Custom Acrylics',
    avatar: img(P.a3),
  },
  {
    id: 4,
    name: 'Alicia Vega',
    specialty: 'Nail Health & Natural Manicure',
    avatar: img(P.a4),
  },
  {
    id: 5,
    name: 'Mia Santos',
    specialty: 'Bold Colors & 3D Nail Art',
    avatar: img(P.a5),
  },
];

export default function ConfirmedScreen() {
  const params = useLocalSearchParams();

  const designerId = Number(params.id ?? 1);

  const designer =
    DESIGNERS.find((item) => item.id === designerId) ?? DESIGNERS[0];

  const service = String(params.service ?? '');
  const price = Number(params.price ?? 0);
  const date = String(params.date ?? '');
  const time = String(params.time ?? '');

  const total = price + 2.99;

  return (
    <View style={styles.container}>
      <View style={styles.checkOuter}>
        <View style={styles.checkInner}>
          <Ionicons
            name="checkmark"
            size={34}
            color="#FFFFFF"
          />
        </View>
      </View>

      <Text style={styles.title}>
        Booked!
      </Text>

      <Text style={styles.subtitle}>
        Your appointment is confirmed. {designer.name} will see you soon!
      </Text>

      <View style={styles.card}>
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

            <Text style={styles.specialty}>
              {designer.specialty}
            </Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Service
            </Text>

            <Text style={styles.detailValue}>
              {service}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Date & Time
            </Text>

            <Text style={styles.detailValue}>
              {date} at {time}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Duration
            </Text>

            <Text style={styles.detailValue}>
              —
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Total Paid
            </Text>

            <Text style={styles.totalValue}>
              ${total.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={styles.messageButton}
          onPress={() =>
            router.push({
              pathname: '/chat',
              params: { id: designer.id.toString() },
            })
          }
        >
          <Text style={styles.messageText}>
            Message {designer.name}
          </Text>
        </Pressable>

       <Pressable
  style={styles.appointmentsButton}
  onPress={() =>
    router.push({
      pathname: '/appointments',
      params: {
        id: designer.id.toString(),
        service,
        date,
        time,
      },
    })
  }
>
  <Text style={styles.appointmentsText}>
    View My Appointments
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  checkOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  checkInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontFamily: 'serif',
    fontSize: 30,
    color: COLORS.foreground,
    marginBottom: 8,
  },

  subtitle: {
    maxWidth: 320,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.mutedForeground,
  },

  card: {
    width: '100%',
    marginTop: 32,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
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

  specialty: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  details: {
    gap: 10,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },

  detailLabel: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  totalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },

  buttons: {
    width: '100%',
    gap: 12,
    marginTop: 24,
  },

  messageButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },

  messageText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },

  appointmentsButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },

  appointmentsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});