import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GenerateOutfitsDto } from './generate-outfits.dto';

/** Helper: transform plain object into DTO instance and validate */
async function validateDto(plain: Record<string, any>) {
  const dto = plainToInstance(GenerateOutfitsDto, plain);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('GenerateOutfitsDto', () => {
  // ──────────────────────────────────────────────
  // PASS cases
  // ──────────────────────────────────────────────

  it('valid minimal payload (query only)', async () => {
    const errors = await validateDto({ query: 'casual outfit for brunch' });
    expect(errors).toHaveLength(0);
  });

  it('valid full payload matching frontend shape', async () => {
    const errors = await validateDto({
      query: 'casual outfit',
      topK: 20,
      useWeather: true,
      useFastMode: true,
      aaaaMode: false,
      styleAgent: 'agent1',
      session_id: 'abc-123',
      refinementPrompt: 'more colorful',
      lockedItemIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
      useFeedback: true,
      style_profile: { preferredColors: ['navy'] },
      weights: { constraintsWeight: 1.0, styleWeight: 0.5, weatherWeight: 0.8 },
      weather: { tempF: 72, precipitation: 'none' },
      user_id: 'frontend-sends-this',
    });
    expect(errors).toHaveLength(0);
  });

  // ──────────────────────────────────────────────
  // FAIL cases
  // ──────────────────────────────────────────────

  it('rejects missing query', async () => {
    const errors = await validateDto({});
    const queryErrors = errors.filter((e) => e.property === 'query');
    expect(queryErrors.length).toBeGreaterThan(0);
  });

  it('rejects empty query', async () => {
    const errors = await validateDto({ query: '' });
    const queryErrors = errors.filter((e) => e.property === 'query');
    expect(queryErrors.length).toBeGreaterThan(0);
  });

  it('rejects non-UUID in lockedItemIds', async () => {
    const errors = await validateDto({
      query: 'test',
      lockedItemIds: ['not-a-uuid'],
    });
    const lockErrors = errors.filter((e) => e.property === 'lockedItemIds');
    expect(lockErrors.length).toBeGreaterThan(0);
  });

  it('accepts valid UUIDs in lockedItemIds', async () => {
    const errors = await validateDto({
      query: 'test',
      lockedItemIds: [
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '550e8400-e29b-41d4-a716-446655440000',
      ],
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid styleAgent value', async () => {
    const errors = await validateDto({
      query: 'test',
      styleAgent: 'agent99',
    });
    const agentErrors = errors.filter((e) => e.property === 'styleAgent');
    expect(agentErrors.length).toBeGreaterThan(0);
  });

  it('rejects topK below min', async () => {
    const errors = await validateDto({ query: 'test', topK: 0 });
    const topKErrors = errors.filter((e) => e.property === 'topK');
    expect(topKErrors.length).toBeGreaterThan(0);
  });

  it('rejects topK above max', async () => {
    const errors = await validateDto({ query: 'test', topK: 100 });
    const topKErrors = errors.filter((e) => e.property === 'topK');
    expect(topKErrors.length).toBeGreaterThan(0);
  });

  it('rejects non-boolean useFastMode', async () => {
    const errors = await validateDto({ query: 'test', useFastMode: 'yes' });
    const modeErrors = errors.filter((e) => e.property === 'useFastMode');
    expect(modeErrors.length).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────
  // Whitelisting
  // ──────────────────────────────────────────────

  it('rejects unknown fields when forbidNonWhitelisted is true', async () => {
    const errors = await validateDto({
      query: 'test',
      malicious_field: 'drop table;',
    });
    const unknownErrors = errors.filter(
      (e) => e.property === 'malicious_field',
    );
    expect(unknownErrors.length).toBeGreaterThan(0);
  });
});
