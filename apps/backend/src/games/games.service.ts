import { Injectable } from '@nestjs/common';
import { PlayersService } from '../players/players.service';

export type Game = {
  id: number;
  name: string;
  inGroup: number;
  initiatedBy: number;
  initiatedTime: Date;
  startedTime: Date | null;
  players: number[];  // array of player ids
  isActive: boolean;
  isFinished: boolean;
};

@Injectable()
export class GamesService {
  private games: Game[] = [];
  private nextId = 1;

  constructor(private readonly playersService: PlayersService) {}

  create(
    name: string,
    inGroup: number,
    initiatedBy: number,
  ): Game {
    const newGame: Game = {
      id: this.nextId++,
      name,
      inGroup: Number(inGroup),
      initiatedBy: Number(initiatedBy),
      initiatedTime: new Date(),
      startedTime: null,
      players: [Number(initiatedBy)],
      isActive: false,
      isFinished: false,
    };
    this.games.push(newGame);
    this.playersService.setCurrentGame(Number(initiatedBy), newGame.id);
    return newGame;
  }

  join(gameId: number, playerId: number): Game | undefined {
    const game = this.findById(gameId);
    if (!game || game.isActive) return undefined;
    const pId = Number(playerId);
    if (!game.players.includes(pId)) {
      game.players.push(pId);
      this.playersService.setCurrentGame(pId, game.id);
    }
    return game;
  }

  start(gameId: number): Game | undefined {
    const game = this.findById(gameId);
    if (!game) return undefined;
    this.startGame(game);
    return game;
  }

  // A single player leaves. If the last player leaves, the game is destroyed.
  // Returns the updated game, or null if it was destroyed.
  leave(gameId: number, playerId: number): Game | null | undefined {
    const game = this.findById(gameId);
    if (!game) return undefined;
    const pId = Number(playerId);
    game.players = game.players.filter((id) => id !== pId);
    this.playersService.clearCurrentGame(pId);
    if (game.players.length === 0) {
      this.games = this.games.filter((g) => g.id !== Number(gameId));
      return null;
    }
    return game;
  }

  // Game over: mark finished, clear currentGameId for all players
  finish(gameId: number): Game | undefined {
    const game = this.findById(gameId);
    if (!game) return undefined;
    game.isFinished = true;
    game.isActive = false;
    game.players.forEach((pId) => {
      this.playersService.clearCurrentGame(pId);
    });
    return game;
  }

  findById(gameId: number): Game | undefined {
    return this.games.find((g) => g.id === Number(gameId));
  }

  findByGroup(groupId: number): Game[] {
    return this.games.filter((g) => g.inGroup === Number(groupId));
  }

  findAll(): Game[] {
    return this.games;
  }

  cleanupExpired(): void {
    const now = new Date();
    const THIRTY_MINUTES_MS = 30 * 60 * 1000;

    this.games = this.games.filter((game) => {
      if (game.isActive || game.isFinished) return true;
      const age = now.getTime() - game.initiatedTime.getTime();
      if (age > THIRTY_MINUTES_MS) {
        this.startGame(game);
      }
      return true;
    });
  }

  private startGame(game: Game): void {
    game.isActive = true;
    game.startedTime = new Date();
    // Remove all players from any other pending games they were waiting in.
    // If that empties a pending game, destroy it immediately.
    game.players.forEach((pId) => {
      this.playersService.clearCurrentGame(pId);
      this.games.forEach((otherGame) => {
        if (otherGame.id !== game.id && !otherGame.isActive && otherGame.players.includes(pId)) {
          otherGame.players = otherGame.players.filter((id) => id !== pId);
        }
      });
    });
    // Re-set currentGameId for players in THIS game (clearCurrentGame above wiped it)
    game.players.forEach((pId) => {
      this.playersService.setCurrentGame(pId, game.id);
    });
    // Destroy any pending games that are now empty
    this.games = this.games.filter(
      (g) => g.isActive || g.isFinished || g.players.length > 0,
    );
  }
}
