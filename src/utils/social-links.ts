import type { SocialLinks } from '@/types';

export const SOCIAL_PLATFORMS = ['twitter', 'youtube', 'instagram', 'tiktok'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
const hosts: Record<SocialPlatform, string[]> = { twitter: ['twitter.com', 'x.com'], youtube: ['youtube.com', 'youtu.be'], instagram: ['instagram.com'], tiktok: ['tiktok.com'] };

export function validateSocialUrl(platform: SocialPlatform, value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'https:' && hosts[platform].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)); } catch { return false; }
}

export function normalizeSocialLinks(input: Partial<SocialLinks>): SocialLinks {
  return Object.fromEntries(SOCIAL_PLATFORMS.flatMap((platform) => input[platform] && validateSocialUrl(platform, input[platform]!) ? [[platform, input[platform]]] : [])) as SocialLinks;
}
