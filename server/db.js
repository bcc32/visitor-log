import Sequelize from 'sequelize';

export default class DB {
  constructor(log, dbpath) {
    this.log = log;

    this.db = new Sequelize({
      dialect: 'sqlite',
      pool: {
        max: 5,
        min: 0,
        idle: 10000,
      },
      storage: dbpath,
    });

    this.schema();
  }

  close() {
    return this.db.close();
  }

  schema() {
    const Visitor = this.db.define('visitor', {
      ip: { type: Sequelize.TEXT, allowNull: false, unique: true },
    });

    const Message = this.db.define('message', {
      message: { type: Sequelize.TEXT, allowNull: false },
      hidden: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    }, {
      indexes: [
        { fields: [ 'createdAt' ] },
        { fields: [ 'visitorId' ] },
      ],
    });

    const LinkClick = this.db.define('link_click', {
      path: { type: Sequelize.TEXT, allowNull: false },
      label: { type: Sequelize.TEXT, allowNull: false },
      href: { type: Sequelize.TEXT, allowNull: false },
    }, {
      indexes: [{ fields: [ 'visitorId' ] }],
    });

    Visitor.hasMany(Message);
    Visitor.hasMany(LinkClick);

    const Word = this.db.define('word', {
      word: { type: Sequelize.TEXT, primaryKey: true },
    }, {
      timestamps: false,
    });

    const URL = this.db.define('url', {
      shortUrl: { type: Sequelize.TEXT, field: 'short_url', primaryKey: true },
      url: { type: Sequelize.TEXT, allowNull: false },
      expiry: { type: Sequelize.TEXT, allowNull: false },
    }, {
      indexes: [{ fields: [ 'expiry' ] }],
    });

    this.LinkClick = LinkClick;
    this.Message   = Message;
    this.URL       = URL;
    this.Visitor   = Visitor;
    this.Word      = Word;

    this.db.sync();
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
