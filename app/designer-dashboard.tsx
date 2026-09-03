import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
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
  border: 'rgba(196, 99, 122, 0.14)',
};

const img = (id: string, width = 200, height = 200) =>
  `https://images.unsplash.com/photo-${id}?w=${width}&h=${height}&fit=crop&auto=format`;

const P = {
  a1: '1580489944761-15a19d654956',
  a3: '1489278353717-f64c6ee8a4d2',
  a4: '1562337404-3044c84ac061',
  a5: '1607569708758-0270aa4651bd',
};

const N = {
  n1: '1604654894610-df63bc536371',
  n2: '1571290274554-6a2eaa771e5f',
  n3: '1604654894611-6973b376cbde',
  n4: '1519014816548-bf5fe059798b',
  n5: '1587729927069-ef3b7a5ab9b4',
  n6: '1754799670312-8e7da8e40ad7',
  n7: '1588015810531-dd522c9c8bbb',
  n8: '1588359953494-0c215e3cedc6',
  n9: '1720343409646-960f6dcccae3',
};

type RequestStatus = 'pending' | 'confirmed';

type BookingRequest = {
  client: string;
  service: string;
  date: string;
  avatar: string;
  status: RequestStatus;
};

export default function DesignerDashboard() {
  const [tab, setTab] = useState('Overview');
  const [acceptedRequests, setAcceptedRequests] = useState<number[]>([]);
  const [declinedRequests, setDeclinedRequests] = useState<number[]>([]);
  const [availableDays, setAvailableDays] = useState([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]);

const [scheduleTimes, setScheduleTimes] = useState({
  Monday: { start: '9:00 AM', end: '6:00 PM' },
  Tuesday: { start: '9:00 AM', end: '6:00 PM' },
  Wednesday: { start: '9:00 AM', end: '6:00 PM' },
  Thursday: { start: '9:00 AM', end: '6:00 PM' },
  Friday: { start: '9:00 AM', end: '6:00 PM' },
  Saturday: { start: '9:00 AM', end: '6:00 PM' },
  Sunday: { start: '9:00 AM', end: '6:00 PM' },
});

const timeOptions = [
  '7:00 AM',
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
  '7:00 PM',
  '8:00 PM',
  '9:00 PM',
];

const [editingTime, setEditingTime] = useState<{
  day: string;
  type: 'start' | 'end';
} | null>(null);

  const tabs = ['Overview', 'Portfolio', 'Schedule', 'Requests'];

  const stats = [
    {
      label: 'This Month',
      value: '$1,240',
      icon: 'cash-outline',
      box: '#ECFDF5',
      iconColor: '#059669',
    },
    {
      label: 'Bookings',
      value: '18',
      icon: 'calendar-outline',
      box: '#FBECEF',
      iconColor: COLORS.primary,
    },
    {
      label: 'New Clients',
      value: '7',
      icon: 'people-outline',
      box: '#EFF6FF',
      iconColor: '#2563EB',
    },
    {
      label: 'Rating',
      value: '4.9',
      icon: 'star-outline',
      box: '#FFFBEB',
      iconColor: '#D97706',
    },
  ];

  const requests: BookingRequest[] = [
    {
      client: 'Emma R.',
      service: 'Gel Extensions',
      date: 'Thu Aug 28 · 2:00 PM',
      avatar: img(P.a3, 60, 60),
      status: 'pending',
    },
    {
      client: 'Mia D.',
      service: 'Nail Art Design',
      date: 'Fri Aug 29 · 11:00 AM',
      avatar: img(P.a4, 60, 60),
      status: 'pending',
    },
    {
      client: 'Zoe T.',
      service: 'Classic Manicure',
      date: 'Mon Sep 1 · 3:00 PM',
      avatar: img(P.a5, 60, 60),
      status: 'confirmed',
    },
  ];

  const portfolio = Object.values(N).map((id) => img(id, 200, 200));

  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcome}>
              Welcome back!
            </Text>

            <Text style={styles.name}>
              Sofia ✦
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
  style={styles.iconButton}
  onPress={() => alert('No new notifications')}
>
              <Ionicons
                name="notifications-outline"
                size={18}
                color={COLORS.foreground}
              />
            </Pressable>

            <Image
              source={img(P.a1, 80, 80)}
              style={styles.profileImage}
              contentFit="cover"
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((item) => {
            const selected = tab === item;

            return (
              <Pressable
                key={item}
                onPress={() => setTab(item)}
                style={[
                  styles.tabButton,
                  selected && styles.tabButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    selected && styles.tabTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {tab === 'Overview' && (
          <>
            <View style={styles.statsGrid}>
              {stats.map((item) => (
                <View
                  key={item.label}
                  style={styles.statCard}
                >
                  <View
                    style={[
                      styles.statIcon,
                      { backgroundColor: item.box },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={18}
                      color={item.iconColor}
                    />
                  </View>

                  <Text style={styles.statValue}>
                    {item.value}
                  </Text>

                  <Text style={styles.statLabel}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.proCard}>
              <View style={styles.proTop}>
                <View>
                  <Text style={styles.proTitle}>
                    Artist Pro Plan
                  </Text>

                  <Text style={styles.proSubtitle}>
                    Active · renews Sep 26, 2026
                  </Text>
                </View>

                <View style={styles.proPriceBox}>
                  <Text style={styles.proPrice}>
                    $19.99/mo
                  </Text>
                </View>
              </View>

              <View style={styles.proFeatures}>
                <Text style={styles.proFeature}>
                  ✓ Unlimited discovery
                </Text>

                <Text style={styles.proFeature}>
                  ✓ Analytics
                </Text>

                <Text style={styles.proFeature}>
                  ✓ Priority listing
                </Text>
              </View>
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Recent Requests
              </Text>

              {requests.slice(0, 2).map((request, index) => (
                <View
                  key={`${request.client}-${index}`}
                  style={styles.requestRow}
                >
                  <Image
                    source={request.avatar}
                    style={styles.requestAvatar}
                    contentFit="cover"
                  />

                  <View style={styles.requestInfo}>
                    <Text style={styles.requestClient}>
                      {request.client}
                    </Text>

                    <Text
                      style={styles.requestDetails}
                      numberOfLines={1}
                    >
                      {request.service} · {request.date}
                    </Text>
                  </View>

                  {request.status === 'pending' ? (
                    <View style={styles.requestActions}>
                      <Pressable style={styles.acceptCircle}>
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color="#059669"
                        />
                      </Pressable>

                      <Pressable style={styles.declineCircle}>
                        <Ionicons
                          name="close"
                          size={16}
                          color="#EF4444"
                        />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.confirmedBadge}>
                      <Text style={styles.confirmedText}>
                        Confirmed
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {tab === 'Portfolio' && (
          <>
            <View style={styles.portfolioHeader}>
              <Text style={styles.photoCount}>
                {portfolio.length} photos
              </Text>

              <Pressable
  style={styles.addPhotosButton}
  onPress={() => alert('Add Photos')}
>
                <Ionicons
                  name="add"
                  size={15}
                  color="#FFFFFF"
                />

                <Text style={styles.addPhotosText}>
                  Add Photos
                </Text>
              </Pressable>
            </View>

            <View style={styles.portfolioGrid}>
              {portfolio.map((source, index) => (
                <Image
                  key={index}
                  source={source}
                  style={styles.portfolioImage}
                  contentFit="cover"
                />
              ))}

              <Pressable style={styles.addPhotoTile}>
                <Ionicons
                  name="add"
                  size={26}
                  color={COLORS.mutedForeground}
                />
              </Pressable>
            </View>
          </>
        )}

        {tab === 'Schedule' && (
          <View>
            <Text style={styles.scheduleDescription}>
              Set your weekly availability. Clients can only book during your open hours.
            </Text>

            {days.map((day) => {
              const available = availableDays.includes(day);

              return (
                <View
                  key={day}
                  style={styles.dayRow}
                >
                  <Text style={styles.dayName}>
                    {day}
                  </Text>

                  {available ? (
                    <View style={styles.hours}>
                      <Pressable
  onPress={() =>
  setEditingTime({
    day,
    type: 'start',
  })
}
>
  <Text style={styles.hourBox}>
    {scheduleTimes[day as keyof typeof scheduleTimes].start}
  </Text>
</Pressable>

                      <Text style={styles.dash}>
                        —
                      </Text>

                     <Pressable
  
  onPress={() =>
    setEditingTime({
      day,
      type: 'end',
    })
  }
>
  <Text style={styles.hourBox}>
    {scheduleTimes[day as keyof typeof scheduleTimes].end}
  </Text>
</Pressable>
                    </View>
                  ) : (
                    <Text style={styles.unavailable}>
                      Unavailable
                    </Text>
                  )}

                 <Pressable
  onPress={() => {
    setAvailableDays((prev) =>
      prev.includes(day)
        ? prev.filter((item) => item !== day)
        : [...prev, day]
    );
  }}
  style={[
    styles.switchTrack,
    available && styles.switchTrackOn,
  ]}
>
  <View
    style={[
      styles.switchKnob,
      available && styles.switchKnobOn,
    ]}
  />
</Pressable>
                </View>
              );
            })}
          </View>
        )}
  {editingTime && (
  <View style={styles.timePickerBox}>
    <Text style={styles.timePickerTitle}>
      Choose {editingTime.type === 'start' ? 'opening' : 'closing'} time
    </Text>

    <View style={styles.timeOptionsGrid}>
      {timeOptions.map((time) => (
        <Pressable
          key={time}
          style={styles.timeOption}
          onPress={() => {
            const dayKey = editingTime.day as keyof typeof scheduleTimes;

            setScheduleTimes((prev) => ({
              ...prev,
              [dayKey]: {
                ...prev[dayKey],
                [editingTime.type]: time,
              },
            }));

            setEditingTime(null);
          }}
        >
          <Text style={styles.timeOptionText}>
            {time}
          </Text>
        </Pressable>
      ))}
    </View>

    <Pressable
      style={styles.cancelTimePicker}
      onPress={() => setEditingTime(null)}
    >
      <Text style={styles.cancelTimePickerText}>
        Cancel
      </Text>
    </Pressable>
  </View>
)}  
        {tab === 'Requests' && (
          <View style={styles.requestsList}>
            {requests.map((request, index) => (
              <View
                key={`${request.client}-${index}`}
                style={styles.requestCard}
              >
                <View style={styles.requestCardTop}>
                  <Image
                    source={request.avatar}
                    style={styles.requestCardAvatar}
                    contentFit="cover"
                  />

                  <View style={styles.requestInfo}>
                    <Text style={styles.requestClient}>
                      {request.client}
                    </Text>

                    <Text style={styles.requestDetails}>
                      {request.service}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      request.status === 'confirmed'
                        ? styles.statusConfirmed
                        : styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        request.status === 'confirmed'
                          ? styles.statusTextConfirmed
                          : styles.statusTextPending,
                      ]}
                    >
                      {request.status === 'confirmed'
                        ? 'Confirmed'
                        : 'Pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.requestDateRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={COLORS.mutedForeground}
                  />

                  <Text style={styles.requestDate}>
                    {request.date}
                  </Text>
                </View>

                {request.status === 'pending' && (
                  <View style={styles.requestButtons}>
                    <Pressable
  style={styles.acceptButton}
 onPress={() => {
  setAcceptedRequests((prev) =>
    prev.includes(index) ? prev : [...prev, index]
  );

  setDeclinedRequests((prev) =>
    prev.filter((item) => item !== index)
  );
}}
>
  <Text style={styles.acceptButtonText}>
    {acceptedRequests.includes(index) ? 'Accepted' : 'Accept'}
  </Text>
</Pressable>

  <Pressable
  style={styles.declineButton}
  onPress={() => {
    setDeclinedRequests((prev) =>
      prev.includes(index) ? prev : [...prev, index]
    );

    setAcceptedRequests((prev) =>
      prev.filter((item) => item !== index)
    );
  }}
>
  <Text style={styles.declineButtonText}>
    {declinedRequests.includes(index) ? 'Declined' : 'Decline'}
  </Text>
</Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>
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
    paddingTop: 54,
    paddingHorizontal: 20,
    backgroundColor: COLORS.background,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  welcome: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    color: COLORS.mutedForeground,
  },

  name: {
    marginTop: 2,
    fontFamily: 'serif',
    fontSize: 24,
    color: COLORS.foreground,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(196, 99, 122, 0.25)',
  },

  tabs: {
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  tabButton: {
    paddingBottom: 12,
  },

  tabButtonSelected: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },

  tabText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: COLORS.mutedForeground,
  },

  tabTextSelected: {
    color: COLORS.primary,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 20,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  statValue: {
    fontFamily: 'serif',
    fontSize: 24,
    color: COLORS.foreground,
  },

  statLabel: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  proCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
  },

  proTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  proTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  proSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },

  proPriceBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },

  proPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  proFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },

  proFeature: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },

  sectionTitle: {
    marginBottom: 12,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    color: COLORS.mutedForeground,
  },

  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  requestInfo: {
    flex: 1,
  },

  requestClient: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  requestDetails: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  requestActions: {
    flexDirection: 'row',
    gap: 6,
  },

  acceptCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  declineCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  confirmedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
  },

  confirmedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },

  portfolioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  photoCount: {
    fontSize: 14,
    color: COLORS.mutedForeground,
  },

  addPhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },

  addPhotosText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  portfolioImage: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
  },

  addPhotoTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scheduleDescription: {
    marginBottom: 16,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.mutedForeground,
  },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  dayName: {
    width: 92,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foreground,
  },

  hours: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  hourBox: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.muted,
    fontSize: 11,
    color: COLORS.foreground,
  },

  dash: {
    color: COLORS.mutedForeground,
  },

  unavailable: {
    flex: 1,
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    backgroundColor: COLORS.muted,
  },

  switchTrackOn: {
    backgroundColor: COLORS.primary,
  },

  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  switchKnobOn: {
    marginLeft: 20,
  },

  requestsList: {
    gap: 12,
  },

  requestCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  requestCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },

  requestCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  statusConfirmed: {
    backgroundColor: '#ECFDF5',
  },

  statusPending: {
    backgroundColor: COLORS.muted,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  statusTextConfirmed: {
    color: '#047857',
  },

  statusTextPending: {
    color: COLORS.mutedForeground,
  },

  requestDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },

  requestDate: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },

  acceptButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },

  acceptButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },

  declineButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },

  declineButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
    timePickerBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  timePickerTitle: {
    marginBottom: 14,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  timeOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  timeOption: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.muted,
  },

  timeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.foreground,
  },

  cancelTimePicker: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cancelTimePickerText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
