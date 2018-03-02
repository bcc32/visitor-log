import Promise from 'bluebird';
import { Op } from 'sequelize';

export class NoAvailableWordsError extends Error {
  constructor() {
    super();
    this.message = 'No words are available for short URLs';
    this.name = 'NoAvailableWordsError';
    Error.captureStackTrace(this, NoAvailableWordsError);
  }
}

export class UrlNotFoundError extends Error {
  constructor(word) {
    super();
    this.message = `No URL was found for "${word}"`;
    this.name = 'UrlNotFoundError';
    Error.captureStackTrace(this, UrlNotFoundError);
  }
}

export default class UrlShortener {
  constructor(log, db) {
    this.log = log;
    this.db  = db;

    // Every hour, clean up expired URLs
    this.daemon = setInterval(() => {
      this.cleanupExpired()
        .then((urls) => {
          const numExpired = urls.length;
          this.log.info('cleaned up %d expired URLs', numExpired);
        })
        .catch((e) => {
          this.log.error('failed to cleanup expired URLs: %s', e);
        });
    }, 3600 * 1000);
  }

  close() {
    clearInterval(this.daemon);
  }

  cleanupExpired() {
    const expiry = new Date().toISOString();

    // FIXME cleanup this .db.db nonsense
    return this.db.db.transaction((t) => {
      return this.db.URL
        .findAll({ where: { expiry: { [Op.le]: expiry } }, transaction: t })
        .tap((urls) => {
          return Promise.map(urls, url => url.destroy({ transaction: t }));
        })
        .tap((urls) => {
          return this.db.Word
            .bulkCreate(
              urls.map(url => ({ word: url.shortUrl })),
              { transaction: t }
            );
        });
    });
  }

  shorten(url) {
    let expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
    expiry = expiry.toISOString();

    return this.db.db.transaction((t) => {
      return this.db.Word
        .count({ transaction: t })
        .then((available) => {
          if (available === 0) {
            throw new NoAvailableWordsError();
          }
          const index = Math.floor(available * Math.random());
          return this.db.Word.findOne({ offset: index, transaction: t });
        })
        .then((word) => {
          word.destroy({ transaction: t });
          return word.word;
        })
        .then((word) => {
          return this.db.URL
            .create({ url, expiry, word }, { transaction: t });
        });
    });
  }

  lookup(word) {
    return this.db.URL
      .findOne({
        where: {
          word,
          expiry: { [Op.gte]: new Date().toISOString() }
        }
      })
      .then(url => {
        if (url == null) {
          throw new UrlNotFoundError(word);
        }
        return url.url;
      });
  }
}
