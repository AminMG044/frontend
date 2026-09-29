'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useNotifications } from '@/hooks/use-notifications';
import { Notification, NotificationType } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/formatters';
import { Check, CheckCheck, Filter } from 'lucide-react';

export default function NotificationsPage() {
  const user = useAuthStore((state) => state.user);
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, filterByType } =
    useNotifications(user?.id);
  const [selectedType, setSelectedType] = useState<NotificationType | 'all'>('all');

  const filteredNotifications =
    selectedType === 'all' ? notifications : filterByType(selectedType);

  const types: (NotificationType | 'all')[] = [
    'all',
    'tip',
    'subscription',
    'milestone',
    'collaboration',
    'system',
  ];

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'tip':
        return '💰';
      case 'subscription':
        return '⭐';
      case 'milestone':
        return '🎉';
      case 'system':
        return '🔔';
      case 'collaboration':
        return '🤝';
      default:
        return '📬';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline" size="sm">
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {types.map((type) => (
          <Button
            key={type}
            variant={selectedType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType(type)}
            className="capitalize whitespace-nowrap"
          >
            <Filter className="w-4 h-4 mr-2" />
            {type}
          </Button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No notifications</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-4 transition-colors ${
                !notification.read ? 'bg-primary/5 border-primary' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{notification.title}</h3>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="flex-shrink-0"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(notification.createdAt)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
