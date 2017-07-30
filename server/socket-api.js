import Promise from 'bluebird';

export default class SocketAPI {
  constructor({ api, io, msg }) {
    this.io = io;

    this.ns = io.of('/messages');
    this.ns.on('connection', (socket) => {
      this.handle(socket);
    });

    this.msg = msg;

    api.on('message', (data) => {
      this.ns.emit('message', data);
    });
  }

  async close() {
    await Promise.fromCallback((cb) => {
      this.io.close(cb);
    });
  }

  async handle(socket) {
    const messages = await this.msg.getAll({ reverse: true });
    socket.emit('messages', messages);
  }
}
