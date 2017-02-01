const bodyParser = require('body-parser');
const express = require('express');

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
  const message = req.body.message.trim();
  if (message === '') {
    res.status(400).send('empty message');
    return;
  }
  const ip = req.ip;
  const timestamp = new Date();

  const data = { message, ip, timestamp };

  msg.save(data)
    .then((id) => {
      data.id = id;
      res.status(200).json(data);
    })
    .catch((e) => {
      console.error('Error saving message: ', e);
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
