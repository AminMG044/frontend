'use client';

import { useState, useEffect } from 'react';
import { Notification, NotificationType } from '@/types';
import { useDorisio } from 'dorisio-sdk/react';

export function useNotifications(userId?: string) {
  const { client } = useDorisio();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchNotifications() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const data = await client.getNotifications(userId);
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, [userId, client]);

  const markAsRead = async (notificationId: string) => {
    try {
      await client.markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await client.markAllNotificationsAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const filterByType = (type: NotificationType) => {
    return notifications.filter((n) => n.type === type);
  };

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    filterByType,
  };
}
