import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CreatorLiveStreamSection } from './creator-live-stream';

describe('CreatorLiveStreamSection', () => {
  it('embeds Twitch video and chat with the current hostname', () => {
    render(
      <CreatorLiveStreamSection
        stream={{
          platform: 'twitch',
          channelUrl: 'https://www.twitch.tv/creator_one',
          isLive: true,
          viewerCount: 1250,
        }}
      />,
    );

    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(screen.getByLabelText('1,250 viewers')).toBeInTheDocument();
    expect(screen.getByTitle('Twitch live video').getAttribute('src')).toContain('channel=creator_one');
    expect(screen.getByTitle('Twitch live video').getAttribute('src')).toContain('parent=localhost');
    expect(screen.getByTitle('Twitch live chat').getAttribute('src')).toContain('creator_one/chat');
  });

  it('embeds YouTube live video and chat from the configured video id', () => {
    render(
      <CreatorLiveStreamSection
        stream={{
          platform: 'youtube',
          channelUrl: 'https://www.youtube.com/@creator',
          videoId: 'abc123XYZ_-',
          isLive: true,
        }}
      />,
    );

    expect(screen.getByTitle('YouTube live video').getAttribute('src')).toContain('/embed/abc123XYZ_-');
    expect(screen.getByTitle('YouTube live chat').getAttribute('src')).toContain('v=abc123XYZ_-');
  });

  it('does not embed unsupported URLs and shows a valid offline replay', () => {
    render(
      <CreatorLiveStreamSection
        stream={{
          platform: 'twitch',
          channelUrl: 'javascript:alert(1)',
          isLive: false,
          viewerCount: -10,
          replayUrl: 'https://www.twitch.tv/videos/123456',
        }}
      />,
    );

    expect(screen.getByText('OFFLINE')).toBeInTheDocument();
    expect(screen.getByText('This creator is not streaming right now.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Watch replay' })).toHaveAttribute(
      'href',
      'https://www.twitch.tv/videos/123456',
    );
    expect(screen.queryByTitle(/live video|live chat/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/viewers/)).not.toBeInTheDocument();
  });
});