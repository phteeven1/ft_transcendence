/**
 * Single source of truth for generic game-lobby capacity and lifecycle
 * timing, shared across every game type (Word Building, Word Soup, and any
 * future one). Per-game-type tuning (board size, word counts, etc.) stays in
 * each game's own config module — this file only covers the create → join →
 * auto-start → auto-cancel lifecycle owned by GamesService.
 */
export const GAME_LOBBY_CONFIG = {
  /** Hard cap on players in one game. The join that reaches this count also triggers auto-start. */
  maxPlayers: 5,
  /** Minimum active players required before the auto-start timer is allowed to fire. */
  minPlayersToStart: 1,
  /** A WAITING game auto-starts this long after Game.initiatedTime if minPlayersToStart is met. */
  autoStartTimeoutMs: 5 * 60 * 1000,
  /**
   * A WAITING game that still hasn't reached minPlayersToStart is cancelled
   * this long after Game.initiatedTime. Kept distinct from
   * autoStartTimeoutMs — this is a separate, longer backstop, not the same
   * timer reused for two purposes.
   */
  cancellationTimeoutMs: 15 * 60 * 1000,
  /** Tick interval for the background lifecycle sweep (auto-start/cancel + expired-session reap). */
  sweepIntervalMs: 60 * 1000,
} as const;
