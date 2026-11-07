/**
 * Which grade scale a report card is printed on. No database: the real Prisma
 * module is replaced before it loads, and every function under test takes the
 * client as an argument, so a hand-written fake stands in for it.
 */
jest.mock('../../config/database', () => ({}));

const { getDefaultScale, getScaleResolver } = require('../gradeScale.service');
const { LEGACY_SLC_9_BAND } = require('../../utils/gradeScale');

// A Prisma-shaped row: column names and Decimal-like strings.
const row = (id, name, preset, { isDefault = false } = {}) => ({
  id,
  name,
  isDefault,
  passPercent: String(preset.passPercent),
  bands: preset.bands.map((b) => ({
    minPercent: String(b.min),
    maxPercent: String(b.max),
    grade: b.grade,
    gradePoint: String(b.gpa),
    description: b.description,
    isPassing: b.isPassing,
  })),
});

const fakeDb = (rows) => ({
  gradeScale: {
    findFirst: jest.fn(async ({ where }) =>
      rows.find((r) => r.isDefault === where.isDefault) || null,
    ),
    findMany: jest.fn(async () => rows),
  },
});

const legacyDefault = row(5, 'Legacy SLC (9-band)', LEGACY_SLC_9_BAND, { isDefault: true });

describe('getDefaultScale', () => {
  it('returns the school default, normalized', async () => {
    const scale = await getDefaultScale(1, fakeDb([legacyDefault]));
    expect(scale.id).toBe(5);
    expect(scale.bands).toHaveLength(9);
    expect(scale.bands[0]).toMatchObject({ min: 90, max: 100, grade: 'A+', gpa: 4 });
  });

  it('falls back to the built-in NEB scale when the school has none', async () => {
    const scale = await getDefaultScale(1, fakeDb([]));
    expect(scale.id).toBeNull();
    expect(scale.failGrade).toBe('NG');
    expect(scale.passPercent).toBe(35);
  });

  it('ignores a default scale that has no bands', async () => {
    const empty = { ...legacyDefault, bands: [] };
    const scale = await getDefaultScale(1, fakeDb([empty]));
    expect(scale.id).toBeNull();
  });
});

describe('getScaleResolver', () => {
  it('uses the scale a card was generated with, not the current default', async () => {
    const neb = { ...legacyDefault, id: 4, name: 'Old', isDefault: false };
    const { defaultScale, forReportCard } = await getScaleResolver(1, fakeDb([neb, legacyDefault]));
    expect(defaultScale.id).toBe(5);
    expect(forReportCard({ gradeScaleId: 4 }).id).toBe(4);
  });

  it('keeps a card from before grade scales existed on NEB 8-band', async () => {
    const { forReportCard } = await getScaleResolver(1, fakeDb([legacyDefault]));
    const scale = forReportCard({ gradeScaleId: null });
    expect(scale.id).toBeNull();
    expect(scale.bands).toHaveLength(8);
  });

  it('previews a student with no card on the school default', async () => {
    const { forReportCard } = await getScaleResolver(1, fakeDb([legacyDefault]));
    expect(forReportCard(null).id).toBe(5);
  });
});
