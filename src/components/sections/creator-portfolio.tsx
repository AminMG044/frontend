'use client';

import { useState } from 'react';
import { MediaItem, ExternalLink } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink as ExternalLinkIcon, Play, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';

interface CreatorPortfolioProps {
  mediaItems?: MediaItem[];
  externalLinks?: ExternalLink[];
  isOwner?: boolean;
}

export function CreatorPortfolio({ mediaItems = [], externalLinks = [], isOwner = false }: CreatorPortfolioProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...new Set(mediaItems.map((item) => item.category).filter(Boolean))];

  const filteredItems =
    selectedCategory === 'all' ? mediaItems : mediaItems.filter((item) => item.category === selectedCategory);

  const renderMediaItem = (item: MediaItem) => {
    switch (item.type) {
      case 'image':
        return (
          <div className="relative aspect-square group overflow-hidden rounded-lg">
            <img
              src={item.url}
              alt={item.title || 'Portfolio image'}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            {item.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white text-sm font-medium">{item.title}</p>
              </div>
            )}
          </div>
        );
      case 'video':
        return (
          <div className="relative aspect-video group overflow-hidden rounded-lg bg-muted">
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.title || 'Video thumbnail'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-12 h-12 text-white" />
            </div>
            {item.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white text-sm font-medium">{item.title}</p>
              </div>
            )}
          </div>
        );
      case 'link':
        return (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 border rounded-lg hover:border-primary transition-colors"
          >
            <div className="flex items-start gap-3">
              <LinkIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.title || item.url}</p>
                {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
              </div>
              <ExternalLinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          </a>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* External Links Section */}
      {externalLinks.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-4">Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {externalLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border rounded-lg hover:border-primary transition-colors"
              >
                {link.icon && <span className="text-2xl">{link.icon}</span>}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{link.title}</p>
                </div>
                <ExternalLinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Media Gallery Section */}
      {mediaItems.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Portfolio</h3>
            {categories.length > 1 && (
              <div className="flex gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="capitalize"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <Card className="p-8 text-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No media items in this category</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <div key={item.id}>{renderMediaItem(item)}</div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Empty State */}
      {mediaItems.length === 0 && externalLinks.length === 0 && !isOwner && (
        <Card className="p-8 text-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No portfolio items yet</p>
        </Card>
      )}

      {/* Owner CTA */}
      {mediaItems.length === 0 && externalLinks.length === 0 && isOwner && (
        <Card className="p-8 text-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">Start building your portfolio</p>
          <Button>Add Media or Links</Button>
        </Card>
      )}
    </div>
  );
}
