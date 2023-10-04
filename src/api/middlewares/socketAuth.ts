import jwt from 'jsonwebtoken';
import config from '../../config';

const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token || null;

  jwt.verify(token, config.jwtSecret, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.decodedJwt = decoded;
    next();
  });
};

export default authenticateSocket;
