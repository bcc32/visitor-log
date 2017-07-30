import EventEmitter from 'events';
import { URL }      from 'url';
import bodyParser   from 'body-parser';
import express      from 'express';
import multer       from 'multer';

import { NoAvailableWordsError } from './url-shortener';

export default class API {
  constructor({ log, db, msg, urlShortener }) {
    const router = express.Router();
    this.router = router;

    router.use(bodyParser.urlencoded({ extended: false }));
    router.use(bodyParser.json());
    router.use(multer().none());

    router.use((req, res, next) => {
      res.set({ 'Cache-Control': 'No-Cache' });
      next();
    });

    router.get('/ping', (req, res) => {
      if (req.query.nonce == null || req.query.callback == null) {
        res.sendStatus(400);
        return;
      }
      const nonce = ~req.query.nonce;
      const callback = req.query.callback;
      const data = { type: 'pong', nonce };
      res.status(200).send(`${callback}(${JSON.stringify(data)})`);
    });

    this.messageBus = new EventEmitter();
    this.messageBus.setMaxListeners(100);

    router.get('/messages', async (req, res) => {
      const limit = req.query.limit;

      let reverse = true;
      const order = req.query.order;
      if (order != null) {
        if (order === 'newest') {
          reverse = true;
        } else if (order === 'oldest') {
          reverse = false;
        } else {
          res.status(400).send('invalid order');
          return;
        }
      }

      try {
        const messages = await msg.getAll({ limit, reverse });
        res.status(200).json(messages);
      } catch (e) {
        log.error(e);
        res.sendStatus(500);
      }
    });

    router.post('/messages', async (req, res) => {
      if (req.body.message == null) {
        res.status(400).send('no message');
        return;
      }

      const message = req.body.message.trim();
      if (message === '') {
        res.status(400).send('empty message');
        return;
      }

      const visitor_id = req.visitor_id;
      const data = { message, visitor_id };

      try {
        const id = await msg.save(data);
        data.id = id;
        res.status(201).json(data);
        this.messageBus.emit('update');
      } catch (e) {
        log.error(e);
        res.sendStatus(500);
      }
    });

    router.get('/messages/update', (req, res) => {
      this.messageBus.once('update', () => res.sendStatus(204));
    });

    router.get('/messages/:id', async (req, res) => {
      const id = req.params.id;

      try {
        const data = await msg.get(id);
        res.status(200).json(data);
      } catch (e) {
        log.error(e);
        res.sendStatus(500);
      }
    });

    router.post('/link-clicks', async (req, res) => {
      const { path, label, href } = req.body;
      const visitor_id = req.visitor_id;
      try {
        await db.recordLinkClick({ visitor_id, path, label, href });
        res.status(201).end();
      } catch (e) {
        log.error(e);
        res.sendStatus(500);
      }
    });

    router.post('/u', async (req, res) => {
      const { url } = req.body;

      // If the URL isn't absolute or is malformed, reject.
      try {
        new URL(url);
      } catch(e) {
        res.status(400).json({ error: 'invalid URL' });
        return;
      }

      try {
        const data = await urlShortener.shorten(url);
        res.status(201).json(data);
      } catch (e) {
        if (e instanceof NoAvailableWordsError) {
          res.status(503).json({ error: e.message });
        } else {
          log.error(e);
          res.sendStatus(500);
        }
      }
    });
  }

  close() {
    // kick off all waiting clients
    this.messageBus.emit('update');
  }
}
