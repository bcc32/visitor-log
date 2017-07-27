#!/bin/sh

DBFILE=$1

if [[ ! -e "$DBFILE" ]]
then
    echo "usage: $0 DBFILE"
    exit 1
fi

# Import all words from [public/basic.txt] that are not present in either
# [words] or [urls].

cat <<EOF | sqlite3 -init schema.sql -csv -noheader $DBFILE
BEGIN;
CREATE TEMPORARY TABLE words_temp (
  word TEXT PRIMARY KEY NOT NULL
);
.import public/basic.txt words_temp
INSERT OR IGNORE INTO words
  SELECT word FROM words_temp LEFT JOIN urls
  ON words_temp.word = urls.short_url
  WHERE urls.short_url IS NULL;
COMMIT;
EOF
