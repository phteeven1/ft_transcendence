import { getPlayerSession } from './player-session';

export function shouldLeaveForReplacedPlayerToken(token: string): boolean {
  const stored = getPlayerSession();
  return Boolean(stored && stored.token !== token);
}
