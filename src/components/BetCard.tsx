'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Shield, 
  CheckCircle,
  XCircle,
  Plus,
  Circle,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Pick {
  homeTeam: string;
  awayTeam: string;
  pick: string;
  odds: number;
  probability: number;
  league: string;
  matchDate: string;
  analysis?: string;
  topPicks?: {
    type: string;
    label: string;
    probability: number;
    confidence: number;
    odds: number;
    reasoning: string[];
  }[];
  selectedPickIndices?: number[];
}

interface Combinada {
  id: string;
  picks: Pick[];
  totalOdds: number;
  totalProbability: number;
  risk: string;
}

interface BetCardProps {
  combinada: Combinada;
  onTakeBet?: (combinada: Combinada) => void;
  isYersonPick?: boolean;
}

export function BetCard({ combinada, onTakeBet, isYersonPick }: BetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedPicks = [...combinada.picks].sort((a, b) => {
    const dateA = new Date(a.matchDate).getTime();
    const dateB = new Date(b.matchDate).getTime();
    return dateB - dateA;
  });

  return (
    <Card className={`bg-gradient-to-br from-gray-900 to-black border transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 ${
      isYersonPick ? 'border-yellow-500/50 ring-1 ring-yellow-500/30' : 'border-green-500/20'
    }`}>
      {isYersonPick && (
        <div className="bg-gradient-to-r from-yellow-600 to-amber-500 text-black text-[10px] md:text-xs font-bold text-center py-1 rounded-t-lg">
          ⭐ APUESTA DEL DÍA DEL DIOS YERSON ⭐
        </div>
      )}
      <CardHeader className="pb-1.5 md:pb-2 p-3 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm md:text-lg text-green-400 flex items-center gap-1.5 md:gap-2">
            <Target className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            <span className="truncate">#{combinada.id.substring(0, 6).toUpperCase()}</span>
          </CardTitle>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-[10px] md:text-xs shrink-0">
            <Shield className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
            BAJO RIESGO
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4 pt-0 md:pt-0">
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <div className="bg-gray-800/50 rounded-lg p-2 md:p-3 border border-gray-700/50">
            <div className="text-[10px] md:text-xs text-gray-400 mb-0.5 md:mb-1">💰 Cuota Total</div>
            <div className="text-lg md:text-xl font-bold text-green-400">{combinada.totalOdds.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2 md:p-3 border border-gray-700/50">
            <div className="text-[10px] md:text-xs text-gray-400 mb-0.5 md:mb-1">📊 Probabilidad</div>
            <div className="text-lg md:text-xl font-bold text-white">{(combinada.totalProbability * 100).toFixed(0)}%</div>
            <Progress value={combinada.totalProbability * 100} className="h-0.5 md:h-1 mt-0.5 md:mt-1" />
          </div>
        </div>

        <div className="space-y-1.5 md:space-y-2">
          <div className="text-[10px] md:text-xs text-gray-400 flex items-center justify-between">
            <span>Picks ({combinada.picks.length})</span>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-green-400 hover:text-green-300 text-[10px] md:text-xs flex items-center gap-1"
            >
              {isExpanded ? 'Ver menos' : 'Ver todos los picks'}
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          
          {sortedPicks.map((pick, index) => {
            const matchDate = new Date(pick.matchDate);
            const hasMultiplePicks = pick.topPicks && pick.topPicks.length > 0;
            const selectedIndices = pick.selectedPickIndices || [0];
            
            return (
              <div
                key={index}
                className="bg-gray-800/30 rounded-lg p-2 md:p-3 border border-gray-700/30 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-[11px] md:text-sm text-white font-medium truncate">
                      {index + 1}. {pick.homeTeam} vs {pick.awayTeam}
                    </div>
                    
                    {/* Picks seleccionados */}
                    <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-1">
                      {hasMultiplePicks && selectedIndices.length > 1 ? (
                        // Mostrar múltiples picks si hay más de uno seleccionado
                        <div className="flex flex-wrap gap-1">
                          {selectedIndices.map((idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] md:text-xs border-green-500/50 text-green-400 px-1.5 md:px-2">
                              {pick.topPicks![idx]?.label} @{pick.topPicks![idx]?.odds.toFixed(2)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        // Un solo pick
                        <>
                          <Badge variant="outline" className="text-[10px] md:text-xs border-green-500/50 text-green-400 px-1.5 md:px-2">
                            {pick.pick}
                          </Badge>
                          <span className="text-[10px] md:text-xs text-gray-400">@ {pick.odds.toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] md:text-sm font-bold text-green-400">
                      {(pick.probability * 100).toFixed(0)}%
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-500">
                      {matchDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>

                {/* TOP 3 picks expandido */}
                {isExpanded && hasMultiplePicks && (
                  <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-700/50">
                    <div className="text-[10px] md:text-xs text-gray-400 mb-1.5 md:mb-2">🎯 TOP 3 Picks:</div>
                    <div className="space-y-1">
                      {pick.topPicks!.map((topPick, pIdx) => {
                        const isSelected = selectedIndices.includes(pIdx);
                        return (
                          <div key={pIdx} className={`flex items-center justify-between p-1.5 md:p-2 rounded text-[10px] md:text-xs ${
                            isSelected ? 'bg-green-500/20 border border-green-500/50' : 'bg-gray-800/50'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              {isSelected && <CheckCircle className="w-3 h-3 text-green-400" />}
                              <span className={isSelected ? 'text-green-400 font-medium' : 'text-gray-300'}>
                                {topPick.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">@{topPick.odds.toFixed(2)}</span>
                              <span className="text-green-400 font-medium">{topPick.confidence}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Análisis expandido */}
                {isExpanded && pick.analysis && !hasMultiplePicks && (
                  <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-700/50">
                    <div className="text-[10px] md:text-xs text-gray-400">
                      📈 {pick.analysis}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {onTakeBet && (
          <Button
            onClick={() => onTakeBet(combinada)}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-black font-bold text-xs md:text-sm h-9 md:h-10"
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
            TOMAR ESTA APUESTA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Componente para mostrar una apuesta activa
interface BetItem {
  id: string;
  pick: string;
  odds: number;
  probability: number;
  result: string | null;
  match: {
    homeTeam: string;
    awayTeam: string;
    league: string;
    matchDate?: Date | string;
    homeScore?: number | null;
    awayScore?: number | null;
    status?: string;
    minute?: number | null;
  };
  topPicks?: any;
  selectedPickIndices?: number[];
}

interface ActiveBetCardProps {
  bet: {
    id: string;
    status: string;
    totalProbability: number;
    riskLevel: string;
    createdAt: string;
    items: BetItem[];
  };
  onDelete?: (betId: string) => void;
  isDeleting?: boolean;
}

export function ActiveBetCard({ bet, onDelete, isDeleting }: ActiveBetCardProps) {
  const [showAllPicks, setShowAllPicks] = useState<Record<string, boolean>>({});
  const totalOdds = bet.items.reduce((acc, item) => acc * item.odds, 1);

  const isPickWinning = (item: BetItem): boolean => {
    const { homeScore, awayScore } = item.match;
    if (homeScore === null || homeScore === undefined || 
        awayScore === null || awayScore === undefined) return false;
    
    const pick = item.pick.toLowerCase();
    const totalGoals = homeScore + awayScore;
    
    if (pick.includes('doble oportunidad 1x') || pick.includes('1x')) return homeScore >= awayScore;
    if (pick.includes('doble oportunidad x2') || pick.includes('x2')) return awayScore >= homeScore;
    if (pick.includes('doble oportunidad 12') || pick.includes('12')) return homeScore !== awayScore;
    if (pick.includes('más de') || pick.includes('mas de')) {
      const match = pick.match(/má?s de\s*(\d+\.?\d*)/);
      if (match) return totalGoals > parseFloat(match[1]);
    }
    if (pick.includes('menos de')) {
      const match = pick.match(/menos de\s*(\d+\.?\d*)/);
      if (match) return totalGoals < parseFloat(match[1]);
    }
    
    return false;
  };

  const getPickStatus = (item: BetItem): 'won' | 'lost' | 'winning' | 'losing' | 'live' | 'pending' => {
    const match = item.match;
    const matchDate = match.matchDate ? new Date(match.matchDate) : null;
    const now = new Date();
    
    if (item.result === 'won') return 'won';
    if (item.result === 'lost') return 'lost';
    
    if (matchDate && matchDate < now) {
      const hasScore = match.homeScore !== null && match.homeScore !== undefined;
      if (hasScore) return isPickWinning(item) ? 'winning' : 'losing';
      return 'live';
    }
    
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'bg-green-500/20 border-green-500/50 ring-1 ring-green-500/30';
      case 'lost': return 'bg-red-500/20 border-red-500/50 ring-1 ring-red-500/30';
      case 'winning': return 'bg-emerald-500/30 border-emerald-500/50 ring-1 ring-emerald-400/50 animate-pulse';
      case 'losing': return 'bg-orange-500/20 border-orange-500/50 ring-1 ring-orange-400/50';
      case 'live': return 'bg-blue-500/20 border-blue-500/50';
      default: return 'bg-gray-800/30 border-gray-700/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'won':
        return (
          <Badge className="bg-green-500/20 text-green-400 text-[10px] md:text-xs px-1.5 md:px-2">
            <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" /> Ganado
          </Badge>
        );
      case 'lost':
        return (
          <Badge className="bg-red-500/20 text-red-400 text-[10px] md:text-xs px-1.5 md:px-2">
            <XCircle className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" /> Perdido
          </Badge>
        );
      case 'winning':
        return (
          <Badge className="bg-emerald-500/30 text-emerald-300 animate-pulse text-[10px] md:text-xs px-1.5 md:px-2 border border-emerald-400/50">
            <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" /> ¡Ganando!
          </Badge>
        );
      case 'losing':
        return (
          <Badge className="bg-orange-500/30 text-orange-300 text-[10px] md:text-xs px-1.5 md:px-2 border border-orange-400/50">
            <TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" /> Perdiendo
          </Badge>
        );
      case 'live':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 animate-pulse text-[10px] md:text-xs px-1.5 md:px-2">
            <Circle className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1 fill-blue-400" /> En vivo
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 text-[10px] md:text-xs px-1.5 md:px-2">
            <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" /> Pendiente
          </Badge>
        );
    }
  };

  const stats = {
    won: bet.items.filter(i => i.result === 'won').length,
    lost: bet.items.filter(i => i.result === 'lost').length,
    winning: bet.items.filter(i => getPickStatus(i) === 'winning').length,
    losing: bet.items.filter(i => getPickStatus(i) === 'losing').length,
    pending: bet.items.filter(i => getPickStatus(i) === 'pending').length,
  };

  return (
    <div className="flex gap-2 items-start">
      {onDelete && (
        <button
          onClick={() => onDelete(bet.id)}
          disabled={isDeleting}
          className="mt-3 md:mt-4 p-1.5 md:p-2 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all border border-red-500/30 hover:border-red-500/50 shrink-0 self-start"
          title="Eliminar apuesta"
        >
          {isDeleting ? (
            <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
          )}
        </button>
      )}
      
      <Card className={`flex-1 bg-gradient-to-br from-gray-900 to-black border ${
        bet.status === 'won' 
          ? 'border-green-500/50 ring-2 ring-green-500/30' 
          : bet.status === 'lost'
            ? 'border-red-500/50 ring-2 ring-red-500/30'
            : 'border-green-500/20'
      }`}>
      <CardHeader className="pb-1.5 md:pb-2 p-3 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 shrink-0" />
            <span className="text-[10px] md:text-sm text-gray-400">
              {new Date(bet.createdAt).toLocaleDateString('es-CO', { 
                day: 'numeric', 
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          {bet.status === 'active' ? (
            <Badge className="bg-blue-500/20 text-blue-400 animate-pulse text-[10px] md:text-xs">
              <Circle className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1 fill-blue-400" /> En vivo
            </Badge>
          ) : bet.status === 'won' ? (
            <Badge className="bg-green-500/20 text-green-400 text-[10px] md:text-xs">✓ GANADA</Badge>
          ) : (
            <Badge className="bg-red-500/20 text-red-400 text-[10px] md:text-xs">✗ PERDIDA</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 md:space-y-3 p-3 md:p-4 pt-0 md:pt-0">
        <div className="grid grid-cols-2 gap-1.5 md:gap-2 text-[10px] md:text-sm">
          <div className="bg-gray-800/50 rounded p-1.5 md:p-2 text-center">
            <span className="text-gray-400 text-[10px]">Cuota Total</span>
            <div className="text-green-400 font-bold text-sm md:text-lg">{totalOdds.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800/50 rounded p-1.5 md:p-2 text-center">
            <span className="text-gray-400 text-[10px]">Probabilidad</span>
            <div className="text-white font-bold text-sm md:text-lg">{(bet.totalProbability * 100).toFixed(0)}%</div>
          </div>
        </div>

        <div className="space-y-1.5 md:space-y-2">
          {bet.items.map((item, index) => {
            const status = getPickStatus(item);
            const match = item.match;
            const matchDate = match.matchDate ? new Date(match.matchDate) : null;
            const hasMultiplePicks = item.topPicks && Array.isArray(item.topPicks) && item.topPicks.length > 0;
            const selectedIndices = item.selectedPickIndices || [0];
            
            return (
              <div 
                key={item.id} 
                className={`rounded-lg p-2 md:p-3 border transition-all ${getStatusColor(status)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] md:text-sm text-white font-medium truncate">
                        {index + 1}. {match.homeTeam} vs {match.awayTeam}
                      </span>
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-400 mt-0.5 truncate">{match.league}</div>
                    
                    {matchDate && (
                      <div className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">
                        📅 {matchDate.toLocaleDateString('es-CO', { 
                          weekday: 'short',
                          day: 'numeric', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {getStatusBadge(status)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-1.5 md:mt-2 pt-1.5 md:pt-2 border-t border-gray-700/30">
                  <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                    {/* Mostrar picks seleccionados */}
                    {hasMultiplePicks && selectedIndices.length > 1 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedIndices.map((idx) => {
                          const topPick = item.topPicks[idx];
                          return topPick ? (
                            <span key={idx} className="text-green-400 font-medium text-[10px] md:text-xs bg-green-500/10 px-1.5 rounded">
                              {topPick.label} @{topPick.odds?.toFixed(2) || item.odds.toFixed(2)}
                            </span>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <>
                        <span className="text-green-400 font-medium text-[11px] md:text-sm">{item.pick}</span>
                        <span className="text-gray-400 text-[10px] md:text-xs">@ {item.odds.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                  
                  {(status === 'live' || status === 'winning' || status === 'losing') &&
                   match.homeScore !== null && match.homeScore !== undefined &&
                   match.awayScore !== null && match.awayScore !== undefined && (
                    <div className="flex items-center gap-1.5 md:gap-2">
                      {match.minute && match.minute > 0 && (
                        <div className="px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                          {match.minute}'
                        </div>
                      )}
                      <div className="px-2 md:px-3 py-0.5 md:py-1 rounded text-[11px] md:text-sm font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {match.homeScore} <span className="text-gray-400 mx-0.5">-</span> {match.awayScore}
                        <span className="ml-1 text-blue-400 animate-pulse">●</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {bet.status !== 'active' && (
          <div className={`text-center py-2 md:py-3 rounded-lg ${
            bet.status === 'won' 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {bet.status === 'won' ? (
              <div className="flex items-center justify-center gap-1.5 md:gap-2">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
                <span className="font-bold text-sm md:text-lg">¡COMBINADA GANADA!</span>
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 md:gap-2">
                <TrendingDown className="w-4 h-4 md:w-5 md:h-5" />
                <span className="font-bold text-sm md:text-lg">COMBINADA PERDIDA</span>
                <TrendingDown className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
