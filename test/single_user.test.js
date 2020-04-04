import app from '../src/app.js'
import io from 'socket.io-client'
import logger from '../src/logger.js';

const address = 'localhost';
const port = 8080;

let client1, client2, client3;

/**
 * Setup WS & HTTP servers
 */
beforeAll((done) => {
  app.listen(address, port)
  done();
});

/**
 *  Cleanup WS & HTTP servers
 */
afterAll((done) => {
  app.io.close()
  app.server.close();
  done();
});

/**
 * Run before each test
 */
beforeEach((done) => {
  // Setup
  // Do not hardcode server port and address, square brackets are used for IPv6
  client1 = io.connect(`http://[${address}]:${port}`, {
    'reconnection delay': 0,
    'reopen delay': 0,
    'force new connection': true,
    transports: ['websocket'],
  });
  client1.on('connect', () => {
    done();
  });
});

/**
 * Run after each test
 */
afterEach((done) => {
  // Cleanup
  if (client1.connected) {
    client1.disconnect();
  }
  setTimeout(() => {
    expect(app.state.playerCount()).toBe(0),
    done();
  },30);
});


describe('The player1', () => {

  test('should be able to create a room', (done) => {

    let callback = (room_id) => {
      expect(app.state.getPlayer(client1.id).username).toBe('Johnny');
      expect(app.state.playerCount()).toBe(1);
      expect(app.state.roomCount()).toBe(1);
      expect(room_id.length).toBe(6);
      done();
    };

    client1.emit('CreateRoom', 'Johnny', callback);

  });

});