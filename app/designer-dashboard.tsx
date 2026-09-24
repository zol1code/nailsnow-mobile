import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
// Runs synchronization logic whenever the dashboard becomes active
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';


import * as ImagePicker from 'expo-image-picker';

import AsyncStorage from '@react-native-async-storage/async-storage';

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
// Represents a service created by a designer in Supabase.
type DesignerService = {
  id: number;
  designer_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
};

type RequestStatus = 'pending' | 'confirmed';

type BookingRequest = {
  // Unique ID used to track this request safely
  id: string;
  client: string;
  service: string;
  date: string;
  avatar: string;
  status: RequestStatus;
};

export default function DesignerDashboard() {
  // Controls navigation from the designer dashboard.
const router = useRouter();
// Signs the current user out and returns to the authentication screen.
const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.log('Logout error:', error.message);
    return;
  }

router.replace('/auth');
};
// Saves a new designer service in Supabase.
const saveService = async () => {
  // Prevents saving a service without the required information.
  if (
    !newServiceName.trim() ||
    !newServicePrice.trim() ||
    !newServiceDuration.trim()
  ) {
    console.log('Please complete the required service fields.');
    return;
  }

  const price = Number(
    newServicePrice.replace(',', '.')
  );

  const duration = Number(newServiceDuration);

  // Makes sure price and duration contain valid numbers.
  if (
    Number.isNaN(price) ||
    price < 0 ||
    !Number.isInteger(duration) ||
    duration <= 0
  ) {
    console.log('Invalid service price or duration.');
    return;
  }

  // Gets the currently logged-in designer.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log('Save service error: user not logged in');
    return;
  }

  // If editingServiceId exists, updates the existing service.
if (editingServiceId !== null) {
  const { data: updatedService, error } = await supabase
    .from('designer_services')
    .update({
      name: newServiceName.trim(),
      description: newServiceDescription.trim() || null,
      price,
      duration_minutes: duration,
    })
    .eq('id', editingServiceId)
    .eq('designer_id', user.id)
    .select(
      'id, designer_id, name, description, price, duration_minutes'
    )
    .single();

  if (error) {
    console.log('Update service error:', error.message);
    return;
  }

  // Replaces the old service with the updated one on the screen.
  setServices((prev) =>
    prev.map((service) =>
      service.id === editingServiceId
        ? (updatedService as DesignerService)
        : service
    )
  );
} else {
  // If no service is being edited, creates a new service.
  const { data: createdService, error } = await supabase
    .from('designer_services')
    .insert({
      designer_id: user.id,
      name: newServiceName.trim(),
      description: newServiceDescription.trim() || null,
      price,
      duration_minutes: duration,
    })
    .select(
      'id, designer_id, name, description, price, duration_minutes'
    )
    .single();

  if (error) {
    console.log('Save service error:', error.message);
    return;
  }

  // Immediately displays the newly created service.
  setServices((prev) => [
    ...prev,
    createdService as DesignerService,
  ]);
}

// Clears the form after creating or editing a service.
setNewServiceName('');
setNewServiceDescription('');
setNewServicePrice('');
setNewServiceDuration('');
setEditingServiceId(null);
setShowAddService(false);
};
// Deletes one of the logged-in designer's services from Supabase.
const deleteService = async (serviceId: number) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log('Delete service error: user not logged in');
    return;
  }

  // Deletes the service only when it belongs to the logged-in designer.
  const { error } = await supabase
    .from('designer_services')
    .delete()
    .eq('id', serviceId)
    .eq('designer_id', user.id);

  if (error) {
    console.log('Delete service error:', error.message);
    return;
  }

  // Removes the deleted service from the screen immediately.
  setServices((prev) =>
    prev.filter((service) => service.id !== serviceId)
  );
};
  const [tab, setTab] = useState('Overview');
  // Stores the logged-in designer's services loaded from Supabase.
const [services, setServices] = useState<DesignerService[]>([]);
// Controls whether the Add Service form is visible.
const [showAddService, setShowAddService] = useState(false);

// Stores the information entered in the new service form.
const [newServiceName, setNewServiceName] = useState('');
const [newServiceDescription, setNewServiceDescription] = useState('');
const [newServicePrice, setNewServicePrice] = useState('');
const [newServiceDuration, setNewServiceDuration] = useState('');

// Stores the ID of the service currently being edited.
// Null means that the form is creating a new service.
const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  // Stores the logged-in designer's real profile from Supabase.
const [designerProfile, setDesignerProfile] = useState<{
  name: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
} | null>(null);
// Loads the logged-in designer's profile from Supabase
// whenever the dashboard becomes active.
useFocusEffect(
  useCallback(() => {
    const loadDesignerProfile = async () => {
      // Gets the currently authenticated user.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      // Reads the designer's profile using the authenticated user's ID.
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('name, bio, location, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.log('Designer profile error:', error.message);
        return;
      }

      setDesignerProfile(profile);
      // Loads all services that belong to the currently logged-in designer.
const { data: designerServices, error: servicesError } =
  await supabase
    .from('designer_services')
    .select(
      'id, designer_id, name, description, price, duration_minutes'
    )
    .eq('designer_id', user.id)
    .order('created_at', { ascending: true });

if (servicesError) {
  console.log(
    'Designer services error:',
    servicesError.message
  );
  return;
}

setServices(designerServices ?? []);
    };

    loadDesignerProfile();
  }, [])
);
  // Controls whether the notifications panel is visible
const [showNotifications, setShowNotifications] = useState(false);
// Stores unique request IDs instead of array positions.
// This prevents the wrong booking from changing status when the list order changes.
const [acceptedRequests, setAcceptedRequests] = useState<string[]>([]);
const [declinedRequests, setDeclinedRequests] = useState<string[]>([]);
  // Loads the saved booking request actions when the dashboard opens.
// This keeps accepted and declined requests after the app is closed.
useFocusEffect(
  useCallback(() => {
    const loadRequestActions = async () => {
      // Loads the IDs of requests previously accepted by the designer.
      const savedAcceptedRequests = await AsyncStorage.getItem(
        'acceptedRequests'
      );

      // Loads the IDs of requests previously declined by the designer.
      const savedDeclinedRequests = await AsyncStorage.getItem(
        'declinedRequests'
      );

      // Restores accepted requests.
      // If nothing was saved, resets the state to an empty list.
      setAcceptedRequests(
        savedAcceptedRequests
          ? JSON.parse(savedAcceptedRequests)
          : []
      );

      // Restores declined requests.
      // If nothing was saved, resets the state to an empty list.
      setDeclinedRequests(
        savedDeclinedRequests
          ? JSON.parse(savedDeclinedRequests)
          : []
      );
    };

    loadRequestActions();
  }, [])
);
const pickImage = async () => {
  // Opens the phone gallery and allows the designer to select multiple photos.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 1,
  });

  if (result.canceled) {
    return;
  }

  // Gets the currently logged-in designer.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log('Portfolio upload error: user not logged in');
    return;
  }

  const uploadedPhotos: string[] = [];

  // Uploads every selected image separately.
  for (const asset of result.assets) {
    try {
      // Reads the local Expo image URI.
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      // Creates a unique filename inside the designer's own folder.
      const extension =
        asset.fileName?.split('.').pop()?.toLowerCase() ?? 'jpg';

      const filePath =
        `${user.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${extension}`;

      // Uploads the image to Supabase Storage.
      const { error: uploadError } = await supabase.storage
        .from('designer-portfolios')
        .upload(filePath, arrayBuffer, {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.log(
          'Portfolio upload error:',
          uploadError.message
        );
        continue;
      }

      // Gets the permanent public URL for the uploaded image.
      const { data: publicUrlData } = supabase.storage
        .from('designer-portfolios')
        .getPublicUrl(filePath);

      uploadedPhotos.push(publicUrlData.publicUrl);
    } catch (error) {
      console.log('Portfolio image error:', error);
    }
  }

  // Adds successfully uploaded photos to the existing portfolio.
  if (uploadedPhotos.length > 0) {
    setPortfolio((prev) => {
      const updatedPortfolio = [
        ...prev,
        ...uploadedPhotos,
      ];

      // Keeps the local copy for the current dashboard implementation.
      AsyncStorage.setItem(
        'designerPortfolio',
        JSON.stringify(updatedPortfolio)
      );

      return updatedPortfolio;
    });
  }
};
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

// Loads the saved designer schedule when the dashboard opens.
// This keeps availability and custom times after the app is closed.
useEffect(() => {
  const loadSchedule = async () => {
    const savedAvailableDays = await AsyncStorage.getItem(
      'designerAvailableDays'
    );

    const savedScheduleTimes = await AsyncStorage.getItem(
      'designerScheduleTimes'
    );

    // Restores the days the designer marked as available
    if (savedAvailableDays) {
      setAvailableDays(JSON.parse(savedAvailableDays));
    }

    // Restores the custom opening and closing times
    if (savedScheduleTimes) {
      setScheduleTimes(JSON.parse(savedScheduleTimes));
    }
  };

  loadSchedule();
}, []);

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

const tabs = [
  'Overview',
  'Services',
  'Portfolio',
  'Schedule',
  'Requests',
];
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

 const [requests, setRequests] = useState<BookingRequest[]>([
  {
    // Unique ID for this booking request
    id: 'emma-aug28-2pm',

    client: 'Emma R.',
    service: 'Gel Extensions',
    date: 'Thu Aug 28 · 2:00 PM',
    avatar: img(P.a3, 60, 60),
    status: 'pending',
  },

  {
    // Unique ID for this booking request
    id: 'mia-aug29-11am',

    client: 'Mia D.',
    service: 'Nail Art Design',
    date: 'Fri Aug 29 · 11:00 AM',
    avatar: img(P.a4, 60, 60),
    status: 'pending',
  },

  {
    // Unique ID for this booking request
    id: 'zoe-sep1-3pm',

    client: 'Zoe T.',
    service: 'Classic Manicure',
    date: 'Mon Sep 1 · 3:00 PM',
    avatar: img(P.a5, 60, 60),
    status: 'confirmed',
  },
]);
  // Loads the customer's saved appointment and turns it into a designer request.
// This connects the customer booking flow with the designer dashboard locally.
useFocusEffect(
  useCallback(() => {
    const loadCustomerAppointments = async () => {
      // Loads the list containing all customer appointments.
      const savedAppointments = await AsyncStorage.getItem(
        'customerAppointments'
      );

      // Keeps compatibility with older bookings created
      // before multiple appointments were implemented.
      const savedAppointment = await AsyncStorage.getItem(
        'customerAppointment'
      );

let customerAppointments: {
  designerId: string | number;
  date: string;
  time: string;
  service: string;
}[] = [];
      // Uses the new appointments list when available.
      if (savedAppointments) {
        customerAppointments = JSON.parse(savedAppointments);
      } else if (savedAppointment) {
        // Falls back to the old single appointment if needed.
        customerAppointments = [JSON.parse(savedAppointment)];
      }

      // Converts every customer appointment into a designer booking request.
      const customerRequests: BookingRequest[] =
        customerAppointments.map((appointment) => ({
          // Creates a stable unique ID for each customer booking.
          id: `customer-${appointment.designerId}-${appointment.date}-${appointment.time}`,
          client: 'Customer',
          service: appointment.service,
          date: `${appointment.date} · ${appointment.time}`,
          avatar: img(P.a1, 60, 60),
          status: 'pending',
        }));

      setRequests((prev) => {
        // Keeps only the original/static requests.
        // Customer requests are rebuilt from the current saved appointments.
        const existingRequests = prev.filter(
          (request) => !request.id.startsWith('customer-')
        );

        // Adds all current customer bookings again.
        // This also removes cancelled bookings automatically.
        return [...customerRequests, ...existingRequests];
      });
    };

    loadCustomerAppointments();
  }, [])
);
  // Creates the notification list automatically from pending booking requests.
// This keeps the notification panel synchronized with the Requests section.
// Creates notifications only for booking requests that are still pending.
// Accepted or declined requests are removed from the notification list.
// Keeps only requests that are still pending.
// Uses the request ID instead of the array position so the status stays correct.
const pendingRequests = requests.filter(
  (request) =>
    request.status === 'pending' &&
    !acceptedRequests.includes(request.id) &&
    !declinedRequests.includes(request.id)
);

const [portfolio, setPortfolio] = useState(
  Object.values(N).map((id) => img(id, 200, 200))
);
// Runs when the Designer Dashboard screen opens
// Loads the portfolio photos previously saved on the device
useEffect(() => {
  const loadPortfolio = async () => {
    const savedPortfolio = await AsyncStorage.getItem('designerPortfolio');
 // If saved photos exist, convert them back into an array
    // and display them in the portfolio
    if (savedPortfolio) {
      setPortfolio(JSON.parse(savedPortfolio));
    }
  };

  loadPortfolio();
}, []);
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
              {designerProfile?.name ?? 'Designer'} ✦
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* Logs the designer out of the current account. */}
<Pressable
  style={styles.iconButton}
  onPress={handleLogout}
>
  <Ionicons
    name="log-out-outline"
    size={18}
    color={COLORS.foreground}
  />
</Pressable>
            <Pressable
  style={styles.iconButton}
  onPress={() => setShowNotifications((prev) => !prev)}
>
  <Ionicons
    name="notifications-outline"
    size={18}
    color={COLORS.foreground}
  />

  {/* Shows the number of pending booking requests on the notification bell */}
  {pendingRequests.length > 0 && (
    <View style={styles.notificationBadge}>
      <Text style={styles.notificationBadgeText}>
        {pendingRequests.length}
      </Text>
    </View>
  )}
</Pressable>

           {/* Opens the designer profile editing screen when the profile photo is tapped. */}
<Pressable onPress={() => router.push('/edit-designer-profile')}>
  <Image
    source={designerProfile?.avatar_url || img(P.a1, 80, 80)}
    style={styles.profileImage}
    contentFit="cover"
  />
</Pressable>
          </View>
        </View>
        {/* Shows the notifications panel when the bell button is pressed */}
{showNotifications && (
  <View style={styles.notificationsPanel}>
    <Text style={styles.notificationsTitle}>
      Notifications
    </Text>

    {/* Creates one notification for each pending booking request */}
{pendingRequests.map((request, index) => (
  <View
    key={`${request.client}-${index}`}
    style={styles.notificationItem}
  >
    <Ionicons
      name="calendar-outline"
      size={18}
      color={COLORS.primary}
    />

    <View style={styles.notificationTextContainer}>
      <Text style={styles.notificationText}>
        New booking request from {request.client}
      </Text>

      <Text style={styles.notificationTime}>
        {request.service} · {request.date}
      </Text>
    </View>
  </View>
))}

    <View style={styles.notificationItem}>
  <Ionicons
    name="checkmark-circle-outline"
    size={18}
    color={COLORS.primary}
  />

  <View style={styles.notificationTextContainer}>
    <Text style={styles.notificationText}>
      Mia D. confirmed her appointment.
    </Text>

    <Text style={styles.notificationTime}>
      1 hour ago
    </Text>
  </View>
</View>
  </View>
)}

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

{/* Shows the services created by the logged-in designer. */}
{tab === 'Services' && (
  <View>
    <View style={styles.servicesHeader}>
      <View>
        <Text style={styles.servicesTitle}>
          My Services
        </Text>

        <Text style={styles.servicesSubtitle}>
          Manage the services clients can book.
        </Text>
      </View>

<Pressable
  style={styles.addServiceButton}
onPress={() => {
  // Starts a completely new service.
  setEditingServiceId(null);
  setNewServiceName('');
  setNewServiceDescription('');
  setNewServicePrice('');
  setNewServiceDuration('');
  setShowAddService((prev) => !prev);
}}>
  <Ionicons
          name="add"
          size={16}
          color="#FFFFFF"
        />

        <Text style={styles.addServiceButtonText}>
          Add Service
        </Text>
      </Pressable>
    </View>
    {/* Form used to create a new designer service. */}
{showAddService && (
  <View style={styles.addServiceForm}>
    <Text style={styles.formLabel}>
      Service Name
    </Text>

    <TextInput
      style={styles.serviceInput}
      value={newServiceName}
      onChangeText={setNewServiceName}
      placeholder="e.g. Gel Extensions"
      placeholderTextColor={COLORS.mutedForeground}
    />

    <Text style={styles.formLabel}>
      Description
    </Text>

    <TextInput
      style={[
        styles.serviceInput,
        styles.serviceDescriptionInput,
      ]}
      value={newServiceDescription}
      onChangeText={setNewServiceDescription}
      placeholder="Describe this service"
      placeholderTextColor={COLORS.mutedForeground}
      multiline
    />

    <View style={styles.serviceFormRow}>
      <View style={styles.serviceFormColumn}>
        <Text style={styles.formLabel}>
          Price (€)
        </Text>

        <TextInput
          style={styles.serviceInput}
          value={newServicePrice}
          onChangeText={setNewServicePrice}
          placeholder="45"
          placeholderTextColor={COLORS.mutedForeground}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.serviceFormColumn}>
        <Text style={styles.formLabel}>
          Duration (min)
        </Text>

        <TextInput
          style={styles.serviceInput}
          value={newServiceDuration}
          onChangeText={setNewServiceDuration}
          placeholder="60"
          placeholderTextColor={COLORS.mutedForeground}
          keyboardType="number-pad"
        />
      </View>
    </View>

    <View style={styles.serviceFormButtons}>
      <Pressable
        style={styles.cancelServiceButton}
onPress={() => {
  setEditingServiceId(null);
  setNewServiceName('');
  setNewServiceDescription('');
  setNewServicePrice('');
  setNewServiceDuration('');
  setShowAddService(false);
}}      >
        <Text style={styles.cancelServiceButtonText}>
          Cancel
        </Text>
      </Pressable>

<Pressable
  style={styles.saveServiceButton}
  onPress={saveService}
>
 <Text style={styles.saveServiceButtonText}>
  {editingServiceId !== null ? 'Update Service' : 'Save Service'}
</Text>
      </Pressable>
    </View>
  </View>
)}

    {services.length === 0 ? (
      <View style={styles.emptyServices}>
        <Ionicons
          name="sparkles-outline"
          size={28}
          color={COLORS.primary}
        />

        <Text style={styles.emptyServicesTitle}>
          No services yet
        </Text>

        <Text style={styles.emptyServicesText}>
          Add your first nail service so clients can book with you.
        </Text>
      </View>
    ) : (
      <View style={styles.servicesList}>
        {services.map((service) => (
          <View
            key={service.id}
            style={styles.serviceCard}
          >
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>
                {service.name}
              </Text>

              {service.description && (
                <Text style={styles.serviceDescription}>
                  {service.description}
                </Text>
              )}

              <View style={styles.serviceDurationRow}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={COLORS.mutedForeground}
                />

                <Text style={styles.serviceDuration}>
                  {service.duration_minutes} min
                </Text>
              </View>
            </View>

            <View style={styles.serviceRight}>
  <Text style={styles.servicePrice}>
    €{Number(service.price).toFixed(2)}
  </Text>

<Pressable
  style={styles.editServiceButton}
 onPress={() => {
  // Stores which service is being edited.
  setEditingServiceId(service.id);

  // Fills the form with the current service information.
  setNewServiceName(service.name);
  setNewServiceDescription(service.description ?? '');
  setNewServicePrice(String(service.price));
  setNewServiceDuration(String(service.duration_minutes));

  // Opens the service form.
  setShowAddService(true);
}}
>
  <Ionicons
    name="create-outline"
    size={17}
    color={COLORS.primary}
  />
</Pressable>

  <Pressable
    style={styles.deleteServiceButton}
onPress={() =>
  Alert.alert(
    'Delete Service',
    `Are you sure you want to delete "${service.name}"?`,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteService(service.id),
      },
    ]
  )
}  >
    <Ionicons
      name="trash-outline"
      size={17}
      color="#DC2626"
    />
  </Pressable>
</View>
          </View>
        ))}
      </View>
    )}
  </View>
)}
        {tab === 'Portfolio' && (
          <>
            <View style={styles.portfolioHeader}>
              <Text style={styles.photoCount}>
                {portfolio.length} photos
              </Text>

              <Pressable
  style={styles.addPhotosButton}
  onPress={pickImage}
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

              <Pressable
  style={styles.addPhotoTile}
  onPress={pickImage}
>
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
  setAvailableDays((prev) => {
    const updatedAvailableDays = prev.includes(day)
      ? prev.filter((item) => item !== day)
      : [...prev, day];

    // Saves the updated availability locally on the device
    // so the selected days remain after closing the app
    AsyncStorage.setItem(
      'designerAvailableDays',
      JSON.stringify(updatedAvailableDays)
    );

    return updatedAvailableDays;
  });
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

            setScheduleTimes((prev) => {
  const updatedScheduleTimes = {
    ...prev,
    [dayKey]: {
      ...prev[dayKey],
      [editingTime.type]: time,
    },
  };

  // Saves the updated schedule times locally on the device
  // so custom opening and closing times remain after closing the app
  AsyncStorage.setItem(
    'designerScheduleTimes',
    JSON.stringify(updatedScheduleTimes)
  );

  return updatedScheduleTimes;
});

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

    // Changes the badge background based on the current request status
    acceptedRequests.includes(request.id)
  ? styles.statusConfirmed
  : declinedRequests.includes(request.id)
      ? styles.statusDeclined
      : request.status === 'confirmed'
      ? styles.statusConfirmed
      : styles.statusPending,
  ]}

                  >
                   <Text
  style={[
    styles.statusText,

    // Changes the status text color based on the designer's action
    acceptedRequests.includes(request.id)
      ? styles.statusTextConfirmed
      : declinedRequests.includes(request.id)
      ? styles.statusTextDeclined
      : request.status === 'confirmed'
      ? styles.statusTextConfirmed
      : styles.statusTextPending,
  ]}

                    >
                      {/* Shows the current request status based on the designer's action */}
{acceptedRequests.includes(request.id)
  ? 'Accepted'
  : declinedRequests.includes(request.id)
  ? 'Declined'
  : request.status === 'confirmed'
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
setAcceptedRequests((prev) => {
  const updatedAccepted = prev.includes(request.id)
    ? prev
      : [...prev, request.id];

    // Saves accepted requests locally on the device
    AsyncStorage.setItem(
      'acceptedRequests',
      JSON.stringify(updatedAccepted)
    );

// Saves the accepted status for this specific appointment.
// The customer side uses the same booking key without the "customer-" prefix.
if (request.id.startsWith('customer-')) {
  const appointmentKey = request.id.replace('customer-', '');

  AsyncStorage.getItem('customerAppointmentStatuses').then(
    (savedStatuses) => {
      const statuses = savedStatuses
        ? JSON.parse(savedStatuses)
        : {};

      const updatedStatuses = {
        ...statuses,
        [appointmentKey]: 'accepted',
      };

      AsyncStorage.setItem(
        'customerAppointmentStatuses',
        JSON.stringify(updatedStatuses)
      );
    }
  );
}


    return updatedAccepted;
  });

  setDeclinedRequests((prev) => {
  const updatedDeclined = prev.filter(
    (item) => item !== request.id
  );

    // Removes this request from the declined list if needed
    AsyncStorage.setItem(
      'declinedRequests',
      JSON.stringify(updatedDeclined)
    );
  

    return updatedDeclined;
  });
}}
>
<Text style={styles.acceptButtonText}>
  {acceptedRequests.includes(request.id) ? 'Accepted' : 'Accept'}
</Text>
</Pressable>

<Pressable
  style={styles.declineButton}
  onPress={() => {
    setDeclinedRequests((prev) => {
      const updatedDeclined = prev.includes(request.id)
        ? prev
        : [...prev, request.id];

    // Saves declined requests locally on the device
    AsyncStorage.setItem(
      'declinedRequests',
      JSON.stringify(updatedDeclined)
    );

// Saves the declined status for this specific appointment.
// The customer side uses the same booking key without the "customer-" prefix.
if (request.id.startsWith('customer-')) {
  const appointmentKey = request.id.replace('customer-', '');

  AsyncStorage.getItem('customerAppointmentStatuses').then(
    (savedStatuses) => {
      const statuses = savedStatuses
        ? JSON.parse(savedStatuses)
        : {};

      const updatedStatuses = {
        ...statuses,
        [appointmentKey]: 'declined',
      };

      AsyncStorage.setItem(
        'customerAppointmentStatuses',
        JSON.stringify(updatedStatuses)
      );
    }
  );
}

    return updatedDeclined;
  });

setAcceptedRequests((prev) => {
  const updatedAccepted = prev.filter(
    (item) => item !== request.id
  );

  // Removes this request from the accepted list if needed
  AsyncStorage.setItem(
    'acceptedRequests',
    JSON.stringify(updatedAccepted)
  );

  return updatedAccepted;
});
}}
>
  <Text style={styles.declineButtonText}>
    {declinedRequests.includes(request.id) ? 'Declined' : 'Decline'}
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
  // Light red background used when a booking request is declined
statusDeclined: {
  backgroundColor: '#FEECEC',
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

  // Red text used when the designer declines a booking request
statusTextDeclined: {
  color: '#B42318',
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

  // Container for the notifications dropdown panel
notificationsPanel: {
  marginHorizontal: 20,
  marginTop: 12,
  padding: 16,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: COLORS.border,
  backgroundColor: COLORS.card,
},

// Title displayed at the top of the notifications panel
notificationsTitle: {
  marginBottom: 14,
  fontSize: 14,
  fontWeight: '700',
  color: COLORS.foreground,
},

// Row for each individual notification
notificationItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 10,
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: COLORS.border,
},

// Holds the notification message and timestamp
notificationTextContainer: {
  flex: 1,
},

// Main notification message
notificationText: {
  fontSize: 13,
  fontWeight: '600',
  color: COLORS.foreground,
},

// Small timestamp shown below the notification message
notificationTime: {
  marginTop: 3,
  fontSize: 11,
  color: COLORS.mutedForeground,
},
// Small badge displayed on the notification bell
notificationBadge: {
  position: 'absolute',
  top: -5,
  right: -5,
  minWidth: 18,
  height: 18,
  paddingHorizontal: 4,
  borderRadius: 9,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: COLORS.primary,
},

// Number displayed inside the notification badge
notificationBadgeText: {
  fontSize: 10,
  fontWeight: '700',
  color: '#FFFFFF',
},

// Header of the designer services section.
servicesHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 20,
},

servicesTitle: {
  fontSize: 20,
  fontFamily: 'serif',
  color: COLORS.foreground,
},

servicesSubtitle: {
  marginTop: 4,
  fontSize: 12,
  color: COLORS.mutedForeground,
},

// Button used to create a new service.
addServiceButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 12,
  backgroundColor: COLORS.primary,
},

addServiceButtonText: {
  fontSize: 12,
  fontWeight: '700',
  color: '#FFFFFF',
},

// Empty state shown before the designer creates any services.
emptyServices: {
  alignItems: 'center',
  paddingVertical: 40,
  paddingHorizontal: 24,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: COLORS.border,
  backgroundColor: COLORS.card,
},

emptyServicesTitle: {
  marginTop: 12,
  fontSize: 16,
  fontWeight: '700',
  color: COLORS.foreground,
},

emptyServicesText: {
  marginTop: 6,
  maxWidth: 260,
  textAlign: 'center',
  fontSize: 12,
  lineHeight: 18,
  color: COLORS.mutedForeground,
},

// List containing all services loaded from Supabase.
servicesList: {
  gap: 10,
},

serviceCard: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 16,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: COLORS.border,
  backgroundColor: COLORS.card,
},

serviceInfo: {
  flex: 1,
  marginRight: 16,
},

serviceName: {
  fontSize: 14,
  fontWeight: '700',
  color: COLORS.foreground,
},

serviceDescription: {
  marginTop: 4,
  fontSize: 12,
  lineHeight: 17,
  color: COLORS.mutedForeground,
},

serviceDurationRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  marginTop: 8,
},

serviceDuration: {
  fontSize: 11,
  color: COLORS.mutedForeground,
},

servicePrice: {
  fontSize: 15,
  fontWeight: '700',
  color: COLORS.primary,
},
// Form used to create a new service.
addServiceForm: {
  marginBottom: 20,
  padding: 16,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: COLORS.border,
  backgroundColor: COLORS.card,
},

formLabel: {
  marginBottom: 6,
  fontSize: 12,
  fontWeight: '700',
  color: COLORS.foreground,
},

serviceInput: {
  minHeight: 44,
  marginBottom: 14,
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: COLORS.border,
  backgroundColor: COLORS.background,
  fontSize: 13,
  color: COLORS.foreground,
},

serviceDescriptionInput: {
  minHeight: 80,
  textAlignVertical: 'top',
},

serviceFormRow: {
  flexDirection: 'row',
  gap: 10,
},

serviceFormColumn: {
  flex: 1,
},

serviceFormButtons: {
  flexDirection: 'row',
  gap: 10,
  marginTop: 4,
},

cancelServiceButton: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 11,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: COLORS.border,
},

cancelServiceButtonText: {
  fontSize: 12,
  fontWeight: '700',
  color: COLORS.mutedForeground,
},

saveServiceButton: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 11,
  borderRadius: 10,
  backgroundColor: COLORS.primary,
},

saveServiceButtonText: {
  fontSize: 12,
  fontWeight: '700',
  color: '#FFFFFF',
},
// Holds the service price and action buttons.
serviceRight: {
  alignItems: 'flex-end',
  gap: 10,
},
// Button used to edit one of the designer's services.
editServiceButton: {
  width: 32,
  height: 32,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#DDD6FE',
  backgroundColor: '#F5F3FF',
},

// Button used to delete one of the designer's services.
deleteServiceButton: {
  width: 32,
  height: 32,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#FECACA',
  backgroundColor: '#FEF2F2',
},
});
