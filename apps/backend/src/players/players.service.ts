import { Injectable } from '@nestjs/common';

export type Player = {
  id: number;
  inGroup: number;
  ofUser: number;
  name: string;
  passQuestion: string;
  passAnswer: string;
  currentGameId: number | null;
};

@Injectable()
export class PlayersService {
  private players: Player[] = [];
  private nextId = 1;

  create(
    inGroup: number,
    ofUser: number,
    name: string,
    passQuestion: string,
    passAnswer: string,
  ): Omit<Player, 'passAnswer'> {
    const newPlayer: Player = {
      id: this.nextId++,
      inGroup: Number(inGroup),
      ofUser: Number(ofUser),
      name: name,
      passQuestion: passQuestion,
      passAnswer: passAnswer,
      currentGameId: null,
    };
    this.players.push(newPlayer);
    const { passAnswer: _, ...safePlayer } = newPlayer;
    return safePlayer;
  }

  rename(playerId: number, name: string): Omit<Player, 'passAnswer'> | undefined {
    const player = this.players.find(p => p.id === Number(playerId));
    if (!player) return undefined;
    player.name = name;
    const { passAnswer: _, ...safePlayer } = player;
    return safePlayer;
  }

  updatePassPhrase(
    playerId: number,
    passQuestion: string,
    passAnswer: string,
  ): Omit<Player, 'passAnswer'> | undefined {
    const player = this.players.find(p => p.id === Number(playerId));
    if (!player) return undefined;
    player.passQuestion = passQuestion;
    player.passAnswer = passAnswer;
    const { passAnswer: _, ...safePlayer } = player;
    return safePlayer;
  }

  remove(playerId: number): boolean {
    const index = this.players.findIndex(p => p.id === Number(playerId));
    if (index === -1) return false;
    this.players.splice(index, 1);
    return true;
  }

  removeByGroup(inGroup: number): void {
    this.players = this.players.filter(
      p => p.inGroup !== Number(inGroup)
    );
  }

  findById(playerId: number): Omit<Player, 'passAnswer'> | undefined {
    const player = this.players.find(p => p.id === Number(playerId));
    if (!player) return undefined;
    const { passAnswer: _, ...safePlayer } = player;
    return safePlayer;
  }

  findByParentInGroup(ofUser: number, inGroup: number): Omit<Player, 'passAnswer'>[] {
    return this.players
      .filter(p =>
        p.ofUser === Number(ofUser) &&
        p.inGroup === Number(inGroup),
      )
      .map(({ passAnswer: _, ...safePlayer }) => safePlayer);
  }

  findByGroup(inGroup: number): Omit<Player, 'passAnswer'>[] {
    return this.players
      .filter(p => p.inGroup === Number(inGroup))
      .map(({ passAnswer: _, ...safePlayer }) => safePlayer);
  }

  setCurrentGame(playerId: number, gameId: number): void {
    const player = this.players.find((p) => p.id === Number(playerId));
    if (player) player.currentGameId = Number(gameId);
  }

  clearCurrentGame(playerId: number): void {
    const player = this.players.find((p) => p.id === Number(playerId));
    if (player) player.currentGameId = null;
  }
}