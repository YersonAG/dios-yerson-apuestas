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
  Trash2
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

  // Sort picks by matchDate - most recent first (descending)
  const sortedPicks = [...combinada.picks].sort((a, b) => {
    const dateA = new Date(a.matchDate).getTime();
    const dateB = new Date(b.matchDate).getTime();
    return dateB - dateA; // Descending - most recent first
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
        {/* Stats principales */}
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

        {/* Lista de picks */}
        <div className="space-y-1.5 md:space-y-2">
          <div className="text-[10px] md:text-xs text-gray-400 flex items-center justify-between">
            <span>Picks ({combinada.picks.length})</span>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-green-400 hover:text-green-300 text-[10px] md:text-xs"
            >
              {isExpanded ? 'Ver menos' : 'Ver análisis'}
            </button>
          </div>
          
          {sortedPicks.map((pick, index) => {
            const matchDate = new Date(pick.matchDate);
            
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
                    <div className="flex items-center gap-1 md:gap-2 mt-0.5 md:mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] md:text-xs border-green-500/50 text-green-400 px-1.5 md:px-2">
                        {pick.pick}
                      </Badge>
                      <span className="text-[10px] md:text-xs text-gray-400">@ {pick.odds.toFixed(2)}</span>
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

                {/* Análisis expandido */}
                {isExpanded && pick.analysis && (
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

        {/* Botón para tomar la apuesta */}
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

// Componente para mostrar una apuesta activa - SIN botones manuales
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
  };
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
  const totalOdds = bet.items.reduce((acc, item) => acc * item.odds, 1);

  // Función para determinar si un pick está ganando en vivo
  const isPickWinning = (item: BetItem): boolean => {
    const { homeScore, awayScore } = item.match;
    if (homeScore === null || homeScore === undefined || 
        awayScore === null || awayScore === undefined) return false;
    
    const pick = item.pick.toLowerCase();
    const totalGoals = homeScore + awayScore;
    
    // Doble oportunidad 1X - gana local o empate
    if (pick.includes('doble oportunidad 1x') || pick.includes('1x')) {
      return homeScore >= awayScore;
    }
    // Doble oportunidad X2 - gana visitante o empate
    if (pick.includes('doble oportunidad x2') || pick.includes('x2')) {
      return awayScore >= homeScore;
    }
    // Doble oportunidad 12 - no empate
    if (pick.includes('doble oportunidad 12') || pick.includes('12')) {
      return homeScore !== awayScore;
    }
    // Más de X goles
    if (pick.includes('más de') || pick.includes('mas de')) {
      const match = pick.match(/má?s de\s*(\d+\.?\d*)/);
      if (match) return totalGoals > parseFloat(match[1]);
    }
    // Menos de X goles
    if (pick.includes('menos de')) {
      const match = pick.match(/menos de\s*(\d+\.?\d*)/);
      if (match) return totalGoals < parseFloat(match[1]);
    }
    
    return false;
  };

  // Función para determinar el estado visual del pick
  const getPickStatus = (item: BetItem): 'won' | 'lost' | 'winning' | 'losing' | 'live' | 'pending' => {
    const match = item.match;
    const matchDate = match.matchDate ? new Date(match.matchDate) : null;
    const now = new Date();
    
    // Si ya tiene resultado (definido automáticamente por el sistema)
    if (item.result === 'won') return 'won';
    if (item.result === 'lost') return 'lost';
    
    // Si el partido está en vivo (ya empezó pero no tiene resultado aún)
    if (matchDate && matchDate < now) {
      const hasScore = match.homeScore !== null && match.homeScore !== undefined;
      if (hasScore) {
        // Determinar si está ganando o perdiendo
        return isPickWinning(item) ? 'winning' : 'losing';
      }
      return 'live';
    }
    
    // Si aún no empieza
    return 'pending';
  };

  // Colores según estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won':
        return 'bg-green-500/20 border-green-500/50 ring-1 ring-green-500/30';
      case 'lost':
        return 'bg-red-500/20 border-red-500/50 ring-1 ring-red-500/30';
      case 'winning':
        return 'bg-emerald-500/30 border-emerald-500/50 ring-1 ring-emerald-400/50 animate-pulse';
      case 'losing':
        return 'bg-orange-500/20 border-orange-500/50 ring-1 ring-orange-400/50';
      case 'live':
        return 'bg-blue-500/20 border-blue-500/50';
      default:
        return 'bg-gray-800/30 border-gray-700/30';
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
  
  // Calcular estadísticas rápidas de la combinada
  const stats = {
    won: bet.items.filter(i => i.result === 'won').length,
    lost: bet.items.filter(i => i.result === 'lost').length,
    winning: bet.items.filter(i => getPickStatus(i) === 'winning').length,
    losing: bet.items.filter(i => getPickStatus(i) === 'losing').length,
    pending: bet.items.filter(i => getPickStatus(i) === 'pending').length,
  };

  return (
    <div className="flex gap-2 items-start">
      {/* Botón de eliminar al lado izquierdo */}
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

        {/* Lista de picks - ordenados por fecha más reciente primero (ya ordenados desde ActiveBets) */}
        <div className="space-y-1.5 md:space-y-2">
          {bet.items.map((item, index) => {
            const status = getPickStatus(item);
            const match = item.match;
            const matchDate = match.matchDate ? new Date(match.matchDate) : null;
            
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
                    <span className="text-green-400 font-medium text-[11px] md:text-sm">{item.pick}</span>
                    <span className="text-gray-400 text-[10px] md:text-xs">@ {item.odds.toFixed(2)}</span>
                  </div>
                  
                  {/* Marcador en vivo si está disponible */}
                  {(status === 'live' || status === 'won' || status === 'lost') && 
                   match.homeScore !== null && match.homeScore !== undefined && 
                   match.awayScore !== null && match.awayScore !== undefined && (
                    <div className="bg-gray-900 px-2 md:px-3 py-0.5 md:py-1 rounded text-[11px] md:text-sm">
                      <span className="text-white">{match.homeScore}</span>
                      <span className="text-gray-400 mx-0.5 md:mx-1">-</span>
                      <span className="text-white">{match.awayScore}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mensaje de resultado final */}
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
