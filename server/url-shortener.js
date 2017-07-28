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
  constructor(db) {
    this.db = db;
  }

  shorten(url) {
    const conn = this.db.connect();

    const begin = conn.prepare(String.raw`
      BEGIN TRANSACTION
    `);

    const selectWord = conn.prepare(String.raw`
      SELECT word FROM (SELECT word FROM words LIMIT 100)
      ORDER BY RANDOM()
      LIMIT 1
    `);

    const deleteWord = conn.prepare(String.raw`
      DELETE FROM words WHERE word = $word
    `);

    const insertNewUrl = conn.prepare(String.raw`
      INSERT INTO urls (short_url, url, expiry)
      VALUES ($short_url, $url, $expiry)
    `);

    const commit = conn.prepare(String.raw`
      COMMIT TRANSACTION
    `);

    const rollback = conn.prepare(String.raw`
      ROLLBACK TRANSACTION
    `);

    let expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
    expiry = expiry.toISOString();

    return begin.runAsync()
      .then(() => selectWord.getAsync())
      .then((row) => {
        if (row == null) {
          throw new NoAvailableWordsError();
        }
        return row.word;
      })
      .tap((word) => deleteWord.runAsync({ $word: word }))
      .tap((word) => insertNewUrl.runAsync({
        $short_url: word,
        $url: url,
        $expiry: expiry,
      }))
      .tap(() => commit.runAsync())
      .tapCatch((e) => {
        this.log.error('rolling back transaction', e);
        rollback.runAsync();
      })
      .then((word) => {
        return {
          word,
          url,
          expiry,
        };
      })
      .finally(() => selectWord.resetAsync())
      .finally(() => deleteWord.resetAsync())
      .finally(() => conn.close());
  }

  lookup(word) {
    const conn = this.db.connect();

    const stmt = conn.prepare(String.raw`
      SELECT url FROM urls
      WHERE short_url = $short_url AND expiry >= $now
    `);

    return stmt.getAsync({
      $short_url: word,
      $now: new Date().toISOString(),
    })
      .then((row) => {
        if (row == null) {
          throw new UrlNotFoundError(word);
        }
        return row.url;
      })
      .finally(() => stmt.resetAsync())
      .finally(() => conn.close());
  }

  // TODO add a recurring worker that cleans up expired links and returns words to
  // the [words] table
}
