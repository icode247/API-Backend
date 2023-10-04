import { v1 as uuidv1 } from 'uuid';
import path from 'path';
import { Request } from 'express';
import { FileFilterCallback } from 'multer';
import multerS3 from 'multer-s3';
import config from './';
import { S3Client } from '@aws-sdk/client-s3';

type FileNameCallback = (error: Error | null, filename: string) => void;

const s3 = new S3Client({
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  },
  region: config.awsRegion,
});

export const fileFilter = (request: Request, file: Express.Multer.File, callback: FileFilterCallback): void => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
    callback(null, true);
  } else {
    callback(null, false);
  }
};

export const s3Storage = multerS3({
  s3: s3,
  bucket: config.s3BucketName,
  key: function (req, file, cb: FileNameCallback) {
    const fuid = uuidv1();
    console.log(file);
    cb(null, file.fieldname + '/' + fuid + path.extname(file.originalname));
  },
});
