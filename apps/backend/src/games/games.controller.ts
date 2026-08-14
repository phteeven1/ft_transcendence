import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  /**
   * Creates a new game inside a group and registers the initiating player.
   * This is the main REST entry point used when a parent starts a game from the lobby.
   *
   * @param body Game name, target group, and initiating player id.
   * @returns The created game record in API shape.
   */
  @Post('create')
  create(
    @Body()
    body: {
      name: string;
      inGroup: number;
      initiatedBy: number;
    },
  ) {
    return this.gamesService.create(body.name, body.inGroup, body.initiatedBy);
  }

  /**
   * Adds a player to an existing pending game.
   * Used from the lobby while the game is still joinable.
   *
   * @param body Game id and joining player id.
   * @returns The updated game, or `undefined` if the game cannot be joined.
   */
  @Post('join')
  join(@Body() body: { gameId: number; playerId: number }) {
    return this.gamesService.join(body.gameId, body.playerId);
  }

  /**
   * Marks a pending game as active and starts the play session.
   *
   * @param body The game id to start.
   * @returns The updated game, or `undefined` when the game does not exist.
   */
  @Post('start')
  start(@Body() body: { gameId: number }) {
    return this.gamesService.start(body.gameId);
  }

  /**
   * Removes a player from a game and cleans up the game if it becomes empty.
   *
   * @param body Game id and departing player id.
   * @returns The updated game, `null` if it was deleted, or `undefined` if missing.
   */
  @Post('leave')
  leave(@Body() body: { gameId: number; playerId: number }) {
    return this.gamesService.leave(body.gameId, body.playerId);
  }

  /**
   * Ends the player's play session without deleting the game record immediately.
   * This is used when the child exits the active play flow.
   *
   * @param body Game id and player id.
   */
  @Post('abandonPlay')
  abandonPlay(@Body() body: { gameId: number; playerId: number }) {
    return this.gamesService.abandonPlay(
      Number(body.gameId),
      Number(body.playerId),
    );
  }

  /**
   * Finishes the game and triggers the end-of-game broadcast.
   *
   * @param body The game id to finish.
   * @returns The updated game, or `undefined` if it does not exist.
   */
  @Post('finish')
  finish(@Body() body: { gameId: number }) {
    return this.gamesService.finish(body.gameId);
  }

  /**
   * Runs the cleanup pass that auto-starts or prunes expired pending games.
   *
   * @returns A small acknowledgement payload for the caller.
   */
  @Post('cleanup')
  async cleanup() {
    await this.gamesService.cleanupExpired();
    return { ok: true };
  }

  @Get(':id/finish-outcome')
  getFinishOutcome(@Param('id') id: string) {
    return this.gamesService.getFinishOutcome(Number(id));
  }

  /**
   * Returns one game by id.
   *
   * @param id Game id from the route.
   * @returns The matching game, or `undefined` if it does not exist.
   */
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.gamesService.findById(Number(id));
  }

  /**
   * Returns the player roster for a specific game.
   *
   * @param id Route parameter carrying the game id.
   * @returns A list of player ids and display names.
   */
  @Get(':id/players')
  findPlayersForGame(@Param('id') id: string) {
    return this.gamesService.findPlayersForGame(Number(id));
  }

  /**
   * Returns all games that belong to a specific group.
   *
   * @param groupId Route parameter carrying the group id.
   * @returns The list of games in the requested group.
   */
  @Get('group/:groupId')
  findByGroup(@Param('groupId') groupId: string) {
    return this.gamesService.findByGroup(Number(groupId));
  }
}
