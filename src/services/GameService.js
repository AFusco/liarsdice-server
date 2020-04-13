//@ts-check

import GlobalState from '../models/GlobalState.js'
import Player from '../models/Player.js'
import Room from '../models/Room.js'
import Game from '../models/Game.js'
import logger from '../logger.js';


/**
 * @param {Room} room 
 */
const startGame = (room) => {
    try {
        let game = new Game(room);
        GlobalState.addGame(game);
        return game;
    } catch (error) {
        logger.error('GameService: Error starting game: %o', error);
    }
}

/**
 * @param {Game} game 
 */
const nextRound = (game) => {
    try {
        game.rollDice();
        return game;
    } catch (error) {
        logger.error('GameService: Error executing next round: %o', error);
    }
}

/**
 * 
 * @param {Game} game 
 * @param {Player} player The player making the claim 
 * @param {number} amount 
 * @param {number} pips 
 */
const claim = (game, player, amount, pips) => {
    try {
        if (!game.isValidClaim(amount, pips))
            throw Error('Invalid claim');
        if (game.current_player.sid !== player.sid)
            throw Error('Invalid player (hackerman!)');

        game.setLastClaim(amount, pips);
        
        game.current_player = game.getActivePlayerAfter(player.gid);
        game.last_player = player;
        
        return {
            'status': 'nextturn',
            'claim': {
                'amount': amount,
                'pips': pips,
            },
            'active_player': game.current_player  
        }

    } catch (error) {
        logger.error('GameService: Invalid claim: %o', error);
        throw error;
    }
};

const doubt = (game, player) => {
    try {
        if (game.current_player.sid !== player.sid)
            throw Error('GameService: Invalid player (hackerman!)');
        if (!game.getLastClaim())
            throw Error('GameService: Cannot doubt on first turn');
            
        const doubter = player
        const doubted = game.last_player

        // Find who is losing the doubt
        const loser = game.isDoubtCorrect() ? doubted : doubter;

        // Ugly object copy
        const old_dice = JSON.parse(JSON.stringify(game.dice));
        
        // Remove die from loser
        const keepsOnPlaying = game.removeDie(loser.gid);

        // Check if loser is eliminated
        if (keepsOnPlaying) {
            game.current_player = loser;
        } else {
            if (game.isGameOver()) {
                return {
                    'status': 'gameover',
                    'winner': game.findWinner()
                }
                
            } else {
                game.current_player = game.getActivePlayerAfter(loser.gid);
            }
        }

        // Roll dice
        return {
            'status': 'nextround',
            'round_dice': old_dice,
            'game': nextRound(game),
            'doubter': doubter.gid,
            'doubted': doubted.gid,
            'loser': loser.gid,
            'keepsOnPlaying': keepsOnPlaying,
        }
    } catch (error) {
        logger.error('GameService: Invalid doubt: %o', error);
        throw error;
    }
};

/**
 * @param {Game} game 
 * @param {Player} player
 */
const disconnect = (game, player) => {
    game.removePlayer(player);
    if (!game.isGameOver) {
        game.current_player = game.getActivePlayerAfter(player);
        return {
            'status': 'nextround',
            'game': nextRound(game),
            'quitter': player.gid
        }
    } else {
        return {
            'status': 'gameover',
            'winner': game.findWinner()
        }
    }
}

export default {
    
    'startGame': startGame,

    'claim': claim,
    'doubt': doubt,

    'disconnect': disconnect,
}