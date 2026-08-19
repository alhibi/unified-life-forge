import { describe, expect, it } from 'vitest';
import { GENDER_LABELS_AR, REGISTER_LABELS_AR, REJECTION_REASON_LABELS_AR } from '../types';

describe('Furnace Console v2 Types and Constants', () => {
  it('should contain correct Arabic labels for registers and gender', () => {
    expect(REGISTER_LABELS_AR.formal).toBe('رسمي');
    expect(REGISTER_LABELS_AR.neutral).toBe('محايد');
    expect(REGISTER_LABELS_AR.informal).toBe('غير رسمي');
    expect(REGISTER_LABELS_AR.slang).toBe('عامي / سلاج');
    expect(GENDER_LABELS_AR.der).toBe('مذكر');
    expect(GENDER_LABELS_AR.die).toBe('مؤنث');
    expect(GENDER_LABELS_AR.das).toBe('محايد');
    expect(GENDER_LABELS_AR.plural).toBe('جمع');
  });

  it('should map rejection reasons to Arabic descriptions', () => {
    expect(REJECTION_REASON_LABELS_AR.duplicate).toBe('مكرر في الرف');
    expect(REJECTION_REASON_LABELS_AR.gender_uncertain).toBe('جنس غير دقيق (Gender)');
    expect(REJECTION_REASON_LABELS_AR.register_mismatch).toBe('خارج السجل المحدد');
    expect(REJECTION_REASON_LABELS_AR.shelf_mismatch).toBe('غير متوافق مع الموقف');
    expect(REJECTION_REASON_LABELS_AR.low_confidence).toBe('ثقة/جودة منخفضة');
  });

  it('should compute furnace hunger ratio correctly', () => {
    const calculateHungerRatio = (currentCount: number, targetCount = 25) => {
      const ratio = 1 - currentCount / Math.max(targetCount, 1);
      return Math.min(Math.max(ratio, 0.2), 1.0);
    };

    expect(calculateHungerRatio(0, 25)).toBe(1.0);
    expect(calculateHungerRatio(25, 25)).toBe(0.2); // clamped minimum banked ember
    expect(calculateHungerRatio(30, 25)).toBe(0.2);
    expect(calculateHungerRatio(10, 20)).toBe(0.5);
  });
});
