# bcc32.com

My personal website.

Records visitors to the site and allows them to post messages.

## Running the server

This server is meant to be run behind a reverse proxy like NGINX. If no such
reverse proxy is being used, the environment variable NO_PROXY should be set.

### Development mode

```sh
yarn
npm run dev
# start nginx
```

### Production mode

```sh
yarn
NODE_ENV=production npm run build
npm start
# start nginx
```
