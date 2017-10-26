import Promise from 'bluebird';
import { Op } from 'sequelize';

export default class Msg {
  constructor(db) {
    this.db = db;
  }

  get(id) {
    return this.db.Message.findOne({ where: { id }, raw: true });
  }

  getAll({ limit, reverse, since }) {
    const where = {};

    if (since != null) {
      where.createdAt = { [Op.gte]: since };
    }

    const dir = reverse ? 'DESC' : 'ASC';

    return this.db.Message
      .findAll({ where, limit, order: [[ 'createdAt', dir ]], raw: true });
  }

  save({ message, visitor_id }) {
    return this.db.Message
      .create({
        visitorId: visitor_id,
        message,
      });
  }
}
