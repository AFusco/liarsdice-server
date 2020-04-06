import app from '../src/app.js'
import io from 'socket.io-client'
import { TestScheduler } from 'jest';
import logger from '../src/logger.js';

const address = 'localhost';
const port = 8081;

let client1, client2, client3;

// Trap changes function
let trapChange;

// Global response variables;
let res1, res2, res3;


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
  //client1.on('RoomChange', (res)=> room1 = res);
  client2 = io.connect(`http://[${address}]:${port}`, {
    'reconnection delay': 0,
    'reopen delay': 0,
    'force new connection': true,
    transports: ['websocket'],
  });
  //client2.on('RoomChange', (res)=> room2 = res);
  client3 = io.connect(`http://[${address}]:${port}`, {
    'reconnection delay': 0,
    'reopen delay': 0,
    'force new connection': true,
    transports: ['websocket'],
  });
  //client3.on('RoomChange', (res)=> room3 = res);

  trapChange = (event_name, before, after, timeout=100) => {
    res1 = res2 = res3 = null;
    client1.on(event_name, (res) => {
      res1 = res;
    })
    client2.on(event_name, (res) => {
      res2 = res;
    })
    client3.on(event_name, (res) => {
      res3 = res;
    })
    before();
    setTimeout(() => {
      after();
    }, timeout);
  }

  let p1 = eventPromise(client1, 'connect').then((s, res)=> eventPromise(s, 'CreateRoom'))
  let p2 = eventPromise(client2, 'connect')
  let p3 = eventPromise(client3, 'connect')

  Promise.all(p1, p2, p3).then()

  client1.on('connect', () => {
    client2.on('connect', () => {
      client3.on('connect', () => {
        trapChange(
          'RoomChange',
          () => {
            client1.emit('CreateRoom', 'user1', (res) => {
              client2.emit('JoinRoom', res.room.id, 'user2');
              client3.emit('JoinRoom', res.room.id, 'user3');
            })
          },
          () => {
            expect(app.state.playerCount()).toBe(3);
            expect(app.state.roomCount()).toBe(1);
            expect(res1.room.status).toBe('ready');
            expect(res2.room.status).toBe('ready');
            expect(res3.room.status).toBe('ready');
            done()
          }
        );
      })
    })
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
  if (client2.connected) {
    client2.disconnect();
  }
  if (client3.connected) {
    client3.disconnect();
  }
  setTimeout(() => {
    expect(app.state.playerCount()).toBe(0),
    expect(app.state.roomCount()).toBe(0),
    done();
  },200);
  //done();
});

describe.only('The room', () =>{
  test.only('should have status ready when all users are in', (done) => {
    expect(res1.room.status).toBe('ready');
    expect(res2.room.status).toBe('ready');
    expect(res3.room.status).toBe('ready');
    done();
  });

  test('should notify everybody when the game has started', (done) => {

  });

  test('should have status ready when second player joins', (done) => {

    let callback = (data) => {
      try {
        expect(data.success).toBe(true);
        expect(data.room.status).toBe('waiting');
        expect(app.state.getRoom(data.room.id).size).toBe(1);

        client2.emit('JoinRoom', data.room.id, 'Tarello', (data2) => {
          expect(data2.success).toBe(true);
          expect(data2.room.status).toBe('ready'); //clientside
          expect(app.state.getRoom(data2.room.id).size).toBe(2); //serverside

          client1.once('RoomChange', (data3) => {
            expect(data3.success).toBe(true);
            expect(data3.room.status).toBe('waiting');
            done();
          });

          client2.disconnect();

        });
      } catch (error) {
        done(error);
      }
    };

    client1.emit('CreateRoom', 'Johnny', callback);
  })

  test('should increase size when players join', (done) => {

    let callback = (data) => {
      try {
        expect(data.success).toBe(true);
        expect(app.state.getRoom(data.room.id).size).toBe(1);

        client2.emit('JoinRoom', data.room.id, 'Tarello', (data2) => {
          expect(data2.success).toBe(true);
          expect(data2.room.players.length).toBe(2); //clientside

          expect(app.state.getRoom(data2.room.id).size).toBe(2); //serverside
          done();
        });
      } catch (error) {
        done(error);
      }
    };

    client1.emit('CreateRoom', 'Johnny', callback);
  })
  test('should decrease size when players leave', (done) => {

    let callback = (data) => {
      try {
        expect(data.success).toBe(true);

        expect(data.room.players.length).toBe(1);
        expect(app.state.getRoom(data.room.id).size).toBe(1);

        client2.emit('JoinRoom', data.room.id, 'Tarello', (data2) => {
          expect(data2.success).toBe(true);
          expect(data2.room.players.length).toBe(2);
          expect(app.state.getRoom(data2.room.id).size).toBe(2);
          client2.disconnect();

          setTimeout(() => {
            expect(app.state.getRoom(data2.room.id).size).toBe(1);
            done()
          }, 50);
        });
      } catch (error) {
        done(error);
      }
    };

    client1.emit('CreateRoom', 'Johnny', callback);
  })

});


describe('The room owner', () => {

  test('should receive the room state when someone joins the room', (done) => {

    let callback = (data1) => {
      try {
        client1.on('RoomChange', (data) => {
          expect(data.success).toBe(true);
          expect(data.room.players).toEqual(expect.arrayContaining(['Johnny', 'Tarello']));
          expect(data.room.owner).toEqual('Johnny');
          done()
        })
        client2.emit('JoinRoom', data1.room.id, 'Tarello', (data) => {});

      } catch (error) {
        done(error);
      }
    };
    client1.emit('CreateRoom', 'Johnny', callback);
  });

  test('should receive the room state when someone disconnects', (done) => {

    let callback = (data1) => {
      try {

        client1.once('RoomChange', (data) => {
          expect(data.success).toBe(true);
          expect(data.room.players).toEqual(expect.arrayContaining(['Johnny', 'Tarello']));
          client1.once('RoomChange', (data2) => {
            expect(data2.success).toBe(true);
            expect(data2.room.players.length).toBe(1);
            expect(data2.room.players).toEqual(expect.arrayContaining(['Johnny']));
            done();
          })
        })

        client2.emit('JoinRoom', data1.room.id, 'Tarello', (data) => {
          expect(data.success).toBe(true);
          client2.disconnect();
        });

      } catch (error) {
        done(error);
      }
    };
    client1.emit('CreateRoom', 'Johnny', callback);
  });

  test('should receive the room state when someone leaves', (done) => {

    let callback = (data1) => {
      try {

        client1.once('RoomChange', (data) => {
          expect(data.success).toBe(true);
          expect(data.room.players).toEqual(expect.arrayContaining(['Johnny', 'Tarello']));
          client1.once('RoomChange', (data2) => {
            expect(data2.success).toBe(true);
            expect(data2.room.players.length).toBe(1);
            expect(data2.room.players).toEqual(expect.arrayContaining(['Johnny']));
            done();
          })
        })

        client2.emit('JoinRoom', data1.room.id, 'Tarello', (data) => {
          expect(data.success).toBe(true);
          client2.emit('LeaveRoom');
        });

      } catch (error) {
        done(error);
      }
    };
    client1.emit('CreateRoom', 'Johnny', callback);
  });

});

describe('The second player', () => {

  test('should be able to join a room', (done) => {

    let callback = (data1) => {
      try {
        expect(data1.success).toBe(true);
        expect(app.state.getPlayer(client1.id).username).toBe('Johnny');
        expect(app.state.playerCount()).toBe(2); //the user is already connected
        expect(app.state.roomCount()).toBe(1);
        expect(data1.room.id.length).toBe(6);

        client2.emit('JoinRoom', data1.room.id, 'Tarello', (data) => {
          try {
            expect(data.success).toBe(true);
            expect(app.state.getPlayer(client2.id).username).toBe('Tarello');
            expect(app.state.playerCount()).toBe(2);
            expect(app.state.roomCount()).toBe(1);
            done();
          } catch (error) {
            done(error);
          }
        });

      } catch (error) {
        done(error);
      }
    };

    client1.emit('CreateRoom', 'Johnny', callback);
  });

  test('should receive the room state when joining a room', (done) => {

    let callback = (data) => {
      try {
        expect(data.room.id.length).toBe(6);
        client2.emit('JoinRoom', data.room.id, 'Tarello', (data) => {
          try {
            expect(data.room.players).toEqual(expect.arrayContaining(['Tarello', 'Johnny']))
            done();
          } catch (error) {
            done(error);
          }
        });

      } catch (error) {
        done(error);
      }
    };

    client1.emit('CreateRoom', 'Johnny', callback);
  });

  test('should become owner if the owner disconnects', (done) => {

    let callback = (data1) => {
      try {

        client1.once('RoomChange', (data) => {
          expect(data.success).toBe(true);
          expect(data.room.players).toEqual(expect.arrayContaining(['Johnny', 'Tarello']));

          client2.once('RoomChange', (data2) => {
            expect(data2.success).toBe(true);
            expect(data2.room.players.length).toBe(1);
            expect(data2.room.owner).toBe('Tarello');
            done();
          })

          client1.disconnect();
        });

        client2.emit('JoinRoom', data1.room.id, 'Tarello', (data) => {
          expect(data.success).toBe(true);
        });

      } catch (error) {
        done(error);
      }
    };
    client1.emit('CreateRoom', 'Johnny', callback);

  });

  test('should become owner if the owner leaves the room', (done) => {

    let callback = (data1) => {
      try {

        client1.once('RoomChange', (data) => {
          expect(data.success).toBe(true);
          expect(data.room.players).toEqual(expect.arrayContaining(['Johnny', 'Tarello']));

          client2.once('RoomChange', (data2) => {
            expect(data2.success).toBe(true);
            expect(data2.room.players.length).toBe(1);
            expect(data2.room.owner).toBe('Tarello');
            done();
          })

          client1.emit('LeaveRoom');
        });

        client2.emit('JoinRoom', data1.room.id, 'Tarello', (data) => {
          expect(data.success).toBe(true);
        });

      } catch (error) {
        done(error);
      }
    };
    client1.emit('CreateRoom', 'Johnny', callback);

  });

});