export const ACTIVITY_TYPES = {
  ROUND_FINALIZED: 'round_finalized',
  SKIN_RECORDED: 'skin_recorded',
  CTP_RECORDED: 'ctp_recorded',
  MEMBER_JOINED: 'member_joined',
  MEMBER_REMOVED: 'member_removed',
  HANDICAP_UPDATED: 'handicap_updated',
  ROUND_UNLOCKED: 'round_unlocked',
  LEAGUE_CREATED: 'league_created',
  SETTINGS_UPDATED: 'settings_updated',
  TEAM_CREATED: 'team_created',
};

export function logActivity(leagueId, type, description, extra = {}) {
  if (!leagueId) return;
  const key = `fos_${leagueId}_activity`;
  let current = [];
  try { current = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
  const event = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    description,
    timestamp: new Date().toISOString(),
    leagueId,
    ...extra,
  };
  const updated = [event, ...current].slice(0, 100);
  try { localStorage.setItem(key, JSON.stringify(updated)); } catch {}
  return event;
}

export function getActivity(leagueId) {
  if (!leagueId) return [];
  try { return JSON.parse(localStorage.getItem(`fos_${leagueId}_activity`) || '[]'); } catch { return []; }
}
