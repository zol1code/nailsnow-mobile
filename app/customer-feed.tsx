import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { router } from 'expo-router';

const COLORS = {
  background: '#FDF5EF',
  foreground: '#1C0B12',
  card: '#FFFFFF',
  primary: '#C4637A',
  muted: '#F0E6E9',
  mutedForeground: '#8B6472',
  inputBackground: '#F5EBEE',
  border: 'rgba(196, 99, 122, 0.14)',
};

const img = (id: string, width = 400, height = 400) =>
  `https://images.unsplash.com/photo-${id}?w=${width}&h=${height}&fit=crop&auto=format`;

const N = {
  tortoise: '1604654894610-df63bc536371',
  nude: '1571290274554-6a2eaa771e5f',
  silver: '1604654894611-6973b376cbde',
  pink: '1519014816548-bf5fe059798b',
  dark: '1587729927069-ef3b7a5ab9b4',
  ornate: '1754799670312-8e7da8e40ad7',
  diamond: '1588015810531-dd522c9c8bbb',
  natural: '1588359953494-0c215e3cedc6',
  rings: '1720343409646-960f6dcccae3',
};

const P = {
  a1: '1580489944761-15a19d654956',
  a2: '1662850886700-4ec19bd30d11',
  a3: '1489278353717-f64c6ee8a4d2',
  a4: '1562337404-3044c84ac061',
  a5: '1607569708758-0270aa4651bd',
};

type Designer = {
  id: number;
  name: string;
  specialty: string;
  distance: string;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  available: boolean;
  avatar: string;
  portfolio: string[];
  verified: boolean;
};

const DESIGNERS: Designer[] = [
  {
    id: 1,
    name: 'Sofia Mendes',
    specialty: 'Gel Extensions & Nail Art',
    distance: '0.8 mi',
    rating: 4.9,
    reviewCount: 127,
    priceFrom: 45,
    available: true,
    avatar: img(P.a1, 200, 200),
    portfolio: [
      N.tortoise,
      N.nude,
      N.silver,
      N.pink,
      N.dark,
      N.ornate,
    ].map((id) => img(id)),
    verified: true,
  },
  {
    id: 2,
    name: 'Priya Kapoor',
    specialty: 'Minimalist & French Nails',
    distance: '1.2 mi',
    rating: 4.8,
    reviewCount: 89,
    priceFrom: 35,
    available: true,
    avatar: img(P.a2, 200, 200),
    portfolio: [
      N.pink,
      N.diamond,
      N.natural,
      N.tortoise,
      N.rings,
      N.silver,
    ].map((id) => img(id)),
    verified: true,
  },
  {
    id: 3,
    name: 'Camille Dubois',
    specialty: 'Press-Ons & Custom Acrylics',
    distance: '2.1 mi',
    rating: 4.7,
    reviewCount: 64,
    priceFrom: 40,
    available: false,
    avatar: img(P.a3, 200, 200),
    portfolio: [
      N.ornate,
      N.dark,
      N.rings,
      N.nude,
      N.diamond,
      N.pink,
    ].map((id) => img(id)),
    verified: false,
  },
  {
    id: 4,
    name: 'Alicia Vega',
    specialty: 'Nail Health & Natural Manicure',
    distance: '3.4 mi',
    rating: 5,
    reviewCount: 42,
    priceFrom: 30,
    available: true,
    avatar: img(P.a4, 200, 200),
    portfolio: [
      N.natural,
      N.pink,
      N.nude,
      N.diamond,
      N.tortoise,
      N.rings,
    ].map((id) => img(id)),
    verified: true,
  },
  {
    id: 5,
    name: 'Mia Santos',
    specialty: 'Bold Colors & 3D Nail Art',
    distance: '1.9 mi',
    rating: 4.6,
    reviewCount: 73,
    priceFrom: 50,
    available: true,
    avatar: img(P.a5, 200, 200),
    portfolio: [
      N.rings,
      N.ornate,
      N.tortoise,
      N.dark,
      N.silver,
      N.natural,
    ].map((id) => img(id)),
    verified: true,
  },
];

export default function CustomerFeed() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [liked, setLiked] = useState<number[]>([]);

  const filters = [
    'All',
    'Available Now',
    'Top Rated',
    'Closest',
    'Budget-Friendly',
  ];

  const filtered = DESIGNERS.filter((designer) => {
    const query = search.toLowerCase();

    const matchesSearch =
      designer.name.toLowerCase().includes(query) ||
      designer.specialty.toLowerCase().includes(query);

    if (filter === 'Available Now') {
      return matchesSearch && designer.available;
    }

    if (filter === 'Top Rated') {
      return matchesSearch && designer.rating >= 4.8;
    }

    if (filter === 'Budget-Friendly') {
      return matchesSearch && designer.priceFrom <= 35;
    }

    return matchesSearch;
  });

  function toggleLike(id: number) {
    setLiked((current) =>
      current.includes(id)
        ? current.filter((designerId) => designerId !== id)
        : [...current, id]
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.locationLabel}>YOUR LOCATION</Text>

              <View style={styles.locationRow}>
                <Ionicons
                  name="location"
                  size={14}
                  color={COLORS.primary}
                />

                <Text style={styles.location}>
                  Brooklyn, New York
                </Text>
              </View>
            </View>

            <View style={styles.headerButtons}>
              <Pressable
  style={styles.calendarButton}
  onPress={() => router.push('/appointments')}
>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={COLORS.foreground}
                />

                <View style={styles.notificationDot} />
              </Pressable>

              <Image
                source={img(P.a3, 80, 80)}
                style={styles.profileImage}
                contentFit="cover"
              />
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={18}
              color={COLORS.mutedForeground}
              style={styles.searchIcon}
            />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search nail artists or styles…"
              placeholderTextColor={COLORS.mutedForeground}
              style={styles.searchInput}
            />
          </View>

          {/* Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {filters.map((item) => {
              const active = filter === item;

              return (
                <Pressable
                  key={item}
                  onPress={() => setFilter(item)}
                  style={[
                    styles.filter,
                    active && styles.filterActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      active && styles.filterTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Cards */}
        <View style={styles.cards}>
          <Text style={styles.artistCount}>
            {filtered.length} artists near you
          </Text>

          {filtered.map((designer) => (
            <Pressable
  key={designer.id}
  style={styles.card}
  onPress={() =>
    router.push({
      pathname: '/designer-profile',
      params: { id: designer.id.toString() },
    })
  }
>
              {/* Main image */}
              <View style={styles.mainImageContainer}>
                <Image
                  source={designer.portfolio[0]}
                  style={styles.mainImage}
                  contentFit="cover"
                />

                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: designer.available
                          ? '#22C55E'
                          : '#9CA3AF',
                      },
                    ]}
                  />

                  <Text style={styles.statusText}>
                    {designer.available
                      ? 'Available'
                      : 'Unavailable'}
                  </Text>
                </View>

                <Pressable
                  style={styles.heartButton}
                  onPress={() => toggleLike(designer.id)}
                >
                  <Ionicons
                    name={
                      liked.includes(designer.id)
                        ? 'heart'
                        : 'heart-outline'
                    }
                    size={20}
                    color={
                      liked.includes(designer.id)
                        ? '#FB7185'
                        : '#FFFFFF'
                    }
                  />
                </Pressable>

                <View style={styles.miniPortfolio}>
                  {designer.portfolio.slice(1, 4).map((photo, index) => (
                    <Image
                      key={index}
                      source={photo}
                      style={styles.miniImage}
                      contentFit="cover"
                    />
                  ))}
                </View>
              </View>

              {/* Designer information */}
              <View style={styles.cardInfo}>
                <View style={styles.designerTop}>
                  <View style={styles.designerIdentity}>
                    <Image
                      source={designer.avatar}
                      style={styles.avatar}
                      contentFit="cover"
                    />

                    <View style={styles.nameContainer}>
                      <View style={styles.nameRow}>
                        <Text style={styles.name}>
                          {designer.name}
                        </Text>

                        {designer.verified && (
                          <View style={styles.verified}>
                            <Ionicons
                              name="checkmark"
                              size={11}
                              color="#FFFFFF"
                            />
                          </View>
                        )}
                      </View>

                      <Text style={styles.specialty}>
                        {designer.specialty}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.price}>
                    From ${designer.priceFrom}
                  </Text>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.ratingRow}>
                    <Ionicons
                      name="star"
                      size={14}
                      color="#F5B942"
                    />

                    <Text style={styles.rating}>
                      {designer.rating.toFixed(1)}
                    </Text>

                    <Text style={styles.reviewCount}>
                      ({designer.reviewCount})
                    </Text>
                  </View>

                  <View style={styles.distanceRow}>
                    <Ionicons
                      name="location-outline"
                      size={13}
                      color={COLORS.mutedForeground}
                    />

                    <Text style={styles.distance}>
                      {designer.distance}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
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
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  locationLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.mutedForeground,
    letterSpacing: 1.5,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },

  location: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  calendarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    top: -1,
    right: -1,
    borderWidth: 2,
    borderColor: COLORS.background,
  },

  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(196,99,122,0.25)',
  },

  searchContainer: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 12,
  },

  searchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
  },

  searchInput: {
    width: '100%',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 16,
    paddingLeft: 44,
    paddingRight: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.foreground,
  },

  filters: {
    gap: 8,
    paddingRight: 20,
  },

  filter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.muted,
  },

  filterActive: {
    backgroundColor: COLORS.primary,
  },

  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.mutedForeground,
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  cards: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },

  artistCount: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    fontWeight: '500',
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  mainImageContainer: {
    height: 192,
    position: 'relative',
  },

  mainImage: {
    width: '100%',
    height: '100%',
  },

  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.foreground,
  },

  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  miniPortfolio: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    gap: 4,
  },

  miniImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },

  cardInfo: {
    padding: 16,
  },

  designerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  designerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(196,99,122,0.2)',
  },

  nameContainer: {
    flex: 1,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foreground,
  },

  verified: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  specialty: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },

  price: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 14,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  rating: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  reviewCount: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  distance: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
});