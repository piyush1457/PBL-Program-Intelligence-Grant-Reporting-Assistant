import { describe, it, expect } from 'vitest';
import { classifyRisk, classifyGeography, formatMoMDelta } from '../risk';

describe('Risk Engine — classifyRisk', () => {
  it('should return On Track for values >= 0.75', () => {
    expect(classifyRisk(0.75)).toBe('On Track');
    expect(classifyRisk(0.95)).toBe('On Track');
  });

  it('should return Behind for values between 0.60 and 0.74', () => {
    expect(classifyRisk(0.60)).toBe('Behind');
    expect(classifyRisk(0.74)).toBe('Behind');
  });

  it('should return At Risk for values between 0.35 and 0.59', () => {
    expect(classifyRisk(0.35)).toBe('At Risk');
    expect(classifyRisk(0.59)).toBe('At Risk');
  });

  it('should return Critical for values < 0.35', () => {
    expect(classifyRisk(0.34)).toBe('Critical');
    expect(classifyRisk(0.0)).toBe('Critical');
  });
});

describe('Risk Engine — classifyGeography', () => {
  it('should follow worst-of-three rule: Critical wins over others', () => {
    // 0.8 On Track, 0.9 On Track, 0.2 Critical => should roll up to Critical
    const result = classifyGeography(0.8, 0.9, 0.2);
    expect(result.overallRisk).toBe('Critical');
    expect(result.reason).toContain('average PBL attendance rate');
  });

  it('should follow worst-of-three rule: At Risk wins over Behind & On Track', () => {
    // 0.8 On Track, 0.45 At Risk, 0.65 Behind => should roll up to At Risk
    const result = classifyGeography(0.8, 0.45, 0.65);
    expect(result.overallRisk).toBe('At Risk');
    expect(result.reason).toContain('evidence submission rate');
  });

  it('should return On Track reason when all indicators are On Track', () => {
    const result = classifyGeography(0.8, 0.85, 0.9);
    expect(result.overallRisk).toBe('On Track');
    expect(result.reason).toContain('All indicators are On Track');
  });
});

describe('Month-over-Month Delta — formatMoMDelta', () => {
  it('should handle undefined or null previous values', () => {
    expect(formatMoMDelta(0.8, undefined)).toEqual({ text: '--', direction: 'flat', value: 0 });
  });

  it('should return positive percentage string for increases', () => {
    expect(formatMoMDelta(0.85, 0.80)).toEqual({ text: '+5.0%', direction: 'up', value: expect.any(Number) });
  });

  it('should return negative percentage string for decreases', () => {
    expect(formatMoMDelta(0.70, 0.80)).toEqual({ text: '-10.0%', direction: 'down', value: expect.any(Number) });
  });

  it('should handle flat/neutral changes', () => {
    expect(formatMoMDelta(0.80, 0.80)).toEqual({ text: '0.0%', direction: 'flat', value: 0 });
  });
});
