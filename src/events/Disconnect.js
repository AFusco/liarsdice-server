import logger from '../logger.js'
import PlayerService from '../services/PlayerService.js'
import RoomService from '../services/RoomService.js';
import Room from '../models/Room.js';

export default (socket, io) => {
    socket.on('disconnect', (reason) => {
        logger.info('Socket %s is disconnecting. Reason: %s', socket.id, reason);
        const player = PlayerService.getPlayer(socket.id);
        if (player.room) {
            const room_id = player.room.id;
            const room = RoomService.leaveRoom(socket.id, room_id);
            if (room)
                RoomService.notifyRoom(io, 'RoomChange', room_id);
        }
        PlayerService.removePlayer(socket.id);
    });
}