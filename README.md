# bcc32.com

My personal website.

Records visitors to the site and allows them to post messages.

## Setup

```sh
yarn
# copy server.pem, server.key to global nginx prefix
# [include] nginx.conf in the global nginx.conf
```

## Running the server

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
