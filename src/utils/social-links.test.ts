import { describe, expect, it } from 'vitest';
import { normalizeSocialLinks, validateSocialUrl } from './social-links';

describe('social links', () => {
  it('accepts secure URLs on supported hosts', () => {
    expect(validateSocialUrl('youtube', 'https://youtube.com/@dorisio')).toBe(true);
  });
  it('rejects lookalike and insecure URLs', () => {
    expect(validateSocialUrl('twitter', 'http://twitter.com/dorisio')).toBe(false);
    expect(validateSocialUrl('twitter', 'https://twitter.com.evil.test/dorisio')).toBe(false);
  });
  it('normalizes only valid links', () => {
    expect(normalizeSocialLinks({ instagram: 'https://instagram.com/dorisio', tiktok: 'not-a-url' })).toEqual({ instagram: 'https://instagram.com/dorisio' });
  });
});
