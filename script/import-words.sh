#!/bin/sh

set -eu

DBFILE=$1

if [[ ! -e "$DBFILE" ]]
then
    echo "usage: $0 DBFILE"
    exit 1
fi

cat `dirname $0`/import-words.sql | sqlite3 -csv -noheader $DBFILE
