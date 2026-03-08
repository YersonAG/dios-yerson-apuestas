'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History as HistoryIcon, 
  Trophy, 
  TrendingDown, 
  Calendar,
  RefreshCw,
  Target,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_URL = 'https://dios-yerson-backend.onrender.com';

interface BetHistoryItem {
  id: string;
  result: string;
  totalOdds: number;
  matchesCount: number;
  dateCompleted: string;
  bet: {
    riskLevel: string;
    isYersonPick: boolean;
    items: Array<{
      pick: string;
      odds: number;
      match: {
        homeTeam: string;
        awayTeam: string;
        league: string;
      };
    }>;
  };
}

export function HistoryPanel() {
  const [history, setHistory] = useState<BetHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getSessionToken = () => {
    if (typeof window === 'undefined') return null;
    const localToken = localStorage.getItem('session_token');
    if (localToken) return localToken;
    return document.cookie.split('; ').find(row => row.startsWith('session='))?.split('=')[1] || null;
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    const token = getSessionToken();
    try {
      const response = await fetch(`${API_URL}/api/history`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const wonCount = history.filter(h => h.result === 'won').length;
  const lostCount = history.filter(h => h.result === 'lost').length;

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-black border border-green-500/20">
      <CardHeader className="pb-1.5 md:pb-3 p-3 md:p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-lg text-green-400 flex items-center gap-1.5 md:gap-2">
            <HistoryIcon className="w-4 h-4 md:w-5 md:h-5" />
            Historial de Apuestas
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchHistory}
            className="text-gray-400 hover:text-green-400 h-7 w-7 md:h-8 md:w-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-2 md:gap-4 mt-1.5 md:mt-3">
          <div className="flex items-center gap-1 md:gap-2">
            <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-400" />
            <span className="text-[10px] md:text-sm text-gray-400">Ganadas:</span>
            <Badge className="bg-green-500/20 text-green-400 text-[10px] md:text-xs">{wonCount}</Badge>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <TrendingDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-400" />
            <span className="text-[10px] md:text-sm text-gray-400">Perdidas:</span>
            <Badge className="bg-red-500/20 text-red-400 text-[10px] md:text-xs">{lostCount}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
        <ScrollArea className="h-[400px] md:h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 md:py-12">
              <RefreshCw className="w-5 h-5 md:w-6 md:h-6 animate-spin text-green-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-6 md:py-12 px-3">
              <HistoryIcon className="w-10 h-10 md:w-12 md:h-12 text-gray-600 mx-auto mb-2 md:mb-4" />
              <p className="text-gray-400 text-sm md:text-base">No tienes apuestas en el historial</p>
              <p className="text-[10px] md:text-sm text-gray-500 mt-1 md:mt-2">
                Cuando completes apuestas, aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {history.map((item) => (
                <Card 
                  key={item.id}
                  className={`bg-gray-800/30 border ${
                    item.result === 'won' 
                      ? 'border-green-500/30' 
                      : 'border-red-500/30'
                  }`}
                >
                  <CardContent className="pt-3 md:pt-4 p-3 md:p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                        <span className="text-[10px] md:text-sm text-gray-400">
                          {new Date(item.dateCompleted).toLocaleDateString('es-CO', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(item.dateCompleted).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {item.result === 'won' ? (
                        <Badge className="bg-green-500/20 text-green-400 text-[10px] md:text-xs">
                          <Trophy className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                          GANADA
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 text-[10px] md:text-xs">
                          <TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                          PERDIDA
                        </Badge>
                      )}
                    </div>

                    {/* Yerson Pick Badge */}
                    {item.bet?.isYersonPick && (
                      <div className="mb-2 md:mb-3">
                        <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px] md:text-xs">
                          ⭐ Pick del Dios Yerson
                        </Badge>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-1.5 md:gap-2 mb-2 md:mb-3">
                      <div className="bg-gray-900/50 rounded p-1.5 md:p-2 text-center">
                        <div className="text-[10px] text-gray-500">Cuota Total</div>
                        <div className="text-base md:text-lg font-bold text-green-400">
                          {item.totalOdds.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-gray-900/50 rounded p-1.5 md:p-2 text-center">
                        <div className="text-[10px] text-gray-500">Partidos</div>
                        <div className="text-base md:text-lg font-bold text-white">
                          {item.matchesCount}
                        </div>
                      </div>
                    </div>

                    {/* Matches */}
                    <div className="space-y-1.5 md:space-y-2">
                      {item.bet?.items?.map((betItem, idx) => (
                        <div 
                          key={idx}
                          className="bg-gray-900/30 rounded p-1.5 md:p-2 flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="text-[11px] md:text-sm text-white truncate">
                              {betItem.match.homeTeam} vs {betItem.match.awayTeam}
                            </div>
                            <div className="text-[10px] md:text-xs text-gray-500 truncate">
                              {betItem.match.league}
                            </div>
                          </div>
                          <div className="text-right shrink-0 pl-2">
                            <div className="text-[11px] md:text-sm text-green-400">{betItem.pick}</div>
                            <div className="text-[10px] md:text-xs text-gray-500">@ {betItem.odds.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Risk Level */}
                    <div className="mt-2 md:mt-3 flex justify-between items-center text-[10px] md:text-xs">
                      <div className="flex items-center gap-0.5 md:gap-1">
                        <Target className="w-2.5 h-2.5 md:w-3 md:h-3 text-gray-400" />
                        <span className="text-gray-500">Riesgo:</span>
                        <Badge variant="outline" className={`text-[10px] md:text-xs ${
                          item.bet?.riskLevel === 'low' 
                            ? 'border-green-500/50 text-green-400'
                            : item.bet?.riskLevel === 'medium'
                            ? 'border-yellow-500/50 text-yellow-400'
                            : 'border-red-500/50 text-red-400'
                        }`}>
                          {item.bet?.riskLevel?.toUpperCase() || 'MEDIO'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
