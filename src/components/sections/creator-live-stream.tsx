'use client';

import type { CreatorLiveStream } from '@/types';

interface CreatorLiveStreamProps {
  stream: CreatorLiveStream;
}

function parseUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

function getTwitchChannel(channelUrl: string): string | null {
  const url = parseUrl(channelUrl);
  if (!url || !['twitch.tv', 'www.twitch.tv'].includes(url.hostname.toLowerCase())) {
    return null;
  }

  const channel = url.pathname.split('/').filter(Boolean)[0];
  return channel && /^[a-z\d_]{1,25}$/i.test(channel) ? channel : null;
}

function getYouTubeVideoId(value: string): string | null {
  if (/^[\w-]{6,20}$/.test(value)) return value;

  const url = parseUrl(value);
  if (!url || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname.toLowerCase())) {
    return null;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  const videoId = url.hostname.toLowerCase() === 'youtu.be'
    ? segments[0]
    : url.pathname === '/watch'
      ? url.searchParams.get('v')
      : ['live', 'embed', 'shorts'].includes(segments[0])
        ? segments[1]
        : null;

  return videoId && /^[\w-]{6,20}$/.test(videoId) ? videoId : null;
}

function getYouTubeChannelId(channelUrl: string): string | null {
  const url = parseUrl(channelUrl);
  if (!url || !['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname.toLowerCase())) {
    return null;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  const channelId = segments[0] === 'channel' ? segments[1] : null;
  return channelId && /^UC[\w-]{20,}$/.test(channelId) ? channelId : null;
}

function isSupportedReplayUrl(value: string, platform: CreatorLiveStream['platform']): boolean {
  const url = parseUrl(value);
  if (!url) return false;
  const hostname = url.hostname.toLowerCase();

  if (platform === 'twitch') {
    return ['twitch.tv', 'www.twitch.tv'].includes(hostname) && /^\/videos\/\d+/.test(url.pathname);
  }
  return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(hostname)
    && Boolean(getYouTubeVideoId(value));
}

export function CreatorLiveStreamSection({ stream }: CreatorLiveStreamProps): JSX.Element {
  const channelUrl = parseUrl(stream.channelUrl);
  const twitchChannel = stream.platform === 'twitch' ? getTwitchChannel(stream.channelUrl) : null;
  const youtubeVideoId = stream.platform === 'youtube'
    ? getYouTubeVideoId(stream.videoId ?? stream.channelUrl)
    : null;
  const youtubeChannelId = stream.platform === 'youtube'
    ? getYouTubeChannelId(stream.channelUrl)
    : null;
  const host = typeof window === 'undefined' ? '' : window.location.hostname;
  const playerUrl = stream.platform === 'twitch' && twitchChannel && host
    ? `https://player.twitch.tv/?channel=${encodeURIComponent(twitchChannel)}&parent=${encodeURIComponent(host)}&muted=true`
    : stream.platform === 'youtube' && youtubeVideoId
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeVideoId)}`
      : stream.platform === 'youtube' && youtubeChannelId
        ? `https://www.youtube-nocookie.com/embed/live_stream?channel=${encodeURIComponent(youtubeChannelId)}`
        : null;
  const chatUrl = stream.platform === 'twitch' && twitchChannel && host
    ? `https://www.twitch.tv/embed/${encodeURIComponent(twitchChannel)}/chat?parent=${encodeURIComponent(host)}`
    : stream.platform === 'youtube' && youtubeVideoId && host
      ? `https://www.youtube.com/live_chat?v=${encodeURIComponent(youtubeVideoId)}&embed_domain=${encodeURIComponent(host)}`
      : null;
  const replayUrl = stream.replayUrl && isSupportedReplayUrl(stream.replayUrl, stream.platform)
    ? stream.replayUrl
    : null;
  const platformName = stream.platform === 'twitch' ? 'Twitch' : 'YouTube';
  const viewerCount = Number.isSafeInteger(stream.viewerCount) && (stream.viewerCount ?? -1) >= 0
    ? stream.viewerCount
    : null;

  return (
    <section aria-label={`${platformName} stream`} className="border-b bg-card">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">Live stream</h2>
            <span className={`inline-flex items-center gap-2 text-xs font-semibold ${stream.isLive ? 'text-red-600' : 'text-muted-foreground'}`}>
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${stream.isLive ? 'bg-red-600' : 'bg-muted-foreground'}`} />
              {stream.isLive ? 'LIVE' : 'OFFLINE'}
            </span>
            {stream.isLive && viewerCount !== null && (
              <span className="text-sm text-muted-foreground" aria-label={`${viewerCount} viewers`}>
                {viewerCount.toLocaleString()} viewers
              </span>
            )}
          </div>
          {channelUrl && (
            <a href={channelUrl.href} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
              Open on {platformName}
            </a>
          )}
        </div>

        {stream.isLive && playerUrl ? (
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
            <iframe
              title={`${platformName} live video`}
              src={playerUrl}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="aspect-video w-full border-0 bg-black"
            />
            {chatUrl ? (
              <iframe
                title={`${platformName} live chat`}
                src={chatUrl}
                loading="lazy"
                className="h-[420px] w-full border bg-background"
              />
            ) : (
              <p className="flex min-h-32 items-center justify-center border p-4 text-sm text-muted-foreground">
                Live chat is unavailable for this stream.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 border bg-background p-4">
            <p className="text-sm text-muted-foreground">
              {stream.isLive
                ? `The ${platformName} player is not available for this channel.`
                : 'This creator is not streaming right now.'}
            </p>
            {replayUrl && (
              <a href={replayUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">
                Watch replay
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}