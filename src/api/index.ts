import { Router } from 'express';
import auth from './routes/auth';
import organization from './routes/organization';
import user from './routes/user';
import administrator from './routes/administrator';
import notifications from './routes/notifications';
import community from './routes/community';
import event from './routes/event';
import posts from './routes/posts';
import donations from './routes/donations';
import message from './routes/conversation';
import analytics from './routes/analytics';

// guaranteed to get dependencies
export default (): Router => {
  const app = Router();
  auth(app);
  user(app);
  organization(app);
  administrator(app);
  notifications(app);
  posts(app);
  community(app);
  event(app);
  donations(app);
  message(app);
  analytics(app);
  return app;
};
