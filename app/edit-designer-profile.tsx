import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DesignerPrivateAddressEditor from '../components/DesignerPrivateAddressEditor';
import DesignerServicesEditor from '../components/DesignerServicesEditor';
// Provides access to the phone's photo library.
import * as ImagePicker from 'expo-image-picker';
// Displays the designer's profile photo.
import { Image } from 'expo-image';

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

export default function EditDesignerProfile() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  // Stores the designer's Instagram username.
const [instagram, setInstagram] = useState('');
// Stores the designer's years of professional experience.
const [yearsExperience, setYearsExperience] = useState('');
// Stores the designer's private phone number.
const [phone, setPhone] = useState('');
const [privateDetailsLoaded, setPrivateDetailsLoaded] = useState(false);
// Stores the designer's starting service price.
const [startingPrice, setStartingPrice] = useState('');
  // Stores the designer's current profile photo URL.
const [avatarUrl, setAvatarUrl] = useState('');
const [preparingStripe, setPreparingStripe] = useState(false);
const [stripeFeedback, setStripeFeedback] = useState('');
const stripeLock = useRef(false);
const [savingProfile, setSavingProfile] = useState(false);
const [profileFeedback, setProfileFeedback] = useState('');
const profileSaveLock = useRef(false);

async function prepareStripeAccount() {
  if (stripeLock.current) return;

  stripeLock.current = true;
  setPreparingStripe(true);
  setStripeFeedback('');

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setStripeFeedback('Please sign in again.');
      return;
    }

    const { data, error } = await supabase.functions.invoke(
      'create-connect-account',
      {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (error) {
      let message =
        'Could not prepare your Stripe account. Please try again later.';

      // Reads the server's explanation without displaying credentials.
      if ('context' in error && error.context instanceof Response) {
        const responseBody = await error.context
          .json()
          .catch(() => null);

        if (typeof responseBody?.error === 'string') {
          message = responseBody.error;
        }
      }

      setStripeFeedback(message);
      return;
    }

    if (
      data?.result !== 'account_ready' ||
      data?.livemode !== false
    ) {
      setStripeFeedback(
        'Unexpected response. Please check your account before trying again.'
      );
      return;
    }

    setStripeFeedback(
      'Stripe test account prepared successfully. Bank setup is not completed yet. No real payments are enabled.'
    );
  } catch {
    setStripeFeedback(
      'Could not confirm the result. Please check your connection and try again.'
    );
  } finally {
    stripeLock.current = false;
    setPreparingStripe(false);
  }
}

  useEffect(() => {
    // Loads the current designer profile when the edit screen opens.
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
// Loads all editable profile fields, including the saved profile photo.
// Loads all editable designer profile fields from Supabase.
// Loads all editable designer profile fields from Supabase.
// Loads all editable designer profile fields from Supabase.
.select(
 'name, bio, location, avatar_url, instagram, years_experience, starting_price'
)      .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.log('Edit profile load error:', error.message);
        return;
      }

      if (profile) {
        setName(profile.name ?? '');
        setBio(profile.bio ?? '');
        setLocation(profile.location ?? '');
        // Loads the designer's saved Instagram username.
setInstagram(profile.instagram ?? '');
        // Loads the designer's saved profile photo.
setAvatarUrl(profile.avatar_url ?? '');
// Loads the designer's saved years of experience.
setYearsExperience(
  profile.years_experience != null
    ? String(profile.years_experience): ''
);

// Loads the designer's private phone number.
const { data: privateDetails, error: privateError } =
  await supabase
    .from('profile_private_details')
    .select('phone')
    .eq('user_id', user.id)
    .maybeSingle();

if (privateError) {
  console.log('Private profile load error:', privateError.message);
  return;
}

setPhone(privateDetails?.phone ?? '');
setPrivateDetailsLoaded(true);

// Loads the designer's saved starting price.
setStartingPrice(
  profile.starting_price != null
    ? String(profile.starting_price)
    : ''
);
      }
    };

    loadProfile();
  }, []);
// Opens the phone's photo library so the designer can choose a profile photo.
const pickProfileImage = async () => {
  const permission =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  // Stores the selected image locally so it can be previewed.
  if (!result.canceled) {
    setAvatarUrl(result.assets[0].uri);
  }
};

const saveProfile = async () => {
  if (!privateDetailsLoaded || profileSaveLock.current) {
    return;
  }

  profileSaveLock.current = true;
  setSavingProfile(true);
  setProfileFeedback('');

  try {
    const parsedYears =
      yearsExperience.trim() === ''
        ? null
        : Number(yearsExperience);

    const parsedPrice =
      startingPrice.trim() === ''
        ? null
        : Number(startingPrice.trim().replace(',', '.'));

    if (
      parsedYears !== null &&
      (
        !Number.isInteger(parsedYears) ||
        parsedYears < 0 ||
        parsedYears > 32767
      )
    ) {
      setProfileFeedback(
        'Please enter a valid number of years of experience.'
      );
      return;
    }

    if (
      parsedPrice !== null &&
      (
        !Number.isFinite(parsedPrice) ||
        parsedPrice < 0
      )
    ) {
      setProfileFeedback(
        'Please enter a valid starting price.'
      );
      return;
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setProfileFeedback('Please sign in again.');
      return;
    }

    let finalAvatarUrl = avatarUrl;

    if (avatarUrl && !avatarUrl.startsWith('http')) {
      const response = await fetch(avatarUrl);
      const imageData = await response.arrayBuffer();

      const filePath = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, imageData, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        setProfileFeedback(
          'Could not upload your profile photo. Please try again.'
        );
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      finalAvatarUrl = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase.rpc(
      'save_designer_profile',
      {
        p_name: name.trim(),
        p_bio: bio.trim(),
        p_location: location.trim(),
        p_instagram: instagram.trim(),
        p_years_experience: parsedYears,
        p_avatar_url: finalAvatarUrl || null,
        p_starting_price: parsedPrice,
        p_phone: phone.trim() || null,
      }
    );

    if (error || data !== true) {
      setProfileFeedback(
        'Could not save your profile. Please try again.'
      );
      return;
    }

    router.back();

  } catch {
    setProfileFeedback(
      'Could not confirm the save. Please check your connection.'
    );

  } finally {
    profileSaveLock.current = false;
    setSavingProfile(false);
  }
};


  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>â€¹</Text>
        </Pressable>

        <Text style={styles.title}>Edit Profile</Text>
      </View>
      {/* Shows the current profile photo and lets the designer choose a new one. */}
<Pressable onPress={pickProfileImage} style={styles.avatarButton}>
  <Image
    source={
      avatarUrl
        ? { uri: avatarUrl }
        : require('../assets/images/icon.png')
    }
    style={styles.avatar}
    contentFit="cover"
  />

  <Text style={styles.changePhotoText}>Change Photo</Text>
</Pressable>

      <View style={styles.form}>
        <Text style={styles.label}>NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <Text style={styles.label}>BIO</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          style={[styles.input, styles.bioInput]}
          multiline
        />

       <Text style={styles.label}>PUBLIC AREA / CITY</Text>

<TextInput
  value={location}
  onChangeText={setLocation}
  style={styles.input}
  placeholder="e.g. Douglas, Cork"
  placeholderTextColor={COLORS.mutedForeground}
/>

<Text style={{ fontSize: 12, color: COLORS.mutedForeground }}>
  Shown publicly. Enter only your area and city.
  Do not include your street address or Eircode.
</Text>
        <Text style={styles.label}>INSTAGRAM</Text>
<TextInput
  value={instagram}
  onChangeText={setInstagram}
  style={styles.input}
  placeholder="@username"
/>
<Text style={styles.label}>YEARS OF EXPERIENCE</Text>
<TextInput
  value={yearsExperience}
  onChangeText={setYearsExperience}
  style={styles.input}
  placeholder="e.g. 3"
  keyboardType="number-pad"
/>
<Text style={styles.label}>PHONE</Text>
<TextInput
  value={phone}
  onChangeText={setPhone}
  style={styles.input}
  placeholder="+353 87 123 4567"
  keyboardType="phone-pad"
/>
<Text style={styles.label}>STARTING PRICE (â‚¬)</Text>
<TextInput
  value={startingPrice}
  onChangeText={setStartingPrice}
  style={styles.input}
  placeholder="e.g. 35"
  keyboardType="decimal-pad"
/>
        {/* Saves the edited profile when the button is pressed. */}


<Pressable
  style={[
    styles.saveButton,
    (!privateDetailsLoaded || savingProfile) && {
      opacity: 0.5,
    },
  ]}
  onPress={saveProfile}
  disabled={!privateDetailsLoaded || savingProfile}
>
  <Text style={styles.saveButtonText}>
    {savingProfile
      ? 'Saving...'
      : privateDetailsLoaded
        ? 'Save Changes'
        : 'Profile not loaded'}
  </Text>
</Pressable>

{!!profileFeedback && (
  <Text
    selectable
    accessibilityRole="alert"
    style={{
      color: COLORS.foreground,
      fontSize: 13,
      marginTop: 8,
    }}
  >
    {profileFeedback}
  </Text>
)}


<View
  style={{
    marginTop: 24,
    padding: 16,
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  }}
>
  <Text
    style={{
      fontSize: 18,
      fontWeight: '600',
      color: COLORS.foreground,
    }}
  >
    Payments setup
  </Text>

  <Text style={{ color: COLORS.mutedForeground }}>
    Test mode. No real payments or bank transfers are enabled.
  </Text>

  <Pressable
    onPress={prepareStripeAccount}
    disabled={preparingStripe}
    style={[
      styles.saveButton,
      { marginTop: 0 },
      preparingStripe && { opacity: 0.5 },
    ]}
  >
    <Text style={styles.saveButtonText}>
      {preparingStripe
        ? 'Preparingâ€¦'
        : 'Prepare Stripe test account'}
    </Text>
  </Pressable>

  {!!stripeFeedback && (
    <Text selectable style={{ color: COLORS.foreground }}>
      {stripeFeedback}
    </Text>
  )}
</View>
<DesignerPrivateAddressEditor />

<DesignerServicesEditor />
      </View>
    </ScrollView>
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
    gap: 16,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  back: {
    fontSize: 36,
    color: COLORS.foreground,
  },

  title: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.foreground,
  },

  form: {
    paddingHorizontal: 20,
    gap: 10,
  },

  label: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.mutedForeground,
  },

  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.foreground,
  },

  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  saveButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  avatarButton: {
  alignItems: 'center',
  marginBottom: 10,
},

avatar: {
  width: 96,
  height: 96,
  borderRadius: 48,
  backgroundColor: COLORS.muted,
},

changePhotoText: {
  marginTop: 8,
  color: COLORS.primary,
  fontWeight: '600',
},
});