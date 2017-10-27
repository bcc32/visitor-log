PRAGMA foreign_keys = OFF;

BEGIN;

ALTER TABLE visitors RENAME TO visitors_old;

CREATE TABLE `visitors` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `ip` TEXT NOT NULL UNIQUE, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, UNIQUE (`ip`));

INSERT INTO visitors (id, ip, createdAt, updatedAt)
SELECT id, ip, strftime('%Y-%m-%d %H:%M:%f +00:00', 'now'), strftime('%Y-%m-%d %H:%M:%f +00:00', 'now')
FROM visitors_old;

DROP TABLE visitors_old;

ALTER TABLE messages RENAME TO messages_old;

CREATE TABLE `messages` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `message` TEXT NOT NULL, `hidden` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `visitorId` INTEGER REFERENCES `visitors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE);

INSERT INTO messages (id, message, hidden, createdAt, updatedAt, visitorId)
SELECT id, message, hidden, strftime('%Y-%m-%d %H:%M:%f +00:00', timestamp), strftime('%Y-%m-%d %H:%M:%f +00:00', timestamp), visitor_id
FROM messages_old;

DROP TABLE messages_old;

ALTER TABLE link_clicks RENAME TO link_clicks_old;

CREATE TABLE `link_clicks` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `path` TEXT NOT NULL, `label` TEXT NOT NULL, `href` TEXT NOT NULL, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `visitorId` INTEGER REFERENCES `visitors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE);

INSERT INTO link_clicks (id, path, label, href, createdAt, updatedAt, visitorId)
SELECT id, path, label, href, strftime('%Y-%m-%d %H:%M:%f +00:00', timestamp), strftime('%Y-%m-%d %H:%M:%f +00:00', timestamp), visitor_id
FROM link_clicks_old;

DROP TABLE link_clicks_old;

ALTER TABLE urls RENAME TO urls_old;

CREATE TABLE `urls` (`word` TEXT PRIMARY KEY, `url` TEXT NOT NULL, `expiry` TEXT NOT NULL, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL);

INSERT INTO urls (word, url, expiry, createdAt, updatedAt)
SELECT short_url, url, expiry, strftime('%Y-%m-%d %H:%M:%f +00:00', 'now'), strftime('%Y-%m-%d %H:%M:%f +00:00', 'now')
FROM urls_old;

DROP TABLE urls_old;

PRAGMA foreign_key_check;

COMMIT;

PRAGMA foreign_keys = ON;
