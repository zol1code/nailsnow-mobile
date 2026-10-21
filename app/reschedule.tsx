import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { supabase } from '../lib/supabase';

type Booking = {
  id: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
};

type Slot = {
  slot_time: string;
  is_available: boolean;
};

function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

// Builds dates using Ireland's current calendar day.
function upcomingDates() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Dublin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const part = (type: string) =>
    Number(parts.find((item) => item.type === type)?.value);

  const firstDay = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    12
  );

  return Array.from({ length: 14 }, (_, index) =>
    new Date(firstDay + index * 86400000).toISOString().slice(0, 10)
  );
}

export default function RescheduleScreen() {
  const params = useLocalSearchParams();
  const appointmentId = Array.isArray(params.appointmentId)
    ? params.appointmentId[0]
    : params.appointmentId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [days, setDays] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<{ date: string; rows: Slot[] }>({
    date: '',
    rows: [],
  });

  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsFailed, setSlotsFailed] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [focused, setFocused] = useState(false);

  const submissionLock = useRef(false);
  const generation = useRef(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const version = ++generation.current;

      setFocused(true);
      setLoading(true);
      setBooking(null);
      setDate('');
      setTime('');
      setFeedback('');
      setBlocked(false);

      async function load() {
        try {
          if (!appointmentId) throw new Error('Missing appointment ID.');

          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError) throw authError;
          if (!user) throw new Error('Please sign in again.');

          // RLS restricts this query to the booking's participants.
          const { data, error } = await supabase
            .from('appointments')
            .select(
              'id, service_name, appointment_date, appointment_time, duration_minutes, status'
            )
            .eq('id', appointmentId)
            .single();

          if (error) throw error;

          if (active && generation.current === version) {
            if (data.status !== 'confirmed') {
              setFeedback('Only confirmed appointments can be rescheduled.');
              return;
            }

            const nextDays = upcomingDates();

            setBooking(data as Booking);
            setDays(nextDays);
            setDate(nextDays[0]);
          }
        } catch (error) {
          console.log('Reschedule booking error:', error);

          if (active && generation.current === version) {
            setFeedback('Could not load this appointment. Please refresh.');
          }
        } finally {
          if (active && generation.current === version) {
            setLoading(false);
          }
        }
      }

      void load();

      return () => {
        active = false;
        generation.current += 1;
        setFocused(false);
      };
    }, [appointmentId, refresh])
  );

  useEffect(() => {
    let active = true;

    setTime('');
    setSlots({ date: '', rows: [] });
    setSlotsFailed(false);

    if (!focused || !booking || !date) {
      setLoadingSlots(false);
      return;
    }

    setLoadingSlots(true);

    async function loadSlots() {
      try {
        const { data, error } = await supabase.rpc(
          'get_reschedule_time_slots',
          {
            p_appointment_id: booking!.id,
            p_date: date,
          }
        );

        if (error) throw error;

        if (active) {
          setSlots({
            date,
            rows: (data ?? []) as Slot[],
          });
        }
      } catch (error) {
        console.log('Reschedule slots error:', error);
        if (active) setSlotsFailed(true);
      } finally {
        if (active) setLoadingSlots(false);
      }
    }

    void loadSlots();

    return () => {
      active = false;
    };
  }, [focused, booking, date, refresh]);

  const currentRows = slots.date === date ? slots.rows : [];

  const ready = Boolean(
    focused &&
      booking &&
      !loading &&
      !loadingSlots &&
      !slotsFailed &&
      !submitting &&
      !blocked &&
      currentRows.some(
        (slot) => slot.slot_time === time && slot.is_available
      )
  );

  async function submitProposal() {
    if (submissionLock.current || !ready || !booking) return;

    submissionLock.current = true;
    setSubmitting(true);
    setFeedback('');

    const version = generation.current;

    try {
      const { data, error } = await supabase.rpc(
        'request_appointment_reschedule',
        {
          p_appointment_id: booking.id,
          p_date: date,
          p_time: time,
        }
      );

      if (error) throw error;
      if (generation.current !== version) return;

      if (data?.result === 'requested') {
        setBlocked(true);
        setFeedback(
          'Proposal sent. Your original booking stays in place until the other person accepts.'
        );
      } else if (data?.result === 'pending_request_exists') {
        setBlocked(true);
        setFeedback(
          'A proposal is already pending. Go back to view or withdraw it.'
        );
      } else if (data?.result === 'time_unavailable') {
        setTime('');
        setBlocked(true);
        setFeedback(
          'This time is no longer available. Refresh to choose another time.'
        );
      } else {
        setBlocked(true);
        setFeedback(
          'This appointment cannot be rescheduled right now. Go back to check its status.'
        );
      }
    } catch (error) {
      console.log('Reschedule proposal error:', error);

      if (generation.current === version) {
        setBlocked(true);
        setFeedback(
          'Could not confirm the result. Go back and check for a pending proposal before trying again.'
        );
      }
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} disabled={submitting}>
          <Text style={styles.link}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>Reschedule Appointment</Text>

        {loading ? (
          <Text>Loading appointment…</Text>
        ) : (
          <>
            {booking && (
              <>
                <View style={styles.card}>
                  <Text style={styles.heading}>{booking.service_name}</Text>
                  <Text style={styles.text}>
                    Current booking: {dateLabel(booking.appointment_date)}
                    {' at '}
                    {booking.appointment_time.slice(0, 5)}
                  </Text>
                  <Text style={styles.text}>
                    Your service, price and duration stay the same.
                    The new time requires the other person's acceptance.
                  </Text>
                </View>

                <Text style={styles.heading}>Select New Date</Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.options}
                >
                  {days.map((day) => (
                    <Pressable
                      key={day}
                      disabled={submitting || blocked}
                      onPress={() => {
                        setTime('');
                        setDate(day);
                      }}
                      style={[
                        styles.option,
                        date === day && styles.selected,
                      ]}
                    >
                      <Text style={date === day ? styles.white : styles.text}>
                        {dateLabel(day)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={styles.heading}>Select New Time</Text>

                {loadingSlots ? (
                  <Text>Loading available times…</Text>
                ) : slotsFailed ? (
                  <Text>Could not load times. Please refresh.</Text>
                ) : !currentRows.some((slot) => slot.is_available) ? (
                  <Text>No available times for this date.</Text>
                ) : null}

                <View style={styles.options}>
                  {currentRows.map((slot) => (
                    <Pressable
                      key={slot.slot_time}
                      disabled={!slot.is_available || submitting || blocked}
                      onPress={() => setTime(slot.slot_time)}
                      style={[
                        styles.option,
                        time === slot.slot_time && styles.selected,
                        !slot.is_available && styles.disabled,
                      ]}
                    >
                      <Text
                        style={
                          time === slot.slot_time ? styles.white : styles.text
                        }
                      >
                        {slot.slot_time.slice(0, 5)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {!!time && (
                  <Text style={styles.text}>
                    Propose {dateLabel(date)} at {time.slice(0, 5)}?
                  </Text>
                )}

                <Pressable
                  disabled={!ready}
                  onPress={() => void submitProposal()}
                  style={[styles.button, !ready && styles.disabled]}
                >
                  <Text style={styles.white}>
                    {submitting ? 'Sending…' : 'Send Reschedule Proposal'}
                  </Text>
                </Pressable>
              </>
            )}

            {!!feedback && (
              <Text selectable style={styles.text}>
                {feedback}
              </Text>
            )}

            <Pressable
              disabled={submitting}
              onPress={() => setRefresh((value) => value + 1)}
            >
              <Text style={styles.link}>Refresh</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF5EF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C0B12',
  },
  heading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C0B12',
  },
  text: {
    color: '#1C0B12',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    padding: 12,
    backgroundColor: '#F0E6E9',
    borderRadius: 12,
  },
  selected: {
    backgroundColor: '#C4637A',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#C4637A',
    alignItems: 'center',
  },
  white: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  link: {
    color: '#C4637A',
    fontSize: 16,
    fontWeight: '600',
  },
});