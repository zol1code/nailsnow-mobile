import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { supabase } from '../lib/supabase';

type Service = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;

};

export default function DesignerServicesEditor() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // A null ID means the form is creating a new service.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');

  async function loadServices() {
    setLoading(true);
    setLoadFailed(false);

    try {
      const { data: { user }, error: authError } =
        await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Please sign in again.');
      }

      // Loads only services owned by the logged-in account.
      const { data, error } = await supabase
        .from('designer_services')
        .select('id, name, description, price, duration_minutes, is_active, is_active')
        .eq('designer_id', user.id)
        .order('id');

      if (error) throw error;

      setServices(
        (data ?? []).map((item) => ({
          ...item,
          price: Number(item.price),
        }))
      );
    } catch (error) {
      console.log('Load services error:', error);
      setLoadFailed(true);
      Alert.alert('Could not load services', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadServices();
  }, []);

  function resetForm() {
    setEditingId(null);
    setName('');
    setDescription('');
    setPrice('');
    setDuration('');
  }

  function editService(service: Service) {
    setEditingId(service.id);
    setName(service.name);
    setDescription(service.description ?? '');
    setPrice(String(service.price));
    setDuration(String(service.duration_minutes));
  }

  // Changes availability without deleting the service or booking history.
async function toggleService(service: Service) {
  if (savingRef.current) return;

  savingRef.current = true;
  setSaving(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      Alert.alert('Sign in required', 'Please sign in again.');
      return;
    }

    const { data, error } = await supabase
      .from('designer_services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id)
      .eq('designer_id', user.id)
      .eq('is_active', service.is_active)
      .select('id, is_active')
      .single();

    if (error) throw error;

    // Uses the availability actually saved by Supabase.
    setServices((current) =>
      current.map((item) =>
        item.id === data.id
          ? { ...item, is_active: data.is_active }
          : item
      )
    );
  } catch (error) {
    console.log('Service availability error:', error);
    Alert.alert(
      'Could not update service',
      'Please reopen this screen and try again.'
    );
  } finally {
    savingRef.current = false;
    setSaving(false);
  }
}

  async function saveService() {
    if (savingRef.current) return;

    // Accepts a comma or a dot as the decimal separator.
    const priceText = price.trim().replace(',', '.');
    const durationText = duration.trim();
    const priceValue = Number(priceText);
    const durationValue = Number(durationText);

    if (
      !name.trim() ||
      !/^\d+(\.\d{1,2})?$/.test(priceText) ||
      !Number.isFinite(priceValue) ||
      priceValue <= 0 ||
      !/^\d+$/.test(durationText) ||
      !Number.isSafeInteger(durationValue) ||
      durationValue <= 0 ||
      durationValue > 1440
    ) {
      Alert.alert(
        'Check service details',
        'Enter a name, a price above €0 with up to two decimal places, and a duration from 1 to 1440 whole minutes.'
      );
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      const { data: { user }, error: authError } =
        await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert('Sign in required', 'Please sign in again.');
        return;
      }

      const values = {
        name: name.trim(),
        description: description.trim() || null,
        price: priceValue,
        duration_minutes: durationValue,
      };

      // Updates an existing service or creates a new one.
      // RLS also enforces ownership in Supabase.
      const result = editingId !== null
        ? await supabase
            .from('designer_services')
            .update(values)
            .eq('id', editingId)
            .eq('designer_id', user.id)
            .select('id, name, description, price, duration_minutes, is_active')
            .single()
        : await supabase
            .from('designer_services')
            .insert({ ...values, designer_id: user.id })
            .select('id, name, description, price, duration_minutes, is_active')
            .single();

      if (result.error) throw result.error;

      const saved = {
        ...result.data,
        price: Number(result.data.price),
      };

      // Refreshes the list using the row actually saved by Supabase.
      setServices((current) =>
        editingId !== null
          ? current.map((item) => item.id === saved.id ? saved : item)
          : [...current, saved]
      );

      resetForm();
      Alert.alert('Service saved', 'Your service details were saved.');
    } catch (error) {
      console.log('Save service error:', error);
      Alert.alert(
        'Could not save service',
        'Your changes remain in the form. Please try again.'
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>My Services</Text>

      {loading ? (
        <Text style={styles.details}>Loading services…</Text>
      ) : loadFailed ? (
        <Pressable onPress={() => void loadServices()}>
          <Text style={styles.link}>Retry loading services</Text>
        </Pressable>
      ) : (
        <>
          {services.length === 0 && (
            <Text style={styles.details}>No services added yet.</Text>
          )}

          {services.map((service) => (
            <View key={service.id} style={styles.card}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.details}>
                €{service.price.toFixed(2)} · {service.duration_minutes} min
              </Text>
              {!!service.description && (
                <Text style={styles.details}>{service.description}</Text>
              )}
              <Pressable
                disabled={saving}
                onPress={() => editService(service)}
              >
                <Text style={styles.link}>Edit service</Text>
              </Pressable>
              <Text style={styles.details}>
  {service.is_active ? 'Active' : 'Inactive'}
</Text>

<Pressable
  disabled={saving}
  onPress={() => toggleService(service)}
>
  <Text style={styles.link}>
    {service.is_active ? 'Deactivate' : 'Activate'}
  </Text>
</Pressable>
            </View>
          ))}

          <Text style={styles.heading}>
            {editingId !== null ? 'Edit Service' : 'Add Service'}
          </Text>

          <Text style={styles.label}>SERVICE NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            editable={!saving}
            placeholder="e.g. Gel manicure"
            style={styles.input}
          />

          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            editable={!saving}
            placeholder="What does this service include?"
            multiline
            style={styles.input}
          />

          <Text style={styles.label}>PRICE (€)</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            editable={!saving}
            placeholder="e.g. 35.00"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Text style={styles.label}>DURATION (MINUTES)</Text>
          <TextInput
            value={duration}
            onChangeText={setDuration}
            editable={!saving}
            placeholder="e.g. 40"
            keyboardType="number-pad"
            style={styles.input}
          />

          <Pressable
            disabled={saving}
            onPress={saveService}
            style={[styles.button, saving && { opacity: 0.6 }]}
          >
            <Text style={styles.buttonText}>
              {saving
                ? 'Saving…'
                : editingId !== null ? 'Save Service' : 'Add Service'}
            </Text>
          </Pressable>

          {editingId !== null && (
            <Pressable disabled={saving} onPress={resetForm}>
              <Text style={styles.link}>Cancel editing</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 28, marginBottom: 32, gap: 10 },
  heading: { fontSize: 18, fontWeight: '700', color: '#1C0B12' },
  card: {
    padding: 16,
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(196, 99, 122, 0.14)',
    backgroundColor: '#FFFFFF',
  },
  serviceName: { fontSize: 15, fontWeight: '600', color: '#1C0B12' },
  details: { color: '#8B6472', fontSize: 13 },
  label: { marginTop: 8, fontSize: 12, color: '#8B6472' },
  input: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(196, 99, 122, 0.14)',
    backgroundColor: '#FFFFFF',
    color: '#1C0B12',
  },
  button: {
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#C4637A',
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
  link: { color: '#C4637A', fontWeight: '600', paddingVertical: 8 },
});