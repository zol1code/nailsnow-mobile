import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '../lib/supabase';

type Address = {
  address_line_1: string;
  address_line_2: string;
  city: string;
  county: string;
  eircode: string;
  access_instructions: string;
};

const EMPTY_ADDRESS: Address = {
  address_line_1: '',
  address_line_2: '',
  city: '',
  county: '',
  eircode: '',
  access_instructions: '',
};

const FIELDS: {
  key: keyof Address;
  label: string;
  placeholder: string;
  maxLength: number;
}[] = [
  {
    key: 'address_line_1',
    label: 'Street address *',
    placeholder: 'House number and street',
    maxLength: 200,
  },
  {
    key: 'address_line_2',
    label: 'Address line 2',
    placeholder: 'Apartment, building or unit',
    maxLength: 200,
  },
  {
    key: 'city',
    label: 'City / Town *',
    placeholder: 'e.g. Cork',
    maxLength: 100,
  },
  {
    key: 'county',
    label: 'County',
    placeholder: 'e.g. Cork',
    maxLength: 100,
  },
  {
    key: 'eircode',
    label: 'Eircode',
    placeholder: 'Your Eircode',
    maxLength: 10,
  },
  {
    key: 'access_instructions',
    label: 'Access instructions',
    placeholder: 'Entrance, floor or other arrival details',
    maxLength: 2000,
  },
];

export default function DesignerPrivateAddressEditor() {
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [ownerId, setOwnerId] = useState('');
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [refresh, setRefresh] = useState(0);

  const saveLock = useRef(false);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setFailed(false);
    setFeedback('');
    setOwnerId('');
    setAddress(EMPTY_ADDRESS);

    async function loadAddress() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) throw new Error('Sign in required.');

        const { data, error } = await supabase
          .from('designer_private_addresses')
          .select(
            'address_line_1, address_line_2, city, county, eircode, access_instructions'
          )
          .eq('designer_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (!active) return;

        setOwnerId(user.id);
        setExists(Boolean(data));
        setAddress(data ?? EMPTY_ADDRESS);
      } catch (error) {
        console.log('Private address load error:', error);

        if (active) {
          setFailed(true);
          setFeedback('Could not load your private address. Please retry.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAddress();

    return () => {
      active = false;
    };
  }, [refresh]);

  async function saveAddress() {
    if (saveLock.current || loading || failed || !ownerId) return;

    const cleaned: Address = {
      address_line_1: address.address_line_1.trim(),
      address_line_2: address.address_line_2.trim(),
      city: address.city.trim(),
      county: address.county.trim(),
      eircode: address.eircode.trim().toUpperCase(),
      access_instructions: address.access_instructions.trim(),
    };

    if (!cleaned.address_line_1 || !cleaned.city) {
      setFeedback('Enter your street address and city or town.');
      return;
    }

    if (
      FIELDS.some(
        (field) => cleaned[field.key].length > field.maxLength
      )
    ) {
      setFeedback('One or more fields exceed the allowed length.');
      return;
    }

    saveLock.current = true;
    setSaving(true);
    setFeedback('');

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user || user.id !== ownerId) {
        setFailed(true);
        setFeedback('Your session changed. Reload before saving.');
        return;
      }

      // Updates editable fields only; designer_id stays unchanged.
      const query = exists
        ? supabase
            .from('designer_private_addresses')
            .update(cleaned)
            .eq('designer_id', user.id)
        : supabase
            .from('designer_private_addresses')
            .insert({
              designer_id: user.id,
              ...cleaned,
            });

      const { data, error } = await query
        .select('designer_id')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Address was not saved.');

      setAddress(cleaned);
      setExists(true);
      setFeedback('Private address saved.');
    } catch (error) {
      console.log('Private address save error:', error);

      // Reloads before another attempt if the outcome is uncertain.
      setFailed(true);
      setFeedback(
        'Could not confirm the save. Reload to check the saved address before trying again.'
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Private Appointment Address</Text>

      <Text style={styles.description}>
        This address is not shown on your public profile.
        Saving it does not share it with customers.
      </Text>

      {loading ? (
        <Text style={styles.description}>Loading private address…</Text>
      ) : (
        FIELDS.map((field) => (
          <View key={field.key} style={styles.field}>
            <Text style={styles.label}>{field.label}</Text>

            <TextInput
              value={address[field.key]}
              onChangeText={(value) => {
                setAddress((current) => ({
                  ...current,
                  [field.key]: value,
                }));
                setFeedback('');
              }}
              placeholder={field.placeholder}
              placeholderTextColor="#8B6472"
              maxLength={field.maxLength}
              editable={!saving && !failed}
              autoCorrect={false}
              autoCapitalize={
                field.key === 'eircode' ? 'characters' : 'sentences'
              }
              multiline={field.key === 'access_instructions'}
              style={[
                styles.input,
                field.key === 'access_instructions' && styles.multiline,
              ]}
            />
          </View>
        ))
      )}

      {!!feedback && (
        <Text selectable style={styles.description}>
          {feedback}
        </Text>
      )}

      {failed ? (
        <Pressable
          style={styles.button}
          disabled={saving}
          onPress={() => setRefresh((current) => current + 1)}
        >
          <Text style={styles.buttonText}>Reload Private Address</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[
            styles.button,
            (loading || saving) && { opacity: 0.5 },
          ]}
          disabled={loading || saving}
          onPress={() => void saveAddress()}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving…' : 'Save Private Address'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
    marginBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C0B12',
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: '#8B6472',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B6472',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(196, 99, 122, 0.14)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#1C0B12',
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#C4637A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});