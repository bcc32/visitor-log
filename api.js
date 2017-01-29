const bodyParser = require('body-parser');
const express = require('express');

const db = require('./db');
const msg = require('./msg');

const router = express.Router();

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.get('/messages', (req, res) => {
  msg.getAll()
    .then((messages) => {
      res.status(200).json(messages);
    })
    .catch(() => {
      res.status(500).end();
    });
});

router.post('/messages', (req, res) => {
  const [id, key] = msg.makeIdAndKey();
  const message = req.body.message.trim();
  if (message === '') {
    res.status(400).send('empty message');
    return;
  }
  const ip = req.ip;
  const timestamp = new Date();

  const data = { id, message, ip, timestamp };

  // TODO this should probably be in `msg`
  db.putAsync(key, data)
    .then(() => {
      res.status(200).json(data);
    })
    .catch(() => {
      res.status(500).end();
    });
});

router.get('/messages/:id', (req, res) => {
  const id = req.params.id;
  msg.get(id)
    .then((data) => {
      res.status(200).json(data);
    })
    .catch(() => {
      res.status(500).end();
    });
});

module.exports = router;
