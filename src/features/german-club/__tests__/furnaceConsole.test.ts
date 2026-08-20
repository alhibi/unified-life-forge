import { describe, expect, it } from 'vitest';
import { GENDER_LABELS_AR, REGISTER_LABELS_AR, REJECTION_REASON_LABELS_AR } from '../types';

describe('Furnace Console v2 Types and Constants', () => {
  it('should contain correct Arabic labels for registers and gender', () => {
    expect(REGISTER_LABELS_AR.formal).toBe('رسمي');
    expect(REGISTER_LABELS_AR.informal).toBe('غير رسمي');
    expect(REGISTER_LABELS_AR.slang).toBe('عامي / سلاج');
    expect(GENDER_LABELS_AR.der).toBe('مذكر');
    expect(GENDER_LABELS_AR.die).toBe('مؤنث');
    expect(GENDER_LABELS_AR.das).toBe('محايد');
  });

  it('should map rejection reasons to Arabic descriptions', () => {
    expect(REJECTION_REASON_LABELS_AR.duplicate).toBe('مكرر في الرف');
    expect(REJECTION_REASON_LABELS_AR.gender_uncertain).toBe('جنس غير دقيق (Gender)');
    expect(REJECTION_REASON_LABELS_AR.register_mismatch).toBe('خارج السجل المحدد');
    expect(REJECTION_REASON_LABELS_AR.low_confidence).toBe('ثقة/جودة منخفضة');
  });

  it('should support strictness levels and generation modes', () => {
    const validModes = ['model_capacity', 'fixed_count'];
    const validStrictness = ['balanced', 'strict', 'very_strict'];

    expect(validModes).toContain('model_capacity');
    expect(validModes).toContain('fixed_count');
    expect(validStrictness).toContain('balanced');
    expect(validStrictness).toContain('strict');
    expect(validStrictness).toContain('very_strict');
  });
});
