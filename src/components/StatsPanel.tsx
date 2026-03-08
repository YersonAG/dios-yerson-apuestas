'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Trophy, 
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

const API_URL = 'https://dios-yerson-backend.onrender.com';

interface LearningStats {
  pickType: string;
  successRate: number;
  totalPicks: number;
  wonPicks: number;
}

interface Stats {
  totalBets: number;
  wonBets: number;
  lostBets: number;
  winRate: number;
  learningStats: LearningStats[];
}

export function StatsPanel() {
  const [stats, setStats] = useState<Stats>({
    totalBets: 0,
    wonBets: 0,
    lostBets: 0,
    winRate: 0,
    learningStats: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const getSessionToken = () => {
    if (typeof window === 'undefined') return null;
    const localToken = localStorage.getItem('session_token');
    if (localToken) return localToken;
    return document.cookie.split('; ').find(row => row.startsWith('session='))?.split('=')[1] || null;
  };

  useEffect(() => {
    const fetchStats = async () => {
      const token = getSessionToken();
      try {
        const response = await fetch(`${API_URL}/api/stats`, {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-black border border-green-500/20">
        <CardContent className="py-8 md:py-12 text-center">
          <Activity className="w-6 h-6 md:w-8 md:h-8 animate-spin text-green-400 mx-auto mb-3 md:mb-4" />
          <p className="text-gray-400 text-sm md:text-base">Analizando estadísticas...</p>
        </CardContent>
      </Card>
    );
  }

  const winPercentage = stats.winRate * 100;

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-gray-900 to-black border border-green-500/20">
        <CardHeader className="text-center pb-1.5 md:pb-2 p-3 md:p-4">
          <CardTitle className="text-lg md:text-2xl text-green-400 flex items-center justify-center gap-1.5 md:gap-2">
            <BarChart3 className="w-5 h-5 md:w-6 md:h-6" />
            ESTADÍSTICAS DE LUDOPATÍA
          </CardTitle>
          <p className="text-gray-400 text-[10px] md:text-sm">Tu historial de apuestas analizado por el Dios Yerson</p>
        </CardHeader>
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="bg-gradient-to-br from-gray-900 to-black border border-gray-700">
          <CardContent className="pt-4 md:pt-6 text-center p-3 md:p-4">
            <Target className="w-6 h-6 md:w-8 md:h-8 text-blue-400 mx-auto mb-1.5 md:mb-2" />
            <div className="text-2xl md:text-3xl font-bold text-white">{stats.totalBets}</div>
            <div className="text-[10px] md:text-sm text-gray-400">Total Apuestas</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-black border border-green-500/30">
          <CardContent className="pt-4 md:pt-6 text-center p-3 md:p-4">
            <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-green-400 mx-auto mb-1.5 md:mb-2" />
            <div className="text-2xl md:text-3xl font-bold text-green-400">{stats.wonBets}</div>
            <div className="text-[10px] md:text-sm text-gray-400">Ganadas</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-black border border-red-500/30">
          <CardContent className="pt-4 md:pt-6 text-center p-3 md:p-4">
            <TrendingDown className="w-6 h-6 md:w-8 md:h-8 text-red-400 mx-auto mb-1.5 md:mb-2" />
            <div className="text-2xl md:text-3xl font-bold text-red-400">{stats.lostBets}</div>
            <div className="text-[10px] md:text-sm text-gray-400">Perdidas</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-black border border-yellow-500/30">
          <CardContent className="pt-4 md:pt-6 text-center p-3 md:p-4">
            <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 mx-auto mb-1.5 md:mb-2" />
            <div className="text-2xl md:text-3xl font-bold text-yellow-400">{winPercentage.toFixed(1)}%</div>
            <div className="text-[10px] md:text-sm text-gray-400">Tasa de Acierto</div>
          </CardContent>
        </Card>
      </div>

      {/* Win Rate Progress */}
      <Card className="bg-gradient-to-br from-gray-900 to-black border border-green-500/20">
        <CardHeader className="pb-1.5 md:pb-2 p-3 md:p-4">
          <CardTitle className="text-base md:text-lg text-green-400 flex items-center gap-1.5 md:gap-2">
            <PieChart className="w-4 h-4 md:w-5 md:h-5" />
            Tasa de Éxito
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4 pt-0 md:pt-0">
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex justify-between text-[10px] md:text-sm">
              <span className="text-gray-400">Porcentaje de victorias</span>
              <span className={`font-bold ${winPercentage >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                {winPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={winPercentage} 
              className="h-2 md:h-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-4 mt-2 md:mt-4">
            <div className="bg-green-500/10 rounded-lg p-2 md:p-4 border border-green-500/30">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500" />
                <span className="text-[10px] md:text-sm text-gray-400">Ganadas</span>
              </div>
              <div className="text-lg md:text-xl font-bold text-green-400">
                {stats.totalBets > 0 ? ((stats.wonBets / stats.totalBets) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-2 md:p-4 border border-red-500/30">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500" />
                <span className="text-[10px] md:text-sm text-gray-400">Perdidas</span>
              </div>
              <div className="text-lg md:text-xl font-bold text-red-400">
                {stats.totalBets > 0 ? ((stats.lostBets / stats.totalBets) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Stats */}
      {stats.learningStats && stats.learningStats.length > 0 && (
        <Card className="bg-gradient-to-br from-gray-900 to-black border border-green-500/20">
          <CardHeader className="pb-1.5 md:pb-2 p-3 md:p-4">
            <CardTitle className="text-base md:text-lg text-green-400 flex items-center gap-1.5 md:gap-2">
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
              Análisis por Tipo de Apuesta
            </CardTitle>
            <p className="text-[10px] md:text-sm text-gray-500">
              El Dios Yerson aprendió qué tipos de apuestas te funcionan mejor
            </p>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
            <div className="space-y-2 md:space-y-4">
              {stats.learningStats.map((item, index) => (
                <div key={index} className="bg-gray-800/30 rounded-lg p-2 md:p-4">
                  <div className="flex items-center justify-between mb-1.5 md:mb-2">
                    <span className="text-[11px] md:text-sm text-white font-medium">{item.pickType}</span>
                    <Badge className={`text-[10px] md:text-xs ${
                      item.successRate >= 0.5 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {(item.successRate * 100).toFixed(0)}% acierto
                    </Badge>
                  </div>
                  <Progress value={item.successRate * 100} className="h-1.5 md:h-2" />
                  <div className="flex justify-between text-[10px] md:text-xs text-gray-500 mt-1.5 md:mt-2">
                    <span>{item.wonPicks} ganadas</span>
                    <span>{item.totalPicks} total</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message */}
      <Card className={`${
        stats.winRate >= 0.5 
          ? 'bg-gradient-to-r from-green-900/50 to-green-800/30 border border-green-500/30'
          : 'bg-gradient-to-r from-red-900/50 to-red-800/30 border border-red-500/30'
      }`}>
        <CardContent className="py-4 md:py-6 text-center p-3 md:p-4">
          {stats.totalBets === 0 ? (
            <>
              <Target className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-2 md:mb-4" />
              <p className="text-gray-400 text-sm md:text-lg">¡Empieza a apostar para ver tus estadísticas!</p>
              <p className="text-[10px] md:text-sm text-gray-500 mt-1 md:mt-2">
                El Dios Yerson está listo para analizar tus picks
              </p>
            </>
          ) : stats.winRate >= 0.5 ? (
            <>
              <Trophy className="w-10 h-10 md:w-12 md:h-12 text-green-400 mx-auto mb-2 md:mb-4" />
              <p className="text-green-400 text-sm md:text-lg font-bold">¡BACANO! Estás en verde 💚</p>
              <p className="text-gray-300 mt-1 md:mt-2 text-[11px] md:text-base">
                El Dios Yerson está orgulloso de ti. ¡Sigue así!
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 text-yellow-400 mx-auto mb-2 md:mb-4" />
              <p className="text-yellow-400 text-sm md:text-lg font-bold">Uff, estás en rojo</p>
              <p className="text-gray-300 mt-1 md:mt-2 text-[11px] md:text-base">
                Pero no te desanimes, mi socio. El fútbol es así de jodido. 
                El Dios Yerson sigue trabajando para mejorar tus picks.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
