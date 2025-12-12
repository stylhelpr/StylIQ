import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import {fontScale, moderateScale} from '../utils/scale';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 43) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

type Props = {
  navigate: (screen: string, params?: any) => void;
};

// Layout constants
const HEADER_HEIGHT = 80;
const BOTTOM_NAV_HEIGHT = 90;
const HEART_ICON_SIZE = 22;
const LIKE_COUNT_SIZE = 12;

// Mock data for the showcase
const MOCK_POSTS = [
  {
    id: '1',
    imageUrl:
      'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=400',
    userName: 'StyleQueen',
    userAvatar: 'https://i.pravatar.cc/100?img=1',
    likes: 234,
    tags: ['casual', 'summer'],
  },
  {
    id: '2',
    imageUrl:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    userName: 'FashionForward',
    userAvatar: 'https://i.pravatar.cc/100?img=2',
    likes: 189,
    tags: ['elegant', 'evening'],
  },
  {
    id: '3',
    imageUrl:
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
    userName: 'TrendSetter',
    userAvatar: 'https://i.pravatar.cc/100?img=3',
    likes: 421,
    tags: ['streetwear', 'urban'],
  },
  {
    id: '4',
    imageUrl:
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
    userName: 'ChicVibes',
    userAvatar: 'https://i.pravatar.cc/100?img=4',
    likes: 156,
    tags: ['minimal', 'clean'],
  },
  {
    id: '5',
    imageUrl:
      'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
    userName: 'LookBook',
    userAvatar: 'https://i.pravatar.cc/100?img=5',
    likes: 312,
    tags: ['professional', 'smart'],
  },
  {
    id: '6',
    imageUrl:
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
    userName: 'OutfitDaily',
    userAvatar: 'https://i.pravatar.cc/100?img=6',
    likes: 278,
    tags: ['boho', 'relaxed'],
  },
  {
    id: '7',
    imageUrl:
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
    userName: 'RunwayReady',
    userAvatar: 'https://i.pravatar.cc/100?img=7',
    likes: 567,
    tags: ['runway', 'haute'],
  },
  {
    id: '8',
    imageUrl:
      'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
    userName: 'VintageVibes',
    userAvatar: 'https://i.pravatar.cc/100?img=8',
    likes: 445,
    tags: ['vintage', 'retro'],
  },
  {
    id: '9',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    userName: 'StreetStyle',
    userAvatar: 'https://i.pravatar.cc/100?img=9',
    likes: 623,
    tags: ['street', 'edgy'],
  },
  {
    id: '10',
    imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
    userName: 'MinimalMood',
    userAvatar: 'https://i.pravatar.cc/100?img=10',
    likes: 389,
    tags: ['minimal', 'neutral'],
  },
  {
    id: '11',
    imageUrl:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
    userName: 'GlamGoals',
    userAvatar: 'https://i.pravatar.cc/100?img=11',
    likes: 712,
    tags: ['glam', 'party'],
  },
  {
    id: '12',
    imageUrl:
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
    userName: 'CasualCool',
    userAvatar: 'https://i.pravatar.cc/100?img=12',
    likes: 298,
    tags: ['casual', 'weekend'],
  },
  {
    id: '13',
    imageUrl:
      'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=400',
    userName: 'WorkWear',
    userAvatar: 'https://i.pravatar.cc/100?img=13',
    likes: 534,
    tags: ['office', 'professional'],
  },
  {
    id: '14',
    imageUrl:
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
    userName: 'DateNight',
    userAvatar: 'https://i.pravatar.cc/100?img=14',
    likes: 467,
    tags: ['date', 'romantic'],
  },
  {
    id: '15',
    imageUrl:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
    userName: 'ShopTillDrop',
    userAvatar: 'https://i.pravatar.cc/100?img=15',
    likes: 389,
    tags: ['shopping', 'haul'],
  },
  {
    id: '16',
    imageUrl:
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
    userName: 'BohoBeauty',
    userAvatar: 'https://i.pravatar.cc/100?img=16',
    likes: 512,
    tags: ['boho', 'festival'],
  },
  {
    id: '17',
    imageUrl:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    userName: 'ElegantEdge',
    userAvatar: 'https://i.pravatar.cc/100?img=17',
    likes: 678,
    tags: ['elegant', 'classy'],
  },
  {
    id: '18',
    imageUrl:
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
    userName: 'SummerStyle',
    userAvatar: 'https://i.pravatar.cc/100?img=18',
    likes: 445,
    tags: ['summer', 'beach'],
  },
  {
    id: '19',
    imageUrl:
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400',
    userName: 'UrbanChic',
    userAvatar: 'https://i.pravatar.cc/100?img=19',
    likes: 523,
    tags: ['urban', 'city'],
  },
  {
    id: '20',
    imageUrl:
      'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400',
    userName: 'ClassicLook',
    userAvatar: 'https://i.pravatar.cc/100?img=20',
    likes: 612,
    tags: ['classic', 'timeless'],
  },
  {
    id: '21',
    imageUrl: 'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=400',
    userName: 'NightOwl',
    userAvatar: 'https://i.pravatar.cc/100?img=21',
    likes: 398,
    tags: ['night', 'club'],
  },
  {
    id: '22',
    imageUrl: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400',
    userName: 'SportsLux',
    userAvatar: 'https://i.pravatar.cc/100?img=22',
    likes: 456,
    tags: ['sporty', 'athleisure'],
  },
  {
    id: '23',
    imageUrl:
      'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400',
    userName: 'PastelDreams',
    userAvatar: 'https://i.pravatar.cc/100?img=23',
    likes: 567,
    tags: ['pastel', 'soft'],
  },
  {
    id: '24',
    imageUrl:
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
    userName: 'BoldMoves',
    userAvatar: 'https://i.pravatar.cc/100?img=24',
    likes: 789,
    tags: ['bold', 'statement'],
  },
  {
    id: '25',
    imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
    userName: 'CozyVibes',
    userAvatar: 'https://i.pravatar.cc/100?img=25',
    likes: 345,
    tags: ['cozy', 'comfortable'],
  },
  {
    id: '26',
    imageUrl:
      'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400',
    userName: 'RetroWave',
    userAvatar: 'https://i.pravatar.cc/100?img=26',
    likes: 678,
    tags: ['retro', '80s'],
  },
  {
    id: '27',
    imageUrl: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=400',
    userName: 'EcoFashion',
    userAvatar: 'https://i.pravatar.cc/100?img=27',
    likes: 423,
    tags: ['sustainable', 'eco'],
  },
  {
    id: '28',
    imageUrl:
      'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=400',
    userName: 'DenimDays',
    userAvatar: 'https://i.pravatar.cc/100?img=28',
    likes: 534,
    tags: ['denim', 'jeans'],
  },
  {
    id: '29',
    imageUrl:
      'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=400',
    userName: 'LayeredLooks',
    userAvatar: 'https://i.pravatar.cc/100?img=29',
    likes: 456,
    tags: ['layers', 'fall'],
  },
  {
    id: '30',
    imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
    userName: 'MonoMagic',
    userAvatar: 'https://i.pravatar.cc/100?img=30',
    likes: 612,
    tags: ['monochrome', 'black'],
  },
  {
    id: '31',
    imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
    userName: 'PrintPerfect',
    userAvatar: 'https://i.pravatar.cc/100?img=31',
    likes: 523,
    tags: ['prints', 'patterns'],
  },
  {
    id: '32',
    imageUrl:
      'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
    userName: 'BusinessBoss',
    userAvatar: 'https://i.pravatar.cc/100?img=32',
    likes: 445,
    tags: ['business', 'power'],
  },
  {
    id: '33',
    imageUrl:
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
    userName: 'WeekendWarrior',
    userAvatar: 'https://i.pravatar.cc/100?img=33',
    likes: 678,
    tags: ['weekend', 'relaxed'],
  },
  {
    id: '34',
    imageUrl:
      'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
    userName: 'GardenParty',
    userAvatar: 'https://i.pravatar.cc/100?img=34',
    likes: 567,
    tags: ['garden', 'floral'],
  },
  {
    id: '35',
    imageUrl:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    userName: 'TravelReady',
    userAvatar: 'https://i.pravatar.cc/100?img=35',
    likes: 789,
    tags: ['travel', 'airport'],
  },
  {
    id: '36',
    imageUrl:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
    userName: 'CocktailHour',
    userAvatar: 'https://i.pravatar.cc/100?img=36',
    likes: 834,
    tags: ['cocktail', 'evening'],
  },
  {
    id: '37',
    imageUrl:
      'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=400',
    userName: 'MidnightGlam',
    userAvatar: 'https://i.pravatar.cc/100?img=37',
    likes: 456,
    tags: ['night', 'glam'],
  },
  {
    id: '38',
    imageUrl:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    userName: 'SilkDreams',
    userAvatar: 'https://i.pravatar.cc/100?img=38',
    likes: 523,
    tags: ['silk', 'luxury'],
  },
  {
    id: '39',
    imageUrl:
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
    userName: 'StreetKing',
    userAvatar: 'https://i.pravatar.cc/100?img=39',
    likes: 678,
    tags: ['street', 'urban'],
  },
  {
    id: '40',
    imageUrl:
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
    userName: 'PureElegance',
    userAvatar: 'https://i.pravatar.cc/100?img=40',
    likes: 712,
    tags: ['elegant', 'pure'],
  },
  {
    id: '41',
    imageUrl:
      'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
    userName: 'CorporateChic',
    userAvatar: 'https://i.pravatar.cc/100?img=41',
    likes: 389,
    tags: ['corporate', 'chic'],
  },
  {
    id: '42',
    imageUrl:
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
    userName: 'FreeSpiritStyle',
    userAvatar: 'https://i.pravatar.cc/100?img=42',
    likes: 567,
    tags: ['free', 'spirit'],
  },
  {
    id: '43',
    imageUrl:
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
    userName: 'HighFashion',
    userAvatar: 'https://i.pravatar.cc/100?img=43',
    likes: 834,
    tags: ['high', 'fashion'],
  },
  {
    id: '44',
    imageUrl:
      'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
    userName: 'RetroQueen',
    userAvatar: 'https://i.pravatar.cc/100?img=44',
    likes: 445,
    tags: ['retro', 'queen'],
  },
  {
    id: '45',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    userName: 'EdgeLord',
    userAvatar: 'https://i.pravatar.cc/100?img=45',
    likes: 623,
    tags: ['edge', 'dark'],
  },
  {
    id: '46',
    imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
    userName: 'NeutralTones',
    userAvatar: 'https://i.pravatar.cc/100?img=46',
    likes: 512,
    tags: ['neutral', 'tones'],
  },
  {
    id: '47',
    imageUrl:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
    userName: 'PartyPrincess',
    userAvatar: 'https://i.pravatar.cc/100?img=47',
    likes: 789,
    tags: ['party', 'princess'],
  },
  {
    id: '48',
    imageUrl:
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
    userName: 'LazyDays',
    userAvatar: 'https://i.pravatar.cc/100?img=48',
    likes: 345,
    tags: ['lazy', 'chill'],
  },
  {
    id: '49',
    imageUrl:
      'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=400',
    userName: 'PowerDress',
    userAvatar: 'https://i.pravatar.cc/100?img=49',
    likes: 678,
    tags: ['power', 'dress'],
  },
  {
    id: '50',
    imageUrl:
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
    userName: 'LovelyDate',
    userAvatar: 'https://i.pravatar.cc/100?img=50',
    likes: 534,
    tags: ['date', 'lovely'],
  },
  {
    id: '51',
    imageUrl:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
    userName: 'ShoppingSpree',
    userAvatar: 'https://i.pravatar.cc/100?img=51',
    likes: 456,
    tags: ['shopping', 'spree'],
  },
  {
    id: '52',
    imageUrl:
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
    userName: 'FestivalQueen',
    userAvatar: 'https://i.pravatar.cc/100?img=52',
    likes: 623,
    tags: ['festival', 'queen'],
  },
  {
    id: '53',
    imageUrl:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    userName: 'ClassAct',
    userAvatar: 'https://i.pravatar.cc/100?img=53',
    likes: 712,
    tags: ['class', 'act'],
  },
  {
    id: '54',
    imageUrl:
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
    userName: 'BeachBabe',
    userAvatar: 'https://i.pravatar.cc/100?img=54',
    likes: 567,
    tags: ['beach', 'babe'],
  },
  {
    id: '55',
    imageUrl:
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400',
    userName: 'CitySlicker',
    userAvatar: 'https://i.pravatar.cc/100?img=55',
    likes: 489,
    tags: ['city', 'slick'],
  },
  {
    id: '56',
    imageUrl:
      'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400',
    userName: 'TimelessBeauty',
    userAvatar: 'https://i.pravatar.cc/100?img=56',
    likes: 834,
    tags: ['timeless', 'beauty'],
  },
  {
    id: '57',
    imageUrl: 'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=400',
    userName: 'ClubNights',
    userAvatar: 'https://i.pravatar.cc/100?img=57',
    likes: 456,
    tags: ['club', 'nights'],
  },
  {
    id: '58',
    imageUrl: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400',
    userName: 'AthleticEdge',
    userAvatar: 'https://i.pravatar.cc/100?img=58',
    likes: 523,
    tags: ['athletic', 'edge'],
  },
  {
    id: '59',
    imageUrl:
      'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400',
    userName: 'SoftGlow',
    userAvatar: 'https://i.pravatar.cc/100?img=59',
    likes: 612,
    tags: ['soft', 'glow'],
  },
  {
    id: '60',
    imageUrl:
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
    userName: 'StatementPiece',
    userAvatar: 'https://i.pravatar.cc/100?img=60',
    likes: 789,
    tags: ['statement', 'piece'],
  },
  {
    id: '61',
    imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
    userName: 'ComfortZone',
    userAvatar: 'https://i.pravatar.cc/100?img=61',
    likes: 378,
    tags: ['comfort', 'zone'],
  },
  {
    id: '62',
    imageUrl:
      'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400',
    userName: 'NeonDreams',
    userAvatar: 'https://i.pravatar.cc/100?img=62',
    likes: 645,
    tags: ['neon', '90s'],
  },
  {
    id: '63',
    imageUrl: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=400',
    userName: 'GreenStyle',
    userAvatar: 'https://i.pravatar.cc/100?img=63',
    likes: 489,
    tags: ['green', 'eco'],
  },
  {
    id: '64',
    imageUrl:
      'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=400',
    userName: 'JeanGenius',
    userAvatar: 'https://i.pravatar.cc/100?img=64',
    likes: 567,
    tags: ['jean', 'genius'],
  },
  {
    id: '65',
    imageUrl:
      'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=400',
    userName: 'AutumnVibes',
    userAvatar: 'https://i.pravatar.cc/100?img=65',
    likes: 512,
    tags: ['autumn', 'vibes'],
  },
  {
    id: '66',
    imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
    userName: 'AllBlackEverything',
    userAvatar: 'https://i.pravatar.cc/100?img=66',
    likes: 723,
    tags: ['allblack', 'sleek'],
  },
  {
    id: '67',
    imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
    userName: 'PatternPlay',
    userAvatar: 'https://i.pravatar.cc/100?img=67',
    likes: 456,
    tags: ['pattern', 'play'],
  },
  {
    id: '68',
    imageUrl:
      'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
    userName: 'CEOStyle',
    userAvatar: 'https://i.pravatar.cc/100?img=68',
    likes: 534,
    tags: ['ceo', 'boss'],
  },
  {
    id: '69',
    imageUrl:
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
    userName: 'SundayBest',
    userAvatar: 'https://i.pravatar.cc/100?img=69',
    likes: 623,
    tags: ['sunday', 'best'],
  },
  {
    id: '70',
    imageUrl:
      'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
    userName: 'FloralFancy',
    userAvatar: 'https://i.pravatar.cc/100?img=70',
    likes: 678,
    tags: ['floral', 'fancy'],
  },
  {
    id: '71',
    imageUrl:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    userName: 'JetSetter',
    userAvatar: 'https://i.pravatar.cc/100?img=71',
    likes: 834,
    tags: ['jet', 'setter'],
  },
  {
    id: '72',
    imageUrl:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
    userName: 'GlamSquad',
    userAvatar: 'https://i.pravatar.cc/100?img=72',
    likes: 912,
    tags: ['glam', 'squad'],
  },
];

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

export default function CommunityShowcaseScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState('all');

  // Scroll tracking for bottom nav hide/show
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  // Sync local scrollY with global nav scrollY for bottom nav hide/show
  useEffect(() => {
    const listenerId = scrollY.addListener(({value}) => {
      if ((global as any).__navScrollY) {
        (global as any).__navScrollY.setValue(value);
      }
    });
    return () => scrollY.removeListener(listenerId);
  }, [scrollY]);

  // Screen entrance animation
  const screenFade = useRef(new Animated.Value(0)).current;
  const screenTranslate = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenFade, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(screenTranslate, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    h('impactLight');
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const toggleLike = (postId: string) => {
    h('impactLight');
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const filters = ['all', 'trending', 'new', 'following'];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: moderateScale(tokens.spacing.md1),
      paddingTop: insets.top + 60,
      paddingBottom: moderateScale(tokens.spacing.sm),
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      // marginBottom: moderateScale(tokens.spacing.md),
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.pillDark1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: fontScale(tokens.fontSize['2xl']),
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      letterSpacing: -0.5,
      textTransform: 'uppercase',
    },
    headerSubtitle: {
      fontSize: fontScale(tokens.fontSize.sm),
      color: theme.colors.muted,
      marginTop: 2,
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.button1,
      paddingHorizontal: moderateScale(tokens.spacing.sm),
      paddingVertical: moderateScale(tokens.spacing.xxs),
      borderRadius: tokens.borderRadius.sm,
      gap: 6,
    },
    shareButtonText: {
      fontSize: 12,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.buttonText1,
    },
    filtersContainer: {
      paddingHorizontal: moderateScale(tokens.spacing.md1),
      marginBottom: moderateScale(tokens.spacing.md),
    },
    filtersScroll: {
      flexDirection: 'row',
      gap: 10,
    },
    filterPill: {
      paddingHorizontal: moderateScale(tokens.spacing.md),
      paddingVertical: moderateScale(tokens.spacing.xs),
      borderRadius: tokens.borderRadius.sm,
      // // backgroundColor: theme.colors.pillDark1,
      borderWidth: 1,
      borderColor: theme.colors.muted,
    },
    filterPillActive: {
      backgroundColor: theme.colors.button1,
      // borderColor: theme.colors.surfaceBorder,
    },
    filterText: {
      fontSize: 12,
      fontWeight: tokens.fontWeight.medium,
      color: theme.colors.muted,
      textTransform: 'capitalize',
    },
    filterTextActive: {
      color: theme.colors.buttonText1,
      fontWeight: tokens.fontWeight.semiBold,
    },
    gridContainer: {
      paddingHorizontal: moderateScale(tokens.spacing.md1),
      paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 20,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    card: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      marginBottom: moderateScale(tokens.spacing.nano),
      // borderRadius: tokens.borderRadius.sm,
      overflow: 'hidden',
      backgroundColor: theme.colors.pillDark1,
    },
    cardImage: {
      width: '100%',
      height: '100%',
    },
    cardOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'flex-end',
    },

    cardContent: {
      padding: 6,
    },

    cardUserRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    cardAvatar: {
      width: 30,
      height: 30,
      borderRadius: 50,
      marginRight: 8,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.8)',
    },
    cardUserName: {
      fontSize: fontScale(tokens.fontSize.sm),
      fontWeight: tokens.fontWeight.normal,
      color: '#fff',
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
      flex: 1,
      flexShrink: 1,
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardTags: {
      flexDirection: 'row',
      gap: 4,
      flexWrap: 'wrap',
      flex: 1,
    },
    cardTag: {
      fontSize: fontScale(tokens.fontSize.xs),
      color: 'rgba(255,255,255,0.85)',
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },
    likeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    likeCount: {
      fontSize: LIKE_COUNT_SIZE,
      fontWeight: tokens.fontWeight.normal,
      color: '#fff',
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.pillDark1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: moderateScale(tokens.spacing.md),
    },
    emptyTitle: {
      fontSize: fontScale(tokens.fontSize.lg),
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: fontScale(tokens.fontSize.sm),
      color: theme.colors.muted,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    ctaButton: {
      marginTop: moderateScale(tokens.spacing.lg),
      backgroundColor: theme.colors.button1,
      paddingHorizontal: moderateScale(tokens.spacing.lg),
      paddingVertical: moderateScale(tokens.spacing.sm),
      borderRadius: tokens.borderRadius.sm,
    },
    ctaText: {
      fontSize: fontScale(tokens.fontSize.sm),
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.buttonText1,
    },
  });

  const renderCard = (post: (typeof MOCK_POSTS)[0], index: number) => {
    const isLiked = likedPosts.has(post.id);

    return (
      <Animatable.View
        key={post.id}
        animation="fadeInUp"
        duration={500}
        delay={index * 80}
        useNativeDriver>
        <AppleTouchFeedback
          hapticStyle="impactLight"
          onPress={() => {
            h('impactLight');
            // TODO: Navigate to post detail
          }}
          style={styles.card}>
          <Image source={{uri: post.imageUrl}} style={styles.cardImage} />
          <View style={styles.cardOverlay}>
            <LinearGradient colors={['transparent', 'rgba(0, 0, 0, 1)']}>
              <View style={styles.cardContent}>
                <View style={styles.cardUserRow}>
                  <Image
                    source={{uri: post.userAvatar}}
                    style={styles.cardAvatar}
                  />
                  <Text style={styles.cardUserName}>@{post.userName}</Text>
                </View>
                <View style={styles.cardActions}>
                  <View style={styles.cardTags}>
                    {post.tags.slice(0, 2).map(tag => (
                      <Text key={tag} style={styles.cardTag}>
                        #{tag}
                      </Text>
                    ))}
                  </View>
                  <AppleTouchFeedback
                    hapticStyle="impactLight"
                    onPress={() => toggleLike(post.id)}
                    style={styles.likeButton}>
                    <MaterialIcons
                      name={isLiked ? 'favorite' : 'favorite-border'}
                      size={HEART_ICON_SIZE}
                      color={isLiked ? '#FF4D6D' : '#fff'}
                    />
                    <Text style={styles.likeCount}>
                      {isLiked ? post.likes + 1 : post.likes}
                    </Text>
                  </AppleTouchFeedback>
                </View>
              </View>
            </LinearGradient>
          </View>
        </AppleTouchFeedback>
      </Animatable.View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: screenFade,
          transform: [{translateY: screenTranslate}],
        },
      ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {/* <AppleTouchFeedback
            hapticStyle="impactLight"
            onPress={() => navigate('VideoFeedScreen')}
            style={styles.backButton}>
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={theme.colors.foreground}
            />
          </AppleTouchFeedback> */}

          <View style={{alignItems: 'left', flex: 1}}>
            <Text style={globalStyles.sectionTitle}>Community Share</Text>
            {/* <Text style={styles.headerSubtitle}>Discover shared looks</Text> */}
          </View>

          <AppleTouchFeedback
            hapticStyle="impactLight"
            onPress={() => {
              h('impactMedium');
              // TODO: Navigate to create post
            }}
            style={styles.shareButton}>
            <MaterialIcons
              name="add"
              size={18}
              color={theme.colors.buttonText1}
            />
            <Text style={styles.shareButtonText}>Share</Text>
          </AppleTouchFeedback>
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}>
          {filters.map(filter => (
            <AppleTouchFeedback
              key={filter}
              hapticStyle="selection"
              onPress={() => {
                h('selection');
                setActiveFilter(filter);
              }}
              style={[
                styles.filterPill,
                activeFilter === filter && styles.filterPillActive,
              ]}>
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.filterTextActive,
                ]}>
                {filter}
              </Text>
            </AppleTouchFeedback>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <Animated.ScrollView
        ref={scrollRef as any}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="normal"
        bounces={true}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: true},
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.foreground}
          />
        }
        contentContainerStyle={styles.gridContainer}>
        {MOCK_POSTS.length > 0 ? (
          <View style={styles.grid}>
            {MOCK_POSTS.map((post, index) => renderCard(post, index))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialIcons
                name="people-outline"
                size={40}
                color={theme.colors.muted}
              />
            </View>
            <Text style={styles.emptyTitle}>No looks yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to share your style with the community!
            </Text>
            <AppleTouchFeedback
              hapticStyle="impactMedium"
              onPress={() => {
                h('impactMedium');
                navigate('SavedOutfitsScreen');
              }}
              style={styles.ctaButton}>
              <Text style={styles.ctaText}>Share Your First Look</Text>
            </AppleTouchFeedback>
          </View>
        )}
      </Animated.ScrollView>

      {/* Scroll-to-top button */}
      <AppleTouchFeedback
        onPress={() => {
          scrollRef.current?.scrollTo({y: 0, animated: true});
          h('impactLight');
        }}
        style={{
          position: 'absolute',
          bottom: 100,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderColor: theme.colors.muted,
          borderWidth: tokens.borderWidth.md,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: {width: 0, height: 4},
        }}>
        <MaterialIcons name="keyboard-arrow-up" size={32} color="#fff" />
      </AppleTouchFeedback>
    </Animated.View>
  );
}

///////////////////

// import React, {useState, useRef, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   Image,
//   Dimensions,
//   Animated,
//   Easing,
//   RefreshControl,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// const {width: SCREEN_WIDTH} = Dimensions.get('window');
// const CARD_WIDTH = (SCREEN_WIDTH - 43) / 2;
// const CARD_HEIGHT = CARD_WIDTH * 1.4;

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // Layout constants
// const HEADER_HEIGHT = 80;
// const BOTTOM_NAV_HEIGHT = 90;

// // Mock data for the showcase
// const MOCK_POSTS = [
//   {
//     id: '1',
//     imageUrl:
//       'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=400',
//     userName: 'StyleQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=1',
//     likes: 234,
//     tags: ['casual', 'summer'],
//   },
//   {
//     id: '2',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'FashionForward',
//     userAvatar: 'https://i.pravatar.cc/100?img=2',
//     likes: 189,
//     tags: ['elegant', 'evening'],
//   },
//   {
//     id: '3',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'TrendSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=3',
//     likes: 421,
//     tags: ['streetwear', 'urban'],
//   },
//   {
//     id: '4',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'ChicVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=4',
//     likes: 156,
//     tags: ['minimal', 'clean'],
//   },
//   {
//     id: '5',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'LookBook',
//     userAvatar: 'https://i.pravatar.cc/100?img=5',
//     likes: 312,
//     tags: ['professional', 'smart'],
//   },
//   {
//     id: '6',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'OutfitDaily',
//     userAvatar: 'https://i.pravatar.cc/100?img=6',
//     likes: 278,
//     tags: ['boho', 'relaxed'],
//   },
//   {
//     id: '7',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'RunwayReady',
//     userAvatar: 'https://i.pravatar.cc/100?img=7',
//     likes: 567,
//     tags: ['runway', 'haute'],
//   },
//   {
//     id: '8',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'VintageVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=8',
//     likes: 445,
//     tags: ['vintage', 'retro'],
//   },
//   {
//     id: '9',
//     imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
//     userName: 'StreetStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=9',
//     likes: 623,
//     tags: ['street', 'edgy'],
//   },
//   {
//     id: '10',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'MinimalMood',
//     userAvatar: 'https://i.pravatar.cc/100?img=10',
//     likes: 389,
//     tags: ['minimal', 'neutral'],
//   },
//   {
//     id: '11',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'GlamGoals',
//     userAvatar: 'https://i.pravatar.cc/100?img=11',
//     likes: 712,
//     tags: ['glam', 'party'],
//   },
//   {
//     id: '12',
//     imageUrl:
//       'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
//     userName: 'CasualCool',
//     userAvatar: 'https://i.pravatar.cc/100?img=12',
//     likes: 298,
//     tags: ['casual', 'weekend'],
//   },
//   {
//     id: '13',
//     imageUrl:
//       'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=400',
//     userName: 'WorkWear',
//     userAvatar: 'https://i.pravatar.cc/100?img=13',
//     likes: 534,
//     tags: ['office', 'professional'],
//   },
//   {
//     id: '14',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'DateNight',
//     userAvatar: 'https://i.pravatar.cc/100?img=14',
//     likes: 467,
//     tags: ['date', 'romantic'],
//   },
//   {
//     id: '15',
//     imageUrl:
//       'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
//     userName: 'ShopTillDrop',
//     userAvatar: 'https://i.pravatar.cc/100?img=15',
//     likes: 389,
//     tags: ['shopping', 'haul'],
//   },
//   {
//     id: '16',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'BohoBeauty',
//     userAvatar: 'https://i.pravatar.cc/100?img=16',
//     likes: 512,
//     tags: ['boho', 'festival'],
//   },
//   {
//     id: '17',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'ElegantEdge',
//     userAvatar: 'https://i.pravatar.cc/100?img=17',
//     likes: 678,
//     tags: ['elegant', 'classy'],
//   },
//   {
//     id: '18',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'SummerStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=18',
//     likes: 445,
//     tags: ['summer', 'beach'],
//   },
//   {
//     id: '19',
//     imageUrl:
//       'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400',
//     userName: 'UrbanChic',
//     userAvatar: 'https://i.pravatar.cc/100?img=19',
//     likes: 523,
//     tags: ['urban', 'city'],
//   },
//   {
//     id: '20',
//     imageUrl:
//       'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400',
//     userName: 'ClassicLook',
//     userAvatar: 'https://i.pravatar.cc/100?img=20',
//     likes: 612,
//     tags: ['classic', 'timeless'],
//   },
//   {
//     id: '21',
//     imageUrl: 'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=400',
//     userName: 'NightOwl',
//     userAvatar: 'https://i.pravatar.cc/100?img=21',
//     likes: 398,
//     tags: ['night', 'club'],
//   },
//   {
//     id: '22',
//     imageUrl: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400',
//     userName: 'SportsLux',
//     userAvatar: 'https://i.pravatar.cc/100?img=22',
//     likes: 456,
//     tags: ['sporty', 'athleisure'],
//   },
//   {
//     id: '23',
//     imageUrl:
//       'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400',
//     userName: 'PastelDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=23',
//     likes: 567,
//     tags: ['pastel', 'soft'],
//   },
//   {
//     id: '24',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'BoldMoves',
//     userAvatar: 'https://i.pravatar.cc/100?img=24',
//     likes: 789,
//     tags: ['bold', 'statement'],
//   },
//   {
//     id: '25',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'CozyVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=25',
//     likes: 345,
//     tags: ['cozy', 'comfortable'],
//   },
//   {
//     id: '26',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400',
//     userName: 'RetroWave',
//     userAvatar: 'https://i.pravatar.cc/100?img=26',
//     likes: 678,
//     tags: ['retro', '80s'],
//   },
//   {
//     id: '27',
//     imageUrl: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=400',
//     userName: 'EcoFashion',
//     userAvatar: 'https://i.pravatar.cc/100?img=27',
//     likes: 423,
//     tags: ['sustainable', 'eco'],
//   },
//   {
//     id: '28',
//     imageUrl:
//       'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=400',
//     userName: 'DenimDays',
//     userAvatar: 'https://i.pravatar.cc/100?img=28',
//     likes: 534,
//     tags: ['denim', 'jeans'],
//   },
//   {
//     id: '29',
//     imageUrl:
//       'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=400',
//     userName: 'LayeredLooks',
//     userAvatar: 'https://i.pravatar.cc/100?img=29',
//     likes: 456,
//     tags: ['layers', 'fall'],
//   },
//   {
//     id: '30',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'MonoMagic',
//     userAvatar: 'https://i.pravatar.cc/100?img=30',
//     likes: 612,
//     tags: ['monochrome', 'black'],
//   },
//   {
//     id: '31',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'PrintPerfect',
//     userAvatar: 'https://i.pravatar.cc/100?img=31',
//     likes: 523,
//     tags: ['prints', 'patterns'],
//   },
//   {
//     id: '32',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'BusinessBoss',
//     userAvatar: 'https://i.pravatar.cc/100?img=32',
//     likes: 445,
//     tags: ['business', 'power'],
//   },
//   {
//     id: '33',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'WeekendWarrior',
//     userAvatar: 'https://i.pravatar.cc/100?img=33',
//     likes: 678,
//     tags: ['weekend', 'relaxed'],
//   },
//   {
//     id: '34',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'GardenParty',
//     userAvatar: 'https://i.pravatar.cc/100?img=34',
//     likes: 567,
//     tags: ['garden', 'floral'],
//   },
//   {
//     id: '35',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'TravelReady',
//     userAvatar: 'https://i.pravatar.cc/100?img=35',
//     likes: 789,
//     tags: ['travel', 'airport'],
//   },
//   {
//     id: '36',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'CocktailHour',
//     userAvatar: 'https://i.pravatar.cc/100?img=36',
//     likes: 834,
//     tags: ['cocktail', 'evening'],
//   },
// ];

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function CommunityShowcaseScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();

//   const [refreshing, setRefreshing] = useState(false);
//   const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
//   const [activeFilter, setActiveFilter] = useState('all');

//   // Scroll tracking for bottom nav hide/show
//   const scrollY = useRef(new Animated.Value(0)).current;
//   const scrollRef = useRef<ScrollView>(null);

//   // Sync local scrollY with global nav scrollY for bottom nav hide/show
//   useEffect(() => {
//     const listenerId = scrollY.addListener(({value}) => {
//       if ((global as any).__navScrollY) {
//         (global as any).__navScrollY.setValue(value);
//       }
//     });
//     return () => scrollY.removeListener(listenerId);
//   }, [scrollY]);

//   // Screen entrance animation
//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(30)).current;

//   useEffect(() => {
//     Animated.parallel([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 400,
//         easing: Easing.out(Easing.ease),
//         useNativeDriver: true,
//       }),
//       Animated.timing(screenTranslate, {
//         toValue: 0,
//         duration: 450,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }, []);

//   const onRefresh = async () => {
//     setRefreshing(true);
//     h('impactLight');
//     // Simulate refresh
//     await new Promise(resolve => setTimeout(resolve, 1000));
//     setRefreshing(false);
//   };

//   const toggleLike = (postId: string) => {
//     h('impactLight');
//     setLikedPosts(prev => {
//       const next = new Set(prev);
//       if (next.has(postId)) {
//         next.delete(postId);
//       } else {
//         next.add(postId);
//       }
//       return next;
//     });
//   };

//   const filters = ['all', 'trending', 'new', 'following'];

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       paddingHorizontal: moderateScale(tokens.spacing.md1),
//       paddingTop: insets.top + 60,
//       paddingBottom: moderateScale(tokens.spacing.sm),
//     },
//     headerTop: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       // marginBottom: moderateScale(tokens.spacing.md),
//     },
//     backButton: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     headerTitle: {
//       fontSize: fontScale(tokens.fontSize['2xl']),
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       letterSpacing: -0.5,
//       textTransform: 'uppercase',
//     },
//     headerSubtitle: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       color: theme.colors.muted,
//       marginTop: 2,
//     },
//     shareButton: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.button1,
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       borderRadius: tokens.borderRadius.sm,
//       gap: 6,
//     },
//     shareButtonText: {
//       fontSize: 12,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.buttonText1,
//     },
//     filtersContainer: {
//       paddingHorizontal: moderateScale(tokens.spacing.md1),
//       marginBottom: moderateScale(tokens.spacing.md),
//     },
//     filtersScroll: {
//       flexDirection: 'row',
//       gap: 10,
//     },
//     filterPill: {
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       paddingVertical: moderateScale(tokens.spacing.xs),
//       borderRadius: tokens.borderRadius.sm,
//       // // backgroundColor: theme.colors.pillDark1,
//       borderWidth: 1,
//       borderColor: theme.colors.muted,
//     },
//     filterPillActive: {
//       backgroundColor: theme.colors.button1,
//       // borderColor: theme.colors.surfaceBorder,
//     },
//     filterText: {
//       fontSize: 12,
//       fontWeight: tokens.fontWeight.medium,
//       color: theme.colors.muted,
//       textTransform: 'capitalize',
//     },
//     filterTextActive: {
//       color: theme.colors.buttonText1,
//       fontWeight: tokens.fontWeight.semiBold,
//     },
//     gridContainer: {
//       paddingHorizontal: moderateScale(tokens.spacing.md1),
//       paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 20,
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     card: {
//       width: CARD_WIDTH,
//       height: CARD_HEIGHT,
//       marginBottom: moderateScale(tokens.spacing.nano),
//       // borderRadius: tokens.borderRadius.sm,
//       overflow: 'hidden',
//       backgroundColor: theme.colors.pillDark1,
//     },
//     cardImage: {
//       width: '100%',
//       height: '100%',
//     },
//     cardOverlay: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'flex-end',
//       padding: 8,
//     },

//     cardUserRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginBottom: 8,
//     },
//     cardAvatar: {
//       width: 30,
//       height: 30,
//       borderRadius: 50,
//       marginRight: 8,
//       borderWidth: 1.5,
//       borderColor: 'rgba(255,255,255,0.8)',
//     },
//     cardUserName: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.normal,
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.5)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//       flex: 1,
//       flexShrink: 1,
//     },
//     cardActions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     cardTags: {
//       flexDirection: 'row',
//       gap: 4,
//       flexWrap: 'wrap',
//       flex: 1,
//     },
//     cardTag: {
//       fontSize: fontScale(tokens.fontSize.xxs),
//       color: 'rgba(255,255,255,0.85)',
//       backgroundColor: 'rgba(255,255,255,0.2)',
//       paddingHorizontal: 6,
//       paddingVertical: 2,
//       borderRadius: 4,
//       overflow: 'hidden',
//     },
//     likeButton: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 4,
//     },
//     likeCount: {
//       fontSize: fontScale(tokens.fontSize.xs),
//       fontWeight: tokens.fontWeight.normal,
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.5)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//     },
//     emptyState: {
//       flex: 1,
//       alignItems: 'center',
//       justifyContent: 'center',
//       paddingVertical: 60,
//     },
//     emptyIcon: {
//       width: 80,
//       height: 80,
//       borderRadius: 40,
//       backgroundColor: theme.colors.pillDark1,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: moderateScale(tokens.spacing.md),
//     },
//     emptyTitle: {
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 8,
//     },
//     emptySubtitle: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       color: theme.colors.muted,
//       textAlign: 'center',
//       paddingHorizontal: 40,
//     },
//     ctaButton: {
//       marginTop: moderateScale(tokens.spacing.lg),
//       backgroundColor: theme.colors.button1,
//       paddingHorizontal: moderateScale(tokens.spacing.lg),
//       paddingVertical: moderateScale(tokens.spacing.sm),
//       borderRadius: tokens.borderRadius.sm,
//     },
//     ctaText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.buttonText1,
//     },
//   });

//   const renderCard = (post: (typeof MOCK_POSTS)[0], index: number) => {
//     const isLiked = likedPosts.has(post.id);

//     return (
//       <Animatable.View
//         key={post.id}
//         animation="fadeInUp"
//         duration={500}
//         delay={index * 80}
//         useNativeDriver>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => {
//             h('impactLight');
//             // TODO: Navigate to post detail
//           }}
//           style={styles.card}>
//           <Image source={{uri: post.imageUrl}} style={styles.cardImage} />
//           <View style={styles.cardOverlay}>
//             <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']}>
//               <View style={styles.cardUserRow}>
//                 <Image
//                   source={{uri: post.userAvatar}}
//                   style={styles.cardAvatar}
//                 />
//                 <Text style={styles.cardUserName}>@{post.userName}</Text>
//               </View>
//               <View style={styles.cardActions}>
//                 <View style={styles.cardTags}>
//                   {post.tags.slice(0, 2).map(tag => (
//                     <Text key={tag} style={styles.cardTag}>
//                       #{tag}
//                     </Text>
//                   ))}
//                 </View>
//                 <AppleTouchFeedback
//                   hapticStyle="impactLight"
//                   onPress={() => toggleLike(post.id)}
//                   style={styles.likeButton}>
//                   <MaterialIcons
//                     name={isLiked ? 'favorite' : 'favorite-border'}
//                     size={18}
//                     color={isLiked ? '#FF4D6D' : '#fff'}
//                   />
//                   <Text style={styles.likeCount}>
//                     {isLiked ? post.likes + 1 : post.likes}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </LinearGradient>
//           </View>
//         </AppleTouchFeedback>
//       </Animatable.View>
//     );
//   };

//   return (
//     <Animated.View
//       style={[
//         styles.container,
//         {
//           opacity: screenFade,
//           transform: [{translateY: screenTranslate}],
//         },
//       ]}>
//       {/* Header */}
//       <View style={styles.header}>
//         <View style={styles.headerTop}>
//           {/* <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={() => navigate('VideoFeedScreen')}
//             style={styles.backButton}>
//             <MaterialIcons
//               name="arrow-back"
//               size={22}
//               color={theme.colors.foreground}
//             />
//           </AppleTouchFeedback> */}

//           <View style={{alignItems: 'left', flex: 1}}>
//             <Text style={globalStyles.sectionTitle}>Community Share</Text>
//             {/* <Text style={styles.headerSubtitle}>Discover shared looks</Text> */}
//           </View>

//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={() => {
//               h('impactMedium');
//               // TODO: Navigate to create post
//             }}
//             style={styles.shareButton}>
//             <MaterialIcons
//               name="add"
//               size={18}
//               color={theme.colors.buttonText1}
//             />
//             <Text style={styles.shareButtonText}>Share</Text>
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {/* Filter Pills */}
//       <View style={styles.filtersContainer}>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={styles.filtersScroll}>
//           {filters.map(filter => (
//             <AppleTouchFeedback
//               key={filter}
//               hapticStyle="selection"
//               onPress={() => {
//                 h('selection');
//                 setActiveFilter(filter);
//               }}
//               style={[
//                 styles.filterPill,
//                 activeFilter === filter && styles.filterPillActive,
//               ]}>
//               <Text
//                 style={[
//                   styles.filterText,
//                   activeFilter === filter && styles.filterTextActive,
//                 ]}>
//                 {filter}
//               </Text>
//             </AppleTouchFeedback>
//           ))}
//         </ScrollView>
//       </View>

//       {/* Content */}
//       <Animated.ScrollView
//         ref={scrollRef as any}
//         showsVerticalScrollIndicator={false}
//         scrollEventThrottle={16}
//         decelerationRate="normal"
//         bounces={true}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={onRefresh}
//             tintColor={theme.colors.foreground}
//           />
//         }
//         contentContainerStyle={styles.gridContainer}>
//         {MOCK_POSTS.length > 0 ? (
//           <View style={styles.grid}>
//             {MOCK_POSTS.map((post, index) => renderCard(post, index))}
//           </View>
//         ) : (
//           <View style={styles.emptyState}>
//             <View style={styles.emptyIcon}>
//               <MaterialIcons
//                 name="people-outline"
//                 size={40}
//                 color={theme.colors.muted}
//               />
//             </View>
//             <Text style={styles.emptyTitle}>No looks yet</Text>
//             <Text style={styles.emptySubtitle}>
//               Be the first to share your style with the community!
//             </Text>
//             <AppleTouchFeedback
//               hapticStyle="impactMedium"
//               onPress={() => {
//                 h('impactMedium');
//                 navigate('SavedOutfitsScreen');
//               }}
//               style={styles.ctaButton}>
//               <Text style={styles.ctaText}>Share Your First Look</Text>
//             </AppleTouchFeedback>
//           </View>
//         )}
//       </Animated.ScrollView>

//       {/* Scroll-to-top button */}
//       <AppleTouchFeedback
//         onPress={() => {
//           scrollRef.current?.scrollTo({y: 0, animated: true});
//           h('impactLight');
//         }}
//         style={{
//           position: 'absolute',
//           bottom: 100,
//           right: 20,
//           width: 48,
//           height: 48,
//           borderRadius: 24,
//           backgroundColor: 'rgba(0,0,0,0.6)',
//           borderColor: theme.colors.muted,
//           borderWidth: tokens.borderWidth.md,
//           alignItems: 'center',
//           justifyContent: 'center',
//           shadowColor: '#000',
//           shadowOpacity: 0.3,
//           shadowRadius: 8,
//           shadowOffset: {width: 0, height: 4},
//         }}>
//         <MaterialIcons name="keyboard-arrow-up" size={32} color="#fff" />
//       </AppleTouchFeedback>
//     </Animated.View>
//   );
// }

////////////////

// import React, {useState, useRef, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   Image,
//   Dimensions,
//   Animated,
//   Easing,
//   RefreshControl,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// const {width: SCREEN_WIDTH} = Dimensions.get('window');
// const CARD_WIDTH = (SCREEN_WIDTH - 43) / 2;
// const CARD_HEIGHT = CARD_WIDTH * 1.4;

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // Layout constants
// const HEADER_HEIGHT = 80;
// const BOTTOM_NAV_HEIGHT = 90;

// // Mock data for the showcase
// const MOCK_POSTS = [
//   {
//     id: '1',
//     imageUrl:
//       'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=400',
//     userName: 'StyleQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=1',
//     likes: 234,
//     tags: ['casual', 'summer'],
//   },
//   {
//     id: '2',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'FashionForward',
//     userAvatar: 'https://i.pravatar.cc/100?img=2',
//     likes: 189,
//     tags: ['elegant', 'evening'],
//   },
//   {
//     id: '3',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'TrendSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=3',
//     likes: 421,
//     tags: ['streetwear', 'urban'],
//   },
//   {
//     id: '4',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'ChicVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=4',
//     likes: 156,
//     tags: ['minimal', 'clean'],
//   },
//   {
//     id: '5',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'LookBook',
//     userAvatar: 'https://i.pravatar.cc/100?img=5',
//     likes: 312,
//     tags: ['professional', 'smart'],
//   },
//   {
//     id: '6',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'OutfitDaily',
//     userAvatar: 'https://i.pravatar.cc/100?img=6',
//     likes: 278,
//     tags: ['boho', 'relaxed'],
//   },
//   {
//     id: '7',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'RunwayReady',
//     userAvatar: 'https://i.pravatar.cc/100?img=7',
//     likes: 567,
//     tags: ['runway', 'haute'],
//   },
//   {
//     id: '8',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'VintageVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=8',
//     likes: 445,
//     tags: ['vintage', 'retro'],
//   },
//   {
//     id: '9',
//     imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
//     userName: 'StreetStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=9',
//     likes: 623,
//     tags: ['street', 'edgy'],
//   },
//   {
//     id: '10',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'MinimalMood',
//     userAvatar: 'https://i.pravatar.cc/100?img=10',
//     likes: 389,
//     tags: ['minimal', 'neutral'],
//   },
//   {
//     id: '11',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'GlamGoals',
//     userAvatar: 'https://i.pravatar.cc/100?img=11',
//     likes: 712,
//     tags: ['glam', 'party'],
//   },
//   {
//     id: '12',
//     imageUrl:
//       'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
//     userName: 'CasualCool',
//     userAvatar: 'https://i.pravatar.cc/100?img=12',
//     likes: 298,
//     tags: ['casual', 'weekend'],
//   },
//   {
//     id: '13',
//     imageUrl:
//       'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=400',
//     userName: 'WorkWear',
//     userAvatar: 'https://i.pravatar.cc/100?img=13',
//     likes: 534,
//     tags: ['office', 'professional'],
//   },
//   {
//     id: '14',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'DateNight',
//     userAvatar: 'https://i.pravatar.cc/100?img=14',
//     likes: 467,
//     tags: ['date', 'romantic'],
//   },
//   {
//     id: '15',
//     imageUrl:
//       'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
//     userName: 'ShopTillDrop',
//     userAvatar: 'https://i.pravatar.cc/100?img=15',
//     likes: 389,
//     tags: ['shopping', 'haul'],
//   },
//   {
//     id: '16',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'BohoBeauty',
//     userAvatar: 'https://i.pravatar.cc/100?img=16',
//     likes: 512,
//     tags: ['boho', 'festival'],
//   },
//   {
//     id: '17',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'ElegantEdge',
//     userAvatar: 'https://i.pravatar.cc/100?img=17',
//     likes: 678,
//     tags: ['elegant', 'classy'],
//   },
//   {
//     id: '18',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'SummerStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=18',
//     likes: 445,
//     tags: ['summer', 'beach'],
//   },
// ];

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function CommunityShowcaseScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const insets = useSafeAreaInsets();

//   const [refreshing, setRefreshing] = useState(false);
//   const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
//   const [activeFilter, setActiveFilter] = useState('all');

//   // Scroll tracking for bottom nav hide/show
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Sync local scrollY with global nav scrollY for bottom nav hide/show
//   useEffect(() => {
//     const listenerId = scrollY.addListener(({value}) => {
//       if ((global as any).__navScrollY) {
//         (global as any).__navScrollY.setValue(value);
//       }
//     });
//     return () => scrollY.removeListener(listenerId);
//   }, [scrollY]);

//   // Screen entrance animation
//   const screenFade = useRef(new Animated.Value(0)).current;
//   const screenTranslate = useRef(new Animated.Value(30)).current;

//   useEffect(() => {
//     Animated.parallel([
//       Animated.timing(screenFade, {
//         toValue: 1,
//         duration: 400,
//         easing: Easing.out(Easing.ease),
//         useNativeDriver: true,
//       }),
//       Animated.timing(screenTranslate, {
//         toValue: 0,
//         duration: 450,
//         easing: Easing.out(Easing.exp),
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }, []);

//   const onRefresh = async () => {
//     setRefreshing(true);
//     h('impactLight');
//     // Simulate refresh
//     await new Promise(resolve => setTimeout(resolve, 1000));
//     setRefreshing(false);
//   };

//   const toggleLike = (postId: string) => {
//     h('impactLight');
//     setLikedPosts(prev => {
//       const next = new Set(prev);
//       if (next.has(postId)) {
//         next.delete(postId);
//       } else {
//         next.add(postId);
//       }
//       return next;
//     });
//   };

//   const filters = ['all', 'trending', 'new', 'following'];

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       paddingHorizontal: moderateScale(tokens.spacing.md1),
//       paddingTop: insets.top + 60,
//       paddingBottom: moderateScale(tokens.spacing.sm),
//     },
//     headerTop: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: moderateScale(tokens.spacing.md),
//     },
//     backButton: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     headerTitle: {
//       fontSize: fontScale(tokens.fontSize['2xl']),
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       letterSpacing: -0.5,
//     },
//     headerSubtitle: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       color: theme.colors.muted,
//       marginTop: 2,
//     },
//     shareButton: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.button1,
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xs),
//       borderRadius: tokens.borderRadius.sm,
//       gap: 6,
//     },
//     shareButtonText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.buttonText1,
//     },
//     filtersContainer: {
//       paddingHorizontal: moderateScale(tokens.spacing.md1),
//       marginBottom: moderateScale(tokens.spacing.md),
//     },
//     filtersScroll: {
//       flexDirection: 'row',
//       gap: 10,
//     },
//     filterPill: {
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       paddingVertical: moderateScale(tokens.spacing.xs),
//       borderRadius: tokens.borderRadius.sm,
//       // // backgroundColor: theme.colors.pillDark1,
//       borderWidth: 1,
//       borderColor: theme.colors.muted,
//     },
//     filterPillActive: {
//       backgroundColor: theme.colors.button1,
//       // borderColor: theme.colors.surfaceBorder,
//     },
//     filterText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.medium,
//       color: theme.colors.muted,
//       textTransform: 'capitalize',
//     },
//     filterTextActive: {
//       color: theme.colors.buttonText1,
//       fontWeight: tokens.fontWeight.semiBold,
//     },
//     gridContainer: {
//       paddingHorizontal: moderateScale(tokens.spacing.md1),
//       paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 20,
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     card: {
//       width: CARD_WIDTH,
//       height: CARD_HEIGHT,
//       marginBottom: moderateScale(tokens.spacing.nano),
//       // borderRadius: tokens.borderRadius.sm,
//       overflow: 'hidden',
//       backgroundColor: theme.colors.pillDark1,
//     },
//     cardImage: {
//       width: '100%',
//       height: '100%',
//     },
//     cardOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-end',
//       padding: 8,
//     },

//     cardUserRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginBottom: 8,
//     },
//     cardAvatar: {
//       width: 30,
//       height: 30,
//       borderRadius: 50,
//       marginRight: 8,
//       borderWidth: 1.5,
//       borderColor: 'rgba(255,255,255,0.8)',
//     },
//     cardUserName: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.5)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//       flex: 1,
//       flexShrink: 1,
//     },
//     cardActions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     cardTags: {
//       flexDirection: 'row',
//       gap: 4,
//       flexWrap: 'wrap',
//       flex: 1,
//     },
//     cardTag: {
//       fontSize: fontScale(tokens.fontSize.xxs),
//       color: 'rgba(255,255,255,0.85)',
//       backgroundColor: 'rgba(255,255,255,0.2)',
//       paddingHorizontal: 6,
//       paddingVertical: 2,
//       borderRadius: 4,
//       overflow: 'hidden',
//     },
//     likeButton: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 4,
//     },
//     likeCount: {
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.5)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//     },
//     emptyState: {
//       flex: 1,
//       alignItems: 'center',
//       justifyContent: 'center',
//       paddingVertical: 60,
//     },
//     emptyIcon: {
//       width: 80,
//       height: 80,
//       borderRadius: 40,
//       backgroundColor: theme.colors.pillDark1,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: moderateScale(tokens.spacing.md),
//     },
//     emptyTitle: {
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 8,
//     },
//     emptySubtitle: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       color: theme.colors.muted,
//       textAlign: 'center',
//       paddingHorizontal: 40,
//     },
//     ctaButton: {
//       marginTop: moderateScale(tokens.spacing.lg),
//       backgroundColor: theme.colors.button1,
//       paddingHorizontal: moderateScale(tokens.spacing.lg),
//       paddingVertical: moderateScale(tokens.spacing.sm),
//       borderRadius: tokens.borderRadius.sm,
//     },
//     ctaText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.buttonText1,
//     },
//   });

//   const renderCard = (post: (typeof MOCK_POSTS)[0], index: number) => {
//     const isLiked = likedPosts.has(post.id);

//     return (
//       <Animatable.View
//         key={post.id}
//         animation="fadeInUp"
//         duration={500}
//         delay={index * 80}
//         useNativeDriver>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => {
//             h('impactLight');
//             // TODO: Navigate to post detail
//           }}
//           style={styles.card}>
//           <Image source={{uri: post.imageUrl}} style={styles.cardImage} />
//           <View style={styles.cardOverlay}>
//             <LinearGradient
//               colors={['transparent', 'rgba(0,0,0,0.7)']}
//               style={styles.cardGradient}>
//               <View style={styles.cardUserRow}>
//                 <Image
//                   source={{uri: post.userAvatar}}
//                   style={styles.cardAvatar}
//                 />
//                 <Text style={styles.cardUserName}>@{post.userName}</Text>
//               </View>
//               <View style={styles.cardActions}>
//                 <View style={styles.cardTags}>
//                   {post.tags.slice(0, 2).map(tag => (
//                     <Text key={tag} style={styles.cardTag}>
//                       #{tag}
//                     </Text>
//                   ))}
//                 </View>
//                 <AppleTouchFeedback
//                   hapticStyle="impactLight"
//                   onPress={() => toggleLike(post.id)}
//                   style={styles.likeButton}>
//                   <MaterialIcons
//                     name={isLiked ? 'favorite' : 'favorite-border'}
//                     size={18}
//                     color={isLiked ? '#FF4D6D' : '#fff'}
//                   />
//                   <Text style={styles.likeCount}>
//                     {isLiked ? post.likes + 1 : post.likes}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </LinearGradient>
//           </View>
//         </AppleTouchFeedback>
//       </Animatable.View>
//     );
//   };

//   return (
//     <Animated.View
//       style={[
//         styles.container,
//         {
//           opacity: screenFade,
//           transform: [{translateY: screenTranslate}],
//         },
//       ]}>
//       {/* Header */}
//       <View style={styles.header}>
//         <View style={styles.headerTop}>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={() => navigate('VideoFeedScreen')}
//             style={styles.backButton}>
//             <MaterialIcons
//               name="arrow-back"
//               size={22}
//               color={theme.colors.foreground}
//             />
//           </AppleTouchFeedback>

//           <View style={{alignItems: 'center', flex: 1}}>
//             <Text style={styles.headerTitle}>Community</Text>
//             <Text style={styles.headerSubtitle}>Discover shared looks</Text>
//           </View>

//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={() => {
//               h('impactMedium');
//               // TODO: Navigate to create post
//             }}
//             style={styles.shareButton}>
//             <MaterialIcons
//               name="add"
//               size={18}
//               color={theme.colors.buttonText1}
//             />
//             <Text style={styles.shareButtonText}>Share</Text>
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {/* Filter Pills */}
//       <View style={styles.filtersContainer}>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={styles.filtersScroll}>
//           {filters.map(filter => (
//             <AppleTouchFeedback
//               key={filter}
//               hapticStyle="selection"
//               onPress={() => {
//                 h('selection');
//                 setActiveFilter(filter);
//               }}
//               style={[
//                 styles.filterPill,
//                 activeFilter === filter && styles.filterPillActive,
//               ]}>
//               <Text
//                 style={[
//                   styles.filterText,
//                   activeFilter === filter && styles.filterTextActive,
//                 ]}>
//                 {filter}
//               </Text>
//             </AppleTouchFeedback>
//           ))}
//         </ScrollView>
//       </View>

//       {/* Content */}
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         scrollEventThrottle={16}
//         decelerationRate="normal"
//         bounces={true}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={onRefresh}
//             tintColor={theme.colors.foreground}
//           />
//         }
//         contentContainerStyle={styles.gridContainer}>
//         {MOCK_POSTS.length > 0 ? (
//           <View style={styles.grid}>
//             {MOCK_POSTS.map((post, index) => renderCard(post, index))}
//           </View>
//         ) : (
//           <View style={styles.emptyState}>
//             <View style={styles.emptyIcon}>
//               <MaterialIcons
//                 name="people-outline"
//                 size={40}
//                 color={theme.colors.muted}
//               />
//             </View>
//             <Text style={styles.emptyTitle}>No looks yet</Text>
//             <Text style={styles.emptySubtitle}>
//               Be the first to share your style with the community!
//             </Text>
//             <AppleTouchFeedback
//               hapticStyle="impactMedium"
//               onPress={() => {
//                 h('impactMedium');
//                 navigate('SavedOutfitsScreen');
//               }}
//               style={styles.ctaButton}>
//               <Text style={styles.ctaText}>Share Your First Look</Text>
//             </AppleTouchFeedback>
//           </View>
//         )}
//       </Animated.ScrollView>
//     </Animated.View>
//   );
// }
