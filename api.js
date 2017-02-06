const bodyParser = require('body-parser');
const express = require('express');

const db = require('./db');
const log = require('./log');
const msg = require('./msg');

const router = express.Router();

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.get('/ping', (req, res) => {
  if (req.query.nonce == null || req.query.callback == null) {
    return res.status(400).end();
  }
  const nonce = ~req.query.nonce;
  const callback = req.query.callback;
  const data = { type: 'pong', nonce };
  res.status(200).send(`${callback}(${JSON.stringify(data)})`);
});

router.get('/messages', (req, res) => {
  msg.getAll()
    .then((messages) => {
      res.status(200).json(messages);
    })
    .catch((e) => {
      log.error(e);
      res.status(500).end();
    });
});

router.post('/messages', (req, res) => {
  if (!req.body.message) {
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

  msg.save(data)
    .then((id) => {
      data.id = id;
      res.status(201).json(data);
    })
    .catch((e) => {
      log.error(e);
      res.status(500).end();
    });
});

router.get('/messages/:id', (req, res) => {
  const id = req.params.id;
  msg.get(id)
    .then((data) => {
      res.status(200).json(data);
    })
    .catch((e) => {
      log.error(e);
      res.status(500).end();
    });
});

router.post('/link-clicks', (req, res) => {
  const { path, label, href } = req.body;
  const visitor_id = req.visitor_id;
  db.recordLinkClick({ visitor_id, path, label, href })
    .then(() => res.status(201).end())
    .catch((e) => {
      log.error(e);
      res.status(500).end();
    });
});

module.exports = router;
