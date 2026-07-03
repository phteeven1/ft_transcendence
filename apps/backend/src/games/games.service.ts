import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { gameWithPlayers, toApiGame } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { PlayersService } from '../players/players.service';
import { GameGateway } from './game.gateway';

export type Game = {
  id: number;
  name: string;
  inGroup: number;
  initiatedBy: number;
  initiatedTime: Date;
  startedTime: Date | null;
  players: number[];
  isActive: boolean;
  isFinished: boolean;
};

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly playersService: PlayersService,
    @Inject(forwardRef(() => GameGateway))
    private readonly gateway: GameGateway,
  ) {}

  /**
   * Creates a new game, adds the initiating player to it, and refreshes the lobby view.
   *
   * @param name Display name for the game.
   * @param inGroup Group that owns the game.
   * @param initiatedBy Player id of the creator.
   * @returns The created game in API shape.
   */
  async create(
    name: string,
    inGroup: number,
    initiatedBy: number,
  ): Promise<Game> {
    const game = await this.prisma.game.create({
      data: {
        name,
        inGroupId: inGroup,
        initiatedById: initiatedBy,
        gamePlayers: { create: { playerId: initiatedBy } },
      },
      ...gameWithPlayers,
    });
    await this.playersService.setCurrentGame(initiatedBy, game.id);
    const result = toApiGame(game);
    await this.emitLobbyUpdate(inGroup);
    return result;
  }

  /**
   * Adds a player to a pending game when the game is still joinable.
   *
   * @param gameId Game to join.
   * @param playerId Player joining the game.
   * @returns The updated game, or `undefined` if joining is not allowed.
   */
  async join(gameId: number, playerId: number): Promise<Game | undefined> {
    const game = await this.findById(gameId);
    if (!game || game.isActive) return undefined;

    if (!game.players.includes(playerId)) {
      await this.prisma.gamePlayer.create({
        data: { gameId, playerId },
      });
      await this.playersService.setCurrentGame(playerId, gameId);
    }
    const result = await this.findById(gameId);
    if (result) await this.emitLobbyUpdate(game.inGroup);
    return result;
  }

  /**
   * Starts a pending game and promotes it into the active play state.
   *
   * @param gameId Game to start.
   * @returns The updated game, or `undefined` if it cannot be started.
   */
  async start(gameId: number): Promise<Game | undefined> {
    const game = await this.findById(gameId);
    if (!game) return undefined;
    await this.startGame(game);
    return this.findById(gameId);
  }

  /**
   * Removes a player from a game and deletes the game when it becomes empty.
   * This keeps lobby state and ownership consistent when participants leave.
   *
   * @param gameId Game to leave.
   * @param playerId Player leaving the game.
   * @returns The updated game, `null` if the game was removed, or `undefined` when missing.
   */
  async leave(
    gameId: number,
    playerId: number,
  ): Promise<Game | null | undefined> {
    const game = await this.findById(gameId);
    if (!game) return undefined;

    await this.prisma.gamePlayer.deleteMany({
      where: { gameId, playerId },
    });
    await this.playersService.clearCurrentGame(playerId);

    const updated = await this.findById(gameId);
    if (!updated || updated.players.length === 0) {
      await this.prisma.game.delete({ where: { id: gameId } }).catch(() => {});
      await this.emitLobbyUpdate(game.inGroup);
      return null;
    }

    // if the initiator left and others remain, promote the first remaining player
    if (game.initiatedBy === playerId && updated.players.length > 0) {
      await this.prisma.game.update({
        where: { id: gameId },
        data: { initiatedById: updated.players[0] },
      });
    }

    await this.emitLobbyUpdate(game.inGroup);
    return this.findById(gameId);
  }

  /**
   * Ends a play session for the given player without requiring the game to be deleted.
   *
   * @param gameId Game to abandon.
   * @param playerId Player ending the session.
   */
  async abandonPlay(gameId: number, playerId: number): Promise<void> {
    await this.leave(gameId, playerId);
    await this.playersService.clearSession(playerId);
  }

  /**
   * Looks up one game by id and converts it into the API response shape.
   *
   * @param gameId Game id to fetch.
   * @returns The matching game, or `undefined` if it does not exist.
   */
  async findById(gameId: number): Promise<Game | undefined> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      ...gameWithPlayers,
    });
    return game ? toApiGame(game) : undefined;
  }

  /**
   * Returns all games that belong to a single group.
   *
   * @param groupId Group id to filter by.
   * @returns The list of games in that group.
   */
  async findByGroup(groupId: number): Promise<Game[]> {
    const games = await this.prisma.game.findMany({
      where: { inGroupId: groupId },
      ...gameWithPlayers,
    });
    return games.map(toApiGame);
  }

  /**
   * Returns every game visible to the application.
   *
   * @returns The full game list in API shape.
   */
  async findAll(): Promise<Game[]> {
    const games = await this.prisma.game.findMany(gameWithPlayers);
    return games.map(toApiGame);
  }

  /**
   * Returns the player roster for one game for scoreboard rendering.
   *
   * @param gameId Game whose players should be listed.
   * @returns Player ids and names for the requested game.
   */
  async findPlayersForGame(gameId: number): Promise<Array<{ id: number; name: string }>> {
    const gamePlayers = await this.prisma.gamePlayer.findMany({
      where: { gameId },
      include: { player: { select: { id: true, name: true } } },
    });
    return gamePlayers.map(gp => ({ id: gp.player.id, name: gp.player.name }));
  }

  /**
   * Finds stale pending games and starts the ones that have expired.
   * This is used as a best-effort cleanup and auto-start path for abandoned lobbies.
   */
  async cleanupExpired(): Promise<void> {
    const now = new Date();
    const THIRTY_MINUTES_MS = 30 * 60 * 1000;

    const pending = await this.prisma.game.findMany({
      where: { isActive: false, isFinished: false },
      ...gameWithPlayers,
    });

    for (const game of pending) {
      const age = now.getTime() - game.initiatedTime.getTime();
      if (age > THIRTY_MINUTES_MS) {
        await this.startGame(toApiGame(game));
      }
    }
  }

  /**
   * Promotes a pending game to active status, updates related player state,
   * and removes empty stale games that were left behind in the same cleanup pass.
   *
   * @param game Game to start.
   */
  private async startGame(game: Game): Promise<void> {
    await this.prisma.game.update({
      where: { id: game.id },
      data: { isActive: true, startedTime: new Date() },
    });

    for (const pId of game.players) {
      await this.playersService.clearCurrentGame(pId);

      const otherPending = await this.prisma.game.findMany({
        where: {
          isActive: false,
          isFinished: false,
          id: { not: game.id },
          gamePlayers: { some: { playerId: pId } },
        },
        include: { gamePlayers: true },
      });

      for (const other of otherPending) {
        await this.prisma.gamePlayer.deleteMany({
          where: { gameId: other.id, playerId: pId },
        });

        const count = await this.prisma.gamePlayer.count({
          where: { gameId: other.id },
        });

        if (count === 0) {
          await this.prisma.game.delete({ where: { id: other.id } });
        } else {
          // if the leaving player was the initiator, promote the first remaining player
          if (other.initiatedById === pId) {
            const firstRemaining = await this.prisma.gamePlayer.findFirst({
              where: { gameId: other.id },
            });
            if (firstRemaining) {
              await this.prisma.game.update({
                where: { id: other.id },
                data: { initiatedById: firstRemaining.playerId },
              });
            }
          }
        }
      }
    }

    for (const pId of game.players) {
      await this.playersService.setCurrentGame(pId, game.id);
    }

    await this.prisma.game.deleteMany({
      where: {
        isActive: false,
        isFinished: false,
        gamePlayers: { none: {} },
      },
    });

    // Emit after all DB work is done
    const started = await this.findById(game.id);
    if (started) {
      this.gateway.emitGameStarted(game.inGroup, started);
      await this.emitLobbyUpdate(game.inGroup);
    }
  }

  /**
   * Pushes the refreshed lobby game list to the websocket gateway.
   *
   * @param groupId Group whose lobby should be refreshed.
   */
  private async emitLobbyUpdate(groupId: number): Promise<void> {
    const games = await this.findByGroup(groupId);
    this.gateway.emitLobbyUpdate(groupId, games);
  }

  /**
   * Marks a game as finished, clears player session state, and emits the end-game event.
   *
   * @param gameId Game to finish.
   * @returns The updated game, or `undefined` if the game does not exist.
   */
  async finish(gameId: number): Promise<Game | undefined> {
    const game = await this.findById(gameId);
    if (!game) return undefined;

    await this.prisma.game.update({
      where: { id: gameId },
      data: { isFinished: true, isActive: false },
    });
    for (const pId of game.players) {
      await this.playersService.clearCurrentGame(pId);
    }
    const result = await this.findById(gameId);
    await this.emitLobbyUpdate(game.inGroup);
    // Notify all players inside the game room that the game has ended.
    this.gateway.emitGameFinished(gameId);
    return result;
  }
}