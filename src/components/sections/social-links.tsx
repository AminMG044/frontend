'use client';
import { Instagram, Music2, Twitter, Youtube } from 'lucide-react';
import type { SocialLinks } from '@/types';
import { SOCIAL_PLATFORMS, validateSocialUrl, type SocialPlatform } from '@/utils/social-links';

const icons = { twitter: Twitter, youtube: Youtube, instagram: Instagram, tiktok: Music2 };
const labels = { twitter: 'X / Twitter', youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok' };
export function SocialLinks({ links, editable = false, onChange }: { links: SocialLinks; editable?: boolean; onChange?: (links: SocialLinks) => void }): JSX.Element {
  const set = (platform: SocialPlatform, value: string) => onChange?.({ ...links, [platform]: value || undefined });
  return <section aria-label="Social media links" className="space-y-3"><h3 className="text-lg font-semibold">Social media</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {SOCIAL_PLATFORMS.map((platform) => { const Icon = icons[platform]; const value = links[platform] || ''; return editable ? <label key={platform} className="space-y-1 text-sm"><span>{labels[platform]}</span><input type="url" value={value} placeholder={`https://${platform}.com/...`} onChange={(event) => set(platform, event.target.value)} aria-label={`${labels[platform]} URL`} className="w-full rounded border px-3 py-2" />{value && !validateSocialUrl(platform, value) && <span className="text-xs text-destructive">Enter a valid secure {labels[platform]} URL.</span>}</label> : value && validateSocialUrl(platform, value) ? <a key={platform} href={value} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded border p-3 hover:border-primary" aria-label={`${labels[platform]} profile`}><Icon className="h-5 w-5" aria-hidden="true" /><span>{labels[platform]}</span></a> : null; })}
  </div></section>;
}
