// Types for betting engine - Frontend
// These types match the backend definitions

export interface Pick {
  matchId: string;
  match: string;
  pick: string;
  odds: number;
  probability: number;
  risk: 'low' | 'medium' | 'high';
  analysis: string;
  homeTeam?: string;
  awayTeam?: string;
  league?: string;
  matchDate?: Date;
}

export interface Combinada {
  id: string;
  picks: Pick[];
  totalOdds: number;
  totalProbability: number;
  risk: 'low' | 'medium' | 'high';
  league?: string;
}
