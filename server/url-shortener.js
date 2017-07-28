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

    // TODO add a recurring worker that cleans up expired links and returns words to
    // the [words] table
  }

  async shorten(url) {
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

    try {
      await begin.runAsync();

      const row = await selectWord.getAsync();
      if (row == null) {
        throw new NoAvailableWordsError();
      }
      const word = row.word;

      await deleteWord.runAsync({ $word: word });

      await insertNewUrl.runAsync({
        $short_url: word,
        $url: url,
        $expiry: expiry,
      });

      await commit.runAsync();

      return {
        word,
        url,
        expiry,
      };
    } catch (e) {
      this.log.error('rolling back transaction', e);
      await rollback.runAsync();
      throw e;
    } finally {
      await selectWord.resetAsync();
      await deleteWord.resetAsync();
      conn.close();
    }
  }

  async lookup(word) {
    const conn = this.db.connect();

    const stmt = conn.prepare(String.raw`
      SELECT url FROM urls
      WHERE short_url = $short_url AND expiry >= $now
    `);

    try {
      const row = await stmt.getAsync({
        $short_url: word,
        $now: new Date().toISOString(),
      });
      if (row == null) {
        throw new UrlNotFoundError(word);
      }
      return row.url;
    } finally {
      await stmt.resetAsync();
      conn.close();
    }
  }
}
