import { describe, expect, it } from 'vitest';
import { GENDER_LABELS_AR, REGISTER_LABELS_AR, REJECTION_REASON_LABELS_AR } from '../types';

describe('Furnace Console v2 Types and Constants', () => {
  it('should contain correct Arabic labels for registers and gender', () => {
    expect(REGISTER_LABELS_AR.formal).toBe('رسمي');
    expect(REGISTER_LABELS_AR.informal).toBe('غير رسمي');
    expect(GENDER_LABELS_AR.der).toBe('مذكر');
    expect(GENDER_LABELS_AR.die).toBe('مؤنث');
  });

  it('should map rejection reasons to Arabic descriptions', () => {
    expect(REJECTION_REASON_LABELS_AR.duplicate).toBe('مكرر في الرف');
    expect(REJECTION_REASON_LABELS_AR.gender_uncertain).toBe('جنس غير دقيق (Gender)');
    expect(REJECTION_REASON_LABELS_AR.register_mismatch).toBe('خارج السجل المحدد');
    expect(REJECTION_REASON_LABELS_AR.low_confidence).toBe('ثقة/جودة منخفضة');
  });
});
