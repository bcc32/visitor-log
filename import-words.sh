#!/bin/sh

set -eu

DBFILE=$1

if [[ ! -e "$DBFILE" ]]
then
    echo "usage: $0 DBFILE"
    exit 1
fi

cat import-words.sql | sqlite3 -init schema.sql -csv -noheader $DBFILE
