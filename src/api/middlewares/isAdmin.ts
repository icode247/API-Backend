/**
 * Attach user to req.currentUser
 * @param {*} req Express req Object
 * @param {*} res  Express res Object
 * @param {*} next  Express next Function
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const isAdmin = async (req, res, next) => {
  if (!req.currentUser.isAdmin) {
    return res.sendStatus(401);
  }
  return next();
};

export default isAdmin;
