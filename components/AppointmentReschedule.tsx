import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { supabase } from '../lib/supabase';

type Proposal = {
  id: string;
  requested_by: string;
  proposed_date: string;
  proposed_time: string;
};

type Props = {
  appointmentId: string;
  status: string;
  onChanged: () => void | Promise<void>;
  onPropose: () => void;
};

function displayDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export default function AppointmentReschedule({
  appointmentId,
  status,
  onChanged,
  onPropose,
}: Props) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [refresh, setRefresh] = useState(0);

  const lock = useRef(false);
  const generation = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const version = ++generation.current;
      let active = true;

      setLoading(true);
      setFailed(false);
      setProposal(null);
      setUserId('');
      setFeedback('');

      async function load() {
        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError) throw authError;
          if (!user) throw new Error('Sign in required.');

          const { data, error } = await supabase
            .from('appointment_reschedule_requests')
            .select(
              'id, requested_by, proposed_date, proposed_time'
            )
            .eq('appointment_id', appointmentId)
            .eq('status', 'pending')
            .maybeSingle();

          if (error) throw error;

          if (active && generation.current === version) {
            setUserId(user.id);
            setProposal(data);
          }
        } catch (error) {
          console.log('Reschedule load error:', error);

          if (active && generation.current === version) {
            setFailed(true);
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
      };
    }, [appointmentId, status, refresh])
  );

  async function respond(action: 'accept' | 'decline' | 'withdraw') {
    if (lock.current || !proposal) return;

    lock.current = true;
    setBusy(true);
    setFeedback('');

    const version = generation.current;

    try {
      const { data, error } = await supabase.rpc(
        'respond_to_appointment_reschedule',
        {
          p_request_id: proposal.id,
          p_action: action,
        }
      );

      if (error) throw error;

      if (generation.current !== version) return;

      const result = data?.result as string | undefined;

      const messages: Record<string, string> = {
        accepted: 'Reschedule accepted.',
        declined: 'Proposal declined. The original booking is unchanged.',
        withdrawn: 'Proposal withdrawn. The original booking is unchanged.',
        expired: 'This proposal is no longer valid.',
        time_unavailable:
          'This time is no longer available. The original booking is unchanged.',
        already_handled:
          'This proposal has already been handled.',
        not_allowed: 'You cannot perform this action.',
      };

      setFeedback(
        messages[result ?? ''] ??
          'Could not update this proposal. Please refresh.'
      );

      if (
        result === 'accepted' ||
        result === 'declined' ||
        result === 'withdrawn' ||
        result === 'expired' ||
        result === 'time_unavailable' ||
        result === 'already_handled'
      ) {
        setProposal(null);
        await onChanged();
      }
    } catch (error) {
      console.log('Reschedule response error:', error);

      if (generation.current === version) {
        setFeedback(
          'Could not confirm the result. Refresh before trying again.'
        );
        setFailed(true);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function button(label: string, action: () => void) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={action}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: '#C4637A',
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  if (status !== 'confirmed' && !proposal && !feedback) {
    return null;
  }

  return (
    <View style={{ marginVertical: 12, gap: 10 }}>
      {loading ? (
        <Text>Loading reschedule details…</Text>
      ) : failed ? (
        <>
          <Text>Could not load the latest reschedule details.</Text>
          {button('Refresh', () => setRefresh((value) => value + 1))}
        </>
      ) : proposal ? (
        <>
          <Text style={{ fontWeight: '600', color: '#1C0B12' }}>
            {proposal.requested_by === userId
              ? 'Your reschedule proposal'
              : 'New reschedule proposal'}
          </Text>

          <Text>
            {displayDate(proposal.proposed_date)}
            {' at '}
            {proposal.proposed_time.slice(0, 5)}
          </Text>

          <Text>
            The original booking stays in place until accepted.
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {proposal.requested_by === userId ? (
              button('Withdraw proposal', () => void respond('withdraw'))
            ) : (
              <>
                {status === 'confirmed' &&
                  button('Accept new time', () => void respond('accept'))}

                {button('Decline proposal', () => void respond('decline'))}
              </>
            )}
          </View>
        </>
      ) : (
        status === 'confirmed' &&
        button('Request reschedule', onPropose)
      )}

      {busy && <Text>Updating proposal…</Text>}

      {!!feedback && (
        <Text selectable style={{ color: '#1C0B12' }}>
          {feedback}
        </Text>
      )}
    </View>
  );
}