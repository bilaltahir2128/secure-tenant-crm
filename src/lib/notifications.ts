import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 'deal_update' | 'activity_reminder' | 'team_update';

interface NotificationData {
  type: NotificationType;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  data: Record<string, unknown>;
}

export async function sendNotification(notification: NotificationData) {
  const { data, error } = await supabase.functions.invoke('send-notification', {
    body: notification,
  });

  if (error) {
    console.error('Error sending notification:', error);
    throw new Error(error.message || 'Failed to send notification');
  }

  return data;
}

export async function sendDealUpdateNotification(
  recipientEmail: string,
  recipientName: string,
  dealTitle: string,
  stage: string,
  value: number,
  message?: string
) {
  return sendNotification({
    type: 'deal_update',
    recipientEmail,
    recipientName,
    subject: `Deal Update: ${dealTitle}`,
    data: { dealTitle, stage, value, message },
  });
}

export async function sendActivityReminderNotification(
  recipientEmail: string,
  recipientName: string,
  title: string,
  activityType: string,
  dueDate: string,
  description?: string
) {
  return sendNotification({
    type: 'activity_reminder',
    recipientEmail,
    recipientName,
    subject: `Reminder: ${title}`,
    data: { title, activityType, dueDate, description },
  });
}

export async function sendTeamUpdateNotification(
  recipientEmail: string,
  recipientName: string,
  memberName: string,
  action: string,
  role?: string
) {
  return sendNotification({
    type: 'team_update',
    recipientEmail,
    recipientName,
    subject: `Team Update: ${memberName} ${action}`,
    data: { memberName, action, role },
  });
}

export async function sendTestNotification(
  recipientEmail: string,
  recipientName: string
) {
  return sendNotification({
    type: 'deal_update',
    recipientEmail,
    recipientName,
    subject: 'Test Notification from Your CRM',
    data: {
      dealTitle: 'Sample Deal',
      stage: 'Qualified',
      value: 10000,
      message: 'This is a test notification to verify your email settings are working correctly.',
    },
  });
}
