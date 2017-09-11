-- Import all words from [public/basic.txt] that are not present in either
-- [words] or [urls].

BEGIN;
CREATE TEMPORARY TABLE words_temp (
  word TEXT PRIMARY KEY NOT NULL
);
.import public/basic.txt words_temp
INSERT OR IGNORE INTO words (word)
  SELECT word FROM words_temp
  WHERE word NOT IN (SELECT short_url FROM urls);
COMMIT;
