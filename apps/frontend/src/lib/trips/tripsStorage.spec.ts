import {updateTrip} from './tripsStorage';
import {Trip} from '../../types/trips';
import {apiClient} from '../apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../apiClient', () => ({
  apiClient: {
    patch: jest.fn().mockResolvedValue({data: {}}),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue('[]'),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const makeTripWithCapsule = (overrides?: Partial<Trip>): Trip => ({
  id: 'trip-1',
  destination: 'Paris',
  startDate: '2026-03-01',
  endDate: '2026-03-05',
  activities: ['sightseeing'],
  capsule: {
    version: 1,
    build_id: 'build-1',
    fingerprint: 'fp-1',
    outfits: [],
    packingList: [
      {
        category: 'Tops',
        items: [
          {id: 'i1', wardrobeItemId: 'w1', name: 'T-Shirt', mainCategory: 'Tops', packed: false},
          {id: 'i2', wardrobeItemId: 'w2', name: 'Blouse', mainCategory: 'Tops', packed: false},
        ],
      },
    ],
  },
  ...overrides,
} as Trip);

const makeWipedTrip = (): Trip => ({
  id: 'trip-1',
  destination: 'Paris',
  startDate: '2026-03-01',
  endDate: '2026-03-05',
  activities: ['sightseeing'],
  capsule: null,
} as unknown as Trip);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('updateTrip – empty capsule guard', () => {
  it('must NOT call network PATCH when items=[] and capsule=null', async () => {
    const wiped = makeWipedTrip();
    const result = await updateTrip(wiped);

    expect(apiClient.patch).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('MUST call network PATCH when items>0 and capsule present', async () => {
    const trip = makeTripWithCapsule();
    const result = await updateTrip(trip);

    expect(apiClient.patch).toHaveBeenCalledTimes(1);
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/trips/trip-1/items',
      expect.objectContaining({
        items: [
          {wardrobeItemId: 'w1'},
          {wardrobeItemId: 'w2'},
        ],
        capsule: expect.objectContaining({build_id: 'build-1'}),
      }),
    );
    expect(result).toBe(true);
  });

  it('still writes to AsyncStorage even when guard blocks network PATCH', async () => {
    const wiped = makeWipedTrip();
    // Seed storage with an existing trip so findIndex succeeds
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify([{id: 'trip-1', destination: 'Paris'}]),
    );
    await updateTrip(wiped);

    expect(AsyncStorage.setItem).toHaveBeenCalled();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });
});
