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
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
const CARD_WIDTH = (SCREEN_WIDTH - 51) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

type Props = {
  navigate: (screen: string, params?: any) => void;
};

// Layout constants
const HEADER_HEIGHT = 80;
const BOTTOM_NAV_HEIGHT = 90;
const HEART_ICON_SIZE = 22;
const LIKE_COUNT_SIZE = 12;

// Demo outfit posts with top/bottom/shoes/accessory images (2x2 grid)
const DEMO_OUTFIT_POSTS = [
  {
    id: 'outfit-1',
    top: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400',
    bottom:
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400',
    shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    accessory:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    userName: 'StyleQueen',
    userAvatar: 'https://i.pravatar.cc/100?img=1',
    likes: 234,
    tags: ['casual', 'summer'],
  },
  {
    id: 'outfit-2',
    top: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
    bottom:
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400',
    shoes: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400',
    accessory:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    userName: 'FashionForward',
    userAvatar: 'https://i.pravatar.cc/100?img=2',
    likes: 189,
    tags: ['elegant', 'evening'],
  },
  {
    id: 'outfit-3',
    top: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
    bottom: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
    shoes: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400',
    accessory:
      'https://images.unsplash.com/photo-1509941943102-10c232fc06e0?w=400',
    userName: 'TrendSetter',
    userAvatar: 'https://i.pravatar.cc/100?img=3',
    likes: 421,
    tags: ['streetwear', 'urban'],
  },
  {
    id: 'outfit-4',
    top: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    bottom:
      'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400',
    shoes: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400',
    accessory:
      'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=400',
    userName: 'ChicVibes',
    userAvatar: 'https://i.pravatar.cc/100?img=4',
    likes: 156,
    tags: ['minimal', 'clean'],
  },
  {
    id: 'outfit-5',
    top: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
    bottom:
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
    shoes: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
    accessory:
      'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400',
    userName: 'LookBook',
    userAvatar: 'https://i.pravatar.cc/100?img=5',
    likes: 312,
    tags: ['professional', 'smart'],
  },
  {
    id: 'outfit-6',
    top: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400',
    bottom: 'https://images.unsplash.com/photo-1548883354-94bcfe321cbb?w=400',
    shoes: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400',
    accessory:
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400',
    userName: 'OutfitDaily',
    userAvatar: 'https://i.pravatar.cc/100?img=6',
    likes: 278,
    tags: ['boho', 'relaxed'],
  },
];

// Mock data for the showcase (legacy single-image posts)
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

const h = (
  type:
    | 'selection'
    | 'impactLight'
    | 'impactMedium'
    | 'impactHeavy'
    | 'notificationSuccess'
    | 'notificationWarning'
    | 'notificationError',
) =>
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchAnim = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  // Animated search toggle
  const toggleSearch = () => {
    if (showSearch) {
      // Close search
      Animated.timing(searchAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }).start(() => {
        setShowSearch(false);
        setSearchQuery('');
      });
    } else {
      // Open search - slower, sleek slide
      setShowSearch(true);
      Animated.timing(searchAnim, {
        toValue: 1,
        duration: 750,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      }).start(() => {
        searchInputRef.current?.focus();
      });
    }
    h('selection');
  };

  // Follow state
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

  // Saved/Bookmarked posts state
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

  // Blocked/Muted users state
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());

  // Comments state (with likes and replies support)
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [comments, setComments] = useState<
    Record<
      string,
      Array<{
        id: string;
        user: string;
        avatar: string;
        text: string;
        timestamp: Date;
        likes: number;
        likedByMe: boolean;
        replyTo?: string;
        replyToUser?: string;
      }>
    >
  >({});
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    user: string;
  } | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  // Actions modal state (Pinterest-style)
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [activeActionsPost, setActiveActionsPost] = useState<
    (typeof DEMO_OUTFIT_POSTS)[0] | null
  >(null);

  const toggleFollow = (userName: string) => {
    h('impactLight');
    setFollowedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userName)) {
        next.delete(userName);
      } else {
        next.add(userName);
      }
      return next;
    });
  };

  const openComments = (postId: string) => {
    h('selection');
    setActivePostId(postId);
    setCommentsModalVisible(true);
  };

  const openActionsModal = (post: (typeof DEMO_OUTFIT_POSTS)[0]) => {
    h('selection');
    setActiveActionsPost(post);
    setActionsModalVisible(true);
  };

  const addComment = () => {
    if (!newComment.trim() || !activePostId) return;
    h('impactLight');
    const comment = {
      id: Date.now().toString(),
      user: 'You',
      avatar: 'https://i.pravatar.cc/100?img=99',
      text: replyingTo
        ? `@${replyingTo.user} ${newComment.trim()}`
        : newComment.trim(),
      timestamp: new Date(),
      likes: 0,
      likedByMe: false,
      replyTo: replyingTo?.id,
      replyToUser: replyingTo?.user,
    };
    setComments(prev => ({
      ...prev,
      [activePostId]: [...(prev[activePostId] || []), comment],
    }));
    setNewComment('');
    setReplyingTo(null);
  };

  // Delete own comment
  const deleteComment = (postId: string, commentId: string) => {
    h('impactMedium');
    setComments(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).filter(c => c.id !== commentId),
    }));
  };

  // Toggle save/bookmark post
  const toggleSavePost = (postId: string) => {
    h('impactLight');
    setSavedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  // Block user
  const blockUser = (userName: string) => {
    h('impactMedium');
    setBlockedUsers(prev => {
      const next = new Set(prev);
      next.add(userName);
      return next;
    });
    setActionsModalVisible(false);
  };

  // Mute user
  const muteUser = (userName: string) => {
    h('impactLight');
    setMutedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userName)) {
        next.delete(userName);
      } else {
        next.add(userName);
      }
      return next;
    });
  };

  // Like a comment
  const toggleLikeComment = (postId: string, commentId: string) => {
    h('impactLight');
    setLikedComments(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
    setComments(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).map(c =>
        c.id === commentId
          ? {
              ...c,
              likes: c.likedByMe ? c.likes - 1 : c.likes + 1,
              likedByMe: !c.likedByMe,
            }
          : c,
      ),
    }));
  };

  // Reply to a comment
  const startReply = (commentId: string, userName: string) => {
    h('selection');
    setReplyingTo({id: commentId, user: userName});
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Handle tag tap - opens search with that tag
  const handleTagTap = (tag: string) => {
    h('selection');
    setSearchQuery(tag);
    if (!showSearch) {
      setShowSearch(true);
      Animated.timing(searchAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      }).start(() => {
        searchInputRef.current?.focus();
      });
    }
  };

  // Filter posts based on search
  const filteredPosts = DEMO_OUTFIT_POSTS.filter(
    post =>
      post.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

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

  // Auto-cycle through user share images with fade transition timed with text animation
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setCurrentImageIndex(prev => (prev + 1) % MOCK_POSTS.length);
        // Fade in (timing: 200ms delay + 1200ms animation = 1400ms total, coincides with text fadeInUp)
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }).start();
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [fadeAnim]);

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
      borderWidth: 1,
      borderColor: theme.colors.muted,
    },
    filterPillActive: {
      backgroundColor: theme.colors.button1,
    },
    filterText: {
      fontSize: 12,
      fontWeight: tokens.fontWeight.medium,
      color: theme.colors.foreground,
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
      marginBottom: moderateScale(tokens.spacing.sm),
      borderRadius: tokens.borderRadius.md,
      // borderColor: theme.colors.muted,
      // borderWidth: tokens.borderWidth.hairline,
      overflow: 'hidden',
      backgroundColor: theme.colors.muted,
    },
    cardImage: {
      width: '100%',
      height: '100%',
    },
    cardOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 78,
      borderBottomLeftRadius: tokens.borderRadius.md,
      borderBottomRightRadius: tokens.borderRadius.md,
      overflow: 'hidden',
    },
    cardOverlayContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 78,
    },
    cardGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderBottomLeftRadius: tokens.borderRadius.md,
      borderBottomRightRadius: tokens.borderRadius.md,
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
      width: 35,
      height: 35,
      borderRadius: 50,
      marginRight: 8,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.8)',
    },
    cardUserName: {
      fontSize: fontScale(tokens.fontSize.sm),
      fontWeight: tokens.fontWeight.normal,
      color: theme.colors.buttonText1,
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
    bookmarkButton: {
      padding: 2,
      marginLeft: 6,
    },
    likeCount: {
      fontSize: LIKE_COUNT_SIZE,
      fontWeight: tokens.fontWeight.normal,
      color: theme.colors.buttonText1,
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
    // Search styles
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      marginHorizontal: moderateScale(tokens.spacing.md1),
      marginBottom: moderateScale(tokens.spacing.sm),
      height: 42,
    },
    searchInput: {
      flex: 1,
      fontSize: fontScale(tokens.fontSize.sm),
      color: theme.colors.foreground,
      marginLeft: 10,
      paddingVertical: 0,
    },
    searchIcon: {
      padding: 4,
    },
    // Follow button styles
    followButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: theme.colors.button1,
      marginLeft: 6,
    },
    followButtonFollowing: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.buttonText1,
    },
    followButtonText: {
      fontSize: 10,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.buttonText1,
    },
    // Comments modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    commentsModal: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '70%',
      paddingTop: 12,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.muted,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 12,
    },
    commentsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.surface,
    },
    commentsTitle: {
      fontSize: fontScale(tokens.fontSize.lg),
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
    },
    commentsList: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    commentItem: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    commentAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 10,
    },
    commentContent: {
      flex: 1,
    },
    commentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 4,
    },
    commentUser: {
      fontSize: fontScale(tokens.fontSize.sm),
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
    },
    commentReplyIndicator: {
      fontSize: fontScale(tokens.fontSize.xs),
      color: theme.colors.muted,
    },
    commentText: {
      fontSize: fontScale(tokens.fontSize.sm),
      color: theme.colors.foreground,
      marginTop: 2,
    },
    commentActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      gap: 16,
    },
    commentTime: {
      fontSize: fontScale(tokens.fontSize.xs),
      color: theme.colors.muted,
    },
    commentActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    commentActionText: {
      fontSize: fontScale(tokens.fontSize.xs),
      color: theme.colors.muted,
    },
    replyingToContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.muted,
    },
    replyingToText: {
      fontSize: fontScale(tokens.fontSize.xs),
      color: theme.colors.foreground,
    },
    commentInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.surface,
      paddingBottom: insets.bottom + 12,
    },
    commentInput: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: fontScale(tokens.fontSize.sm),
      color: theme.colors.foreground,
      marginRight: 10,
    },
    sendCommentButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.button1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noComments: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    noCommentsText: {
      fontSize: fontScale(tokens.fontSize.sm),
      color: theme.colors.muted,
      marginTop: 8,
    },
    // More button style
    moreButton: {
      padding: 4,
      marginLeft: 6,
    },
    // Actions modal styles
    actionsModal: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingBottom: insets.bottom + 20,
    },
    actionsUserRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.surface,
    },
    actionsAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: 12,
    },
    actionsUserInfo: {
      flex: 1,
    },
    actionsUserName: {
      fontSize: fontScale(tokens.fontSize.base),
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
    },
    actionsUserHandle: {
      fontSize: fontScale(tokens.fontSize.sm),
      color: theme.colors.muted,
      marginTop: 2,
    },
    actionsList: {
      paddingTop: 8,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    actionText: {
      fontSize: fontScale(tokens.fontSize.base),
      color: theme.colors.foreground,
      flex: 1,
    },
    actionChevron: {
      opacity: 0.4,
    },
  });

  // Render outfit composite card (2x2 grid: top/bottom/shoes/accessory)
  const renderOutfitCard = (
    post: (typeof DEMO_OUTFIT_POSTS)[0],
    index: number,
  ) => {
    const isLiked = likedPosts.has(post.id);
    const cellSize = CARD_WIDTH / 2;

    return (
      <Animatable.View
        key={post.id}
        animation="fadeInUp"
        duration={500}
        delay={index * 80}
        useNativeDriver>
        <AppleTouchFeedback
          hapticStyle="none"
          onPress={() => {
            // TODO: Navigate to post detail
          }}
          style={styles.card}>
          {/* 2x2 Grid Composite */}
          <View style={styles.cardImage}>
            {/* Row 1 */}
            <View style={{flexDirection: 'row', height: cellSize}}>
              {/* Top */}
              <View
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: theme.colors.background,
                }}>
                {post.top ? (
                  <Image
                    source={{uri: post.top}}
                    style={{width: '100%', height: '100%'}}
                    resizeMode="cover"
                  />
                ) : null}
              </View>
              {/* Bottom */}
              <View
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: theme.colors.background,
                }}>
                {post.bottom ? (
                  <Image
                    source={{uri: post.bottom}}
                    style={{width: '100%', height: '100%'}}
                    resizeMode="cover"
                  />
                ) : null}
              </View>
            </View>
            {/* Row 2 */}
            <View style={{flexDirection: 'row', height: cellSize}}>
              {/* Shoes */}
              <View
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: theme.colors.background,
                }}>
                {post.shoes ? (
                  <Image
                    source={{uri: post.shoes}}
                    style={{width: '100%', height: '100%'}}
                    resizeMode="cover"
                  />
                ) : null}
              </View>
              {/* Accessory */}
              <View
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: theme.colors.background,
                }}>
                {post.accessory ? (
                  <Image
                    source={{uri: post.accessory}}
                    style={{width: '100%', height: '100%'}}
                    resizeMode="cover"
                  />
                ) : null}
              </View>
            </View>
          </View>
          <View style={styles.cardOverlayContainer}>
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
              style={styles.cardGradient}
            />
            <View style={styles.cardContent}>
              <View style={styles.cardUserRow}>
                <Image
                  source={{uri: post.userAvatar}}
                  style={styles.cardAvatar}
                />
                <Text style={styles.cardUserName} numberOfLines={1}>
                  @{post.userName}
                </Text>
              </View>
              <View style={styles.cardActions}>
                <View style={styles.cardTags}>
                  {post.tags.slice(0, 1).map(tag => (
                    <Pressable
                      key={tag}
                      onPress={() => handleTagTap(tag)}
                      hitSlop={8}>
                      <Text style={styles.cardTag}>#{tag}</Text>
                    </Pressable>
                  ))}
                </View>
                <AppleTouchFeedback
                  hapticStyle="none"
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
                <AppleTouchFeedback
                  hapticStyle="selection"
                  onPress={() => openActionsModal(post)}
                  style={styles.moreButton}>
                  <MaterialIcons name="more-horiz" size={18} color="#fff" />
                </AppleTouchFeedback>
              </View>
            </View>
          </View>
        </AppleTouchFeedback>
      </Animatable.View>
    );
  };

  // Render single-image card (legacy)
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
          hapticStyle="none"
          onPress={() => {
            // TODO: Navigate to post detail
          }}
          style={styles.card}>
          <Image source={{uri: post.imageUrl}} style={styles.cardImage} />
          <View style={styles.cardOverlayContainer}>
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.06)', 'rgba(0, 0, 0, 0.76)']}
              style={styles.cardGradient}
            />
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
                  {post.tags.slice(0, 1).map(tag => (
                    <Pressable
                      key={tag}
                      onPress={() => handleTagTap(tag)}
                      hitSlop={8}>
                      <Text style={styles.cardTag}>#{tag}</Text>
                    </Pressable>
                  ))}
                </View>
                <AppleTouchFeedback
                  hapticStyle="none"
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
          <View style={{alignItems: 'flex-start', flex: 1}}>
            <Text style={globalStyles.sectionTitle}>Community Share</Text>
          </View>
          <Pressable onPress={toggleSearch} style={styles.searchIcon}>
            <MaterialIcons
              name={showSearch ? 'close' : 'search'}
              size={24}
              color={theme.colors.foreground}
            />
          </Pressable>
        </View>
      </View>

      {/* Animated Search Bar - Slides open from right */}
      {showSearch && (
        <Animated.View
          style={[
            styles.searchContainer,
            {
              opacity: searchAnim.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [0, 1, 1],
              }),
              transform: [
                {
                  translateX: searchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [150, 0],
                  }),
                },
              ],
            },
          ]}>
          <MaterialIcons name="search" size={20} color={theme.colors.muted} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search users or tags..."
            placeholderTextColor={theme.colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={12}>
              <MaterialIcons
                name="close"
                size={18}
                color={theme.colors.muted}
              />
            </Pressable>
          )}
        </Animated.View>
      )}

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
        <View
          style={{
            width: '100%',
            height: 300,
            overflow: 'hidden',
            marginBottom: 14,
          }}>
          <Animated.Image
            key={`image-${currentImageIndex}`}
            source={{uri: MOCK_POSTS[currentImageIndex].imageUrl}}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: tokens.borderRadius.lg,
              opacity: fadeAnim,
            }}
            resizeMode="cover"
          />

          {/* Light tinted overlay for better text visibility */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              borderRadius: tokens.borderRadius.lg,
            }}
          />

          <Animatable.View
            key={`text-${currentImageIndex}`}
            animation="fadeInUp"
            duration={1200}
            delay={200}
            useNativeDriver
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: moderateScale(tokens.spacing.md),
              paddingBottom: moderateScale(tokens.spacing.lg),
            }}>
            <Text
              style={{
                fontSize: fontScale(tokens.fontSize['3xl']),
                fontWeight: tokens.fontWeight.bold,
                color: '#ffffff',
                marginBottom: moderateScale(tokens.spacing.sm),
                textShadowColor: 'rgba(0, 0, 0, 0.5)',
                textShadowOffset: {width: 0, height: 2},
                textShadowRadius: 4,
              }}>
              @{MOCK_POSTS[currentImageIndex].userName}
            </Text>
            <Text
              style={{
                fontSize: fontScale(tokens.fontSize.md),
                fontWeight: tokens.fontWeight.medium,
                color: 'rgba(255, 255, 255, 1)',
                lineHeight: 18,
                textShadowColor: 'rgba(0, 0, 0, 0.4)',
                textShadowOffset: {width: 0, height: 1},
                textShadowRadius: 3,
              }}>
              #{MOCK_POSTS[currentImageIndex].tags.join(' #')} •{' '}
              {MOCK_POSTS[currentImageIndex].likes} likes
            </Text>
          </Animatable.View>
        </View>

        {filteredPosts.length > 0 || MOCK_POSTS.length > 0 ? (
          <View style={styles.grid}>
            {/* Render outfit composite cards (2x2 grid) */}
            {filteredPosts.map((post, index) => renderOutfitCard(post, index))}
            {/* Render legacy single-image cards */}
            {!searchQuery &&
              MOCK_POSTS.map((post, index) =>
                renderCard(post, filteredPosts.length + index),
              )}
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
        }}
        style={{
          position: 'absolute',
          bottom: 100,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: theme.colors.background,
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

      {/* Comments Modal */}
      <Modal
        visible={commentsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentsModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCommentsModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.commentsModal}>
            <Pressable onPress={e => e.stopPropagation()}>
              <View style={styles.modalHandle} />
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Comments</Text>
                <Pressable onPress={() => setCommentsModalVisible(false)}>
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={theme.colors.foreground}
                  />
                </Pressable>
              </View>
              <FlatList
                data={activePostId ? comments[activePostId] || [] : []}
                keyExtractor={item => item.id}
                style={{maxHeight: 300}}
                contentContainerStyle={styles.commentsList}
                ListEmptyComponent={
                  <View style={styles.noComments}>
                    <MaterialIcons
                      name="chat-bubble-outline"
                      size={40}
                      color={theme.colors.muted}
                    />
                    <Text style={styles.noCommentsText}>
                      No comments yet. Be the first!
                    </Text>
                  </View>
                }
                renderItem={({item}) => (
                  <View style={styles.commentItem}>
                    <Image
                      source={{uri: item.avatar}}
                      style={styles.commentAvatar}
                    />
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentUser}>{item.user}</Text>
                        {item.replyToUser && (
                          <Text style={styles.commentReplyIndicator}>
                            replied to @{item.replyToUser}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.commentText}>{item.text}</Text>
                      <View style={styles.commentActions}>
                        <Text style={styles.commentTime}>
                          {item.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        <Pressable
                          style={styles.commentActionButton}
                          onPress={() =>
                            activePostId &&
                            toggleLikeComment(activePostId, item.id)
                          }>
                          <MaterialIcons
                            name={
                              item.likedByMe ? 'favorite' : 'favorite-border'
                            }
                            size={14}
                            color={
                              item.likedByMe ? '#FF4D6D' : theme.colors.muted
                            }
                          />
                          {item.likes > 0 && (
                            <Text
                              style={[
                                styles.commentActionText,
                                item.likedByMe && {color: '#FF4D6D'},
                              ]}>
                              {item.likes}
                            </Text>
                          )}
                        </Pressable>
                        <Pressable
                          style={styles.commentActionButton}
                          onPress={() => startReply(item.id, item.user)}>
                          <MaterialIcons
                            name="reply"
                            size={14}
                            color={theme.colors.muted}
                          />
                          <Text style={styles.commentActionText}>Reply</Text>
                        </Pressable>
                        {item.user === 'You' && (
                          <Pressable
                            style={styles.commentActionButton}
                            onPress={() =>
                              activePostId && deleteComment(activePostId, item.id)
                            }>
                            <MaterialIcons
                              name="delete-outline"
                              size={14}
                              color={theme.colors.muted}
                            />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>
                )}
              />
              {/* Reply indicator */}
              {replyingTo && (
                <View style={styles.replyingToContainer}>
                  <Text style={styles.replyingToText}>
                    Replying to @{replyingTo.user}
                  </Text>
                  <Pressable onPress={cancelReply}>
                    <MaterialIcons
                      name="close"
                      size={16}
                      color={theme.colors.muted}
                    />
                  </Pressable>
                </View>
              )}
              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder={
                    replyingTo
                      ? `Reply to @${replyingTo.user}...`
                      : 'Add a comment...'
                  }
                  placeholderTextColor={theme.colors.muted}
                  value={newComment}
                  onChangeText={setNewComment}
                />
                <Pressable
                  style={[
                    styles.sendCommentButton,
                    !newComment.trim() && {opacity: 0.5},
                  ]}
                  onPress={addComment}
                  disabled={!newComment.trim()}>
                  <MaterialIcons
                    name="send"
                    size={18}
                    color={theme.colors.buttonText1}
                  />
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Actions Modal (Pinterest-style) */}
      <Modal
        visible={actionsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActionsModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActionsModalVisible(false)}>
          <View style={styles.actionsModal}>
            <Pressable onPress={e => e.stopPropagation()}>
              <View style={styles.modalHandle} />

              {activeActionsPost && (
                <>
                  {/* User info row */}
                  <View style={styles.actionsUserRow}>
                    <Image
                      source={{uri: activeActionsPost.userAvatar}}
                      style={styles.actionsAvatar}
                    />
                    <View style={styles.actionsUserInfo}>
                      <Text style={styles.actionsUserName}>
                        {activeActionsPost.userName}
                      </Text>
                      <Text style={styles.actionsUserHandle}>
                        @{activeActionsPost.userName.toLowerCase()}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        toggleFollow(activeActionsPost.userName);
                      }}
                      style={[
                        styles.followButton,
                        followedUsers.has(activeActionsPost.userName) &&
                          styles.followButtonFollowing,
                        {
                          marginLeft: 0,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                        },
                      ]}>
                      <Text style={styles.followButtonText}>
                        {followedUsers.has(activeActionsPost.userName)
                          ? 'Following'
                          : 'Follow'}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Actions list */}
                  <View style={styles.actionsList}>
                    {/* Send Message */}
                    <Pressable
                      style={styles.actionItem}
                      onPress={() => {
                        setActionsModalVisible(false);
                        navigate('ChatScreen', {
                          recipientId: activeActionsPost.id,
                          recipientName: activeActionsPost.userName,
                          recipientAvatar: activeActionsPost.userAvatar,
                        });
                      }}>
                      <View style={styles.actionIcon}>
                        <MaterialIcons
                          name="send"
                          size={20}
                          color={theme.colors.foreground}
                        />
                      </View>
                      <Text style={styles.actionText}>Send Message</Text>
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color={theme.colors.muted}
                        style={styles.actionChevron}
                      />
                    </Pressable>

                    {/* View Comments */}
                    <Pressable
                      style={styles.actionItem}
                      onPress={() => {
                        setActionsModalVisible(false);
                        setTimeout(
                          () => openComments(activeActionsPost.id),
                          300,
                        );
                      }}>
                      <View style={styles.actionIcon}>
                        <MaterialIcons
                          name="chat-bubble-outline"
                          size={20}
                          color={theme.colors.foreground}
                        />
                      </View>
                      <Text style={styles.actionText}>
                        Comments{' '}
                        {(comments[activeActionsPost.id] || []).length > 0 &&
                          `(${(comments[activeActionsPost.id] || []).length})`}
                      </Text>
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color={theme.colors.muted}
                        style={styles.actionChevron}
                      />
                    </Pressable>

                    {/* Share */}
                    <Pressable
                      style={styles.actionItem}
                      onPress={() => {
                        h('selection');
                      }}>
                      <View style={styles.actionIcon}>
                        <MaterialIcons
                          name="share"
                          size={20}
                          color={theme.colors.foreground}
                        />
                      </View>
                      <Text style={styles.actionText}>Share</Text>
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color={theme.colors.muted}
                        style={styles.actionChevron}
                      />
                    </Pressable>

                    {/* Save/Bookmark */}
                    <Pressable
                      style={styles.actionItem}
                      onPress={() => {
                        toggleSavePost(activeActionsPost.id);
                        setActionsModalVisible(false);
                      }}>
                      <View style={styles.actionIcon}>
                        <MaterialIcons
                          name={
                            savedPosts.has(activeActionsPost.id)
                              ? 'bookmark'
                              : 'bookmark-border'
                          }
                          size={20}
                          color={
                            savedPosts.has(activeActionsPost.id)
                              ? '#FFD700'
                              : theme.colors.foreground
                          }
                        />
                      </View>
                      <Text style={styles.actionText}>
                        {savedPosts.has(activeActionsPost.id)
                          ? 'Unsave'
                          : 'Save'}
                      </Text>
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color={theme.colors.muted}
                        style={styles.actionChevron}
                      />
                    </Pressable>

                    {/* Mute User */}
                    <Pressable
                      style={styles.actionItem}
                      onPress={() => {
                        muteUser(activeActionsPost.userName);
                        setActionsModalVisible(false);
                      }}>
                      <View style={styles.actionIcon}>
                        <MaterialIcons
                          name={
                            mutedUsers.has(activeActionsPost.userName)
                              ? 'volume-up'
                              : 'volume-off'
                          }
                          size={20}
                          color={theme.colors.foreground}
                        />
                      </View>
                      <Text style={styles.actionText}>
                        {mutedUsers.has(activeActionsPost.userName)
                          ? 'Unmute'
                          : 'Mute'}{' '}
                        @{activeActionsPost.userName}
                      </Text>
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color={theme.colors.muted}
                        style={styles.actionChevron}
                      />
                    </Pressable>

                    {/* Block User */}
                    <Pressable
                      style={styles.actionItem}
                      onPress={() => {
                        blockUser(activeActionsPost.userName);
                      }}>
                      <View
                        style={[
                          styles.actionIcon,
                          {backgroundColor: 'rgba(255,77,109,0.1)'},
                        ]}>
                        <MaterialIcons name="block" size={20} color="#FF4D6D" />
                      </View>
                      <Text style={[styles.actionText, {color: '#FF4D6D'}]}>
                        Block @{activeActionsPost.userName}
                      </Text>
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color="#FF4D6D"
                        style={[styles.actionChevron, {opacity: 0.6}]}
                      />
                    </Pressable>

                    {/* Report */}
                    <Pressable
                      style={styles.actionItem}
                      onPress={() => {
                        h('selection');
                      }}>
                      <View
                        style={[
                          styles.actionIcon,
                          {backgroundColor: 'rgba(255,77,109,0.1)'},
                        ]}>
                        <MaterialIcons name="flag" size={20} color="#FF4D6D" />
                      </View>
                      <Text style={[styles.actionText, {color: '#FF4D6D'}]}>
                        Report
                      </Text>
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color="#FF4D6D"
                        style={[styles.actionChevron, {opacity: 0.6}]}
                      />
                    </Pressable>
                  </View>
                </>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

///////////////

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
// const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;
// const CARD_HEIGHT = CARD_WIDTH * 1.4;

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // Layout constants
// const HEADER_HEIGHT = 80;
// const BOTTOM_NAV_HEIGHT = 90;
// const HEART_ICON_SIZE = 22;
// const LIKE_COUNT_SIZE = 12;

// // Demo outfit posts with top/bottom/shoes/accessory images (2x2 grid)
// const DEMO_OUTFIT_POSTS = [
//   {
//     id: 'outfit-1',
//     top: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400',
//     shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
//     userName: 'StyleQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=1',
//     likes: 234,
//     tags: ['casual', 'summer'],
//   },
//   {
//     id: 'outfit-2',
//     top: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400',
//     shoes: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
//     userName: 'FashionForward',
//     userAvatar: 'https://i.pravatar.cc/100?img=2',
//     likes: 189,
//     tags: ['elegant', 'evening'],
//   },
//   {
//     id: 'outfit-3',
//     top: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
//     bottom: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
//     shoes: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1509941943102-10c232fc06e0?w=400',
//     userName: 'TrendSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=3',
//     likes: 421,
//     tags: ['streetwear', 'urban'],
//   },
//   {
//     id: 'outfit-4',
//     top: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400',
//     shoes: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=400',
//     userName: 'ChicVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=4',
//     likes: 156,
//     tags: ['minimal', 'clean'],
//   },
//   {
//     id: 'outfit-5',
//     top: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
//     shoes: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400',
//     userName: 'LookBook',
//     userAvatar: 'https://i.pravatar.cc/100?img=5',
//     likes: 312,
//     tags: ['professional', 'smart'],
//   },
//   {
//     id: 'outfit-6',
//     top: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400',
//     bottom: 'https://images.unsplash.com/photo-1548883354-94bcfe321cbb?w=400',
//     shoes: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400',
//     userName: 'OutfitDaily',
//     userAvatar: 'https://i.pravatar.cc/100?img=6',
//     likes: 278,
//     tags: ['boho', 'relaxed'],
//   },
// ];

// // Mock data for the showcase (legacy single-image posts)
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
//   {
//     id: '37',
//     imageUrl:
//       'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=400',
//     userName: 'MidnightGlam',
//     userAvatar: 'https://i.pravatar.cc/100?img=37',
//     likes: 456,
//     tags: ['night', 'glam'],
//   },
//   {
//     id: '38',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'SilkDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=38',
//     likes: 523,
//     tags: ['silk', 'luxury'],
//   },
//   {
//     id: '39',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StreetKing',
//     userAvatar: 'https://i.pravatar.cc/100?img=39',
//     likes: 678,
//     tags: ['street', 'urban'],
//   },
//   {
//     id: '40',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'PureElegance',
//     userAvatar: 'https://i.pravatar.cc/100?img=40',
//     likes: 712,
//     tags: ['elegant', 'pure'],
//   },
//   {
//     id: '41',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CorporateChic',
//     userAvatar: 'https://i.pravatar.cc/100?img=41',
//     likes: 389,
//     tags: ['corporate', 'chic'],
//   },
//   {
//     id: '42',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FreeSpiritStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=42',
//     likes: 567,
//     tags: ['free', 'spirit'],
//   },
//   {
//     id: '43',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'HighFashion',
//     userAvatar: 'https://i.pravatar.cc/100?img=43',
//     likes: 834,
//     tags: ['high', 'fashion'],
//   },
//   {
//     id: '44',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'RetroQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=44',
//     likes: 445,
//     tags: ['retro', 'queen'],
//   },
//   {
//     id: '45',
//     imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
//     userName: 'EdgeLord',
//     userAvatar: 'https://i.pravatar.cc/100?img=45',
//     likes: 623,
//     tags: ['edge', 'dark'],
//   },
//   {
//     id: '46',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'NeutralTones',
//     userAvatar: 'https://i.pravatar.cc/100?img=46',
//     likes: 512,
//     tags: ['neutral', 'tones'],
//   },
//   {
//     id: '47',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'PartyPrincess',
//     userAvatar: 'https://i.pravatar.cc/100?img=47',
//     likes: 789,
//     tags: ['party', 'princess'],
//   },
//   {
//     id: '48',
//     imageUrl:
//       'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
//     userName: 'LazyDays',
//     userAvatar: 'https://i.pravatar.cc/100?img=48',
//     likes: 345,
//     tags: ['lazy', 'chill'],
//   },
//   {
//     id: '49',
//     imageUrl:
//       'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=400',
//     userName: 'PowerDress',
//     userAvatar: 'https://i.pravatar.cc/100?img=49',
//     likes: 678,
//     tags: ['power', 'dress'],
//   },
//   {
//     id: '50',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'LovelyDate',
//     userAvatar: 'https://i.pravatar.cc/100?img=50',
//     likes: 534,
//     tags: ['date', 'lovely'],
//   },
//   {
//     id: '51',
//     imageUrl:
//       'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
//     userName: 'ShoppingSpree',
//     userAvatar: 'https://i.pravatar.cc/100?img=51',
//     likes: 456,
//     tags: ['shopping', 'spree'],
//   },
//   {
//     id: '52',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FestivalQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=52',
//     likes: 623,
//     tags: ['festival', 'queen'],
//   },
//   {
//     id: '53',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'ClassAct',
//     userAvatar: 'https://i.pravatar.cc/100?img=53',
//     likes: 712,
//     tags: ['class', 'act'],
//   },
//   {
//     id: '54',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'BeachBabe',
//     userAvatar: 'https://i.pravatar.cc/100?img=54',
//     likes: 567,
//     tags: ['beach', 'babe'],
//   },
//   {
//     id: '55',
//     imageUrl:
//       'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400',
//     userName: 'CitySlicker',
//     userAvatar: 'https://i.pravatar.cc/100?img=55',
//     likes: 489,
//     tags: ['city', 'slick'],
//   },
//   {
//     id: '56',
//     imageUrl:
//       'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400',
//     userName: 'TimelessBeauty',
//     userAvatar: 'https://i.pravatar.cc/100?img=56',
//     likes: 834,
//     tags: ['timeless', 'beauty'],
//   },
//   {
//     id: '57',
//     imageUrl: 'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=400',
//     userName: 'ClubNights',
//     userAvatar: 'https://i.pravatar.cc/100?img=57',
//     likes: 456,
//     tags: ['club', 'nights'],
//   },
//   {
//     id: '58',
//     imageUrl: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400',
//     userName: 'AthleticEdge',
//     userAvatar: 'https://i.pravatar.cc/100?img=58',
//     likes: 523,
//     tags: ['athletic', 'edge'],
//   },
//   {
//     id: '59',
//     imageUrl:
//       'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400',
//     userName: 'SoftGlow',
//     userAvatar: 'https://i.pravatar.cc/100?img=59',
//     likes: 612,
//     tags: ['soft', 'glow'],
//   },
//   {
//     id: '60',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StatementPiece',
//     userAvatar: 'https://i.pravatar.cc/100?img=60',
//     likes: 789,
//     tags: ['statement', 'piece'],
//   },
//   {
//     id: '61',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'ComfortZone',
//     userAvatar: 'https://i.pravatar.cc/100?img=61',
//     likes: 378,
//     tags: ['comfort', 'zone'],
//   },
//   {
//     id: '62',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400',
//     userName: 'NeonDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=62',
//     likes: 645,
//     tags: ['neon', '90s'],
//   },
//   {
//     id: '63',
//     imageUrl: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=400',
//     userName: 'GreenStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=63',
//     likes: 489,
//     tags: ['green', 'eco'],
//   },
//   {
//     id: '64',
//     imageUrl:
//       'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=400',
//     userName: 'JeanGenius',
//     userAvatar: 'https://i.pravatar.cc/100?img=64',
//     likes: 567,
//     tags: ['jean', 'genius'],
//   },
//   {
//     id: '65',
//     imageUrl:
//       'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=400',
//     userName: 'AutumnVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=65',
//     likes: 512,
//     tags: ['autumn', 'vibes'],
//   },
//   {
//     id: '66',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'AllBlackEverything',
//     userAvatar: 'https://i.pravatar.cc/100?img=66',
//     likes: 723,
//     tags: ['allblack', 'sleek'],
//   },
//   {
//     id: '67',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'PatternPlay',
//     userAvatar: 'https://i.pravatar.cc/100?img=67',
//     likes: 456,
//     tags: ['pattern', 'play'],
//   },
//   {
//     id: '68',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CEOStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=68',
//     likes: 534,
//     tags: ['ceo', 'boss'],
//   },
//   {
//     id: '69',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'SundayBest',
//     userAvatar: 'https://i.pravatar.cc/100?img=69',
//     likes: 623,
//     tags: ['sunday', 'best'],
//   },
//   {
//     id: '70',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'FloralFancy',
//     userAvatar: 'https://i.pravatar.cc/100?img=70',
//     likes: 678,
//     tags: ['floral', 'fancy'],
//   },
//   {
//     id: '71',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'JetSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=71',
//     likes: 834,
//     tags: ['jet', 'setter'],
//   },
//   {
//     id: '72',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'GlamSquad',
//     userAvatar: 'https://i.pravatar.cc/100?img=72',
//     likes: 912,
//     tags: ['glam', 'squad'],
//   },
// ];

// const h = (
//   type:
//     | 'selection'
//     | 'impactLight'
//     | 'impactMedium'
//     | 'impactHeavy'
//     | 'notificationSuccess'
//     | 'notificationWarning'
//     | 'notificationError',
// ) =>
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
//   const [currentImageIndex, setCurrentImageIndex] = useState(0);
//   const fadeAnim = useRef(new Animated.Value(1)).current;

//   // const fashionImages = [
//   //   require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
//   //   require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
//   //   require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
//   //   require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
//   //   require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
//   //   require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
//   //   require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
//   //   require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
//   //   require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
//   //   require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
//   //   require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
//   //   require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
//   //   require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
//   //   require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
//   //   require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
//   //   require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
//   //   require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
//   //   require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
//   //   require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
//   //   require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
//   // ];

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

//   // Auto-cycle through user share images with fade transition timed with text animation
//   useEffect(() => {
//     const interval = setInterval(() => {
//       // Fade out
//       Animated.timing(fadeAnim, {
//         toValue: 0,
//         duration: 800,
//         useNativeDriver: true,
//       }).start(() => {
//         setCurrentImageIndex(prev => (prev + 1) % MOCK_POSTS.length);
//         // Fade in (timing: 200ms delay + 1200ms animation = 1400ms total, coincides with text fadeInUp)
//         Animated.timing(fadeAnim, {
//           toValue: 1,
//           duration: 1200,
//           useNativeDriver: true,
//         }).start();
//       });
//     }, 8000);
//     return () => clearInterval(interval);
//   }, [fadeAnim]);

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
//       color: theme.colors.buttonText1,
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
//       marginBottom: moderateScale(tokens.spacing.md),
//       borderRadius: tokens.borderRadius.md,
//       // borderColor: theme.colors.muted,
//       // borderWidth: tokens.borderWidth.hairline,
//       overflow: 'hidden',
//       backgroundColor: theme.colors.muted,
//     },
//     cardImage: {
//       width: '100%',
//       height: '100%',
//     },
//     cardOverlay: {
//       position: 'absolute',
//       left: 0,
//       right: 0,
//       bottom: 0,
//       height: 78,
//       borderBottomLeftRadius: tokens.borderRadius.md,
//       borderBottomRightRadius: tokens.borderRadius.md,
//       overflow: 'hidden',
//     },
//     cardOverlayContainer: {
//       position: 'absolute',
//       left: 0,
//       right: 0,
//       bottom: 0,
//       height: 78,
//     },
//     cardGradient: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       borderBottomLeftRadius: tokens.borderRadius.md,
//       borderBottomRightRadius: tokens.borderRadius.md,
//     },

//     cardContent: {
//       padding: 6,
//     },

//     cardUserRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginBottom: 8,
//     },
//     cardAvatar: {
//       width: 35,
//       height: 35,
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
//       fontSize: fontScale(tokens.fontSize.xs),
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
//       fontSize: LIKE_COUNT_SIZE,
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

//   // Render outfit composite card (2x2 grid: top/bottom/shoes/accessory)
//   const renderOutfitCard = (
//     post: (typeof DEMO_OUTFIT_POSTS)[0],
//     index: number,
//   ) => {
//     const isLiked = likedPosts.has(post.id);
//     const cellSize = CARD_WIDTH / 2;

//     return (
//       <Animatable.View
//         key={post.id}
//         animation="fadeInUp"
//         duration={500}
//         delay={index * 80}
//         useNativeDriver>
//         <AppleTouchFeedback
//           hapticStyle="none"
//           onPress={() => {
//             // TODO: Navigate to post detail
//           }}
//           style={styles.card}>
//           {/* 2x2 Grid Composite */}
//           <View style={styles.cardImage}>
//             {/* Row 1 */}
//             <View style={{flexDirection: 'row', height: cellSize}}>
//               {/* Top */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.top ? (
//                   <Image
//                     source={{uri: post.top}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//               {/* Bottom */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.bottom ? (
//                   <Image
//                     source={{uri: post.bottom}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//             </View>
//             {/* Row 2 */}
//             <View style={{flexDirection: 'row', height: cellSize}}>
//               {/* Shoes */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.shoes ? (
//                   <Image
//                     source={{uri: post.shoes}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//               {/* Accessory */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.accessory ? (
//                   <Image
//                     source={{uri: post.accessory}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//             </View>
//           </View>
//           <View style={styles.cardOverlayContainer}>
//             <LinearGradient
//               colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
//               style={styles.cardGradient}
//             />
//             <View style={styles.cardContent}>
//               <View style={styles.cardUserRow}>
//                 <Image
//                   source={{uri: post.userAvatar}}
//                   style={styles.cardAvatar}
//                 />
//                 <Text style={styles.cardUserName}>@{post.userName}</Text>
//               </View>
//               <View style={styles.cardActions}>
//                 <View style={styles.cardTags}>
//                   {post.tags.slice(0, 1).map(tag => (
//                     <Text key={tag} style={styles.cardTag}>
//                       #{tag}
//                     </Text>
//                   ))}
//                 </View>
//                 <AppleTouchFeedback
//                   hapticStyle="none"
//                   onPress={() => toggleLike(post.id)}
//                   style={styles.likeButton}>
//                   <MaterialIcons
//                     name={isLiked ? 'favorite' : 'favorite-border'}
//                     size={HEART_ICON_SIZE}
//                     color={isLiked ? '#FF4D6D' : '#fff'}
//                   />
//                   <Text style={styles.likeCount}>
//                     {isLiked ? post.likes + 1 : post.likes}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
//           </View>
//         </AppleTouchFeedback>
//       </Animatable.View>
//     );
//   };

//   // Render single-image card (legacy)
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
//           hapticStyle="none"
//           onPress={() => {
//             // TODO: Navigate to post detail
//           }}
//           style={styles.card}>
//           <Image source={{uri: post.imageUrl}} style={styles.cardImage} />
//           <View style={styles.cardOverlayContainer}>
//             <LinearGradient
//               colors={['rgba(0, 0, 0, 0.06)', 'rgba(0, 0, 0, 0.76)']}
//               style={styles.cardGradient}
//             />
//             <View style={styles.cardContent}>
//               <View style={styles.cardUserRow}>
//                 <Image
//                   source={{uri: post.userAvatar}}
//                   style={styles.cardAvatar}
//                 />
//                 <Text style={styles.cardUserName}>@{post.userName}</Text>
//               </View>
//               <View style={styles.cardActions}>
//                 <View style={styles.cardTags}>
//                   {post.tags.slice(0, 1).map(tag => (
//                     <Text key={tag} style={styles.cardTag}>
//                       #{tag}
//                     </Text>
//                   ))}
//                 </View>
//                 <AppleTouchFeedback
//                   hapticStyle="none"
//                   onPress={() => toggleLike(post.id)}
//                   style={styles.likeButton}>
//                   <MaterialIcons
//                     name={isLiked ? 'favorite' : 'favorite-border'}
//                     size={HEART_ICON_SIZE}
//                     color={isLiked ? '#FF4D6D' : '#fff'}
//                   />
//                   <Text style={styles.likeCount}>
//                     {isLiked ? post.likes + 1 : post.likes}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
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
//           <View style={{alignItems: 'left', flex: 1}}>
//             <Text style={globalStyles.sectionTitle}>Community Share</Text>
//           </View>
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
//         <View
//           style={{
//             width: '100%',
//             height: 300,
//             overflow: 'hidden',
//             marginBottom: 14,
//           }}>
//           <Animated.Image
//             key={`image-${currentImageIndex}`}
//             source={{uri: MOCK_POSTS[currentImageIndex].imageUrl}}
//             style={{
//               width: '100%',
//               height: '100%',
//               borderRadius: tokens.borderRadius.lg,
//               // borderColor: theme.colors.muted,
//               // borderWidth: tokens.borderWidth.hairline,
//               opacity: fadeAnim,
//             }}
//             resizeMode="cover"
//           />

//           {/* Light tinted overlay for better text visibility */}
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'rgba(0, 0, 0, 0.15)',
//               borderRadius: tokens.borderRadius.lg,
//             }}
//           />

//           {/* TOP PICKS label */}
//           {/* <View
//             style={{
//               position: 'absolute',
//               top: moderateScale(tokens.spacing.md),
//               left: moderateScale(tokens.spacing.md),
//             }}>
//             <Text
//               style={{
//                 fontSize: fontScale(tokens.fontSize['2xl']),
//                 fontWeight: tokens.fontWeight.extraBold,
//                 color: '#ffffff',
//                 letterSpacing: 1,
//                 textTransform: 'uppercase',
//               }}>
//               TOP PICKS
//             </Text>
//           </View> */}

//           <Animatable.View
//             key={`text-${currentImageIndex}`}
//             animation="fadeInUp"
//             duration={1200}
//             delay={200}
//             useNativeDriver
//             style={{
//               position: 'absolute',
//               bottom: 0,
//               left: 0,
//               right: 0,
//               paddingHorizontal: moderateScale(tokens.spacing.md),
//               paddingBottom: moderateScale(tokens.spacing.lg),
//             }}>
//             <Text
//               style={{
//                 fontSize: fontScale(tokens.fontSize['3xl']),
//                 fontWeight: tokens.fontWeight.bold,
//                 color: '#ffffff',

//                 marginBottom: moderateScale(tokens.spacing.sm),
//                 textShadowColor: 'rgba(0, 0, 0, 0.5)',
//                 textShadowOffset: {width: 0, height: 2},
//                 textShadowRadius: 4,
//               }}>
//               @{MOCK_POSTS[currentImageIndex].userName}
//             </Text>
//             <Text
//               style={{
//                 fontSize: fontScale(tokens.fontSize.md),
//                 fontWeight: tokens.fontWeight.medium,
//                 color: 'rgba(255, 255, 255, 1)',
//                 lineHeight: 18,
//                 textShadowColor: 'rgba(0, 0, 0, 0.4)',
//                 textShadowOffset: {width: 0, height: 1},
//                 textShadowRadius: 3,
//               }}>
//               #{MOCK_POSTS[currentImageIndex].tags.join(' #')} •{' '}
//               {MOCK_POSTS[currentImageIndex].likes} likes
//             </Text>
//           </Animatable.View>
//         </View>
//         {DEMO_OUTFIT_POSTS.length > 0 || MOCK_POSTS.length > 0 ? (
//           <View style={styles.grid}>
//             {/* Render outfit composite cards (2x2 grid) */}
//             {DEMO_OUTFIT_POSTS.map((post, index) =>
//               renderOutfitCard(post, index),
//             )}
//             {/* Render legacy single-image cards */}
//             {MOCK_POSTS.map((post, index) =>
//               renderCard(post, DEMO_OUTFIT_POSTS.length + index),
//             )}
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

//////////////////

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
// const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;
// const CARD_HEIGHT = CARD_WIDTH * 1.4;

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // Layout constants
// const HEADER_HEIGHT = 80;
// const BOTTOM_NAV_HEIGHT = 90;
// const HEART_ICON_SIZE = 22;
// const LIKE_COUNT_SIZE = 12;

// // Demo outfit posts with top/bottom/shoes/accessory images (2x2 grid)
// const DEMO_OUTFIT_POSTS = [
//   {
//     id: 'outfit-1',
//     top: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400',
//     shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
//     userName: 'StyleQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=1',
//     likes: 234,
//     tags: ['casual', 'summer'],
//   },
//   {
//     id: 'outfit-2',
//     top: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400',
//     shoes: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
//     userName: 'FashionForward',
//     userAvatar: 'https://i.pravatar.cc/100?img=2',
//     likes: 189,
//     tags: ['elegant', 'evening'],
//   },
//   {
//     id: 'outfit-3',
//     top: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
//     bottom: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
//     shoes: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1509941943102-10c232fc06e0?w=400',
//     userName: 'TrendSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=3',
//     likes: 421,
//     tags: ['streetwear', 'urban'],
//   },
//   {
//     id: 'outfit-4',
//     top: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400',
//     shoes: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=400',
//     userName: 'ChicVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=4',
//     likes: 156,
//     tags: ['minimal', 'clean'],
//   },
//   {
//     id: 'outfit-5',
//     top: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
//     shoes: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400',
//     userName: 'LookBook',
//     userAvatar: 'https://i.pravatar.cc/100?img=5',
//     likes: 312,
//     tags: ['professional', 'smart'],
//   },
//   {
//     id: 'outfit-6',
//     top: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400',
//     bottom: 'https://images.unsplash.com/photo-1548883354-94bcfe321cbb?w=400',
//     shoes: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400',
//     userName: 'OutfitDaily',
//     userAvatar: 'https://i.pravatar.cc/100?img=6',
//     likes: 278,
//     tags: ['boho', 'relaxed'],
//   },
// ];

// // Mock data for the showcase (legacy single-image posts)
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
//   {
//     id: '37',
//     imageUrl:
//       'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=400',
//     userName: 'MidnightGlam',
//     userAvatar: 'https://i.pravatar.cc/100?img=37',
//     likes: 456,
//     tags: ['night', 'glam'],
//   },
//   {
//     id: '38',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'SilkDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=38',
//     likes: 523,
//     tags: ['silk', 'luxury'],
//   },
//   {
//     id: '39',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StreetKing',
//     userAvatar: 'https://i.pravatar.cc/100?img=39',
//     likes: 678,
//     tags: ['street', 'urban'],
//   },
//   {
//     id: '40',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'PureElegance',
//     userAvatar: 'https://i.pravatar.cc/100?img=40',
//     likes: 712,
//     tags: ['elegant', 'pure'],
//   },
//   {
//     id: '41',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CorporateChic',
//     userAvatar: 'https://i.pravatar.cc/100?img=41',
//     likes: 389,
//     tags: ['corporate', 'chic'],
//   },
//   {
//     id: '42',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FreeSpiritStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=42',
//     likes: 567,
//     tags: ['free', 'spirit'],
//   },
//   {
//     id: '43',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'HighFashion',
//     userAvatar: 'https://i.pravatar.cc/100?img=43',
//     likes: 834,
//     tags: ['high', 'fashion'],
//   },
//   {
//     id: '44',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'RetroQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=44',
//     likes: 445,
//     tags: ['retro', 'queen'],
//   },
//   {
//     id: '45',
//     imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
//     userName: 'EdgeLord',
//     userAvatar: 'https://i.pravatar.cc/100?img=45',
//     likes: 623,
//     tags: ['edge', 'dark'],
//   },
//   {
//     id: '46',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'NeutralTones',
//     userAvatar: 'https://i.pravatar.cc/100?img=46',
//     likes: 512,
//     tags: ['neutral', 'tones'],
//   },
//   {
//     id: '47',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'PartyPrincess',
//     userAvatar: 'https://i.pravatar.cc/100?img=47',
//     likes: 789,
//     tags: ['party', 'princess'],
//   },
//   {
//     id: '48',
//     imageUrl:
//       'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
//     userName: 'LazyDays',
//     userAvatar: 'https://i.pravatar.cc/100?img=48',
//     likes: 345,
//     tags: ['lazy', 'chill'],
//   },
//   {
//     id: '49',
//     imageUrl:
//       'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=400',
//     userName: 'PowerDress',
//     userAvatar: 'https://i.pravatar.cc/100?img=49',
//     likes: 678,
//     tags: ['power', 'dress'],
//   },
//   {
//     id: '50',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'LovelyDate',
//     userAvatar: 'https://i.pravatar.cc/100?img=50',
//     likes: 534,
//     tags: ['date', 'lovely'],
//   },
//   {
//     id: '51',
//     imageUrl:
//       'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
//     userName: 'ShoppingSpree',
//     userAvatar: 'https://i.pravatar.cc/100?img=51',
//     likes: 456,
//     tags: ['shopping', 'spree'],
//   },
//   {
//     id: '52',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FestivalQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=52',
//     likes: 623,
//     tags: ['festival', 'queen'],
//   },
//   {
//     id: '53',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'ClassAct',
//     userAvatar: 'https://i.pravatar.cc/100?img=53',
//     likes: 712,
//     tags: ['class', 'act'],
//   },
//   {
//     id: '54',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'BeachBabe',
//     userAvatar: 'https://i.pravatar.cc/100?img=54',
//     likes: 567,
//     tags: ['beach', 'babe'],
//   },
//   {
//     id: '55',
//     imageUrl:
//       'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400',
//     userName: 'CitySlicker',
//     userAvatar: 'https://i.pravatar.cc/100?img=55',
//     likes: 489,
//     tags: ['city', 'slick'],
//   },
//   {
//     id: '56',
//     imageUrl:
//       'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400',
//     userName: 'TimelessBeauty',
//     userAvatar: 'https://i.pravatar.cc/100?img=56',
//     likes: 834,
//     tags: ['timeless', 'beauty'],
//   },
//   {
//     id: '57',
//     imageUrl: 'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=400',
//     userName: 'ClubNights',
//     userAvatar: 'https://i.pravatar.cc/100?img=57',
//     likes: 456,
//     tags: ['club', 'nights'],
//   },
//   {
//     id: '58',
//     imageUrl: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400',
//     userName: 'AthleticEdge',
//     userAvatar: 'https://i.pravatar.cc/100?img=58',
//     likes: 523,
//     tags: ['athletic', 'edge'],
//   },
//   {
//     id: '59',
//     imageUrl:
//       'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400',
//     userName: 'SoftGlow',
//     userAvatar: 'https://i.pravatar.cc/100?img=59',
//     likes: 612,
//     tags: ['soft', 'glow'],
//   },
//   {
//     id: '60',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StatementPiece',
//     userAvatar: 'https://i.pravatar.cc/100?img=60',
//     likes: 789,
//     tags: ['statement', 'piece'],
//   },
//   {
//     id: '61',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'ComfortZone',
//     userAvatar: 'https://i.pravatar.cc/100?img=61',
//     likes: 378,
//     tags: ['comfort', 'zone'],
//   },
//   {
//     id: '62',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400',
//     userName: 'NeonDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=62',
//     likes: 645,
//     tags: ['neon', '90s'],
//   },
//   {
//     id: '63',
//     imageUrl: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=400',
//     userName: 'GreenStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=63',
//     likes: 489,
//     tags: ['green', 'eco'],
//   },
//   {
//     id: '64',
//     imageUrl:
//       'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=400',
//     userName: 'JeanGenius',
//     userAvatar: 'https://i.pravatar.cc/100?img=64',
//     likes: 567,
//     tags: ['jean', 'genius'],
//   },
//   {
//     id: '65',
//     imageUrl:
//       'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=400',
//     userName: 'AutumnVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=65',
//     likes: 512,
//     tags: ['autumn', 'vibes'],
//   },
//   {
//     id: '66',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'AllBlackEverything',
//     userAvatar: 'https://i.pravatar.cc/100?img=66',
//     likes: 723,
//     tags: ['allblack', 'sleek'],
//   },
//   {
//     id: '67',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'PatternPlay',
//     userAvatar: 'https://i.pravatar.cc/100?img=67',
//     likes: 456,
//     tags: ['pattern', 'play'],
//   },
//   {
//     id: '68',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CEOStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=68',
//     likes: 534,
//     tags: ['ceo', 'boss'],
//   },
//   {
//     id: '69',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'SundayBest',
//     userAvatar: 'https://i.pravatar.cc/100?img=69',
//     likes: 623,
//     tags: ['sunday', 'best'],
//   },
//   {
//     id: '70',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'FloralFancy',
//     userAvatar: 'https://i.pravatar.cc/100?img=70',
//     likes: 678,
//     tags: ['floral', 'fancy'],
//   },
//   {
//     id: '71',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'JetSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=71',
//     likes: 834,
//     tags: ['jet', 'setter'],
//   },
//   {
//     id: '72',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'GlamSquad',
//     userAvatar: 'https://i.pravatar.cc/100?img=72',
//     likes: 912,
//     tags: ['glam', 'squad'],
//   },
// ];

// const h = (
//   type:
//     | 'selection'
//     | 'impactLight'
//     | 'impactMedium'
//     | 'impactHeavy'
//     | 'notificationSuccess'
//     | 'notificationWarning'
//     | 'notificationError',
// ) =>
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
//       color: theme.colors.buttonText1,
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
//       marginBottom: moderateScale(tokens.spacing.md),
//       borderRadius: tokens.borderRadius.md,
//       // borderColor: theme.colors.muted,
//       // borderWidth: tokens.borderWidth.hairline,
//       overflow: 'hidden',
//       backgroundColor: theme.colors.muted,
//     },
//     cardImage: {
//       width: '100%',
//       height: '100%',
//     },
//     cardOverlay: {
//       position: 'absolute',
//       left: 0,
//       right: 0,
//       bottom: 0,
//       height: 78,
//       borderBottomLeftRadius: tokens.borderRadius.md,
//       borderBottomRightRadius: tokens.borderRadius.md,
//       overflow: 'hidden',
//     },
//     cardOverlayContainer: {
//       position: 'absolute',
//       left: 0,
//       right: 0,
//       bottom: 0,
//       height: 78,
//     },
//     cardGradient: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       borderBottomLeftRadius: tokens.borderRadius.md,
//       borderBottomRightRadius: tokens.borderRadius.md,
//     },

//     cardContent: {
//       padding: 6,
//     },

//     cardUserRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginBottom: 8,
//     },
//     cardAvatar: {
//       width: 35,
//       height: 35,
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
//       fontSize: fontScale(tokens.fontSize.xs),
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
//       fontSize: LIKE_COUNT_SIZE,
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

//   // Render outfit composite card (2x2 grid: top/bottom/shoes/accessory)
//   const renderOutfitCard = (
//     post: (typeof DEMO_OUTFIT_POSTS)[0],
//     index: number,
//   ) => {
//     const isLiked = likedPosts.has(post.id);
//     const cellSize = CARD_WIDTH / 2;

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
//           {/* 2x2 Grid Composite */}
//           <View style={styles.cardImage}>
//             {/* Row 1 */}
//             <View style={{flexDirection: 'row', height: cellSize}}>
//               {/* Top */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.top ? (
//                   <Image
//                     source={{uri: post.top}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//               {/* Bottom */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.bottom ? (
//                   <Image
//                     source={{uri: post.bottom}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//             </View>
//             {/* Row 2 */}
//             <View style={{flexDirection: 'row', height: cellSize}}>
//               {/* Shoes */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.shoes ? (
//                   <Image
//                     source={{uri: post.shoes}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//               {/* Accessory */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.accessory ? (
//                   <Image
//                     source={{uri: post.accessory}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//             </View>
//           </View>
//           <View style={styles.cardOverlayContainer}>
//             <LinearGradient
//               colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
//               style={styles.cardGradient}
//             />
//             <View style={styles.cardContent}>
//               <View style={styles.cardUserRow}>
//                 <Image
//                   source={{uri: post.userAvatar}}
//                   style={styles.cardAvatar}
//                 />
//                 <Text style={styles.cardUserName}>@{post.userName}</Text>
//               </View>
//               <View style={styles.cardActions}>
//                 <View style={styles.cardTags}>
//                   {post.tags.slice(0, 1).map(tag => (
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
//                     size={HEART_ICON_SIZE}
//                     color={isLiked ? '#FF4D6D' : '#fff'}
//                   />
//                   <Text style={styles.likeCount}>
//                     {isLiked ? post.likes + 1 : post.likes}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
//           </View>
//         </AppleTouchFeedback>
//       </Animatable.View>
//     );
//   };

//   // Render single-image card (legacy)
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
//           <View style={styles.cardOverlayContainer}>
//             <LinearGradient
//               colors={['rgba(0, 0, 0, 0.06)', 'rgba(0, 0, 0, 0.76)']}
//               style={styles.cardGradient}
//             />
//             <View style={styles.cardContent}>
//               <View style={styles.cardUserRow}>
//                 <Image
//                   source={{uri: post.userAvatar}}
//                   style={styles.cardAvatar}
//                 />
//                 <Text style={styles.cardUserName}>@{post.userName}</Text>
//               </View>
//               <View style={styles.cardActions}>
//                 <View style={styles.cardTags}>
//                   {post.tags.slice(0, 1).map(tag => (
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
//                     size={HEART_ICON_SIZE}
//                     color={isLiked ? '#FF4D6D' : '#fff'}
//                   />
//                   <Text style={styles.likeCount}>
//                     {isLiked ? post.likes + 1 : post.likes}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
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
//           <View style={{alignItems: 'left', flex: 1}}>
//             <Text style={globalStyles.sectionTitle}>Community Share</Text>
//           </View>
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
//         {DEMO_OUTFIT_POSTS.length > 0 || MOCK_POSTS.length > 0 ? (
//           <View style={styles.grid}>
//             {/* Render outfit composite cards (2x2 grid) */}
//             {DEMO_OUTFIT_POSTS.map((post, index) =>
//               renderOutfitCard(post, index),
//             )}
//             {/* Render legacy single-image cards */}
//             {MOCK_POSTS.map((post, index) =>
//               renderCard(post, DEMO_OUTFIT_POSTS.length + index),
//             )}
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

/////////////

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
// const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;
// const CARD_HEIGHT = CARD_WIDTH * 1.4;

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // Layout constants
// const HEADER_HEIGHT = 80;
// const BOTTOM_NAV_HEIGHT = 90;
// const HEART_ICON_SIZE = 22;
// const LIKE_COUNT_SIZE = 12;

// // Demo outfit posts with top/bottom/shoes/accessory images (2x2 grid)
// const DEMO_OUTFIT_POSTS = [
//   {
//     id: 'outfit-1',
//     top: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400',
//     shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
//     userName: 'StyleQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=1',
//     likes: 234,
//     tags: ['casual', 'summer'],
//   },
//   {
//     id: 'outfit-2',
//     top: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400',
//     shoes: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
//     userName: 'FashionForward',
//     userAvatar: 'https://i.pravatar.cc/100?img=2',
//     likes: 189,
//     tags: ['elegant', 'evening'],
//   },
//   {
//     id: 'outfit-3',
//     top: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
//     bottom: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
//     shoes: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1509941943102-10c232fc06e0?w=400',
//     userName: 'TrendSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=3',
//     likes: 421,
//     tags: ['streetwear', 'urban'],
//   },
//   {
//     id: 'outfit-4',
//     top: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400',
//     shoes: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=400',
//     userName: 'ChicVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=4',
//     likes: 156,
//     tags: ['minimal', 'clean'],
//   },
//   {
//     id: 'outfit-5',
//     top: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
//     shoes: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400',
//     userName: 'LookBook',
//     userAvatar: 'https://i.pravatar.cc/100?img=5',
//     likes: 312,
//     tags: ['professional', 'smart'],
//   },
//   {
//     id: 'outfit-6',
//     top: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400',
//     bottom: 'https://images.unsplash.com/photo-1548883354-94bcfe321cbb?w=400',
//     shoes: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400',
//     userName: 'OutfitDaily',
//     userAvatar: 'https://i.pravatar.cc/100?img=6',
//     likes: 278,
//     tags: ['boho', 'relaxed'],
//   },
// ];

// // Mock data for the showcase (legacy single-image posts)
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
//   {
//     id: '37',
//     imageUrl:
//       'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=400',
//     userName: 'MidnightGlam',
//     userAvatar: 'https://i.pravatar.cc/100?img=37',
//     likes: 456,
//     tags: ['night', 'glam'],
//   },
//   {
//     id: '38',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'SilkDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=38',
//     likes: 523,
//     tags: ['silk', 'luxury'],
//   },
//   {
//     id: '39',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StreetKing',
//     userAvatar: 'https://i.pravatar.cc/100?img=39',
//     likes: 678,
//     tags: ['street', 'urban'],
//   },
//   {
//     id: '40',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'PureElegance',
//     userAvatar: 'https://i.pravatar.cc/100?img=40',
//     likes: 712,
//     tags: ['elegant', 'pure'],
//   },
//   {
//     id: '41',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CorporateChic',
//     userAvatar: 'https://i.pravatar.cc/100?img=41',
//     likes: 389,
//     tags: ['corporate', 'chic'],
//   },
//   {
//     id: '42',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FreeSpiritStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=42',
//     likes: 567,
//     tags: ['free', 'spirit'],
//   },
//   {
//     id: '43',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'HighFashion',
//     userAvatar: 'https://i.pravatar.cc/100?img=43',
//     likes: 834,
//     tags: ['high', 'fashion'],
//   },
//   {
//     id: '44',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'RetroQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=44',
//     likes: 445,
//     tags: ['retro', 'queen'],
//   },
//   {
//     id: '45',
//     imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
//     userName: 'EdgeLord',
//     userAvatar: 'https://i.pravatar.cc/100?img=45',
//     likes: 623,
//     tags: ['edge', 'dark'],
//   },
//   {
//     id: '46',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'NeutralTones',
//     userAvatar: 'https://i.pravatar.cc/100?img=46',
//     likes: 512,
//     tags: ['neutral', 'tones'],
//   },
//   {
//     id: '47',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'PartyPrincess',
//     userAvatar: 'https://i.pravatar.cc/100?img=47',
//     likes: 789,
//     tags: ['party', 'princess'],
//   },
//   {
//     id: '48',
//     imageUrl:
//       'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
//     userName: 'LazyDays',
//     userAvatar: 'https://i.pravatar.cc/100?img=48',
//     likes: 345,
//     tags: ['lazy', 'chill'],
//   },
//   {
//     id: '49',
//     imageUrl:
//       'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=400',
//     userName: 'PowerDress',
//     userAvatar: 'https://i.pravatar.cc/100?img=49',
//     likes: 678,
//     tags: ['power', 'dress'],
//   },
//   {
//     id: '50',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'LovelyDate',
//     userAvatar: 'https://i.pravatar.cc/100?img=50',
//     likes: 534,
//     tags: ['date', 'lovely'],
//   },
//   {
//     id: '51',
//     imageUrl:
//       'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
//     userName: 'ShoppingSpree',
//     userAvatar: 'https://i.pravatar.cc/100?img=51',
//     likes: 456,
//     tags: ['shopping', 'spree'],
//   },
//   {
//     id: '52',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FestivalQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=52',
//     likes: 623,
//     tags: ['festival', 'queen'],
//   },
//   {
//     id: '53',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'ClassAct',
//     userAvatar: 'https://i.pravatar.cc/100?img=53',
//     likes: 712,
//     tags: ['class', 'act'],
//   },
//   {
//     id: '54',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'BeachBabe',
//     userAvatar: 'https://i.pravatar.cc/100?img=54',
//     likes: 567,
//     tags: ['beach', 'babe'],
//   },
//   {
//     id: '55',
//     imageUrl:
//       'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400',
//     userName: 'CitySlicker',
//     userAvatar: 'https://i.pravatar.cc/100?img=55',
//     likes: 489,
//     tags: ['city', 'slick'],
//   },
//   {
//     id: '56',
//     imageUrl:
//       'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400',
//     userName: 'TimelessBeauty',
//     userAvatar: 'https://i.pravatar.cc/100?img=56',
//     likes: 834,
//     tags: ['timeless', 'beauty'],
//   },
//   {
//     id: '57',
//     imageUrl: 'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=400',
//     userName: 'ClubNights',
//     userAvatar: 'https://i.pravatar.cc/100?img=57',
//     likes: 456,
//     tags: ['club', 'nights'],
//   },
//   {
//     id: '58',
//     imageUrl: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400',
//     userName: 'AthleticEdge',
//     userAvatar: 'https://i.pravatar.cc/100?img=58',
//     likes: 523,
//     tags: ['athletic', 'edge'],
//   },
//   {
//     id: '59',
//     imageUrl:
//       'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400',
//     userName: 'SoftGlow',
//     userAvatar: 'https://i.pravatar.cc/100?img=59',
//     likes: 612,
//     tags: ['soft', 'glow'],
//   },
//   {
//     id: '60',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StatementPiece',
//     userAvatar: 'https://i.pravatar.cc/100?img=60',
//     likes: 789,
//     tags: ['statement', 'piece'],
//   },
//   {
//     id: '61',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'ComfortZone',
//     userAvatar: 'https://i.pravatar.cc/100?img=61',
//     likes: 378,
//     tags: ['comfort', 'zone'],
//   },
//   {
//     id: '62',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400',
//     userName: 'NeonDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=62',
//     likes: 645,
//     tags: ['neon', '90s'],
//   },
//   {
//     id: '63',
//     imageUrl: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=400',
//     userName: 'GreenStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=63',
//     likes: 489,
//     tags: ['green', 'eco'],
//   },
//   {
//     id: '64',
//     imageUrl:
//       'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=400',
//     userName: 'JeanGenius',
//     userAvatar: 'https://i.pravatar.cc/100?img=64',
//     likes: 567,
//     tags: ['jean', 'genius'],
//   },
//   {
//     id: '65',
//     imageUrl:
//       'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=400',
//     userName: 'AutumnVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=65',
//     likes: 512,
//     tags: ['autumn', 'vibes'],
//   },
//   {
//     id: '66',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'AllBlackEverything',
//     userAvatar: 'https://i.pravatar.cc/100?img=66',
//     likes: 723,
//     tags: ['allblack', 'sleek'],
//   },
//   {
//     id: '67',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'PatternPlay',
//     userAvatar: 'https://i.pravatar.cc/100?img=67',
//     likes: 456,
//     tags: ['pattern', 'play'],
//   },
//   {
//     id: '68',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CEOStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=68',
//     likes: 534,
//     tags: ['ceo', 'boss'],
//   },
//   {
//     id: '69',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'SundayBest',
//     userAvatar: 'https://i.pravatar.cc/100?img=69',
//     likes: 623,
//     tags: ['sunday', 'best'],
//   },
//   {
//     id: '70',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'FloralFancy',
//     userAvatar: 'https://i.pravatar.cc/100?img=70',
//     likes: 678,
//     tags: ['floral', 'fancy'],
//   },
//   {
//     id: '71',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'JetSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=71',
//     likes: 834,
//     tags: ['jet', 'setter'],
//   },
//   {
//     id: '72',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'GlamSquad',
//     userAvatar: 'https://i.pravatar.cc/100?img=72',
//     likes: 912,
//     tags: ['glam', 'squad'],
//   },
// ];

// const h = (
//   type:
//     | 'selection'
//     | 'impactLight'
//     | 'impactMedium'
//     | 'impactHeavy'
//     | 'notificationSuccess'
//     | 'notificationWarning'
//     | 'notificationError',
// ) =>
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
//   const [currentImageIndex, setCurrentImageIndex] = useState(0);
//   const fadeAnim = useRef(new Animated.Value(1)).current;

//   const fashionImages = [
//     require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
//     require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
//     require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
//     require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
//     require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
//     require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
//     require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
//     require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
//     require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
//     require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
//     require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
//     require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
//     require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
//     require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
//     require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
//   ];

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

//   // Auto-cycle through fashion images with fade transition timed with text animation
//   useEffect(() => {
//     const interval = setInterval(() => {
//       // Fade out
//       Animated.timing(fadeAnim, {
//         toValue: 0,
//         duration: 800,
//         useNativeDriver: true,
//       }).start(() => {
//         setCurrentImageIndex(prev => (prev + 1) % fashionImages.length);
//         // Fade in (timing: 200ms delay + 1200ms animation = 1400ms total, coincides with text fadeInUp)
//         Animated.timing(fadeAnim, {
//           toValue: 1,
//           duration: 1200,
//           useNativeDriver: true,
//         }).start();
//       });
//     }, 8000);
//     return () => clearInterval(interval);
//   }, [fashionImages.length, fadeAnim]);

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
//       color: theme.colors.buttonText1,
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
//       marginBottom: moderateScale(tokens.spacing.md),
//       borderRadius: tokens.borderRadius.md,
//       // borderColor: theme.colors.muted,
//       // borderWidth: tokens.borderWidth.hairline,
//       overflow: 'hidden',
//       backgroundColor: theme.colors.muted,
//     },
//     cardImage: {
//       width: '100%',
//       height: '100%',
//     },
//     cardOverlay: {
//       position: 'absolute',
//       left: 0,
//       right: 0,
//       bottom: 0,
//       height: 78,
//       borderBottomLeftRadius: tokens.borderRadius.md,
//       borderBottomRightRadius: tokens.borderRadius.md,
//       overflow: 'hidden',
//     },
//     cardOverlayContainer: {
//       position: 'absolute',
//       left: 0,
//       right: 0,
//       bottom: 0,
//       height: 78,
//     },
//     cardGradient: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       borderBottomLeftRadius: tokens.borderRadius.md,
//       borderBottomRightRadius: tokens.borderRadius.md,
//     },

//     cardContent: {
//       padding: 6,
//     },

//     cardUserRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginBottom: 8,
//     },
//     cardAvatar: {
//       width: 35,
//       height: 35,
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
//       fontSize: fontScale(tokens.fontSize.xs),
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
//       fontSize: LIKE_COUNT_SIZE,
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

//   // Render outfit composite card (2x2 grid: top/bottom/shoes/accessory)
//   const renderOutfitCard = (
//     post: (typeof DEMO_OUTFIT_POSTS)[0],
//     index: number,
//   ) => {
//     const isLiked = likedPosts.has(post.id);
//     const cellSize = CARD_WIDTH / 2;

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
//           {/* 2x2 Grid Composite */}
//           <View style={styles.cardImage}>
//             {/* Row 1 */}
//             <View style={{flexDirection: 'row', height: cellSize}}>
//               {/* Top */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.top ? (
//                   <Image
//                     source={{uri: post.top}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//               {/* Bottom */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.bottom ? (
//                   <Image
//                     source={{uri: post.bottom}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//             </View>
//             {/* Row 2 */}
//             <View style={{flexDirection: 'row', height: cellSize}}>
//               {/* Shoes */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.shoes ? (
//                   <Image
//                     source={{uri: post.shoes}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//               {/* Accessory */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.accessory ? (
//                   <Image
//                     source={{uri: post.accessory}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//             </View>
//           </View>
//           <View style={styles.cardOverlayContainer}>
//             <LinearGradient
//               colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
//               style={styles.cardGradient}
//             />
//             <View style={styles.cardContent}>
//               <View style={styles.cardUserRow}>
//                 <Image
//                   source={{uri: post.userAvatar}}
//                   style={styles.cardAvatar}
//                 />
//                 <Text style={styles.cardUserName}>@{post.userName}</Text>
//               </View>
//               <View style={styles.cardActions}>
//                 <View style={styles.cardTags}>
//                   {post.tags.slice(0, 1).map(tag => (
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
//                     size={HEART_ICON_SIZE}
//                     color={isLiked ? '#FF4D6D' : '#fff'}
//                   />
//                   <Text style={styles.likeCount}>
//                     {isLiked ? post.likes + 1 : post.likes}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
//           </View>
//         </AppleTouchFeedback>
//       </Animatable.View>
//     );
//   };

//   // Render single-image card (legacy)
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
//           <View style={styles.cardOverlayContainer}>
//             <LinearGradient
//               colors={['rgba(0, 0, 0, 0.06)', 'rgba(0, 0, 0, 0.76)']}
//               style={styles.cardGradient}
//             />
//             <View style={styles.cardContent}>
//               <View style={styles.cardUserRow}>
//                 <Image
//                   source={{uri: post.userAvatar}}
//                   style={styles.cardAvatar}
//                 />
//                 <Text style={styles.cardUserName}>@{post.userName}</Text>
//               </View>
//               <View style={styles.cardActions}>
//                 <View style={styles.cardTags}>
//                   {post.tags.slice(0, 1).map(tag => (
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
//                     size={HEART_ICON_SIZE}
//                     color={isLiked ? '#FF4D6D' : '#fff'}
//                   />
//                   <Text style={styles.likeCount}>
//                     {isLiked ? post.likes + 1 : post.likes}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
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
//           <View style={{alignItems: 'left', flex: 1}}>
//             <Text style={globalStyles.sectionTitle}>Community Share</Text>
//           </View>
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
//         <View
//           style={{
//             width: '100%',
//             height: 300,
//             overflow: 'hidden',
//             marginBottom: 14,
//           }}>
//           <Animated.Image
//             key={`image-${currentImageIndex}`}
//             source={fashionImages[currentImageIndex]}
//             style={{
//               width: '100%',
//               height: '100%',
//               borderRadius: tokens.borderRadius.lg,
//               // borderColor: theme.colors.muted,
//               // borderWidth: tokens.borderWidth.hairline,
//               opacity: fadeAnim,
//             }}
//             resizeMode="cover"
//           />
//           <Animatable.View
//             key={`text-${currentImageIndex}`}
//             animation="fadeInUp"
//             duration={1200}
//             delay={200}
//             useNativeDriver
//             style={{
//               position: 'absolute',
//               bottom: 0,
//               left: 0,
//               right: 0,
//               paddingHorizontal: moderateScale(tokens.spacing.md),
//               paddingBottom: moderateScale(tokens.spacing.lg),
//             }}>
//             <Text
//               style={{
//                 fontSize: fontScale(tokens.fontSize['3xl']),
//                 fontWeight: tokens.fontWeight.bold,
//                 color: '#ffffff',

//                 marginBottom: moderateScale(tokens.spacing.sm),
//                 textShadowColor: 'rgba(0, 0, 0, 0.5)',
//                 textShadowOffset: {width: 0, height: 2},
//                 textShadowRadius: 4,
//               }}>
//               They Line Up{'\n'}For A Revolution.
//             </Text>
//             <Text
//               style={{
//                 fontSize: fontScale(tokens.fontSize.md),
//                 fontWeight: tokens.fontWeight.medium,
//                 color: 'rgba(255, 255, 255, 1)',
//                 lineHeight: 18,
//                 textShadowColor: 'rgba(0, 0, 0, 0.4)',
//                 textShadowOffset: {width: 0, height: 1},
//                 textShadowRadius: 3,
//               }}>
//               Discover the latest in fashion innovation and style
//             </Text>
//           </Animatable.View>
//         </View>
//         {DEMO_OUTFIT_POSTS.length > 0 || MOCK_POSTS.length > 0 ? (
//           <View style={styles.grid}>
//             {/* Render outfit composite cards (2x2 grid) */}
//             {DEMO_OUTFIT_POSTS.map((post, index) =>
//               renderOutfitCard(post, index),
//             )}
//             {/* Render legacy single-image cards */}
//             {MOCK_POSTS.map((post, index) =>
//               renderCard(post, DEMO_OUTFIT_POSTS.length + index),
//             )}
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

/////////////////

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
// const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;
// const CARD_HEIGHT = CARD_WIDTH * 1.4;

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // Layout constants
// const HEADER_HEIGHT = 80;
// const BOTTOM_NAV_HEIGHT = 90;
// const HEART_ICON_SIZE = 22;
// const LIKE_COUNT_SIZE = 12;

// // Demo outfit posts with top/bottom/shoes/accessory images (2x2 grid)
// const DEMO_OUTFIT_POSTS = [
//   {
//     id: 'outfit-1',
//     top: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400',
//     shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
//     userName: 'StyleQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=1',
//     likes: 234,
//     tags: ['casual', 'summer'],
//   },
//   {
//     id: 'outfit-2',
//     top: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400',
//     shoes: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
//     userName: 'FashionForward',
//     userAvatar: 'https://i.pravatar.cc/100?img=2',
//     likes: 189,
//     tags: ['elegant', 'evening'],
//   },
//   {
//     id: 'outfit-3',
//     top: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
//     bottom: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
//     shoes: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1509941943102-10c232fc06e0?w=400',
//     userName: 'TrendSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=3',
//     likes: 421,
//     tags: ['streetwear', 'urban'],
//   },
//   {
//     id: 'outfit-4',
//     top: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400',
//     shoes: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=400',
//     userName: 'ChicVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=4',
//     likes: 156,
//     tags: ['minimal', 'clean'],
//   },
//   {
//     id: 'outfit-5',
//     top: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
//     shoes: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400',
//     userName: 'LookBook',
//     userAvatar: 'https://i.pravatar.cc/100?img=5',
//     likes: 312,
//     tags: ['professional', 'smart'],
//   },
//   {
//     id: 'outfit-6',
//     top: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400',
//     bottom: 'https://images.unsplash.com/photo-1548883354-94bcfe321cbb?w=400',
//     shoes: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400',
//     userName: 'OutfitDaily',
//     userAvatar: 'https://i.pravatar.cc/100?img=6',
//     likes: 278,
//     tags: ['boho', 'relaxed'],
//   },
// ];

// // Mock data for the showcase (legacy single-image posts)
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
//   {
//     id: '37',
//     imageUrl:
//       'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=400',
//     userName: 'MidnightGlam',
//     userAvatar: 'https://i.pravatar.cc/100?img=37',
//     likes: 456,
//     tags: ['night', 'glam'],
//   },
//   {
//     id: '38',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'SilkDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=38',
//     likes: 523,
//     tags: ['silk', 'luxury'],
//   },
//   {
//     id: '39',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StreetKing',
//     userAvatar: 'https://i.pravatar.cc/100?img=39',
//     likes: 678,
//     tags: ['street', 'urban'],
//   },
//   {
//     id: '40',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'PureElegance',
//     userAvatar: 'https://i.pravatar.cc/100?img=40',
//     likes: 712,
//     tags: ['elegant', 'pure'],
//   },
//   {
//     id: '41',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CorporateChic',
//     userAvatar: 'https://i.pravatar.cc/100?img=41',
//     likes: 389,
//     tags: ['corporate', 'chic'],
//   },
//   {
//     id: '42',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FreeSpiritStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=42',
//     likes: 567,
//     tags: ['free', 'spirit'],
//   },
//   {
//     id: '43',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'HighFashion',
//     userAvatar: 'https://i.pravatar.cc/100?img=43',
//     likes: 834,
//     tags: ['high', 'fashion'],
//   },
//   {
//     id: '44',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'RetroQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=44',
//     likes: 445,
//     tags: ['retro', 'queen'],
//   },
//   {
//     id: '45',
//     imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
//     userName: 'EdgeLord',
//     userAvatar: 'https://i.pravatar.cc/100?img=45',
//     likes: 623,
//     tags: ['edge', 'dark'],
//   },
//   {
//     id: '46',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'NeutralTones',
//     userAvatar: 'https://i.pravatar.cc/100?img=46',
//     likes: 512,
//     tags: ['neutral', 'tones'],
//   },
//   {
//     id: '47',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'PartyPrincess',
//     userAvatar: 'https://i.pravatar.cc/100?img=47',
//     likes: 789,
//     tags: ['party', 'princess'],
//   },
//   {
//     id: '48',
//     imageUrl:
//       'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
//     userName: 'LazyDays',
//     userAvatar: 'https://i.pravatar.cc/100?img=48',
//     likes: 345,
//     tags: ['lazy', 'chill'],
//   },
//   {
//     id: '49',
//     imageUrl:
//       'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=400',
//     userName: 'PowerDress',
//     userAvatar: 'https://i.pravatar.cc/100?img=49',
//     likes: 678,
//     tags: ['power', 'dress'],
//   },
//   {
//     id: '50',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'LovelyDate',
//     userAvatar: 'https://i.pravatar.cc/100?img=50',
//     likes: 534,
//     tags: ['date', 'lovely'],
//   },
//   {
//     id: '51',
//     imageUrl:
//       'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
//     userName: 'ShoppingSpree',
//     userAvatar: 'https://i.pravatar.cc/100?img=51',
//     likes: 456,
//     tags: ['shopping', 'spree'],
//   },
//   {
//     id: '52',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FestivalQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=52',
//     likes: 623,
//     tags: ['festival', 'queen'],
//   },
//   {
//     id: '53',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'ClassAct',
//     userAvatar: 'https://i.pravatar.cc/100?img=53',
//     likes: 712,
//     tags: ['class', 'act'],
//   },
//   {
//     id: '54',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'BeachBabe',
//     userAvatar: 'https://i.pravatar.cc/100?img=54',
//     likes: 567,
//     tags: ['beach', 'babe'],
//   },
//   {
//     id: '55',
//     imageUrl:
//       'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400',
//     userName: 'CitySlicker',
//     userAvatar: 'https://i.pravatar.cc/100?img=55',
//     likes: 489,
//     tags: ['city', 'slick'],
//   },
//   {
//     id: '56',
//     imageUrl:
//       'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400',
//     userName: 'TimelessBeauty',
//     userAvatar: 'https://i.pravatar.cc/100?img=56',
//     likes: 834,
//     tags: ['timeless', 'beauty'],
//   },
//   {
//     id: '57',
//     imageUrl: 'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=400',
//     userName: 'ClubNights',
//     userAvatar: 'https://i.pravatar.cc/100?img=57',
//     likes: 456,
//     tags: ['club', 'nights'],
//   },
//   {
//     id: '58',
//     imageUrl: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400',
//     userName: 'AthleticEdge',
//     userAvatar: 'https://i.pravatar.cc/100?img=58',
//     likes: 523,
//     tags: ['athletic', 'edge'],
//   },
//   {
//     id: '59',
//     imageUrl:
//       'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400',
//     userName: 'SoftGlow',
//     userAvatar: 'https://i.pravatar.cc/100?img=59',
//     likes: 612,
//     tags: ['soft', 'glow'],
//   },
//   {
//     id: '60',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StatementPiece',
//     userAvatar: 'https://i.pravatar.cc/100?img=60',
//     likes: 789,
//     tags: ['statement', 'piece'],
//   },
//   {
//     id: '61',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'ComfortZone',
//     userAvatar: 'https://i.pravatar.cc/100?img=61',
//     likes: 378,
//     tags: ['comfort', 'zone'],
//   },
//   {
//     id: '62',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400',
//     userName: 'NeonDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=62',
//     likes: 645,
//     tags: ['neon', '90s'],
//   },
//   {
//     id: '63',
//     imageUrl: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=400',
//     userName: 'GreenStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=63',
//     likes: 489,
//     tags: ['green', 'eco'],
//   },
//   {
//     id: '64',
//     imageUrl:
//       'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=400',
//     userName: 'JeanGenius',
//     userAvatar: 'https://i.pravatar.cc/100?img=64',
//     likes: 567,
//     tags: ['jean', 'genius'],
//   },
//   {
//     id: '65',
//     imageUrl:
//       'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=400',
//     userName: 'AutumnVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=65',
//     likes: 512,
//     tags: ['autumn', 'vibes'],
//   },
//   {
//     id: '66',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'AllBlackEverything',
//     userAvatar: 'https://i.pravatar.cc/100?img=66',
//     likes: 723,
//     tags: ['allblack', 'sleek'],
//   },
//   {
//     id: '67',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'PatternPlay',
//     userAvatar: 'https://i.pravatar.cc/100?img=67',
//     likes: 456,
//     tags: ['pattern', 'play'],
//   },
//   {
//     id: '68',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CEOStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=68',
//     likes: 534,
//     tags: ['ceo', 'boss'],
//   },
//   {
//     id: '69',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'SundayBest',
//     userAvatar: 'https://i.pravatar.cc/100?img=69',
//     likes: 623,
//     tags: ['sunday', 'best'],
//   },
//   {
//     id: '70',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'FloralFancy',
//     userAvatar: 'https://i.pravatar.cc/100?img=70',
//     likes: 678,
//     tags: ['floral', 'fancy'],
//   },
//   {
//     id: '71',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'JetSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=71',
//     likes: 834,
//     tags: ['jet', 'setter'],
//   },
//   {
//     id: '72',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'GlamSquad',
//     userAvatar: 'https://i.pravatar.cc/100?img=72',
//     likes: 912,
//     tags: ['glam', 'squad'],
//   },
// ];

// const h = (
//   type:
//     | 'selection'
//     | 'impactLight'
//     | 'impactMedium'
//     | 'impactHeavy'
//     | 'notificationSuccess'
//     | 'notificationWarning'
//     | 'notificationError',
// ) =>
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
//   const [currentImageIndex, setCurrentImageIndex] = useState(0);
//   const fadeAnim = useRef(new Animated.Value(1)).current;

//   const fashionImages = [
//     require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
//     require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
//     require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
//     require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
//     require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
//     require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
//     require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
//     require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
//     require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
//     require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
//     require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
//     require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
//     require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
//     require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
//     require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
//   ];

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

//   // Auto-cycle through fashion images with fade transition timed with text animation
//   useEffect(() => {
//     const interval = setInterval(() => {
//       // Fade out
//       Animated.timing(fadeAnim, {
//         toValue: 0,
//         duration: 800,
//         useNativeDriver: true,
//       }).start(() => {
//         setCurrentImageIndex(prev => (prev + 1) % fashionImages.length);
//         // Fade in (timing: 200ms delay + 1200ms animation = 1400ms total, coincides with text fadeInUp)
//         Animated.timing(fadeAnim, {
//           toValue: 1,
//           duration: 1200,
//           useNativeDriver: true,
//         }).start();
//       });
//     }, 8000);
//     return () => clearInterval(interval);
//   }, [fashionImages.length, fadeAnim]);

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
//       color: theme.colors.buttonText1,
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
//       marginBottom: moderateScale(tokens.spacing.md),
//       borderRadius: tokens.borderRadius.md,
//       // borderColor: theme.colors.muted,
//       // borderWidth: tokens.borderWidth.hairline,
//       overflow: 'hidden',
//       backgroundColor: theme.colors.muted,
//     },
//     cardImage: {
//       width: '100%',
//       height: '100%',
//     },
//     cardOverlay: {
//       position: 'absolute',
//       left: 0,
//       right: 0,
//       bottom: 0,
//       height: 78,
//       borderBottomLeftRadius: tokens.borderRadius.md,
//       borderBottomRightRadius: tokens.borderRadius.md,
//       overflow: 'hidden',
//     },
//     cardOverlayContainer: {
//       position: 'absolute',
//       left: 0,
//       right: 0,
//       bottom: 0,
//       height: 78,
//     },
//     cardGradient: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       borderBottomLeftRadius: tokens.borderRadius.md,
//       borderBottomRightRadius: tokens.borderRadius.md,
//     },

//     cardContent: {
//       padding: 6,
//     },

//     cardUserRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginBottom: 8,
//     },
//     cardAvatar: {
//       width: 35,
//       height: 35,
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
//       fontSize: fontScale(tokens.fontSize.xs),
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
//       fontSize: LIKE_COUNT_SIZE,
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

//   // Render outfit composite card (2x2 grid: top/bottom/shoes/accessory)
//   const renderOutfitCard = (
//     post: (typeof DEMO_OUTFIT_POSTS)[0],
//     index: number,
//   ) => {
//     const isLiked = likedPosts.has(post.id);
//     const cellSize = CARD_WIDTH / 2;

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
//           {/* 2x2 Grid Composite */}
//           <View style={styles.cardImage}>
//             {/* Row 1 */}
//             <View style={{flexDirection: 'row', height: cellSize}}>
//               {/* Top */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.top ? (
//                   <Image
//                     source={{uri: post.top}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//               {/* Bottom */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.bottom ? (
//                   <Image
//                     source={{uri: post.bottom}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//             </View>
//             {/* Row 2 */}
//             <View style={{flexDirection: 'row', height: cellSize}}>
//               {/* Shoes */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.shoes ? (
//                   <Image
//                     source={{uri: post.shoes}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//               {/* Accessory */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.accessory ? (
//                   <Image
//                     source={{uri: post.accessory}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//             </View>
//           </View>
//           <View style={styles.cardOverlayContainer}>
//             <LinearGradient
//               colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
//               style={styles.cardGradient}
//             />
//             <View style={styles.cardContent}>
//               <View style={styles.cardUserRow}>
//                 <Image
//                   source={{uri: post.userAvatar}}
//                   style={styles.cardAvatar}
//                 />
//                 <Text style={styles.cardUserName}>@{post.userName}</Text>
//               </View>
//               <View style={styles.cardActions}>
//                 <View style={styles.cardTags}>
//                   {post.tags.slice(0, 1).map(tag => (
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
//                     size={HEART_ICON_SIZE}
//                     color={isLiked ? '#FF4D6D' : '#fff'}
//                   />
//                   <Text style={styles.likeCount}>
//                     {isLiked ? post.likes + 1 : post.likes}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
//           </View>
//         </AppleTouchFeedback>
//       </Animatable.View>
//     );
//   };

//   // Render single-image card (legacy)
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
//           <View style={styles.cardOverlayContainer}>
//             <LinearGradient
//               colors={['rgba(0, 0, 0, 0.06)', 'rgba(0, 0, 0, 0.76)']}
//               style={styles.cardGradient}
//             />
//             <View style={styles.cardContent}>
//               <View style={styles.cardUserRow}>
//                 <Image
//                   source={{uri: post.userAvatar}}
//                   style={styles.cardAvatar}
//                 />
//                 <Text style={styles.cardUserName}>@{post.userName}</Text>
//               </View>
//               <View style={styles.cardActions}>
//                 <View style={styles.cardTags}>
//                   {post.tags.slice(0, 1).map(tag => (
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
//                     size={HEART_ICON_SIZE}
//                     color={isLiked ? '#FF4D6D' : '#fff'}
//                   />
//                   <Text style={styles.likeCount}>
//                     {isLiked ? post.likes + 1 : post.likes}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
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
//           <View style={{alignItems: 'left', flex: 1}}>
//             <Text style={globalStyles.sectionTitle}>Community Share</Text>
//           </View>
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
//         <View
//           style={{
//             width: '100%',
//             height: 300,
//             overflow: 'hidden',
//             marginBottom: 14,
//           }}>
//           <Animated.Image
//             key={`image-${currentImageIndex}`}
//             source={fashionImages[currentImageIndex]}
//             style={{
//               width: '100%',
//               height: '100%',
//               borderRadius: tokens.borderRadius.lg,
//               // borderColor: theme.colors.muted,
//               // borderWidth: tokens.borderWidth.hairline,
//               opacity: fadeAnim,
//             }}
//             resizeMode="cover"
//           />
//           <Animatable.View
//             key={`text-${currentImageIndex}`}
//             animation="fadeInUp"
//             duration={1200}
//             delay={200}
//             useNativeDriver
//             style={{
//               position: 'absolute',
//               bottom: 0,
//               left: 0,
//               right: 0,
//               paddingHorizontal: moderateScale(tokens.spacing.md),
//               paddingBottom: moderateScale(tokens.spacing.lg),
//             }}>
//             <Text
//               style={{
//                 fontSize: fontScale(tokens.fontSize['3xl']),
//                 fontWeight: tokens.fontWeight.bold,
//                 color: '#ffffff',

//                 marginBottom: moderateScale(tokens.spacing.sm),
//                 textShadowColor: 'rgba(0, 0, 0, 0.5)',
//                 textShadowOffset: {width: 0, height: 2},
//                 textShadowRadius: 4,
//               }}>
//               They Line Up{'\n'}For A Revolution.
//             </Text>
//             <Text
//               style={{
//                 fontSize: fontScale(tokens.fontSize.md),
//                 fontWeight: tokens.fontWeight.medium,
//                 color: 'rgba(255, 255, 255, 1)',
//                 lineHeight: 18,
//                 textShadowColor: 'rgba(0, 0, 0, 0.4)',
//                 textShadowOffset: {width: 0, height: 1},
//                 textShadowRadius: 3,
//               }}>
//               Discover the latest in fashion innovation and style
//             </Text>
//           </Animatable.View>
//         </View>
//         {DEMO_OUTFIT_POSTS.length > 0 || MOCK_POSTS.length > 0 ? (
//           <View style={styles.grid}>
//             {/* Render outfit composite cards (2x2 grid) */}
//             {DEMO_OUTFIT_POSTS.map((post, index) =>
//               renderOutfitCard(post, index),
//             )}
//             {/* Render legacy single-image cards */}
//             {MOCK_POSTS.map((post, index) =>
//               renderCard(post, DEMO_OUTFIT_POSTS.length + index),
//             )}
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

//////////////////////

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
// const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;
// const CARD_HEIGHT = CARD_WIDTH * 1.4;

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // Layout constants
// const HEADER_HEIGHT = 80;
// const BOTTOM_NAV_HEIGHT = 90;
// const HEART_ICON_SIZE = 22;
// const LIKE_COUNT_SIZE = 12;

// // Demo outfit posts with top/bottom/shoes/accessory images (2x2 grid)
// const DEMO_OUTFIT_POSTS = [
//   {
//     id: 'outfit-1',
//     top: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400',
//     shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
//     userName: 'StyleQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=1',
//     likes: 234,
//     tags: ['casual', 'summer'],
//   },
//   {
//     id: 'outfit-2',
//     top: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400',
//     shoes: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
//     userName: 'FashionForward',
//     userAvatar: 'https://i.pravatar.cc/100?img=2',
//     likes: 189,
//     tags: ['elegant', 'evening'],
//   },
//   {
//     id: 'outfit-3',
//     top: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
//     bottom: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
//     shoes: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1509941943102-10c232fc06e0?w=400',
//     userName: 'TrendSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=3',
//     likes: 421,
//     tags: ['streetwear', 'urban'],
//   },
//   {
//     id: 'outfit-4',
//     top: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400',
//     shoes: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=400',
//     userName: 'ChicVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=4',
//     likes: 156,
//     tags: ['minimal', 'clean'],
//   },
//   {
//     id: 'outfit-5',
//     top: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
//     shoes: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400',
//     userName: 'LookBook',
//     userAvatar: 'https://i.pravatar.cc/100?img=5',
//     likes: 312,
//     tags: ['professional', 'smart'],
//   },
//   {
//     id: 'outfit-6',
//     top: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400',
//     bottom: 'https://images.unsplash.com/photo-1548883354-94bcfe321cbb?w=400',
//     shoes: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400',
//     userName: 'OutfitDaily',
//     userAvatar: 'https://i.pravatar.cc/100?img=6',
//     likes: 278,
//     tags: ['boho', 'relaxed'],
//   },
// ];

// // Mock data for the showcase (legacy single-image posts)
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
//   {
//     id: '37',
//     imageUrl:
//       'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=400',
//     userName: 'MidnightGlam',
//     userAvatar: 'https://i.pravatar.cc/100?img=37',
//     likes: 456,
//     tags: ['night', 'glam'],
//   },
//   {
//     id: '38',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'SilkDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=38',
//     likes: 523,
//     tags: ['silk', 'luxury'],
//   },
//   {
//     id: '39',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StreetKing',
//     userAvatar: 'https://i.pravatar.cc/100?img=39',
//     likes: 678,
//     tags: ['street', 'urban'],
//   },
//   {
//     id: '40',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'PureElegance',
//     userAvatar: 'https://i.pravatar.cc/100?img=40',
//     likes: 712,
//     tags: ['elegant', 'pure'],
//   },
//   {
//     id: '41',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CorporateChic',
//     userAvatar: 'https://i.pravatar.cc/100?img=41',
//     likes: 389,
//     tags: ['corporate', 'chic'],
//   },
//   {
//     id: '42',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FreeSpiritStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=42',
//     likes: 567,
//     tags: ['free', 'spirit'],
//   },
//   {
//     id: '43',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'HighFashion',
//     userAvatar: 'https://i.pravatar.cc/100?img=43',
//     likes: 834,
//     tags: ['high', 'fashion'],
//   },
//   {
//     id: '44',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'RetroQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=44',
//     likes: 445,
//     tags: ['retro', 'queen'],
//   },
//   {
//     id: '45',
//     imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
//     userName: 'EdgeLord',
//     userAvatar: 'https://i.pravatar.cc/100?img=45',
//     likes: 623,
//     tags: ['edge', 'dark'],
//   },
//   {
//     id: '46',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'NeutralTones',
//     userAvatar: 'https://i.pravatar.cc/100?img=46',
//     likes: 512,
//     tags: ['neutral', 'tones'],
//   },
//   {
//     id: '47',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'PartyPrincess',
//     userAvatar: 'https://i.pravatar.cc/100?img=47',
//     likes: 789,
//     tags: ['party', 'princess'],
//   },
//   {
//     id: '48',
//     imageUrl:
//       'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
//     userName: 'LazyDays',
//     userAvatar: 'https://i.pravatar.cc/100?img=48',
//     likes: 345,
//     tags: ['lazy', 'chill'],
//   },
//   {
//     id: '49',
//     imageUrl:
//       'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=400',
//     userName: 'PowerDress',
//     userAvatar: 'https://i.pravatar.cc/100?img=49',
//     likes: 678,
//     tags: ['power', 'dress'],
//   },
//   {
//     id: '50',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'LovelyDate',
//     userAvatar: 'https://i.pravatar.cc/100?img=50',
//     likes: 534,
//     tags: ['date', 'lovely'],
//   },
//   {
//     id: '51',
//     imageUrl:
//       'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
//     userName: 'ShoppingSpree',
//     userAvatar: 'https://i.pravatar.cc/100?img=51',
//     likes: 456,
//     tags: ['shopping', 'spree'],
//   },
//   {
//     id: '52',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FestivalQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=52',
//     likes: 623,
//     tags: ['festival', 'queen'],
//   },
//   {
//     id: '53',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'ClassAct',
//     userAvatar: 'https://i.pravatar.cc/100?img=53',
//     likes: 712,
//     tags: ['class', 'act'],
//   },
//   {
//     id: '54',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'BeachBabe',
//     userAvatar: 'https://i.pravatar.cc/100?img=54',
//     likes: 567,
//     tags: ['beach', 'babe'],
//   },
//   {
//     id: '55',
//     imageUrl:
//       'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400',
//     userName: 'CitySlicker',
//     userAvatar: 'https://i.pravatar.cc/100?img=55',
//     likes: 489,
//     tags: ['city', 'slick'],
//   },
//   {
//     id: '56',
//     imageUrl:
//       'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400',
//     userName: 'TimelessBeauty',
//     userAvatar: 'https://i.pravatar.cc/100?img=56',
//     likes: 834,
//     tags: ['timeless', 'beauty'],
//   },
//   {
//     id: '57',
//     imageUrl: 'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=400',
//     userName: 'ClubNights',
//     userAvatar: 'https://i.pravatar.cc/100?img=57',
//     likes: 456,
//     tags: ['club', 'nights'],
//   },
//   {
//     id: '58',
//     imageUrl: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400',
//     userName: 'AthleticEdge',
//     userAvatar: 'https://i.pravatar.cc/100?img=58',
//     likes: 523,
//     tags: ['athletic', 'edge'],
//   },
//   {
//     id: '59',
//     imageUrl:
//       'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400',
//     userName: 'SoftGlow',
//     userAvatar: 'https://i.pravatar.cc/100?img=59',
//     likes: 612,
//     tags: ['soft', 'glow'],
//   },
//   {
//     id: '60',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StatementPiece',
//     userAvatar: 'https://i.pravatar.cc/100?img=60',
//     likes: 789,
//     tags: ['statement', 'piece'],
//   },
//   {
//     id: '61',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'ComfortZone',
//     userAvatar: 'https://i.pravatar.cc/100?img=61',
//     likes: 378,
//     tags: ['comfort', 'zone'],
//   },
//   {
//     id: '62',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400',
//     userName: 'NeonDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=62',
//     likes: 645,
//     tags: ['neon', '90s'],
//   },
//   {
//     id: '63',
//     imageUrl: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=400',
//     userName: 'GreenStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=63',
//     likes: 489,
//     tags: ['green', 'eco'],
//   },
//   {
//     id: '64',
//     imageUrl:
//       'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=400',
//     userName: 'JeanGenius',
//     userAvatar: 'https://i.pravatar.cc/100?img=64',
//     likes: 567,
//     tags: ['jean', 'genius'],
//   },
//   {
//     id: '65',
//     imageUrl:
//       'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=400',
//     userName: 'AutumnVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=65',
//     likes: 512,
//     tags: ['autumn', 'vibes'],
//   },
//   {
//     id: '66',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'AllBlackEverything',
//     userAvatar: 'https://i.pravatar.cc/100?img=66',
//     likes: 723,
//     tags: ['allblack', 'sleek'],
//   },
//   {
//     id: '67',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'PatternPlay',
//     userAvatar: 'https://i.pravatar.cc/100?img=67',
//     likes: 456,
//     tags: ['pattern', 'play'],
//   },
//   {
//     id: '68',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CEOStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=68',
//     likes: 534,
//     tags: ['ceo', 'boss'],
//   },
//   {
//     id: '69',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'SundayBest',
//     userAvatar: 'https://i.pravatar.cc/100?img=69',
//     likes: 623,
//     tags: ['sunday', 'best'],
//   },
//   {
//     id: '70',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'FloralFancy',
//     userAvatar: 'https://i.pravatar.cc/100?img=70',
//     likes: 678,
//     tags: ['floral', 'fancy'],
//   },
//   {
//     id: '71',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'JetSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=71',
//     likes: 834,
//     tags: ['jet', 'setter'],
//   },
//   {
//     id: '72',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'GlamSquad',
//     userAvatar: 'https://i.pravatar.cc/100?img=72',
//     likes: 912,
//     tags: ['glam', 'squad'],
//   },
// ];

// const h = (
//   type:
//     | 'selection'
//     | 'impactLight'
//     | 'impactMedium'
//     | 'impactHeavy'
//     | 'notificationSuccess'
//     | 'notificationWarning'
//     | 'notificationError',
// ) =>
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
//   const [currentImageIndex, setCurrentImageIndex] = useState(0);
//   const fadeAnim = useRef(new Animated.Value(1)).current;

//   const fashionImages = [
//     require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
//     require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
//     require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
//     require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
//     require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
//     require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
//     require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
//     require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
//     require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
//     require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
//     require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
//     require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
//     require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
//     require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
//     require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
//     require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
//   ];

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

//   // Auto-cycle through fashion images every 5 seconds with fade transition
//   useEffect(() => {
//     const interval = setInterval(() => {
//       // Fade out
//       Animated.timing(fadeAnim, {
//         toValue: 0,
//         duration: 500,
//         useNativeDriver: true,
//       }).start(() => {
//         setCurrentImageIndex(prev => (prev + 1) % fashionImages.length);
//         // Fade in
//         Animated.timing(fadeAnim, {
//           toValue: 1,
//           duration: 500,
//           useNativeDriver: true,
//         }).start();
//       });
//     }, 5000);
//     return () => clearInterval(interval);
//   }, [fashionImages.length, fadeAnim]);

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
//       color: theme.colors.buttonText1,
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
//       marginBottom: moderateScale(tokens.spacing.md),
//       borderRadius: tokens.borderRadius.md,
//       // borderColor: theme.colors.muted,
//       // borderWidth: tokens.borderWidth.hairline,
//       overflow: 'hidden',
//       backgroundColor: theme.colors.muted,
//     },
//     cardImage: {
//       width: '100%',
//       height: '100%',
//     },
//     cardOverlay: {
//       position: 'absolute',
//       left: 0,
//       right: 0,
//       bottom: 0,
//       height: 78,
//       borderBottomLeftRadius: tokens.borderRadius.md,
//       borderBottomRightRadius: tokens.borderRadius.md,
//       overflow: 'hidden',
//     },
//     cardOverlayContainer: {
//       position: 'absolute',
//       left: 0,
//       right: 0,
//       bottom: 0,
//       height: 78,
//     },
//     cardGradient: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       borderBottomLeftRadius: tokens.borderRadius.md,
//       borderBottomRightRadius: tokens.borderRadius.md,
//     },

//     cardContent: {
//       padding: 6,
//     },

//     cardUserRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginBottom: 8,
//     },
//     cardAvatar: {
//       width: 35,
//       height: 35,
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
//       fontSize: fontScale(tokens.fontSize.xs),
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
//       fontSize: LIKE_COUNT_SIZE,
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

//   // Render outfit composite card (2x2 grid: top/bottom/shoes/accessory)
//   const renderOutfitCard = (
//     post: (typeof DEMO_OUTFIT_POSTS)[0],
//     index: number,
//   ) => {
//     const isLiked = likedPosts.has(post.id);
//     const cellSize = CARD_WIDTH / 2;

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
//           {/* 2x2 Grid Composite */}
//           <View style={styles.cardImage}>
//             {/* Row 1 */}
//             <View style={{flexDirection: 'row', height: cellSize}}>
//               {/* Top */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.top ? (
//                   <Image
//                     source={{uri: post.top}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//               {/* Bottom */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.bottom ? (
//                   <Image
//                     source={{uri: post.bottom}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//             </View>
//             {/* Row 2 */}
//             <View style={{flexDirection: 'row', height: cellSize}}>
//               {/* Shoes */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.shoes ? (
//                   <Image
//                     source={{uri: post.shoes}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//               {/* Accessory */}
//               <View
//                 style={{
//                   width: cellSize,
//                   height: cellSize,
//                   backgroundColor: '#000',
//                 }}>
//                 {post.accessory ? (
//                   <Image
//                     source={{uri: post.accessory}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                 ) : null}
//               </View>
//             </View>
//           </View>
//           <View style={styles.cardOverlayContainer}>
//             <LinearGradient
//               colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
//               style={styles.cardGradient}
//             />
//             <View style={styles.cardContent}>
//               <View style={styles.cardUserRow}>
//                 <Image
//                   source={{uri: post.userAvatar}}
//                   style={styles.cardAvatar}
//                 />
//                 <Text style={styles.cardUserName}>@{post.userName}</Text>
//               </View>
//               <View style={styles.cardActions}>
//                 <View style={styles.cardTags}>
//                   {post.tags.slice(0, 1).map(tag => (
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
//                     size={HEART_ICON_SIZE}
//                     color={isLiked ? '#FF4D6D' : '#fff'}
//                   />
//                   <Text style={styles.likeCount}>
//                     {isLiked ? post.likes + 1 : post.likes}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
//           </View>
//         </AppleTouchFeedback>
//       </Animatable.View>
//     );
//   };

//   // Render single-image card (legacy)
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
//           <View style={styles.cardOverlayContainer}>
//             <LinearGradient
//               colors={['rgba(0, 0, 0, 0.06)', 'rgba(0, 0, 0, 0.76)']}
//               style={styles.cardGradient}
//             />
//             <View style={styles.cardContent}>
//               <View style={styles.cardUserRow}>
//                 <Image
//                   source={{uri: post.userAvatar}}
//                   style={styles.cardAvatar}
//                 />
//                 <Text style={styles.cardUserName}>@{post.userName}</Text>
//               </View>
//               <View style={styles.cardActions}>
//                 <View style={styles.cardTags}>
//                   {post.tags.slice(0, 1).map(tag => (
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
//                     size={HEART_ICON_SIZE}
//                     color={isLiked ? '#FF4D6D' : '#fff'}
//                   />
//                   <Text style={styles.likeCount}>
//                     {isLiked ? post.likes + 1 : post.likes}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
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
//           <View style={{alignItems: 'left', flex: 1}}>
//             <Text style={globalStyles.sectionTitle}>Community Share</Text>
//           </View>
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
//         <View
//           style={{
//             width: '100%',
//             height: 300,
//             overflow: 'hidden',
//             marginBottom: 14,
//           }}>
//           <Animated.Image
//             key={`image-${currentImageIndex}`}
//             source={fashionImages[currentImageIndex]}
//             style={{
//               width: '100%',
//               height: '100%',
//               borderRadius: tokens.borderRadius.lg,
//               // borderColor: theme.colors.muted,
//               // borderWidth: tokens.borderWidth.hairline,
//               opacity: fadeAnim,
//             }}
//             resizeMode="cover"
//           />
//           <Animatable.View
//             key={`text-${currentImageIndex}`}
//             animation="fadeInUp"
//             duration={1200}
//             delay={200}
//             useNativeDriver
//             style={{
//               position: 'absolute',
//               bottom: 0,
//               left: 0,
//               right: 0,
//               paddingHorizontal: moderateScale(tokens.spacing.md),
//               paddingBottom: moderateScale(tokens.spacing.lg),
//             }}>
//             <Text
//               style={{
//                 fontSize: fontScale(tokens.fontSize['3xl']),
//                 fontWeight: tokens.fontWeight.bold,
//                 color: '#ffffff',

//                 marginBottom: moderateScale(tokens.spacing.sm),
//                 textShadowColor: 'rgba(0, 0, 0, 0.5)',
//                 textShadowOffset: {width: 0, height: 2},
//                 textShadowRadius: 4,
//               }}>
//               They Line Up{'\n'}For A Revolution.
//             </Text>
//             <Text
//               style={{
//                 fontSize: fontScale(tokens.fontSize.md),
//                 fontWeight: tokens.fontWeight.medium,
//                 color: 'rgba(255, 255, 255, 1)',
//                 lineHeight: 18,
//                 textShadowColor: 'rgba(0, 0, 0, 0.4)',
//                 textShadowOffset: {width: 0, height: 1},
//                 textShadowRadius: 3,
//               }}>
//               Discover the latest in fashion innovation and style
//             </Text>
//           </Animatable.View>
//         </View>
//         {DEMO_OUTFIT_POSTS.length > 0 || MOCK_POSTS.length > 0 ? (
//           <View style={styles.grid}>
//             {/* Render outfit composite cards (2x2 grid) */}
//             {DEMO_OUTFIT_POSTS.map((post, index) =>
//               renderOutfitCard(post, index),
//             )}
//             {/* Render legacy single-image cards */}
//             {MOCK_POSTS.map((post, index) =>
//               renderCard(post, DEMO_OUTFIT_POSTS.length + index),
//             )}
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

///////////////

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
// const CARD_WIDTH = (SCREEN_WIDTH - 50) / 2;
// const CARD_HEIGHT = CARD_WIDTH * 1.4;

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// // Layout constants
// const HEADER_HEIGHT = 80;
// const BOTTOM_NAV_HEIGHT = 90;
// const HEART_ICON_SIZE = 22;
// const LIKE_COUNT_SIZE = 12;

// // Demo outfit posts with top/bottom/shoes/accessory images (2x2 grid)
// const DEMO_OUTFIT_POSTS = [
//   {
//     id: 'outfit-1',
//     top: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400',
//     shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
//     userName: 'StyleQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=1',
//     likes: 234,
//     tags: ['casual', 'summer'],
//   },
//   {
//     id: 'outfit-2',
//     top: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400',
//     shoes: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
//     userName: 'FashionForward',
//     userAvatar: 'https://i.pravatar.cc/100?img=2',
//     likes: 189,
//     tags: ['elegant', 'evening'],
//   },
//   {
//     id: 'outfit-3',
//     top: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
//     bottom: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
//     shoes: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1509941943102-10c232fc06e0?w=400',
//     userName: 'TrendSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=3',
//     likes: 421,
//     tags: ['streetwear', 'urban'],
//   },
//   {
//     id: 'outfit-4',
//     top: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400',
//     shoes: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=400',
//     userName: 'ChicVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=4',
//     likes: 156,
//     tags: ['minimal', 'clean'],
//   },
//   {
//     id: 'outfit-5',
//     top: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
//     bottom:
//       'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
//     shoes: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400',
//     userName: 'LookBook',
//     userAvatar: 'https://i.pravatar.cc/100?img=5',
//     likes: 312,
//     tags: ['professional', 'smart'],
//   },
//   {
//     id: 'outfit-6',
//     top: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400',
//     bottom: 'https://images.unsplash.com/photo-1548883354-94bcfe321cbb?w=400',
//     shoes: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400',
//     accessory:
//       'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400',
//     userName: 'OutfitDaily',
//     userAvatar: 'https://i.pravatar.cc/100?img=6',
//     likes: 278,
//     tags: ['boho', 'relaxed'],
//   },
// ];

// // Mock data for the showcase (legacy single-image posts)
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
//   {
//     id: '37',
//     imageUrl:
//       'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=400',
//     userName: 'MidnightGlam',
//     userAvatar: 'https://i.pravatar.cc/100?img=37',
//     likes: 456,
//     tags: ['night', 'glam'],
//   },
//   {
//     id: '38',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'SilkDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=38',
//     likes: 523,
//     tags: ['silk', 'luxury'],
//   },
//   {
//     id: '39',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StreetKing',
//     userAvatar: 'https://i.pravatar.cc/100?img=39',
//     likes: 678,
//     tags: ['street', 'urban'],
//   },
//   {
//     id: '40',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'PureElegance',
//     userAvatar: 'https://i.pravatar.cc/100?img=40',
//     likes: 712,
//     tags: ['elegant', 'pure'],
//   },
//   {
//     id: '41',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CorporateChic',
//     userAvatar: 'https://i.pravatar.cc/100?img=41',
//     likes: 389,
//     tags: ['corporate', 'chic'],
//   },
//   {
//     id: '42',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FreeSpiritStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=42',
//     likes: 567,
//     tags: ['free', 'spirit'],
//   },
//   {
//     id: '43',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'HighFashion',
//     userAvatar: 'https://i.pravatar.cc/100?img=43',
//     likes: 834,
//     tags: ['high', 'fashion'],
//   },
//   {
//     id: '44',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'RetroQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=44',
//     likes: 445,
//     tags: ['retro', 'queen'],
//   },
//   {
//     id: '45',
//     imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
//     userName: 'EdgeLord',
//     userAvatar: 'https://i.pravatar.cc/100?img=45',
//     likes: 623,
//     tags: ['edge', 'dark'],
//   },
//   {
//     id: '46',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'NeutralTones',
//     userAvatar: 'https://i.pravatar.cc/100?img=46',
//     likes: 512,
//     tags: ['neutral', 'tones'],
//   },
//   {
//     id: '47',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'PartyPrincess',
//     userAvatar: 'https://i.pravatar.cc/100?img=47',
//     likes: 789,
//     tags: ['party', 'princess'],
//   },
//   {
//     id: '48',
//     imageUrl:
//       'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
//     userName: 'LazyDays',
//     userAvatar: 'https://i.pravatar.cc/100?img=48',
//     likes: 345,
//     tags: ['lazy', 'chill'],
//   },
//   {
//     id: '49',
//     imageUrl:
//       'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=400',
//     userName: 'PowerDress',
//     userAvatar: 'https://i.pravatar.cc/100?img=49',
//     likes: 678,
//     tags: ['power', 'dress'],
//   },
//   {
//     id: '50',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'LovelyDate',
//     userAvatar: 'https://i.pravatar.cc/100?img=50',
//     likes: 534,
//     tags: ['date', 'lovely'],
//   },
//   {
//     id: '51',
//     imageUrl:
//       'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
//     userName: 'ShoppingSpree',
//     userAvatar: 'https://i.pravatar.cc/100?img=51',
//     likes: 456,
//     tags: ['shopping', 'spree'],
//   },
//   {
//     id: '52',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FestivalQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=52',
//     likes: 623,
//     tags: ['festival', 'queen'],
//   },
//   {
//     id: '53',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'ClassAct',
//     userAvatar: 'https://i.pravatar.cc/100?img=53',
//     likes: 712,
//     tags: ['class', 'act'],
//   },
//   {
//     id: '54',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'BeachBabe',
//     userAvatar: 'https://i.pravatar.cc/100?img=54',
//     likes: 567,
//     tags: ['beach', 'babe'],
//   },
//   {
//     id: '55',
//     imageUrl:
//       'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400',
//     userName: 'CitySlicker',
//     userAvatar: 'https://i.pravatar.cc/100?img=55',
//     likes: 489,
//     tags: ['city', 'slick'],
//   },
//   {
//     id: '56',
//     imageUrl:
//       'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400',
//     userName: 'TimelessBeauty',
//     userAvatar: 'https://i.pravatar.cc/100?img=56',
//     likes: 834,
//     tags: ['timeless', 'beauty'],
//   },
//   {
//     id: '57',
//     imageUrl: 'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=400',
//     userName: 'ClubNights',
//     userAvatar: 'https://i.pravatar.cc/100?img=57',
//     likes: 456,
//     tags: ['club', 'nights'],
//   },
//   {
//     id: '58',
//     imageUrl: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400',
//     userName: 'AthleticEdge',
//     userAvatar: 'https://i.pravatar.cc/100?img=58',
//     likes: 523,
//     tags: ['athletic', 'edge'],
//   },
//   {
//     id: '59',
//     imageUrl:
//       'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400',
//     userName: 'SoftGlow',
//     userAvatar: 'https://i.pravatar.cc/100?img=59',
//     likes: 612,
//     tags: ['soft', 'glow'],
//   },
//   {
//     id: '60',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StatementPiece',
//     userAvatar: 'https://i.pravatar.cc/100?img=60',
//     likes: 789,
//     tags: ['statement', 'piece'],
//   },
//   {
//     id: '61',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'ComfortZone',
//     userAvatar: 'https://i.pravatar.cc/100?img=61',
//     likes: 378,
//     tags: ['comfort', 'zone'],
//   },
//   {
//     id: '62',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400',
//     userName: 'NeonDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=62',
//     likes: 645,
//     tags: ['neon', '90s'],
//   },
//   {
//     id: '63',
//     imageUrl: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=400',
//     userName: 'GreenStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=63',
//     likes: 489,
//     tags: ['green', 'eco'],
//   },
//   {
//     id: '64',
//     imageUrl:
//       'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=400',
//     userName: 'JeanGenius',
//     userAvatar: 'https://i.pravatar.cc/100?img=64',
//     likes: 567,
//     tags: ['jean', 'genius'],
//   },
//   {
//     id: '65',
//     imageUrl:
//       'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=400',
//     userName: 'AutumnVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=65',
//     likes: 512,
//     tags: ['autumn', 'vibes'],
//   },
//   {
//     id: '66',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'AllBlackEverything',
//     userAvatar: 'https://i.pravatar.cc/100?img=66',
//     likes: 723,
//     tags: ['allblack', 'sleek'],
//   },
//   {
//     id: '67',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'PatternPlay',
//     userAvatar: 'https://i.pravatar.cc/100?img=67',
//     likes: 456,
//     tags: ['pattern', 'play'],
//   },
//   {
//     id: '68',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CEOStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=68',
//     likes: 534,
//     tags: ['ceo', 'boss'],
//   },
//   {
//     id: '69',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'SundayBest',
//     userAvatar: 'https://i.pravatar.cc/100?img=69',
//     likes: 623,
//     tags: ['sunday', 'best'],
//   },
//   {
//     id: '70',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'FloralFancy',
//     userAvatar: 'https://i.pravatar.cc/100?img=70',
//     likes: 678,
//     tags: ['floral', 'fancy'],
//   },
//   {
//     id: '71',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'JetSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=71',
//     likes: 834,
//     tags: ['jet', 'setter'],
//   },
//   {
//     id: '72',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'GlamSquad',
//     userAvatar: 'https://i.pravatar.cc/100?img=72',
//     likes: 912,
//     tags: ['glam', 'squad'],
//   },
// ];

// const h = (
//   type:
//     | 'selection'
//     | 'impactLight'
//     | 'impactMedium'
//     | 'impactHeavy'
//     | 'notificationSuccess'
//     | 'notificationWarning'
//     | 'notificationError',
// ) =>
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
//       marginBottom: moderateScale(tokens.spacing.md),
//       borderRadius: tokens.borderRadius.sm,
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
//     },

//     cardContent: {
//       padding: 6,
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
//       fontSize: fontScale(tokens.fontSize.xs),
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
//       fontSize: LIKE_COUNT_SIZE,
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

//   // Render outfit composite card (2x2 grid: top/bottom/shoes/accessory)
//   const renderOutfitCard = (
//     post: (typeof DEMO_OUTFIT_POSTS)[0],
//     index: number,
//   ) => {
//     const isLiked = likedPosts.has(post.id);
//     const cellSize = CARD_WIDTH / 2;

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
//           {/* 2x2 Grid Composite */}
//           <View style={styles.cardImage}>
//             {/* Row 1 */}
//             <View style={{flexDirection: 'row', height: cellSize}}>
//               {/* Top */}
//               <View style={{width: cellSize, height: cellSize}}>
//                 <Image
//                   source={{uri: post.top}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               </View>
//               {/* Bottom */}
//               <View style={{width: cellSize, height: cellSize}}>
//                 <Image
//                   source={{uri: post.bottom}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               </View>
//             </View>
//             {/* Row 2 */}
//             <View style={{flexDirection: 'row', height: cellSize}}>
//               {/* Shoes */}
//               <View style={{width: cellSize, height: cellSize}}>
//                 <Image
//                   source={{uri: post.shoes}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               </View>
//               {/* Accessory */}
//               <View style={{width: cellSize, height: cellSize}}>
//                 <Image
//                   source={{uri: post.accessory}}
//                   style={{width: '100%', height: '100%'}}
//                   resizeMode="cover"
//                 />
//               </View>
//             </View>
//           </View>
//           <View style={styles.cardOverlay}>
//             <LinearGradient colors={['transparent', 'rgba(0, 0, 0, 1)']}>
//               <View style={styles.cardContent}>
//                 <View style={styles.cardUserRow}>
//                   <Image
//                     source={{uri: post.userAvatar}}
//                     style={styles.cardAvatar}
//                   />
//                   <Text style={styles.cardUserName}>@{post.userName}</Text>
//                 </View>
//                 <View style={styles.cardActions}>
//                   <View style={styles.cardTags}>
//                     {post.tags.slice(0, 2).map(tag => (
//                       <Text key={tag} style={styles.cardTag}>
//                         #{tag}
//                       </Text>
//                     ))}
//                   </View>
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => toggleLike(post.id)}
//                     style={styles.likeButton}>
//                     <MaterialIcons
//                       name={isLiked ? 'favorite' : 'favorite-border'}
//                       size={HEART_ICON_SIZE}
//                       color={isLiked ? '#FF4D6D' : '#fff'}
//                     />
//                     <Text style={styles.likeCount}>
//                       {isLiked ? post.likes + 1 : post.likes}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </View>
//               </View>
//             </LinearGradient>
//           </View>
//         </AppleTouchFeedback>
//       </Animatable.View>
//     );
//   };

//   // Render single-image card (legacy)
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
//             <LinearGradient colors={['transparent', 'rgba(0, 0, 0, 1)']}>
//               <View style={styles.cardContent}>
//                 <View style={styles.cardUserRow}>
//                   <Image
//                     source={{uri: post.userAvatar}}
//                     style={styles.cardAvatar}
//                   />
//                   <Text style={styles.cardUserName}>@{post.userName}</Text>
//                 </View>
//                 <View style={styles.cardActions}>
//                   <View style={styles.cardTags}>
//                     {post.tags.slice(0, 2).map(tag => (
//                       <Text key={tag} style={styles.cardTag}>
//                         #{tag}
//                       </Text>
//                     ))}
//                   </View>
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => toggleLike(post.id)}
//                     style={styles.likeButton}>
//                     <MaterialIcons
//                       name={isLiked ? 'favorite' : 'favorite-border'}
//                       size={HEART_ICON_SIZE}
//                       color={isLiked ? '#FF4D6D' : '#fff'}
//                     />
//                     <Text style={styles.likeCount}>
//                       {isLiked ? post.likes + 1 : post.likes}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </View>
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
//         {DEMO_OUTFIT_POSTS.length > 0 ? (
//           <View style={styles.grid}>
//             {/* Render outfit composite cards (vertical stack) */}
//             {DEMO_OUTFIT_POSTS.map((post, index) =>
//               renderOutfitCard(post, index),
//             )}
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

////////////////////

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
// const HEART_ICON_SIZE = 22;
// const LIKE_COUNT_SIZE = 12;

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
//   {
//     id: '37',
//     imageUrl:
//       'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=400',
//     userName: 'MidnightGlam',
//     userAvatar: 'https://i.pravatar.cc/100?img=37',
//     likes: 456,
//     tags: ['night', 'glam'],
//   },
//   {
//     id: '38',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'SilkDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=38',
//     likes: 523,
//     tags: ['silk', 'luxury'],
//   },
//   {
//     id: '39',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StreetKing',
//     userAvatar: 'https://i.pravatar.cc/100?img=39',
//     likes: 678,
//     tags: ['street', 'urban'],
//   },
//   {
//     id: '40',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'PureElegance',
//     userAvatar: 'https://i.pravatar.cc/100?img=40',
//     likes: 712,
//     tags: ['elegant', 'pure'],
//   },
//   {
//     id: '41',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CorporateChic',
//     userAvatar: 'https://i.pravatar.cc/100?img=41',
//     likes: 389,
//     tags: ['corporate', 'chic'],
//   },
//   {
//     id: '42',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FreeSpiritStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=42',
//     likes: 567,
//     tags: ['free', 'spirit'],
//   },
//   {
//     id: '43',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'HighFashion',
//     userAvatar: 'https://i.pravatar.cc/100?img=43',
//     likes: 834,
//     tags: ['high', 'fashion'],
//   },
//   {
//     id: '44',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'RetroQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=44',
//     likes: 445,
//     tags: ['retro', 'queen'],
//   },
//   {
//     id: '45',
//     imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
//     userName: 'EdgeLord',
//     userAvatar: 'https://i.pravatar.cc/100?img=45',
//     likes: 623,
//     tags: ['edge', 'dark'],
//   },
//   {
//     id: '46',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'NeutralTones',
//     userAvatar: 'https://i.pravatar.cc/100?img=46',
//     likes: 512,
//     tags: ['neutral', 'tones'],
//   },
//   {
//     id: '47',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'PartyPrincess',
//     userAvatar: 'https://i.pravatar.cc/100?img=47',
//     likes: 789,
//     tags: ['party', 'princess'],
//   },
//   {
//     id: '48',
//     imageUrl:
//       'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
//     userName: 'LazyDays',
//     userAvatar: 'https://i.pravatar.cc/100?img=48',
//     likes: 345,
//     tags: ['lazy', 'chill'],
//   },
//   {
//     id: '49',
//     imageUrl:
//       'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=400',
//     userName: 'PowerDress',
//     userAvatar: 'https://i.pravatar.cc/100?img=49',
//     likes: 678,
//     tags: ['power', 'dress'],
//   },
//   {
//     id: '50',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'LovelyDate',
//     userAvatar: 'https://i.pravatar.cc/100?img=50',
//     likes: 534,
//     tags: ['date', 'lovely'],
//   },
//   {
//     id: '51',
//     imageUrl:
//       'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
//     userName: 'ShoppingSpree',
//     userAvatar: 'https://i.pravatar.cc/100?img=51',
//     likes: 456,
//     tags: ['shopping', 'spree'],
//   },
//   {
//     id: '52',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FestivalQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=52',
//     likes: 623,
//     tags: ['festival', 'queen'],
//   },
//   {
//     id: '53',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'ClassAct',
//     userAvatar: 'https://i.pravatar.cc/100?img=53',
//     likes: 712,
//     tags: ['class', 'act'],
//   },
//   {
//     id: '54',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'BeachBabe',
//     userAvatar: 'https://i.pravatar.cc/100?img=54',
//     likes: 567,
//     tags: ['beach', 'babe'],
//   },
//   {
//     id: '55',
//     imageUrl:
//       'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400',
//     userName: 'CitySlicker',
//     userAvatar: 'https://i.pravatar.cc/100?img=55',
//     likes: 489,
//     tags: ['city', 'slick'],
//   },
//   {
//     id: '56',
//     imageUrl:
//       'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400',
//     userName: 'TimelessBeauty',
//     userAvatar: 'https://i.pravatar.cc/100?img=56',
//     likes: 834,
//     tags: ['timeless', 'beauty'],
//   },
//   {
//     id: '57',
//     imageUrl: 'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=400',
//     userName: 'ClubNights',
//     userAvatar: 'https://i.pravatar.cc/100?img=57',
//     likes: 456,
//     tags: ['club', 'nights'],
//   },
//   {
//     id: '58',
//     imageUrl: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400',
//     userName: 'AthleticEdge',
//     userAvatar: 'https://i.pravatar.cc/100?img=58',
//     likes: 523,
//     tags: ['athletic', 'edge'],
//   },
//   {
//     id: '59',
//     imageUrl:
//       'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400',
//     userName: 'SoftGlow',
//     userAvatar: 'https://i.pravatar.cc/100?img=59',
//     likes: 612,
//     tags: ['soft', 'glow'],
//   },
//   {
//     id: '60',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StatementPiece',
//     userAvatar: 'https://i.pravatar.cc/100?img=60',
//     likes: 789,
//     tags: ['statement', 'piece'],
//   },
//   {
//     id: '61',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'ComfortZone',
//     userAvatar: 'https://i.pravatar.cc/100?img=61',
//     likes: 378,
//     tags: ['comfort', 'zone'],
//   },
//   {
//     id: '62',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400',
//     userName: 'NeonDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=62',
//     likes: 645,
//     tags: ['neon', '90s'],
//   },
//   {
//     id: '63',
//     imageUrl: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=400',
//     userName: 'GreenStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=63',
//     likes: 489,
//     tags: ['green', 'eco'],
//   },
//   {
//     id: '64',
//     imageUrl:
//       'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=400',
//     userName: 'JeanGenius',
//     userAvatar: 'https://i.pravatar.cc/100?img=64',
//     likes: 567,
//     tags: ['jean', 'genius'],
//   },
//   {
//     id: '65',
//     imageUrl:
//       'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=400',
//     userName: 'AutumnVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=65',
//     likes: 512,
//     tags: ['autumn', 'vibes'],
//   },
//   {
//     id: '66',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'AllBlackEverything',
//     userAvatar: 'https://i.pravatar.cc/100?img=66',
//     likes: 723,
//     tags: ['allblack', 'sleek'],
//   },
//   {
//     id: '67',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'PatternPlay',
//     userAvatar: 'https://i.pravatar.cc/100?img=67',
//     likes: 456,
//     tags: ['pattern', 'play'],
//   },
//   {
//     id: '68',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CEOStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=68',
//     likes: 534,
//     tags: ['ceo', 'boss'],
//   },
//   {
//     id: '69',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'SundayBest',
//     userAvatar: 'https://i.pravatar.cc/100?img=69',
//     likes: 623,
//     tags: ['sunday', 'best'],
//   },
//   {
//     id: '70',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'FloralFancy',
//     userAvatar: 'https://i.pravatar.cc/100?img=70',
//     likes: 678,
//     tags: ['floral', 'fancy'],
//   },
//   {
//     id: '71',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'JetSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=71',
//     likes: 834,
//     tags: ['jet', 'setter'],
//   },
//   {
//     id: '72',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'GlamSquad',
//     userAvatar: 'https://i.pravatar.cc/100?img=72',
//     likes: 912,
//     tags: ['glam', 'squad'],
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
//     },

//     cardContent: {
//       padding: 6,
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
//       fontSize: fontScale(tokens.fontSize.xs),
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
//       fontSize: LIKE_COUNT_SIZE,
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
//             <LinearGradient colors={['transparent', 'rgba(0, 0, 0, 1)']}>
//               <View style={styles.cardContent}>
//                 <View style={styles.cardUserRow}>
//                   <Image
//                     source={{uri: post.userAvatar}}
//                     style={styles.cardAvatar}
//                   />
//                   <Text style={styles.cardUserName}>@{post.userName}</Text>
//                 </View>
//                 <View style={styles.cardActions}>
//                   <View style={styles.cardTags}>
//                     {post.tags.slice(0, 2).map(tag => (
//                       <Text key={tag} style={styles.cardTag}>
//                         #{tag}
//                       </Text>
//                     ))}
//                   </View>
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => toggleLike(post.id)}
//                     style={styles.likeButton}>
//                     <MaterialIcons
//                       name={isLiked ? 'favorite' : 'favorite-border'}
//                       size={HEART_ICON_SIZE}
//                       color={isLiked ? '#FF4D6D' : '#fff'}
//                     />
//                     <Text style={styles.likeCount}>
//                       {isLiked ? post.likes + 1 : post.likes}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </View>
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

/////////////////

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
// const HEART_ICON_SIZE = 22;
// const LIKE_COUNT_SIZE = 12;

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
//   {
//     id: '37',
//     imageUrl:
//       'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=400',
//     userName: 'MidnightGlam',
//     userAvatar: 'https://i.pravatar.cc/100?img=37',
//     likes: 456,
//     tags: ['night', 'glam'],
//   },
//   {
//     id: '38',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'SilkDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=38',
//     likes: 523,
//     tags: ['silk', 'luxury'],
//   },
//   {
//     id: '39',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StreetKing',
//     userAvatar: 'https://i.pravatar.cc/100?img=39',
//     likes: 678,
//     tags: ['street', 'urban'],
//   },
//   {
//     id: '40',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'PureElegance',
//     userAvatar: 'https://i.pravatar.cc/100?img=40',
//     likes: 712,
//     tags: ['elegant', 'pure'],
//   },
//   {
//     id: '41',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CorporateChic',
//     userAvatar: 'https://i.pravatar.cc/100?img=41',
//     likes: 389,
//     tags: ['corporate', 'chic'],
//   },
//   {
//     id: '42',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FreeSpiritStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=42',
//     likes: 567,
//     tags: ['free', 'spirit'],
//   },
//   {
//     id: '43',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'HighFashion',
//     userAvatar: 'https://i.pravatar.cc/100?img=43',
//     likes: 834,
//     tags: ['high', 'fashion'],
//   },
//   {
//     id: '44',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'RetroQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=44',
//     likes: 445,
//     tags: ['retro', 'queen'],
//   },
//   {
//     id: '45',
//     imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
//     userName: 'EdgeLord',
//     userAvatar: 'https://i.pravatar.cc/100?img=45',
//     likes: 623,
//     tags: ['edge', 'dark'],
//   },
//   {
//     id: '46',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'NeutralTones',
//     userAvatar: 'https://i.pravatar.cc/100?img=46',
//     likes: 512,
//     tags: ['neutral', 'tones'],
//   },
//   {
//     id: '47',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'PartyPrincess',
//     userAvatar: 'https://i.pravatar.cc/100?img=47',
//     likes: 789,
//     tags: ['party', 'princess'],
//   },
//   {
//     id: '48',
//     imageUrl:
//       'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
//     userName: 'LazyDays',
//     userAvatar: 'https://i.pravatar.cc/100?img=48',
//     likes: 345,
//     tags: ['lazy', 'chill'],
//   },
//   {
//     id: '49',
//     imageUrl:
//       'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=400',
//     userName: 'PowerDress',
//     userAvatar: 'https://i.pravatar.cc/100?img=49',
//     likes: 678,
//     tags: ['power', 'dress'],
//   },
//   {
//     id: '50',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'LovelyDate',
//     userAvatar: 'https://i.pravatar.cc/100?img=50',
//     likes: 534,
//     tags: ['date', 'lovely'],
//   },
//   {
//     id: '51',
//     imageUrl:
//       'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
//     userName: 'ShoppingSpree',
//     userAvatar: 'https://i.pravatar.cc/100?img=51',
//     likes: 456,
//     tags: ['shopping', 'spree'],
//   },
//   {
//     id: '52',
//     imageUrl:
//       'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
//     userName: 'FestivalQueen',
//     userAvatar: 'https://i.pravatar.cc/100?img=52',
//     likes: 623,
//     tags: ['festival', 'queen'],
//   },
//   {
//     id: '53',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'ClassAct',
//     userAvatar: 'https://i.pravatar.cc/100?img=53',
//     likes: 712,
//     tags: ['class', 'act'],
//   },
//   {
//     id: '54',
//     imageUrl:
//       'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
//     userName: 'BeachBabe',
//     userAvatar: 'https://i.pravatar.cc/100?img=54',
//     likes: 567,
//     tags: ['beach', 'babe'],
//   },
//   {
//     id: '55',
//     imageUrl:
//       'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400',
//     userName: 'CitySlicker',
//     userAvatar: 'https://i.pravatar.cc/100?img=55',
//     likes: 489,
//     tags: ['city', 'slick'],
//   },
//   {
//     id: '56',
//     imageUrl:
//       'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400',
//     userName: 'TimelessBeauty',
//     userAvatar: 'https://i.pravatar.cc/100?img=56',
//     likes: 834,
//     tags: ['timeless', 'beauty'],
//   },
//   {
//     id: '57',
//     imageUrl: 'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=400',
//     userName: 'ClubNights',
//     userAvatar: 'https://i.pravatar.cc/100?img=57',
//     likes: 456,
//     tags: ['club', 'nights'],
//   },
//   {
//     id: '58',
//     imageUrl: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400',
//     userName: 'AthleticEdge',
//     userAvatar: 'https://i.pravatar.cc/100?img=58',
//     likes: 523,
//     tags: ['athletic', 'edge'],
//   },
//   {
//     id: '59',
//     imageUrl:
//       'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400',
//     userName: 'SoftGlow',
//     userAvatar: 'https://i.pravatar.cc/100?img=59',
//     likes: 612,
//     tags: ['soft', 'glow'],
//   },
//   {
//     id: '60',
//     imageUrl:
//       'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
//     userName: 'StatementPiece',
//     userAvatar: 'https://i.pravatar.cc/100?img=60',
//     likes: 789,
//     tags: ['statement', 'piece'],
//   },
//   {
//     id: '61',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'ComfortZone',
//     userAvatar: 'https://i.pravatar.cc/100?img=61',
//     likes: 378,
//     tags: ['comfort', 'zone'],
//   },
//   {
//     id: '62',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400',
//     userName: 'NeonDreams',
//     userAvatar: 'https://i.pravatar.cc/100?img=62',
//     likes: 645,
//     tags: ['neon', '90s'],
//   },
//   {
//     id: '63',
//     imageUrl: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=400',
//     userName: 'GreenStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=63',
//     likes: 489,
//     tags: ['green', 'eco'],
//   },
//   {
//     id: '64',
//     imageUrl:
//       'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=400',
//     userName: 'JeanGenius',
//     userAvatar: 'https://i.pravatar.cc/100?img=64',
//     likes: 567,
//     tags: ['jean', 'genius'],
//   },
//   {
//     id: '65',
//     imageUrl:
//       'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=400',
//     userName: 'AutumnVibes',
//     userAvatar: 'https://i.pravatar.cc/100?img=65',
//     likes: 512,
//     tags: ['autumn', 'vibes'],
//   },
//   {
//     id: '66',
//     imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400',
//     userName: 'AllBlackEverything',
//     userAvatar: 'https://i.pravatar.cc/100?img=66',
//     likes: 723,
//     tags: ['allblack', 'sleek'],
//   },
//   {
//     id: '67',
//     imageUrl: 'https://images.unsplash.com/photo-1544957992-20514f595d6f?w=400',
//     userName: 'PatternPlay',
//     userAvatar: 'https://i.pravatar.cc/100?img=67',
//     likes: 456,
//     tags: ['pattern', 'play'],
//   },
//   {
//     id: '68',
//     imageUrl:
//       'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
//     userName: 'CEOStyle',
//     userAvatar: 'https://i.pravatar.cc/100?img=68',
//     likes: 534,
//     tags: ['ceo', 'boss'],
//   },
//   {
//     id: '69',
//     imageUrl:
//       'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400',
//     userName: 'SundayBest',
//     userAvatar: 'https://i.pravatar.cc/100?img=69',
//     likes: 623,
//     tags: ['sunday', 'best'],
//   },
//   {
//     id: '70',
//     imageUrl:
//       'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400',
//     userName: 'FloralFancy',
//     userAvatar: 'https://i.pravatar.cc/100?img=70',
//     likes: 678,
//     tags: ['floral', 'fancy'],
//   },
//   {
//     id: '71',
//     imageUrl:
//       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
//     userName: 'JetSetter',
//     userAvatar: 'https://i.pravatar.cc/100?img=71',
//     likes: 834,
//     tags: ['jet', 'setter'],
//   },
//   {
//     id: '72',
//     imageUrl:
//       'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
//     userName: 'GlamSquad',
//     userAvatar: 'https://i.pravatar.cc/100?img=72',
//     likes: 912,
//     tags: ['glam', 'squad'],
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
//     },

//     cardContent: {
//       padding: 6,
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
//       fontSize: fontScale(tokens.fontSize.xs),
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
//       fontSize: LIKE_COUNT_SIZE,
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
//             <LinearGradient colors={['transparent', 'rgba(0, 0, 0, 1)']}>
//               <View style={styles.cardContent}>
//                 <View style={styles.cardUserRow}>
//                   <Image
//                     source={{uri: post.userAvatar}}
//                     style={styles.cardAvatar}
//                   />
//                   <Text style={styles.cardUserName}>@{post.userName}</Text>
//                 </View>
//                 <View style={styles.cardActions}>
//                   <View style={styles.cardTags}>
//                     {post.tags.slice(0, 2).map(tag => (
//                       <Text key={tag} style={styles.cardTag}>
//                         #{tag}
//                       </Text>
//                     ))}
//                   </View>
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => toggleLike(post.id)}
//                     style={styles.likeButton}>
//                     <MaterialIcons
//                       name={isLiked ? 'favorite' : 'favorite-border'}
//                       size={HEART_ICON_SIZE}
//                       color={isLiked ? '#FF4D6D' : '#fff'}
//                     />
//                     <Text style={styles.likeCount}>
//                       {isLiked ? post.likes + 1 : post.likes}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </View>
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
