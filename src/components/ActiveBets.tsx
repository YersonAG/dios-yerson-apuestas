'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { ActiveBetCard } from './BetCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const API_URL = 'https://dios-yerson-backend.onrender.com';

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

interface Bet {
  id: string;
  status: string;
  totalProbability: number;
  riskLevel: string;
  createdAt: string;
  items: BetItem[];
}

export function ActiveBets() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [deletingBetId, setDeletingBetId] = useState<string | null>(null);

  const getSessionToken = () => {
    if (typeof window === 'undefined') return null;
    const localToken = localStorage.getItem('session_token');
    if (localToken) return localToken;
    return document.cookie.split('; ').find(row => row.startsWith('session='))?.split('=')[1] || null;
  };

  const fetchBets = async () => {
    setIsLoading(true);
    try {
      const token = getSessionToken();
      
      const response = await fetch(`${API_URL}/api/bets?status=active`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      const data = await response.json();
      
      // Sort bets by createdAt (most recent first) and sort items by matchDate (most recent first)
      const sortedBets = (data.bets || []).map((bet: Bet) => ({
        ...bet,
        items: [...bet.items].sort((a, b) => {
          const dateA = a.match.matchDate ? new Date(a.match.matchDate).getTime() : 0;
          const dateB = b.match.matchDate ? new Date(b.match.matchDate).getTime() : 0;
          return dateB - dateA; // Most recent first (descending)
        })
      })).sort((a: Bet, b: Bet) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setBets(sortedBets);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching bets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
    // Actualizar cada 30 segundos para resultados en vivo
    const interval = setInterval(fetchBets, 30000);
    return () => clearInterval(interval);
  }, []);

  // Contar picks por estado
  const getPicksStats = () => {
    let pending = 0;
    let live = 0;
    let won = 0;
    let lost = 0;
    
    bets.forEach(bet => {
      bet.items.forEach(item => {
        if (item.result === 'won') won++;
        else if (item.result === 'lost') lost++;
        else {
          const matchDate = item.match.matchDate ? new Date(item.match.matchDate) : null;
          if (matchDate && matchDate < new Date()) live++;
          else pending++;
        }
      });
    });
    
    return { pending, live, won, lost };
  };

  const stats = getPicksStats();

  const handleDeleteBet = async (betId: string) => {
    const token = getSessionToken();
    if (!token) return;

    setDeletingBetId(betId);
    try {
      const response = await fetch(`${API_URL}/api/bets/${betId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setBets(prev => prev.filter(bet => bet.id !== betId));
      }
    } catch (error) {
      console.error('Error eliminando apuesta:', error);
    } finally {
      setDeletingBetId(null);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-black border border-green-500/20 h-full">
      <CardHeader className="pb-1.5 md:pb-3 p-3 md:p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-lg text-green-400 flex items-center gap-1.5 md:gap-2">
            <Clock className="w-4 h-4 md:w-5 md:h-5" />
            Apuestas Activas
          </CardTitle>
          <div className="flex items-center gap-1 md:gap-2">
            {lastUpdate && (
              <span className="text-[10px] md:text-xs text-gray-500">
                {lastUpdate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchBets}
              className="text-gray-400 hover:text-green-400 h-7 w-7 md:h-8 md:w-8"
            >
              <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Estadísticas rápidas */}
        {bets.length > 0 && (
          <div className="flex gap-1 md:gap-2 mt-1.5 md:mt-2 flex-wrap">
            {stats.pending > 0 && (
              <Badge className="bg-gray-500/20 text-gray-400 text-[10px] md:text-xs">
                {stats.pending} pendientes
              </Badge>
            )}
            {stats.live > 0 && (
              <Badge className="bg-blue-500/20 text-blue-400 animate-pulse text-[10px] md:text-xs">
                {stats.live} en vivo
              </Badge>
            )}
            {stats.won > 0 && (
              <Badge className="bg-green-500/20 text-green-400 text-[10px] md:text-xs">
                {stats.won} ganados
              </Badge>
            )}
            {stats.lost > 0 && (
              <Badge className="bg-red-500/20 text-red-400 text-[10px] md:text-xs">
                {stats.lost} perdidos
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
        <ScrollArea className="h-[300px] md:h-[400px]">
          {isLoading && bets.length === 0 ? (
            <div className="flex items-center justify-center py-6 md:py-8">
              <RefreshCw className="w-5 h-5 md:w-6 md:h-6 animate-spin text-green-400" />
            </div>
          ) : bets.length === 0 ? (
            <div className="text-center py-4 md:py-8 px-3">
              <Trophy className="w-10 h-10 md:w-12 md:h-12 text-gray-600 mx-auto mb-2 md:mb-3" />
              <p className="text-gray-400 text-xs md:text-base">No tienes apuestas activas</p>
              <p className="text-[10px] md:text-sm text-gray-500 mt-1">
                Pide combinadas en el chat para empezar
              </p>
              <div className="mt-2 md:mt-4 p-2 md:p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <p className="text-[10px] md:text-xs text-gray-400">
                  💡 Di <span className="text-green-400">"quiero 5 partidos"</span> o 
                  <span className="text-green-400"> "ver partidos"</span> en el chat
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4 pr-1">
              {bets.map((bet) => (
                <ActiveBetCard
                  key={bet.id}
                  bet={bet}
                  onDelete={handleDeleteBet}
                  isDeleting={deletingBetId === bet.id}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
