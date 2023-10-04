import AWS from 'aws-sdk';
import config from '../config';

AWS.config.update({
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  },
  region: config.awsRegion,
});
const sqs = new AWS.SQS();

export const enqueueNotification = async (notificationData: {
  notification: { body: string; title: string };
  priority: string;
  data: { body: string; title: string; click_action: string; sound: string };
  to: string;
}): Promise<void> => {
  try {
    await sqs
      .sendMessage({
        QueueUrl: config.sqsConfigURL,
        MessageBody: JSON.stringify(notificationData),
      })
      .promise();
    console.log('Notification enqueued:', notificationData);
  } catch (error) {
    console.error('Error enqueuing notification:', error);
  }
};
