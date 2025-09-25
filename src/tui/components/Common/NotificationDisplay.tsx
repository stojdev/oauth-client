import React from 'react';
import { Box, Text } from 'ink';
import { useNotification, NotificationType } from '../../hooks/useNotification.js';

const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case 'success': return 'green';
    case 'error': return 'red';
    case 'warning': return 'yellow';
    case 'info': return 'blue';
    default: return 'white';
  }
};

const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
    default: return '📢';
  }
};

export const NotificationDisplay: React.FC = () => {
  const { notifications } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" position="absolute" marginTop={2} marginLeft={2}>
      {notifications.slice(-3).map((notification) => (
        <Box
          key={notification.id}
          borderStyle="round"
          borderColor={getNotificationColor(notification.type)}
          paddingX={1}
          marginBottom={1}
        >
          <Box flexDirection="row">
            <Text>{getNotificationIcon(notification.type)} </Text>
            <Text color={getNotificationColor(notification.type)}>
              {notification.message}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};