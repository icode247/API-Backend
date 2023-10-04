import { expressjwt as jwt } from 'express-jwt';
import config from '../../config';

/**
 * We are assuming that the JWT will come in a header with the form
 *
 * Authorization: Bearer ${JWT}
 *
 * But it could come in a query parameter with the name that you want like
 * GET https://sitename.com/stats?apiKey=${JWT}
 */
const getTokenFromHeader = req => {
  /**
   * @TODO Edge and Internet Explorer do some weird things with the headers
   * So I believe that this should handle more 'edge' cases ;)
   */
  if (
    (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Token') ||
    (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer')
  ) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

const isAuth = jwt({
  secret: config.jwtSecret,
  algorithms: [config.jwtAlgorithm],
  requestProperty: 'token',
  getToken: getTokenFromHeader,
});

export default isAuth;
