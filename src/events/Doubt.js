import logger from '../logger.js'
import PlayerService from '../services/PlayerService.js'
import RoomService from '../services/RoomService.js'
import GameService from '../services/GameService.js'
import Response from './Response.js'
import Game from '../models/Game.js'
import GlobalState from '../models/GlobalState.js'

export default (socket, io) => {
    return socket.on('Doubt', () => {

        logger.info('Received event Doubt');
        try {
            let player = PlayerService.getPlayer(socket.id);
            let room = player.room;
            let game = GlobalState.getGame(room.id);

            if (!game) {
                logger.error('Hacking detected! Player is not playing any game')
                return;
            }

            logger.info('Doubt received by %s(%s)', player.username, socket.id);
            if (player.gid !== game.current_player.gid) {
                logger.error('Hackerman detected! Claim by wrong user %s(%s)', player.username, player.gid);
                /*
                io.to(player.sid).emit('Doubt', {
                    'success': false,
                    'message': 'Hackerman! Ti ho segnalato a mio zio che lavora alla polizia postale'
                });
                */
                return;
            }

            const doubted_player = game.last_player;

            const obj = GameService.doubt(game, player);
            
            Object.keys(game._players).forEach(gid => {
                const p = game._players[gid];

                if (obj.status == 'gameover') {
                    io.to(p.sid).emit('GameOver', {
                        success: true,
                        winner: obj.winner.gid, 
                    });
                } else {
                    io.to(p.sid).emit('NextRound', {
                        'success': true,
                        'round_dice': obj.round_dice,
                        'dice': game.getDice(p.gid),
                        'active_player': game.current_player.gid,
                        'doubter': obj.doubter,
                        'doubted': obj.doubted,
                        'loser': obj.loser,
                        'keepsOnPlaying': obj.keepsOnPlaying,
                    });
                }
            });

        } catch(error) {
            console.error(error);
        }
    });
}