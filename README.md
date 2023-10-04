# Heroek Application API

## Development

We use `node` version `18.8.0`. Anything above should also work fine

```
nvm install 18.8.0
```

```
nvm use 18.8.0
```

The first time, you will need to run

```
npm install
```

Setup the ENVs

```
cp .env.example .env
```

Then just start the server with

```
npm run start
```
It uses nodemon for live-reloading :peace-fingers:

# API Validation

 By using [celebrate](https://github.com/arb/celebrate), the req.body schema becomes clearly defined at route level.

 ```js
 route.post('/signup',
  celebrate({
    body: Joi.object({
      name: Joi.string().required(),
      email: Joi.string().required(),
      password: Joi.string().required(),
    }),
  }),
  controller.signup)
 ```

 **Example error**

 ```json
 {
    "error": {
        "statusCode": 400,
        "message": "Bad Request",
        "details": {
            "message": "Email address already taken."
        }
    }
}
 ```

[Read more about celebrate here](https://github.com/arb/celebrate) and [the Joi validation API](https://github.com/hapijs/joi/blob/v15.0.1/API.md)

All non-celebrate error messages should be an instance of ValidationError since an error handler has already been written for it.

# Roadmap
- [x] API Validation layer (Celebrate+Joi)
- [x] Unit tests
- [x] API Documentation
- [ ] Cluster mode
- [x] The logging _'layer'_
- [x] Continuous integration with AWS CodeBuild and AWS Codepipeline 😍
- [x] Deploys script and docs for AWS Elastic Beanstalk or Heroku
