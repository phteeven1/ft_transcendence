import { Injectable } from '@nestjs/common';

export type Player = {
  playerId: number;
  playerInGroup: number;
  playerParent: number;
  playerName: string;
  playerPassQuestion: string;
  playerPassAnswer: string;
};

@Injectable()
export class PlayersService {
  private players: Player[] = [];
  private nextId = 1;

  create(
    playerInGroup: number,
    playerParent: number,
    playerName: string,
    playerPassQuestion: string,
    playerPassAnswer: string,
  ): Omit<Player, 'playerPassAnswer'> {
    const newPlayer: Player = {
      playerId: this.nextId++,
      playerInGroup: Number(playerInGroup),
      playerParent: Number(playerParent),
      playerName,
      playerPassQuestion,
      playerPassAnswer,
    };
    this.players.push(newPlayer);
    const { playerPassAnswer: _, ...safePlayer } = newPlayer;
    return safePlayer;
  }

  findById(playerId: number): Omit<Player, 'playerPassAnswer'> | undefined {
    const player = this.players.find(p => p.playerId === Number(playerId));
    if (!player) return undefined;
    const { playerPassAnswer: _, ...safePlayer } = player;
    return safePlayer;
  }

  findByParentInGroup(playerParent: number, playerInGroup: number): Omit<Player, 'playerPassAnswer'>[] {
    return this.players
      .filter(p =>
        p.playerParent === Number(playerParent) &&
        p.playerInGroup === Number(playerInGroup),
      )
      .map(({ playerPassAnswer: _, ...safePlayer }) => safePlayer);
  }

  findByGroup(playerInGroup: number): Omit<Player, 'playerPassAnswer'>[] {
    return this.players
      .filter(p => p.playerInGroup === Number(playerInGroup))
      .map(({ playerPassAnswer: _, ...safePlayer }) => safePlayer);
  }
}