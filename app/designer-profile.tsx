import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
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

type Service = {
  name: string;
  duration: string;
  price: number;
};

type Review = {
  author: string;
  rating: number;
  comment: string;
  date: string;
  avatar: string;
};

type Designer = {
  id: number;
  name: string;
  specialty: string;
  location: string;
  distance: string;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  available: boolean;
  avatar: string;
  portfolio: string[];
  services: Service[];
  about: string;
  reviews: Review[];
  joined: string;
  verified: boolean;
};

const DESIGNERS: Designer[] = [
  {
    id: 1,
    name: 'Sofia Mendes',
    specialty: 'Gel Extensions & Nail Art',
    location: 'Brooklyn, NY',
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
    services: [
      { name: 'Classic Manicure', duration: '45 min', price: 35 },
      { name: 'Gel Polish', duration: '60 min', price: 55 },
      { name: 'Gel Extensions', duration: '90 min', price: 95 },
      { name: 'Nail Art Design', duration: '20 min', price: 15 },
      { name: 'Nail Removal', duration: '30 min', price: 25 },
    ],
    about:
      "Hi! I'm Sofia, a certified nail technician with 6 years of experience specializing in gel extensions and intricate nail art. I work from my home studio in Brooklyn with a clean, relaxed atmosphere.",
    reviews: [
      {
        author: 'Jasmine T.',
        rating: 5,
        comment:
          'Sofia is absolutely incredible! My gel extensions lasted 4 weeks without lifting. I get compliments everywhere I go.',
        date: 'Aug 12, 2026',
        avatar: img(P.a3, 60, 60),
      },
      {
        author: 'Priya M.',
        rating: 5,
        comment:
          'Best nail artist I have ever been to. The nail art she created was exactly what I wanted.',
        date: 'Aug 3, 2026',
        avatar: img(P.a4, 60, 60),
      },
      {
        author: 'Lena R.',
        rating: 4,
        comment:
          'Great experience overall. The studio is cozy and she really takes her time.',
        date: 'Jul 28, 2026',
        avatar: img(P.a5, 60, 60),
      },
    ],
    joined: '2022',
    verified: true,
  },

  {
    id: 2,
    name: 'Priya Kapoor',
    specialty: 'Minimalist & French Nails',
    location: 'Williamsburg, NY',
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
    services: [
      { name: 'Classic Manicure', duration: '45 min', price: 35 },
      { name: 'French Manicure', duration: '60 min', price: 50 },
      { name: 'Gel Polish', duration: '60 min', price: 50 },
      { name: 'Pedicure', duration: '60 min', price: 55 },
      { name: 'Mani + Pedi Combo', duration: '2 hrs', price: 80 },
    ],
    about:
      'Priya here! I specialize in elegant, minimalist nail looks — clean French manicures, understated neutrals, and delicate nail art.',
    reviews: [
      {
        author: 'Clara S.',
        rating: 5,
        comment:
          'Priya did the most perfect French manicure. Clean, symmetrical, and it lasted three weeks!',
        date: 'Aug 15, 2026',
        avatar: img(P.a1, 60, 60),
      },
      {
        author: 'Aisha K.',
        rating: 5,
        comment:
          'So professional and sweet. Her technique is flawless and the space is very clean.',
        date: 'Aug 10, 2026',
        avatar: img(P.a5, 60, 60),
      },
    ],
    joined: '2021',
    verified: true,
  },

  {
    id: 3,
    name: 'Camille Dubois',
    specialty: 'Press-Ons & Custom Acrylics',
    location: 'Park Slope, NY',
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
    services: [
      { name: 'Custom Press-On Set', duration: '2 hrs', price: 75 },
      { name: 'Acrylic Full Set', duration: '90 min', price: 85 },
      { name: 'Acrylic Fill', duration: '60 min', price: 50 },
      { name: 'Nail Art Add-On', duration: '30 min', price: 20 },
      { name: 'Soak-Off Removal', duration: '30 min', price: 25 },
    ],
    about:
      "I'm Camille, a custom nail artist with a passion for elaborate designs and unique shapes.",
    reviews: [
      {
        author: 'Monica W.',
        rating: 5,
        comment:
          'Camille made me the most stunning custom press-ons for my wedding.',
        date: 'Aug 8, 2026',
        avatar: img(P.a2, 60, 60),
      },
      {
        author: 'Yuki T.',
        rating: 4,
        comment: 'Great acrylics, super creative.',
        date: 'Aug 1, 2026',
        avatar: img(P.a4, 60, 60),
      },
    ],
    joined: '2023',
    verified: false,
  },

  {
    id: 4,
    name: 'Alicia Vega',
    specialty: 'Nail Health & Natural Manicure',
    location: 'Astoria, NY',
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
    services: [
      { name: 'Natural Manicure', duration: '40 min', price: 30 },
      { name: 'Strengthening Treatment', duration: '45 min', price: 40 },
      { name: 'Paraffin Wax Treatment', duration: '75 min', price: 60 },
      { name: 'Nail Repair', duration: '20 min', price: 15 },
      { name: 'Spa Pedicure', duration: '75 min', price: 65 },
    ],
    about:
      "Alicia here — I'm passionate about nail health first, beauty second.",
    reviews: [
      {
        author: 'Rachel B.',
        rating: 5,
        comment:
          'My nails have never felt this healthy! Alicia is so knowledgeable.',
        date: 'Aug 18, 2026',
        avatar: img(P.a1, 60, 60),
      },
      {
        author: 'Sophie L.',
        rating: 5,
        comment: 'Such a calming experience.',
        date: 'Aug 11, 2026',
        avatar: img(P.a3, 60, 60),
      },
    ],
    joined: '2024',
    verified: true,
  },

  {
    id: 5,
    name: 'Mia Santos',
    specialty: 'Bold Colors & 3D Nail Art',
    location: 'Bushwick, NY',
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
    services: [
      { name: 'Gel Manicure (Color)', duration: '60 min', price: 55 },
      { name: '3D Nail Art', duration: '2 hrs', price: 110 },
      { name: 'Ombre Gel', duration: '75 min', price: 70 },
      { name: 'Chrome Powder Add-On', duration: '15 min', price: 15 },
      { name: 'Gel Extension + Art', duration: '2.5 hrs', price: 130 },
    ],
    about:
      "I'm Mia, and I live for bold, statement nails! 3D gems, elaborate nail art and ombre effects.",
    reviews: [
      {
        author: 'Diana C.',
        rating: 5,
        comment:
          'Mia did the most insane 3D nail art for my birthday.',
        date: 'Aug 14, 2026',
        avatar: img(P.a2, 60, 60),
      },
      {
        author: 'Keisha M.',
        rating: 4,
        comment: 'The chrome ombre she did was so beautiful.',
        date: 'Aug 6, 2026',
        avatar: img(P.a4, 60, 60),
      },
    ],
    joined: '2022',
    verified: true,
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= Math.round(rating) ? 'star' : 'star-outline'}
          size={13}
          color="#F5B942"
        />
      ))}
    </View>
  );
}

export default function DesignerProfileScreen() {
  const params = useLocalSearchParams();
  const id = Number(params.id ?? 1);

  const designer =
    DESIGNERS.find((item) => item.id === id) ?? DESIGNERS[0];

  const [tab, setTab] = useState('Portfolio');

  const tabs = ['Portfolio', 'Services', 'Reviews'];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cover */}
        <View style={styles.coverContainer}>
          <Image
            source={designer.portfolio[0]}
            style={styles.cover}
            contentFit="cover"
          />

          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        {/* Information */}
        <View style={styles.info}>
          <View style={styles.avatarRow}>
            <Image
              source={designer.avatar}
              style={styles.avatar}
              contentFit="cover"
            />

            <View style={styles.badges}>
              {designer.available && (
                <View style={styles.availableBadge}>
                  <View style={styles.greenDot} />
                  <Text style={styles.availableText}>
                    Available
                  </Text>
                </View>
              )}

              {designer.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons
                    name="checkmark"
                    size={12}
                    color={COLORS.primary}
                  />
                  <Text style={styles.verifiedText}>
                    Verified
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.name}>{designer.name}</Text>

          <Text style={styles.specialty}>
            {designer.specialty}
          </Text>

          <View style={styles.ratingRow}>
            <Stars rating={designer.rating} />

            <Text style={styles.rating}>
              {designer.rating.toFixed(1)}
            </Text>

            <Text style={styles.reviewCount}>
              ({designer.reviewCount} reviews)
            </Text>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detail}>
              <Ionicons
                name="location-outline"
                size={15}
                color={COLORS.mutedForeground}
              />

              <Text style={styles.detailText}>
                {designer.location}
              </Text>
            </View>

            <View style={styles.detail}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={COLORS.mutedForeground}
              />

              <Text style={styles.detailText}>
                Since {designer.joined}
              </Text>
            </View>
          </View>

          <Text style={styles.about}>
            {designer.about}
          </Text>

          {/* Tabs */}
          <View style={styles.tabs}>
            {tabs.map((item) => (
              <Pressable
                key={item}
                onPress={() => setTab(item)}
                style={[
                  styles.tabButton,
                  tab === item && styles.tabButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === item && styles.tabTextActive,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Portfolio */}
          {tab === 'Portfolio' && (
            <View style={styles.portfolio}>
              {designer.portfolio.map((photo, index) => (
                <Image
                  key={index}
                  source={photo}
                  style={styles.portfolioImage}
                  contentFit="cover"
                />
              ))}
            </View>
          )}

          {/* Services */}
          {tab === 'Services' && (
            <View style={styles.services}>
              {designer.services.map((service, index) => (
                <View key={index} style={styles.serviceCard}>
                  <View>
                    <Text style={styles.serviceName}>
                      {service.name}
                    </Text>

                    <View style={styles.durationRow}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={COLORS.mutedForeground}
                      />

                      <Text style={styles.duration}>
                        {service.duration}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.servicePrice}>
                    ${service.price}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Reviews */}
          {tab === 'Reviews' && (
            <View style={styles.reviews}>
              <View style={styles.reviewSummary}>
                <Text style={styles.bigRating}>
                  {designer.rating.toFixed(1)}
                </Text>

                <Stars rating={designer.rating} />

                <Text style={styles.summaryText}>
                  {designer.reviewCount} reviews
                </Text>
              </View>

              {designer.reviews.map((review, index) => (
                <View key={index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Image
                      source={review.avatar}
                      style={styles.reviewAvatar}
                      contentFit="cover"
                    />

                    <View style={styles.reviewAuthor}>
                      <Text style={styles.reviewName}>
                        {review.author}
                      </Text>

                      <Text style={styles.reviewDate}>
                        {review.date}
                      </Text>
                    </View>

                    <Stars rating={review.rating} />
                  </View>

                  <Text style={styles.reviewComment}>
                    {review.comment}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom buttons */}
      <View style={styles.bottomBar}>
        <Pressable
  style={styles.chatButton}
  onPress={() =>
    router.push({
      pathname: '/chat',
      params: { id: designer.id.toString() },
    })
  }
>
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color={COLORS.primary}
          />

          <Text style={styles.chatText}>Chat</Text>
        </Pressable>

        <Pressable
  style={styles.bookButton}
  onPress={() =>
    router.push({
      pathname: '/booking',
      params: { id: designer.id.toString() },
    })
  }
>
          <Ionicons
            name="calendar-outline"
            size={18}
            color="#FFFFFF"
          />

          <Text style={styles.bookText}>
            Book Appointment
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 110,
  },

  coverContainer: {
    height: 256,
    position: 'relative',
  },

  cover: {
    width: '100%',
    height: '100%',
  },

  backButton: {
    position: 'absolute',
    top: 54,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  info: {
    paddingHorizontal: 20,
    marginTop: -56,
  },

  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: COLORS.background,
  },

  badges: {
    flexDirection: 'row',
    gap: 7,
    paddingBottom: 4,
  },

  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
  },

  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },

  availableText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },

  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#C4637A1A',
    borderRadius: 999,
  },

  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },

  name: {
    fontSize: 30,
    color: COLORS.foreground,
    fontFamily: 'serif',
  },

  specialty: {
    marginTop: 2,
    fontSize: 14,
    color: COLORS.mutedForeground,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 9,
  },

  stars: {
    flexDirection: 'row',
    gap: 1,
  },

  rating: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  reviewCount: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 9,
  },

  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  detailText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  about: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.mutedForeground,
    lineHeight: 21,
  },

  tabs: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  tabButton: {
    paddingBottom: 12,
  },

  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.mutedForeground,
  },

  tabTextActive: {
    color: COLORS.primary,
  },

  portfolio: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 20,
  },

  portfolioImage: {
    width: '31.7%',
    aspectRatio: 1,
    borderRadius: 12,
  },

  services: {
    gap: 10,
    paddingTop: 20,
  },

  serviceCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foreground,
  },

  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },

  duration: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  servicePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },

  reviews: {
    gap: 14,
    paddingTop: 20,
  },

  reviewSummary: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },

  bigRating: {
    fontSize: 36,
    color: COLORS.foreground,
    fontFamily: 'serif',
  },

  summaryText: {
    marginTop: 5,
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  reviewCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
  },

  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  reviewAuthor: {
    flex: 1,
    marginLeft: 10,
  },

  reviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foreground,
  },

  reviewDate: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },

  reviewComment: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.mutedForeground,
    lineHeight: 21,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    flexDirection: 'row',
    gap: 12,
  },

  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },

  chatText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  bookButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },

  bookText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});