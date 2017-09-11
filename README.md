# bcc32.com

My personal website.

Records visitors to the site and allows them to post messages.

## Running the server

### Development mode

```sh
npm install
npm run build
npm run dev
```

### Production mode

```sh
npm install
NODE_ENV=production npm run build
npm start
# copy server.pem, server.key to global nginx prefix
# [include] nginx.conf in the global nginx.conf
# start nginx
```
