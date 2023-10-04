import { Router, Request, Response, NextFunction } from 'express';
import { celebrate, Joi, Segments } from 'celebrate';
import { Container } from 'typedi';
import { Logger } from 'winston';

import multer from 'multer';
import { fileFilter, s3Storage } from '../../config/multer';
import middlewares from '../middlewares';
import PostService from '../../services/post';
import { ICreatePostInputDTO } from '../../interfaces/IPost';

const route = Router();
const upload = multer({ storage: s3Storage, fileFilter });

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default (app: Router) => {
  app.use('/posts', route);
  /**
   * @swagger
   * components:
   *   schemas:
   *     ReportsResponse:
   *       type: object
   *       properties:
   *         reports:
   *           type: array
   *           items:
   *             $ref: '#/components/schemas/Report'
   *     Report:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *           description: The ID of the report
   *         post:
   *           $ref: '#/components/schemas/Post'
   *         reporter:
   *           $ref: '#/components/schemas/User'
   *         reason:
   *           type: string
   *           description: The reason for the report
   *         createdAt:
   *           type: string
   *           format: date-time
   *           description: The date the report was created
   *     Comment:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *           description: The unique identifier for the comment.
   *         content:
   *           type: string
   *           description: The content of the comment.
   *         replies:
   *           type: array
   *           items:
   *             $ref: '#/components/schemas/Comment'
   *           description: The IDs of the comments on the post.
   *         user:
   *           type: object
   *           properties:
   *             _id:
   *               type: string
   *               description: The unique identifier for the user who created the comment.
   *             username:
   *               type: string
   *               description: The username of the user who created the comment.
   *       example:
   *         _id: 60df68f6b52d6e0015eb9b1a
   *         content: This is a comment.
   *         user:
   *           _id: 60df68f6b52d6e0015eb9b19
   *           username: john_doe
   *     Post:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *           description: The ID of the post.
   *         user:
   *           type: string
   *           description: The user who created the post.
   *         likes:
   *           type: array
   *           items:
   *             type: string
   *           description: The IDs of the users who liked the post.
   *         community:
   *           type: string
   *           description: The ID of the community to which the post belongs.
   *         content:
   *           type: string
   *           description: The content of the post.
   *         comments:
   *           type: array
   *           items:
   *             type: string
   *           description: The IDs of the comments on the post.
   *         attachments:
   *           type: array
   *           items:
   *             type: string
   *           description: The IDs of the attachments on the post.
   */

  /**
   * @swagger
   * /api/posts/community/{communityId}:
   *   get:
   *     summary: Get community posts
   *     description: Returns a list of posts for a specific community.
   *     tags:
   *       - Posts
   *     parameters:
   *       - in: path
   *         name: communityId
   *         required: true
   *         schema:
   *           type: string
   *         description: Id of the community.
   *       - in: query
   *         name: searchQuery
   *         schema:
   *           type: string
   *         description: Optional search query parameter for filtering posts
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         description: Page number for paginated results.
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *         description: Number of items to return per page for paginated results.
   *     responses:
   *       200:
   *         description: List of posts for the specified community.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 posts:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Post'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get(
    '/community/:communityId',
    celebrate({
      [Segments.PARAMS]: Joi.object({
        communityId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const { page, pageSize, searchQuery } = req.query;
        const options = {
          page: parseInt(page?.toString(), 10) || 1,
          pageSize: parseInt(pageSize?.toString(), 10) || 10,
          communityId: req.params.communityId.toString(),
          searchQuery: searchQuery?.toString(),
        };

        const postServiceInstance = Container.get(PostService);
        const posts = await postServiceInstance.getCommunityPosts(options);
        return res.json({ posts }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/posts:
   *   get:
   *     summary: Get all posts
   *     produces:
   *       - application/json
   *     tags:
   *       - Posts
   *     parameters:
   *       - in: query
   *         name: searchQuery
   *         schema:
   *           type: string
   *         description: Optional search query parameter for filtering posts
   *       - name: page
   *         description: Page number to retrieve
   *         in: query
   *         type: integer
   *         example: 1
   *       - name: pageSize
   *         description: Number of posts per page
   *         in: query
   *         type: integer
   *         example: 10
   *       - name: userId
   *         description: ID of the user to retrieve posts for
   *         in: query
   *         type: string
   *         example: 6150e59d5288462560b58a12
   *     responses:
   *       200:
   *         description: Successfully retrieved posts
   *         schema:
   *           type: object
   *           properties:
   *             posts:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Post'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get('/', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');

    try {
      const { page, pageSize, userId, searchQuery } = req.query;
      const options = {
        page: parseInt(page?.toString(), 10) || 1,
        pageSize: parseInt(pageSize?.toString(), 10) || 10,
        userId: userId?.toString(),
        searchQuery: searchQuery?.toString(),
      };

      const postServiceInstance = Container.get(PostService);
      const posts = await postServiceInstance.getPosts(options);
      return res.json({ posts }).status(200);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  /**
   * @swagger
   * /api/posts/:
   *   post:
   *     summary: Create a new post
   *     description: Use this endpoint to create a new post with the provided content and attachments.
   *     tags:
   *       - Posts
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               content:
   *                 type: string
   *                 description: The content of the post.
   *               communityId:
   *                 type: string
   *                 description: The ID of the community to which the post belongs.
   *     responses:
   *       201:
   *         description: Created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 post:
   *                   $ref: '#/components/schemas/Post'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    upload.single('attachment'),
    celebrate({
      [Segments.BODY]: Joi.object({
        content: Joi.string(),
        communityId: Joi.string(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling the Create Post endpoint');

      try {
        const postServiceInstance = Container.get(PostService);
        const post = await postServiceInstance.createPost(
          req.body as ICreatePostInputDTO,
          req.file as Multer.File,
          req.currentUser,
        );

        return res.json({ post }).status(201);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/posts/{postId}/like:
   *   post:
   *     summary: Like a post
   *     tags:
   *       - Posts
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: postId
   *         schema:
   *           type: string
   *         required: true
   *         description: The ID of the post to like.
   *     responses:
   *       200:
   *         description: The post with the updated likes list.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Post'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  route.post(
    '/:postId/like',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.PARAMS]: Joi.object({
        postId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling the Like Post endpoint');

      try {
        const postServiceInstance = Container.get(PostService);
        const post = await postServiceInstance.likePost(req.params.postId, req.currentUser._id);
        return res.json({ post }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/posts/{postId}/unlike:
   *   post:
   *     summary: Unlike a post
   *     tags:
   *       - Posts
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: postId
   *         schema:
   *           type: string
   *         required: true
   *         description: The ID of the post to unlike.
   *     responses:
   *       204:
   *         description: The post has been unliked.
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/:postId/unlike',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.PARAMS]: Joi.object({
        postId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling the Unlike Post endpoint');

      const { postId } = req.params;

      try {
        const postServiceInstance = Container.get(PostService);
        await postServiceInstance.unlikePost(postId, req.currentUser._id);

        return res.sendStatus(204);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/posts/{postId}/comment:
   *   post:
   *     summary: Create a new comment on a post
   *     tags:
   *       - Posts
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: postId
   *         schema:
   *           type: string
   *         required: true
   *         description: The ID of the post to comment on
   *       - in: body
   *         name: content
   *         description: The content of the comment
   *         required: true
   *         schema:
   *           type: object
   *           properties:
   *             content:
   *               type: string
   *     responses:
   *       '201':
   *         description: Created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Comment'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/:postId/comment',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.PARAMS]: Joi.object({
        postId: Joi.string().required(),
      }),
      [Segments.BODY]: Joi.object({
        content: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling the Comment on Post endpoint');

      try {
        const postServiceInstance = Container.get(PostService);
        const comment = await postServiceInstance.createComment(
          req.params.postId,
          req.body.content,
          req.currentUser._id,
        );
        return res.json({ comment }).status(201);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/posts/{postId}/comments:
   *   get:
   *     summary: Get Post comments
   *     description: Returns a list of comments for a specific post.
   *     tags:
   *       - Posts
   *     parameters:
   *       - in: path
   *         name: postId
   *         required: true
   *         schema:
   *           type: string
   *         description: Id of the post.
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         description: Page number for paginated results.
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *         description: Number of items to return per page for paginated results.
   *     responses:
   *       200:
   *         description: List of comments for the specified post.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 comments:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Comment'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get(
    '/:postId/comments',
    celebrate({
      [Segments.PARAMS]: Joi.object({
        postId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling the Comment on Post endpoint');

      try {
        const { page, pageSize } = req.query;
        const options = {
          page: parseInt(page?.toString(), 10) || 1,
          pageSize: parseInt(pageSize?.toString(), 10) || 10,
          postId: req.params.postId.toString(),
        };
        const postServiceInstance = Container.get(PostService);
        const comments = await postServiceInstance.postComments(options);

        return res.json({ comments }).status(201);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/posts/comments/{commentId}/reply:
   *   post:
   *     summary: Endpoint for replying to a comment
   *     tags:
   *       - Posts
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         schema:
   *           type: string
   *         required: true
   *         description: The ID of the comment to reply to
   *       - in: body
   *         name: content
   *         description: The content of the reply
   *         required: true
   *         schema:
   *           type: object
   *           properties:
   *             content:
   *               type: string
   *     responses:
   *       '201':
   *         description: Created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Comment'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/comments/:commentId/reply',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.PARAMS]: Joi.object({
        commentId: Joi.string().required(),
      }),
      [Segments.BODY]: Joi.object({
        content: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling the Comment on Post endpoint');

      try {
        const postServiceInstance = Container.get(PostService);
        const reply = await postServiceInstance.addReply(req.params.commentId, req.body.content, req.currentUser._id);

        return res.json({ reply }).status(201);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/posts/comments/{commentId}/like:
   *   post:
   *     summary: Like a comment on a post
   *     description: Like a comment on a post by providing the comment ID and the user ID
   *     tags:
   *       - Posts
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         description: ID of the comment to be liked
   *         schema:
   *           type: string
   *           required: true
   *           example: 610cb0493be4fb04d0000001
   *     responses:
   *       '200':
   *         description: The liked comment
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Comment'
   *       '401':
   *         $ref: '#/components/responses/UnauthorizedError'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/comments/:commentId/like',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.PARAMS]: Joi.object({
        commentId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling the Like Post endpoint');

      try {
        const postServiceInstance = Container.get(PostService);
        const comment = await postServiceInstance.likeComment(req.currentUser._id, req.params.commentId);
        return res.json({ comment }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/posts/comments/{commentId}/unlike:
   *   post:
   *     summary: Unlike a comment on a post
   *     description: Use this endpoint to unlike a comment on a post
   *     tags:
   *       - Posts
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         description: ID of the comment to unlike
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Comment unliked successfully
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/comments/:commentId/unlike',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.PARAMS]: Joi.object({
        commentId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling the Unlike comment endpoint');

      const { commentId } = req.params;

      try {
        const postServiceInstance = Container.get(PostService);
        await postServiceInstance.unlikeComment(commentId, req.currentUser._id);

        return res.sendStatus(204);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/posts/{postId}/report:
   *   post:
   *     summary: Report a post
   *     tags:
   *       - Posts
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: postId
   *         schema:
   *           type: string
   *         required: true
   *         description: The ID of the post to report
   *       - in: body
   *         name: body
   *         description: The reason for reporting the post
   *         required: true
   *         schema:
   *           type: object
   *           properties:
   *             reason:
   *               type: string
   *               description: The reason for reporting the post
   *     responses:
   *       '200':
   *         description: The reported post
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Post'
   *       '401':
   *         $ref: '#/components/responses/UnauthorizedError'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/:postId/report',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.PARAMS]: Joi.object({
        postId: Joi.string().required(),
      }),
      [Segments.BODY]: Joi.object({
        reason: Joi.string(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling the Report Post endpoint');

      const { postId } = req.params;
      const { reason } = req.body;

      try {
        const postServiceInstance = Container.get(PostService);
        const post = await postServiceInstance.reportPost(postId, req.currentUser._id, reason?.toString());

        return res.json({ post });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/posts/reports:
   *   get:
   *     summary: Retrieve a list of reported posts
   *     tags:
   *       - Posts
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - name: page
   *         description: Page number to retrieve
   *         in: query
   *         type: integer
   *         example: 1
   *       - name: pageSize
   *         description: Number of posts per page
   *         in: query
   *         type: integer
   *         example: 10
   *     responses:
   *       200:
   *         description: A list of reported posts
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ReportsResponse'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  route.get(
    '/reports',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    middlewares.isAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const { page, pageSize } = req.query;
        const options = {
          page: parseInt(page?.toString(), 10) || 1,
          pageSize: parseInt(pageSize?.toString(), 10) || 10,
        };

        const postServiceInstance = Container.get(PostService);
        const reports = await postServiceInstance.reports(options);
        return res.json({ reports }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/posts/{postId}:
   *   get:
   *     summary: Get a post by ID
   *     tags:
   *       - Posts
   *     parameters:
   *       - in: path
   *         name: postId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the post to get
   *     responses:
   *       200:
   *         description: Post object
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Post'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  route.get(
    '/:postId',
    celebrate({
      [Segments.PARAMS]: Joi.object({
        postId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      const { postId } = req.params;

      try {
        const postServiceInstance = Container.get(PostService);
        const post = await postServiceInstance.getPost(postId);

        return res.json({ post });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/posts/{postId}:
   *   delete:
   *     summary: Deletes a post.
   *     tags:
   *       - Posts
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: postId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the post to delete.
   *     responses:
   *       204:
   *         description: The post was deleted successfully.
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  route.delete(
    '/:postId',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.PARAMS]: Joi.object({
        postId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling the Delete Post endpoint');

      const { postId } = req.params;

      try {
        const postServiceInstance = Container.get(PostService);
        await postServiceInstance.deletePost(postId, req.currentUser);

        return res.json({});
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
