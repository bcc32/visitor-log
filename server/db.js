import Sequelize from 'sequelize';

import schema from './schema';

export default class DB {
  constructor(log, dbpath) {
    this.log = log;

    this.db = new Sequelize({
      dialect: 'sqlite',
      logging: this.log.verbose.bind(this.log),
      pool: {
        max: 5,
        min: 0,
        idle: 10000,
      },
      storage: dbpath,
    });

    const models = schema(this.db, Sequelize.DataTypes);
    Object.assign(this, models);
  }

  close() {
    return this.db.close();
  }

  recordVisitor(ip) {
    return this.Visitor
      .findOrCreate({ where: { ip } })
      .spread((visitor) => visitor.id);
  }

  recordLinkClick({ visitor_id: visitorId, path, label, href }) {
    return this.LinkClick
      .create({
        visitorId,
        path,
        label,
        href,
      });
  }
}
