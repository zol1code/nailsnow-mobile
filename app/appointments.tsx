import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '../lib/supabase';
import AppointmentReschedule from '../components/AppointmentReschedule';

// Stores appointments locally so they remain available after closing the app
import AsyncStorage from '@react-native-async-storage/async-storage';

// Stores appointments locally so they remain available after closing the app
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

// React hooks used to store and restore appointment data
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
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
// Represents an appointment loaded from Supabase.
type RealAppointment = {
  id: string;
  customer_id: string;
  designer_id: string;
  service_id: string | null;
  service_name: string;
  price: number;
  duration_minutes: number;
  appointment_date: string;
  appointment_time: string;
  status:
    | 'pending'
    | 'confirmed'
    | 'declined'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'disputed';
  created_at: string;
};
export default function AppointmentsScreen() {
  const [completionMode, setCompletionMode] = useState<
  Record<string, 'confirm' | 'problem' | undefined>
>({});

const [problemReasons, setProblemReasons] =
  useState<Record<string, string>>({});

const [completionFeedback, setCompletionFeedback] =
  useState<Record<string, string>>({});

const [respondingCompletionId, setRespondingCompletionId] =
  useState<string | null>(null);

const completionResponseLock = useRef(false);

async function respondToCompletion(
  appointmentId: string,
  confirm: boolean
) {
  if (completionResponseLock.current) return;

  const reason = (problemReasons[appointmentId] ?? '').trim();

  if (!confirm && (reason.length < 10 || reason.length > 2000)) {
    setCompletionFeedback((current) => ({
      ...current,
      [appointmentId]: 'Describe the problem using 10 to 2,000 characters.',
    }));
    return;
  }

  completionResponseLock.current = true;
  setRespondingCompletionId(appointmentId);
  setCompletionFeedback((current) => ({
    ...current,
    [appointmentId]: '',
  }));

  try {
    const { data, error } = await supabase.rpc(
      'respond_to_appointment_completion',
      {
        p_appointment_id: appointmentId,
        p_confirm: confirm,
        p_reason: confirm ? null : reason,
      }
    );

    if (error) throw error;

    const result = data?.result;

    if (
      result !== 'completed' &&
      result !== 'disputed' &&
      result !== 'already_confirmed' &&
      result !== 'already_disputed'
    ) {
      setCompletionFeedback((current) => ({
        ...current,
        [appointmentId]:
          result === 'invalid_reason'
            ? 'Describe the problem using 10 to 2,000 characters.'
            : 'This appointment cannot receive this response. Reopen the screen to check its status.',
      }));
      return;
    }

    // Reads the saved status instead of assuming the outcome.
    const { data: booking, error: bookingError } = await supabase
      .from('appointments')
      .select('status')
      .eq('id', appointmentId)
      .single();

    if (bookingError) throw bookingError;

    if (
      booking.status !== 'completed' &&
      booking.status !== 'disputed'
    ) {
      throw new Error('Unexpected appointment status.');
    }

    const savedStatus: RealAppointment['status'] = booking.status;

    setRealAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentId
          ? { ...appointment, status: savedStatus }
          : appointment
      )
    );

    setCompletionRequests((current) => ({
      ...current,
      [appointmentId]: false,
    }));

    setCompletionMode((current) => ({
      ...current,
      [appointmentId]: undefined,
    }));

    setProblemReasons((current) => ({
      ...current,
      [appointmentId]: '',
    }));

    setCompletionFeedback((current) => ({
      ...current,
      [appointmentId]:
        savedStatus === 'completed'
          ? 'You confirmed that the service was completed.'
          : 'Your problem report was saved. The appointment is marked as disputed.',
    }));
  } catch (error) {
    console.log('Customer completion response error:', error);

    setCompletionFeedback((current) => ({
      ...current,
      [appointmentId]:
        'Could not confirm the result. Reopen this screen to check the status before trying again.',
    }));
  } finally {
    completionResponseLock.current = false;
    setRespondingCompletionId(null);
  }
}
const [loadingStartCode, setLoadingStartCode] =
  useState<string | null>(null);

const [startCodes, setStartCodes] =
  useState<Record<string, string>>({});

const [startCodeError, setStartCodeError] =
  useState<{ appointmentId: string; message: string } | null>(null);

const startCodeVersion = useRef(0);

// Clears codes that may have been invalidated by rescheduling.
function clearStartCodeDisplay() {
  startCodeVersion.current += 1;
  setStartCodes({});
  setStartCodeError(null);
  setLoadingStartCode(null);
}

async function showStartCode(appointmentId: string) {
  if (loadingStartCode) return;

  const version = startCodeVersion.current;

  setLoadingStartCode(appointmentId);
  setStartCodeError(null);

  try {
    const { data, error } = await supabase.rpc(
      'get_appointment_start_code',
      { p_appointment_id: appointmentId }
    );

    if (error) throw error;

    // Ignores responses received after leaving or refreshing.
    if (version !== startCodeVersion.current) return;

    if (typeof data !== 'string' || !data) {
      throw new Error('Start code unavailable.');
    }

    setStartCodes((current) => ({
      ...current,
      [appointmentId]: data,
    }));
  } catch (error) {
    console.log('Start code error:', error);

    if (version !== startCodeVersion.current) return;

    setStartCodeError({
      appointmentId,
      message:
        'Could not load the code. The appointment must still be confirmed. Please try again.',
    });
  } finally {
    if (version === startCodeVersion.current) {
      setLoadingStartCode(null);
    }
  }
}
  const params = useLocalSearchParams();
    // Appointments loaded from the real Supabase database.
  const [realAppointments, setRealAppointments] =
    useState<RealAppointment[]>([]);
    // Identifies appointments awaiting the customer's response.
const [completionRequests, setCompletionRequests] =
  useState<Record<string, boolean>>({});

const [completionRequestsFailed, setCompletionRequestsFailed] =
  useState(false);

    // Guarda os perfis das profissionais pelo ID usado nos agendamentos.
const [designerProfiles, setDesignerProfiles] = useState<
  Record<string, { name: string | null; avatar_url: string | null }>
>({});

  // Controls the loading state while Supabase is being queried.
  const [loadingAppointments, setLoadingAppointments] =
    useState(true);
  
    // Loads the logged-in customer's appointments from Supabase.
async function loadRealAppointments() {
  try {
    setLoadingAppointments(true);

    // Gets the currently logged-in customer.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.log('Get user error:', userError.message);
      return;
    }

    if (!user) {
      console.log('No logged-in user found.');
      return;
    }

    // Loads only appointments that belong to this customer.
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('customer_id', user.id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      console.log('Appointments load error:', error.message);
      return;
    }

    setRealAppointments((data ?? []) as RealAppointment[]);

// Clears old results before loading this customer's requests.
setCompletionRequests({});
setCompletionRequestsFailed(false);

const appointmentIds = (data ?? []).map((item) => item.id);

if (appointmentIds.length > 0) {
  const {
    data: completionRows,
    error: completionError,
  } = await supabase
    .from('appointment_completion_requests')
    .select('appointment_id')
    .in('appointment_id', appointmentIds)
    .is('customer_confirmed_at', null)
    .is('disputed_at', null);

  if (completionError) {
    console.log(
      'Customer completion requests error:',
      completionError.message
    );
    setCompletionRequestsFailed(true);
  } else {
    setCompletionRequests(
      Object.fromEntries(
        (completionRows ?? []).map((item) => [
          item.appointment_id,
          true,
        ])
      )
    );
  }
}
    // Busca somente as profissionais presentes nos agendamentos carregados.
const designerIds = [
  ...new Set((data ?? []).map((item) => item.designer_id)),
];

if (designerIds.length > 0) {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .eq('user_type', 'designer')
    .in('id', designerIds);

  if (profilesError) {
    console.log('Designer profiles error:', profilesError.message);
  } else {
    // Permite localizar cada perfil pelo designer_id do agendamento.
    const profilesById = Object.fromEntries(
      (profiles ?? []).map((profile) => [
        profile.id,
        { name: profile.name, avatar_url: profile.avatar_url },
      ])
    );
    setDesignerProfiles(profilesById);
  }
}
  } catch (error) {
    console.log('Unexpected appointments error:', error);
  } finally {
    setLoadingAppointments(false);
  }
}
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

// Stores the status of each appointment separately.
// The key identifies the booking and the value stores its current status.
const [appointmentStatuses, setAppointmentStatuses] = useState<
  Record<string, 'pending' | 'accepted' | 'declined'>
>({});

// Creates a unique key for each appointment.
// This lets the app store a different status for every booking.
const getAppointmentKey = (appointment: CustomerAppointment) =>
  `${appointment.designerId}-${appointment.date}-${appointment.time}`;

// Loads a previously saved appointment when this screen opens.
// This allows the appointment to remain available after closing the app.
// Loads real appointments from Supabase when this screen opens.
// Refreshes real appointments whenever this screen becomes active.
useFocusEffect(
  useCallback(() => {
    clearStartCodeDisplay();
    void loadRealAppointments();

    return () => {
      // Ignores pending code responses after leaving this screen.
      startCodeVersion.current += 1;
    };
  }, [])
);

// Old local AsyncStorage system - kept temporarily during migration.

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
useFocusEffect(
  useCallback(() => {
  const loadAppointmentStatus = async () => {
    // Loads the old single appointment status.
    // We keep this temporarily for compatibility with older saved bookings.
    const savedStatus = await AsyncStorage.getItem(
      'customerAppointmentStatus'
    );

    // Loads the new object containing one status per appointment.
    const savedStatuses = await AsyncStorage.getItem(
      'customerAppointmentStatuses'
    );

    // Restores all individual appointment statuses.
    if (savedStatuses) {
      setAppointmentStatuses(JSON.parse(savedStatuses));
    }

    // Restores the old single status if one exists.
    if (
      savedStatus === 'accepted' ||
      savedStatus === 'declined'
    ) {
      setAppointmentStatus(savedStatus);
    }
  };

  loadAppointmentStatus();
}, [])
);
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
// Creates the unique key used to track this appointment's status
const appointmentKey = getAppointmentKey(appointmentToSave);

// Saves this new appointment with its own Pending status
const savedStatuses = await AsyncStorage.getItem(
  'customerAppointmentStatuses'
);

const currentStatuses = savedStatuses
  ? JSON.parse(savedStatuses)
  : {};

const updatedStatuses = {
  ...currentStatuses,
  [appointmentKey]: 'pending',
};

await AsyncStorage.setItem(
  'customerAppointmentStatuses',
  JSON.stringify(updatedStatuses)
);

// Updates the status on the screen immediately
setAppointmentStatuses(updatedStatuses);
      // Saves the newest appointment in the old storage key.
// We keep this temporarily so the current app flow continues working.
await AsyncStorage.setItem(
  'customerAppointment',
  JSON.stringify(appointmentToSave)
);

// Adds the new appointment to the appointments list
// instead of replacing the previous appointment.
setAppointments((prev) => {
  // Checks whether this exact appointment is already in the list.
// This prevents the same booking from being saved more than once.
const appointmentAlreadyExists = prev.some(
  (appointment) =>
    getAppointmentKey(appointment) ===
    getAppointmentKey(appointmentToSave)
);

// If the appointment already exists, keep the current list unchanged.
if (appointmentAlreadyExists) {
  return prev;
}

// Adds the new appointment only when it does not already exist.
const updatedAppointments = [...prev, appointmentToSave];

// Saves the updated appointments list locally on the device.
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
const hasAppointment = realAppointments.length > 0;

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
{realAppointments.map((appointment, index) => {
  // Finds the correct nail artist for this specific appointment
  return (
    <View key={appointment.id} style={styles.card}>
      <View style={styles.statusRow}>
        <View
          style={[
            styles.confirmedBadge,
            (appointment.status === 'declined' ||
              appointment.status === 'cancelled') && {
              backgroundColor: '#FEE2E2',
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              (appointment.status === 'declined' ||
                appointment.status === 'cancelled') && {
                backgroundColor: '#DC2626',
              },
            ]}
          />
          <Text
            style={[
              styles.confirmedText,
              (appointment.status === 'declined' ||
                appointment.status === 'cancelled') && {
                color: '#991B1B',
              },
            ]}
          >
  {appointment.status === 'confirmed'
    ? 'Confirmed'
    : appointment.status === 'in_progress'
    ? 'In Progress'
    : appointment.status === 'completed'
    ? 'Completed'
    : appointment.status === 'declined'
    ? 'Declined'
    : appointment.status === 'cancelled'
    ? 'Cancelled'
    : appointment.status === 'disputed'
    ? 'Disputed'
    : 'Pending'}
</Text>
          </View>
{(appointment.status === 'pending' ||
  appointment.status === 'confirmed') && (
  <Text style={styles.upcoming}>Upcoming</Text>
)}
        </View>

        <View style={styles.designerRow}>
      {designerProfiles[appointment.designer_id]?.avatar_url ? (
  <Image
    source={{ uri: designerProfiles[appointment.designer_id].avatar_url! }}
    style={styles.avatar}
    contentFit="cover"
  />
) : (
  <View style={styles.avatar} />
)}

<View>
  <Text style={styles.designerName}>
    {designerProfiles[appointment.designer_id]?.name ?? 'Nail artist'}
  </Text>
            <Text style={styles.serviceName}>
              {appointment.service_name}
            </Text>
          </View>
        </View>

        <View style={styles.dateTimeRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>
              Date
            </Text>

            <Text style={styles.infoValue}>
              {appointment.appointment_date}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>
              Time
            </Text>

            <Text style={styles.infoValue}>
              {appointment.appointment_time}
            </Text>
          </View>
        </View>

 {appointment.status === 'in_progress' && (
  <View style={{ marginBottom: 16, gap: 10 }}>
    {loadingAppointments ? (
      <Text style={styles.serviceName}>
        Checking completion request…
      </Text>
    ) : completionRequestsFailed ? (
      <Text style={styles.serviceName}>
        Could not check completion requests. Please reopen this screen.
      </Text>
    ) : !completionRequests[appointment.id] ? (
      <Text style={styles.serviceName}>
        Your appointment is in progress. Your artist has not requested
        completion confirmation yet.
      </Text>
    ) : (
      <>
        <Text style={styles.designerName}>
          Your artist has requested completion confirmation.
        </Text>

        {!completionMode[appointment.id] && (
          <>
            <Pressable
              style={styles.chatButton}
              disabled={respondingCompletionId !== null}
              onPress={() =>
                setCompletionMode((current) => ({
                  ...current,
                  [appointment.id]: 'confirm',
                }))
              }
            >
              <Text style={styles.chatButtonText}>
                Confirm Completion
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              disabled={respondingCompletionId !== null}
              onPress={() =>
                setCompletionMode((current) => ({
                  ...current,
                  [appointment.id]: 'problem',
                }))
              }
            >
              <Text style={styles.cancelButtonText}>
                Report a Problem
              </Text>
            </Pressable>
          </>
        )}

        {completionMode[appointment.id] === 'confirm' && (
          <>
            <Text style={styles.serviceName}>
              Confirm only if the service has finished. If there is
              a problem, choose Report a Problem instead.
            </Text>

            <Pressable
              style={[
                styles.chatButton,
                respondingCompletionId !== null && { opacity: 0.5 },
              ]}
              disabled={respondingCompletionId !== null}
              onPress={() => respondToCompletion(appointment.id, true)}
            >
              <Text style={styles.chatButtonText}>
                {respondingCompletionId === appointment.id
                  ? 'Saving…'
                  : 'Yes, the Service Is Complete'}
              </Text>
            </Pressable>
          </>
        )}

        {completionMode[appointment.id] === 'problem' && (
          <>
            <TextInput
              value={problemReasons[appointment.id] ?? ''}
              onChangeText={(value) =>
                setProblemReasons((current) => ({
                  ...current,
                  [appointment.id]: value,
                }))
              }
              placeholder="Describe what happened (10–2,000 characters)"
              placeholderTextColor={COLORS.mutedForeground}
              multiline
              maxLength={2000}
              editable={respondingCompletionId === null}
              style={{
                minHeight: 100,
                padding: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 12,
                color: COLORS.foreground,
                backgroundColor: COLORS.card,
                textAlignVertical: 'top',
              }}
            />

            <Pressable
              style={[
                styles.cancelButton,
                respondingCompletionId !== null && { opacity: 0.5 },
              ]}
              disabled={respondingCompletionId !== null}
              onPress={() => respondToCompletion(appointment.id, false)}
            >
              <Text style={styles.cancelButtonText}>
                {respondingCompletionId === appointment.id
                  ? 'Saving…'
                  : 'Submit Problem Report'}
              </Text>
            </Pressable>
          </>
        )}

        {!!completionMode[appointment.id] && (
          <Pressable
            disabled={respondingCompletionId !== null}
            onPress={() =>
              setCompletionMode((current) => ({
                ...current,
                [appointment.id]: undefined,
              }))
            }
          >
            <Text style={styles.chatButtonText}>Go Back</Text>
          </Pressable>
        )}
      </>
    )}
  </View>
)}

{!!completionFeedback[appointment.id] && (
  <Text style={[styles.serviceName, { marginBottom: 12 }]}>
    {completionFeedback[appointment.id]}
  </Text>
)}       
{appointment.status === 'confirmed' && (
  <View style={{ marginBottom: 12 }}>
    {startCodes[appointment.id] ? (
      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>
          Your appointment start code
        </Text>

        <Text
          selectable
          style={[
            styles.infoValue,
            {
              fontSize: 26,
              letterSpacing: 4,
              marginVertical: 10,
            },
          ]}
        >
          {startCodes[appointment.id]}
        </Text>

        <Text style={styles.serviceName}>
          Share this code with your artist only when you arrive
          and are ready to start.
        </Text>

        <Pressable
          style={{ marginTop: 12, paddingVertical: 8 }}
          onPress={() =>
            setStartCodes((current) => {
              const updated = { ...current };
              delete updated[appointment.id];
              return updated;
            })
          }
        >
          <Text style={styles.chatButtonText}>
            Hide code
          </Text>
        </Pressable>
      </View>
    ) : (
      <Pressable
        style={[
          styles.chatButton,
          loadingStartCode !== null && { opacity: 0.5 },
        ]}
        disabled={loadingStartCode !== null}
        onPress={() => showStartCode(appointment.id)}
      >
        <Text style={styles.chatButtonText}>
          {loadingStartCode === appointment.id
            ? 'Loading code…'
            : 'Show start code'}
        </Text>
      </Pressable>
    )}

    {startCodeError?.appointmentId === appointment.id && (
      <Text
        style={{
          color: COLORS.destructive,
          marginTop: 8,
          fontSize: 12,
        }}
      >
        {startCodeError.message}
      </Text>
    )}
  </View>
)}
{appointment.status === 'confirmed' && (
  <AppointmentReschedule
    key={`${appointment.id}-${appointment.appointment_date}-${appointment.appointment_time}`}
    appointmentId={appointment.id}
    status={appointment.status}
    onChanged={async () => {
      clearStartCodeDisplay();
      await loadRealAppointments();
    }}
    onPropose={() => {
      clearStartCodeDisplay();

      router.push({
        pathname: '/reschedule',
        params: {
          appointmentId: appointment.id,
        },
      });
    }}
  />
)}
        <View style={styles.actions}>
         <Pressable
  style={styles.chatButton}
  onPress={() =>
    router.push({
      pathname: '/chat',
      params: {
        appointmentId: appointment.id,
        designerName:
          designerProfiles[appointment.designer_id]?.name ?? 'Nail artist',
        avatarUrl:
          designerProfiles[appointment.designer_id]?.avatar_url ?? '',
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
  disabled={appointment.status !== 'pending'}
  onPress={() => {
    Alert.alert(
      'Cancel appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'Keep appointment', style: 'cancel' },
        {
          text: 'Cancel appointment',
          style: 'destructive',
          onPress: async () => {
            try {
              // Confirma qual cliente está conectado.
              const { data: { user }, error: userError } =
                await supabase.auth.getUser();

              if (userError || !user) {
                Alert.alert('Error', 'Please log in again.');
                return;
              }

              // Cancela somente este agendamento pendente do cliente.
              const { data, error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', appointment.id)
                .eq('customer_id', user.id)
                .eq('status', 'pending')
                .select('id')
                .maybeSingle();

              if (error || !data) {
                Alert.alert(
                  'Error',
                  'Could not cancel this appointment. Please refresh and try again.'
                );
                return;
              }

              // Recarrega a lista para mostrar o novo status.
              await loadRealAppointments();
            } catch (error) {
              console.log('Cancellation error:', error);
              Alert.alert('Error', 'Could not cancel this appointment.');
            }
          },
        },
      ]
    );
  }}
>
  <Text style={styles.cancelButtonText}>
    {appointment.status === 'pending' ? 'Cancel' : 'Cancellation unavailable'}
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