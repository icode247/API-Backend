import axios from 'axios';
import axiosRetry from 'axios-retry';
import AWS from 'aws-sdk';
import config from './config';

AWS.config.update({
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  },
  region: config.awsRegion,
});

const sqsWorker = new AWS.SQS();

axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
});

const pollQueue = async () => {
  try {
    const { Messages } = await sqsWorker
      .receiveMessage({
        QueueUrl: config.sqsConfigURL,
        MaxNumberOfMessages: 10,
        VisibilityTimeout: 300,
      })
      .promise();

    if (Messages && Messages.length > 0) {
      for (const message of Messages) {
        const notificationData = JSON.parse(message.Body);

        axios
          .post('https://fcm.googleapis.com/fcm/send', notificationData, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `key=${process.env.FCM_SERVER_TOKEN}`,
            },
          })
          .then(response => {
            console.log('Push notification sent: ', response.data);
          })
          .catch(error => {
            console.error('Push notification error: ', error.message);
          });

        await sqsWorker
          .deleteMessage({
            QueueUrl: config.sqsConfigURL,
            ReceiptHandle: message.ReceiptHandle,
          })
          .promise();
      }
      await pollQueue();
    } else {
      setTimeout(pollQueue, 1000);
    }
  } catch (error) {
    console.error('Error processing queue:', error);
    setTimeout(pollQueue, 1000);
  }
};

pollQueue();
