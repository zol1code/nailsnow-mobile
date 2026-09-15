import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
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
  // Stores the designer's current profile photo URL.
const [avatarUrl, setAvatarUrl] = useState('');

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
.select(
  'name, bio, location, avatar_url, instagram, years_experience'
)       .eq('id', user.id)
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
    ? String(profile.years_experience)
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
// Saves the edited designer profile to Supabase.
const saveProfile = async () => {
  // Gets the currently authenticated user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  // Keeps the current avatar URL unless the designer selected
  // a new local photo from the phone.
  let finalAvatarUrl = avatarUrl;

  if (avatarUrl && !avatarUrl.startsWith('http')) {
    // Reads the selected photo from the phone.
    const response = await fetch(avatarUrl);
    const imageData = await response.arrayBuffer();

    // Saves each user's avatar inside a folder named with their user ID.
    const filePath = `${user.id}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, imageData, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.log('Avatar upload error:', uploadError.message);
      return;
    }

    // Gets the public URL that can be stored in the profile table.
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    finalAvatarUrl = publicUrlData.publicUrl;
  }

  // Updates the logged-in designer's profile.
  const { error } = await supabase
    .from('profiles')
    .update({
  // Saves the editable designer profile fields.
  name: name.trim(),
  bio: bio.trim(),
  location: location.trim(),
  instagram: instagram.trim(),
  avatar_url: finalAvatarUrl || null,
  // Saves the number of years as a numeric value.
years_experience:
  yearsExperience.trim() === ''
    ? null
    : Number(yearsExperience),
})
    .eq('id', user.id);

  if (error) {
    console.log('Profile update error:', error.message);
    return;
  }

  // Returns to the dashboard after saving successfully.
  router.back();
};

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
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

        <Text style={styles.label}>LOCATION</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          style={styles.input}
        />
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

        {/* Saves the edited profile when the button is pressed. */}
<Pressable
  style={styles.saveButton}
  onPress={saveProfile}
>
  <Text style={styles.saveButtonText}>Save Changes</Text>
</Pressable>
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