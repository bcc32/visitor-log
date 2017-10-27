export default function (sequelize, DataTypes) {
  const Visitor = sequelize.define('visitor', {
    ip: { type: DataTypes.TEXT, allowNull: false, unique: true },
  });

  const Message = sequelize.define('message', {
    message: { type: DataTypes.TEXT, allowNull: false },
    hidden: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    indexes: [
      { fields: [ 'createdAt' ] },
      { fields: [ 'visitorId' ] },
    ],
  });

  const LinkClick = sequelize.define('link_click', {
    path: { type: DataTypes.TEXT, allowNull: false },
    label: { type: DataTypes.TEXT, allowNull: false },
    href: { type: DataTypes.TEXT, allowNull: false },
  }, {
    indexes: [{ fields: [ 'visitorId' ] }],
  });

  Visitor.hasMany(Message);
  Visitor.hasMany(LinkClick);

  const Word = sequelize.define('word', {
    word: { type: DataTypes.TEXT, primaryKey: true },
  }, {
    timestamps: false,
  });

  const URL = sequelize.define('url', {
    word: { type: DataTypes.TEXT, field: 'word', primaryKey: true },
    url: { type: DataTypes.TEXT, allowNull: false },
    expiry: { type: DataTypes.TEXT, allowNull: false },
  }, {
    indexes: [{ fields: [ 'expiry' ] }],
  });

  sequelize.sync();

  return {
    LinkClick,
    Message,
    URL,
    Visitor,
    Word,
  };
}
