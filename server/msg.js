import { Op } from 'sequelize';

const attributes = ['id', 'message', 'createdAt'];

export default class Msg {
  constructor(db) {
    this.db = db;
  }

  get(id) {
    return this.db.Message
      .findOne({ where: { id }, attributes });
  }

  getAll({ limit, reverse, since }) {
    const where = { hidden: false };

    if (since != null) {
      where.createdAt = { [Op.gte]: since };
    }

    const dir = reverse ? 'DESC' : 'ASC';

    return this.db.Message
      .findAll({ where, limit, order: [[ 'createdAt', dir ]], attributes });
  }

  save({ message, visitor_id }) {
    return this.db.Message
      .create({
        visitorId: visitor_id,
        message,
      });
  }
}
