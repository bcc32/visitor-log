import EventEmitter from 'events';
import { URL }      from 'url';
import bodyParser   from 'body-parser';
import express      from 'express';
import multer       from 'multer';

import { NoAvailableWordsError } from './url-shortener';

export default class API extends EventEmitter {
  constructor({ log, db, msg, urlShortener }) {
    super();

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
      if (req.query.nonce == null) {
        res.sendStatus(400);
        return;
      }
      const nonce = ~req.query.nonce;
      const data = { type: 'pong', nonce };
      res.status(200).jsonp(data);
    });

    router.get('/messages', async (req, res) => {
      const limit = req.query.limit;
      const since = req.query.since;

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
        const messages = await msg.getAll({ limit, reverse, since });
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
        const savedMsg = await msg.save(data);
        res.status(201).json(savedMsg);
        this.emit('message', savedMsg);
      } catch (e) {
        log.error(e);
        res.sendStatus(500);
      }
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
        res.sendStatus(400);
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
}
