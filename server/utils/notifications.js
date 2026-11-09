import { prisma } from '../config/db.js';

/**
 * Send an Expo Push Notification to a user via Expo's HTTP push API
 * Handles token formatting, silent delivery failure prevention, and logging
 * @param {string} userId - User CUID
 * @param {object} payload - { title, body, data }
 */
export async function sendPushNotificationToUser(userId, { title, body, data = {} }) {
  try {
    if (!userId) return false;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true, name: true },
    });

    if (!user || !user.pushToken) {
      return false;
    }

    const token = user.pushToken.trim();
    // Validate Expo push token format (ExponentPushToken[...] or ExpoPushToken[...])
    if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
      return false;
    }

    const message = {
      to: token,
      sound: 'default',
      title: title || 'KIRSAB',
      body: body || '',
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
      channelId: 'kirsab_orders',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error sending push notification to user:', userId, err.message);
    return false;
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToUsers(userIds = [], { title, body, data = {} }) {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];
  const results = await Promise.allSettled(
    userIds.map((id) => sendPushNotificationToUser(id, { title, body, data }))
  );
  return results;
}

