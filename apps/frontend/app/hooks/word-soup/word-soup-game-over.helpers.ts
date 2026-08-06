import type { GameFinishOutcomeDto, GameFinishPlayerOutcomeDto } from '@/lib/api/games/types';
import { computeXpAwarded, isMultiplayerGame } from '@/lib/api/progression';

export function getGameOverClosingText(
  players: GameFinishPlayerOutcomeDto[],
): string {
  if (players.length === 1) {
    return `Well done ${players[0]?.playerName ?? 'everyone'}, great solo game! See you again soon!`;
  }
  return 'Well done everyone, great game! See you again soon!';
}

export type GameOverAnnouncement = {
  playerId: number;
  speech: string;
};

export function ordinal(place: number): string {
  const mod100 = place % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${place}th`;
  const suffixes = ['th', 'st', 'nd', 'rd'] as const;
  const suffix = suffixes[place % 10] ?? 'th';
  return `${place}${suffix}`;
}

export function buildGameOverAnnouncements(
  players: GameFinishPlayerOutcomeDto[],
): GameOverAnnouncement[] {
  if (players.length === 0) return [];

  const sorted = [...players].sort((a, b) => a.score - b.score);
  const winners = sorted.filter((player) => player.isWinner);
  const nonWinners = sorted.filter((player) => !player.isWinner);
  const totalPlayers = sorted.length;
  const announcements: GameOverAnnouncement[] = [];

  for (let index = 0; index < nonWinners.length; index += 1) {
    const player = nonWinners[index]!;
    const place = totalPlayers - index;
    announcements.push({
      playerId: player.playerId,
      speech: `In ${ordinal(place)} place, ${player.playerName}, with ${player.score} points and +${player.xpAwarded} XP!`,
    });
  }

  for (let index = 0; index < winners.length; index += 1) {
    const player = winners[index]!;
    if (totalPlayers === 1) {
      announcements.push({
        playerId: player.playerId,
        speech: `In 1st place, ${player.playerName}, with ${player.score} points and +${player.xpAwarded} XP!`,
      });
      continue;
    }
    const prefix =
      index === 0
        ? winners.length > 1
          ? 'And finally, the winners! '
          : 'And finally, the winner, '
        : '';
    announcements.push({
      playerId: player.playerId,
      speech: `${prefix}${player.playerName}, with ${player.score} points and +${player.xpAwarded} XP!`,
    });
  }

  return announcements;
}

export function buildFallbackFinishOutcome(
  players: Array<{ id: number; name: string }>,
  playerScores: Record<number, number>,
): GameFinishOutcomeDto {
  const scores = players.map((player) => playerScores[player.id] ?? 0);
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

  return {
    players: players.map((player) => {
      const score = playerScores[player.id] ?? 0;
      const isWinner =
        isMultiplayerGame(players.length) &&
        players.length > 0 &&
        score === maxScore;
      return {
        playerId: player.id,
        playerName: player.name,
        score,
        xpAwarded: computeXpAwarded(players.length, isWinner),
        isWinner,
        newlyUnlockedTier: null,
      };
    }),
  };
}
