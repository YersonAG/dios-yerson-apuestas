'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, CheckCircle2, Calendar, MapPin, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { config } from '@/lib/config';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  country: string;
  matchDate: string;
  status: string;
}

interface SelectablePick {
  type: string;
  label: string;
  probability: number;
  confidence: number;
  odds: number;
  reasoning: string[];
  selected?: boolean;
}

interface PickResult {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchDate: string;
  top3Picks: SelectablePick[];
  riskLevel: string;
}

interface Combinada {
  id: string;
  picks: any[];
  totalOdds: number;
  totalProbability: number;
  risk: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  combinadas?: Combinada[];
  canTake?: boolean;
  matches?: Match[];
  pickResults?: PickResult[];
}

interface ChatProps {
  onCombinadasGenerated?: (combinadas: Combinada[]) => void;
  onTakeBet?: (combinada: Combinada) => void;
  user?: { id: string; username: string; email: string } | null;
}

const formatColombianDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    
    if (dateOnly.getTime() === todayOnly.getTime()) return 'HOY';
    else if (dateOnly.getTime() === tomorrowOnly.getTime()) return 'MAÑANA';
    
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' });
  } catch {
    return 'Fecha pendiente';
  }
};

const formatColombianTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
  } catch {
    return '--:--';
  }
};

export function Chat({ onCombinadasGenerated, onTakeBet, user }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `🎰 ${user?.username || 'Mi socio'}, hola mi ludopana favorito!

¿En qué partidos le vas a encomendar tu dinero?

Escribe **"ver partidos"** para ver los partidos disponibles.

*Agradece al Dios Yerson.* 🙏`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [takingBet, setTakingBet] = useState(false);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  // NUEVO: Estado para picks seleccionados por partido
  const [selectedPicksByMatch, setSelectedPicksByMatch] = useState<Record<string, number[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const API_URL = config.apiUrl;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('session_token');
        if (!token) {
          token = document.cookie.split('; ').find(row => row.startsWith('session='))?.split('=')[1] || null;
        }
      }

      let body: any = { message: textToSend };
      
      if (selectedMatchIds.size > 0) {
        const lastMessageWithMatches = [...messages].reverse().find(m => m.matches && m.matches.length > 0);
        if (lastMessageWithMatches?.matches) {
          const selectedMatches = lastMessageWithMatches.matches.filter(m => selectedMatchIds.has(m.id));
          if (selectedMatches.length > 0) {
            body.selectedMatches = selectedMatches;
          }
        }
      }

      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Procesando...',
        timestamp: new Date(),
        combinadas: data.combinadas,
        canTake: data.canTake,
        matches: data.availableMatches || [],
        pickResults: data.pickResults || [],
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (data.combinadas) {
        setSelectedMatchIds(new Set());
        if (onCombinadasGenerated) {
          onCombinadasGenerated(data.combinadas);
        }
      }

      // Reset picks seleccionados cuando hay nuevos resultados
      if (data.pickResults) {
        const initialPicks: Record<string, number[]> = {};
        data.pickResults.forEach((pr: PickResult) => {
          // Por defecto, el primer pick está seleccionado
          initialPicks[pr.matchId] = [0];
        });
        setSelectedPicksByMatch(initialPicks);
      }

    } catch (error) {
      console.error('❌ Error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '❌ Error al conectar. El backend puede estar despertando (espera 30s).',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMatch = (matchId: string) => {
    const newSelected = new Set(selectedMatchIds);
    if (newSelected.has(matchId)) {
      newSelected.delete(matchId);
    } else if (newSelected.size < 20) {
      newSelected.add(matchId);
    }
    setSelectedMatchIds(newSelected);
  };

  // NUEVO: Toggle pick selection
  const togglePick = (matchId: string, pickIndex: number) => {
    setSelectedPicksByMatch(prev => {
      const current = prev[matchId] || [0];
      const newSelection = [...current];
      
      if (newSelection.includes(pickIndex)) {
        // Si ya está seleccionado, lo quitamos (mínimo 1 debe quedar)
        if (newSelection.length > 1) {
          const idx = newSelection.indexOf(pickIndex);
          newSelection.splice(idx, 1);
        }
      } else {
        // Si no está seleccionado, lo agregamos (máximo 3)
        if (newSelection.length < 3) {
          newSelection.push(pickIndex);
        }
      }
      
      return { ...prev, [matchId]: newSelection.sort() };
    });
  };

  const clearSelection = () => {
    setSelectedMatchIds(new Set());
    setSelectedPicksByMatch({});
  };

  const handleConfirmSelection = () => {
    if (selectedMatchIds.size === 0) return;
    sendMessage('generar combinada con seleccionados');
  };

  // NUEVO: Confirmar picks seleccionados
  const handleConfirmPicks = async () => {
    const lastMessageWithPicks = [...messages].reverse().find(m => m.pickResults && m.pickResults.length > 0);
    if (!lastMessageWithPicks?.pickResults) return;

    const selections = lastMessageWithPicks.pickResults.map(pr => ({
      matchId: pr.matchId,
      homeTeam: pr.homeTeam,
      awayTeam: pr.awayTeam,
      league: pr.league,
      matchDate: pr.matchDate,
      selectedIndices: selectedPicksByMatch[pr.matchId] || [0],
      selectedPicks: (selectedPicksByMatch[pr.matchId] || [0]).map(i => pr.top3Picks[i]),
      topPicks: pr.top3Picks,
    }));

    setTakingBet(true);
    try {
      let sessionToken: string | null = null;
      if (typeof window !== 'undefined') {
        sessionToken = localStorage.getItem('session_token');
        if (!sessionToken) {
          sessionToken = document.cookie.split('; ').find(row => row.startsWith('session='))?.split('=')[1] || null;
        }
      }

      if (!sessionToken) {
        throw new Error('No hay sesión activa. Inicia sesión de nuevo.');
      }

      const response = await fetch(`${API_URL}/api/chat/take`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ selections }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: '✅ **¡Apuesta confirmada!**\n\nVe a **"Activas"** para ver el estado de tus picks.\n\n*Agradece al Dios Yerson.* 🙏',
            timestamp: new Date(),
          },
        ]);
        setSelectedPicksByMatch({});
      } else {
        throw new Error(data.error || 'Error');
      }
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ ${error.message || 'Error al confirmar la apuesta'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setTakingBet(false);
    }
  };

  const handleTakeBet = async (combinada: Combinada) => {
    if (!user) return;
    
    setTakingBet(true);
    try {
      let sessionToken: string | null = null;
      if (typeof window !== 'undefined') {
        sessionToken = localStorage.getItem('session_token');
        if (!sessionToken) {
          sessionToken = document.cookie.split('; ').find(row => row.startsWith('session='))?.split('=')[1] || null;
        }
      }

      if (!sessionToken) {
        throw new Error('No hay sesión activa. Inicia sesión de nuevo.');
      }

      const response = await fetch(`${API_URL}/api/chat/take`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ combinada }),
      });

      const data = await response.json();

      if (data.success) {
        if (onTakeBet) {
          onTakeBet(combinada);
        }
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: '✅ **¡Apuesta tomada!**\n\nVe a **"Activas"** para verla.\n\n*Agradece al Dios Yerson.* 🙏',
            timestamp: new Date(),
          },
        ]);
      } else {
        throw new Error(data.error || 'Error');
      }
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ ${error.message || 'Error al tomar la apuesta'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setTakingBet(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-black rounded-xl border border-green-500/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 border-b border-green-500/20 shrink-0 bg-gray-900">
        <div className="relative">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Bot className="w-4 h-4 md:w-6 md:h-6 text-black" />
          </div>
          <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-green-400 absolute -top-1 -right-1 animate-pulse" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-green-400 text-sm md:text-base">El Dios Yerson</h3>
          <p className="text-[10px] md:text-xs text-gray-400">Motor v5.4 - TOP 3 picks por partido 🟢</p>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-4"
        style={{ minHeight: 0 }}
      >
        <div className="space-y-3 md:space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-2 md:gap-3',
                message.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0',
                  message.role === 'user'
                    ? 'bg-gray-700'
                    : 'bg-gradient-to-br from-green-500 to-emerald-600'
                )}
              >
                {message.role === 'user' ? (
                  <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-300" />
                ) : (
                  <Bot className="w-3.5 h-3.5 md:w-4 md:h-4 text-black" />
                )}
              </div>
              <div className="flex flex-col gap-1.5 md:gap-2 max-w-[85%] md:max-w-[75%] min-w-0">
                <div
                  className={cn(
                    'rounded-2xl px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere',
                    message.role === 'user'
                      ? 'bg-green-600 text-black rounded-tr-sm'
                      : 'bg-gray-800 text-gray-100 rounded-tl-sm border border-gray-700'
                  )}
                >
                  {message.content}
                </div>
                
                {/* Mostrar partidos disponibles */}
                {message.matches && message.matches.length > 0 && (
                  <div className="bg-gray-800/50 rounded-lg p-2 md:p-3 border border-gray-700/50 mt-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] md:text-sm text-green-400 font-medium">
                        📋 {message.matches.length} partidos:
                      </p>
                      <div className="flex items-center gap-2">
                        {selectedMatchIds.size > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full ${
                              selectedMatchIds.size >= 20 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
                                : 'bg-green-500/20 text-green-400 border border-green-500/50'
                            }`}>
                              {selectedMatchIds.size}/20
                            </span>
                            <Button size="sm" variant="ghost" onClick={clearSelection} className="text-gray-400 hover:text-white h-6 text-[10px] px-2">
                              Limpiar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 md:space-y-1.5 max-h-40 md:max-h-52 overflow-y-auto pr-1">
                      {message.matches.map((match) => {
                        const isSelected = selectedMatchIds.has(match.id);
                        return (
                          <div
                            key={match.id}
                            onClick={() => toggleMatch(match.id)}
                            className={cn(
                              'flex items-start gap-1.5 md:gap-2 p-1.5 md:p-2 rounded-lg cursor-pointer transition-all',
                              isSelected 
                                ? 'bg-green-500/20 border border-green-500' 
                                : 'bg-gray-700/30 hover:bg-gray-700/50 border border-transparent'
                            )}
                          >
                            <Checkbox checked={isSelected} className="border-green-500 data-[state=checked]:bg-green-500 shrink-0 mt-0.5 h-3.5 w-3.5 md:h-4 md:w-4" />
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="text-[10px] md:text-xs text-white font-medium truncate">
                                {match.homeTeam} vs {match.awayTeam}
                              </div>
                              <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[9px] md:text-[10px] text-gray-400">
                                <span className="flex items-center gap-0.5 truncate max-w-[60px] md:max-w-[100px]">
                                  <MapPin className="w-2.5 h-2.5 text-green-500 shrink-0" /> 
                                  <span className="truncate">{match.league}</span>
                                </span>
                                <span className={`flex items-center gap-0.5 shrink-0 font-medium ${
                                  formatColombianDate(match.matchDate) === 'HOY' ? 'text-green-400' : 
                                  formatColombianDate(match.matchDate) === 'MAÑANA' ? 'text-yellow-400' : ''
                                }`}>
                                  <Calendar className="w-2.5 h-2.5 text-blue-400" /> 
                                  {formatColombianDate(match.matchDate)}
                                </span>
                                <span className="flex items-center gap-0.5 shrink-0">
                                  <Clock className="w-2.5 h-2.5 text-yellow-400" /> 
                                  {formatColombianTime(match.matchDate)}
                                </span>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                    
                    {selectedMatchIds.size > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className="text-[10px] md:text-xs font-bold px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/50">
                            🎯 {selectedMatchIds.size} partidos seleccionados
                          </span>
                        </div>
                        <Button
                          onClick={handleConfirmSelection}
                          disabled={isLoading}
                          className="w-full bg-green-600 hover:bg-green-500 text-black font-bold text-[10px] md:text-xs h-7 md:h-9"
                        >
                          {isLoading ? 'Analizando...' : `Analizar ${selectedMatchIds.size} partidos`}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* NUEVO: Mostrar TOP 3 picks por partido */}
                {message.pickResults && message.pickResults.length > 0 && (
                  <div className="bg-gray-800/50 rounded-lg p-2 md:p-3 border border-green-500/30 mt-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] md:text-sm text-green-400 font-medium">
                        🎯 TOP 3 PICKS - Selecciona tus picks:
                      </p>
                    </div>
                    <div className="space-y-2 md:space-y-3 max-h-80 md:max-h-96 overflow-y-auto pr-1">
                      {message.pickResults.map((pr, idx) => {
                        const selectedIndices = selectedPicksByMatch[pr.matchId] || [0];
                        return (
                          <div key={pr.matchId} className="bg-gray-900/50 rounded-lg p-2 md:p-3 border border-gray-700/50">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] md:text-sm text-white font-medium truncate">
                                  {idx + 1}. {pr.homeTeam} vs {pr.awayTeam}
                                </div>
                                <div className="text-[10px] md:text-xs text-gray-400 truncate">
                                  {pr.league} • {formatColombianDate(pr.matchDate)} {formatColombianTime(pr.matchDate)}
                                </div>
                              </div>
                              <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                                pr.riskLevel === 'LOW' ? 'bg-green-500/20 text-green-400' :
                                pr.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {pr.riskLevel === 'LOW' ? '🟢 BAJO' : pr.riskLevel === 'MEDIUM' ? '🟡 MEDIO' : '🔴 ALTO'}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              {pr.top3Picks.map((pick, pIdx) => {
                                const isSelected = selectedIndices.includes(pIdx);
                                return (
                                  <div
                                    key={pIdx}
                                    onClick={() => togglePick(pr.matchId, pIdx)}
                                    className={cn(
                                      'flex items-center gap-2 p-1.5 md:p-2 rounded-lg cursor-pointer transition-all border',
                                      isSelected
                                        ? 'bg-green-500/20 border-green-500'
                                        : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50'
                                    )}
                                  >
                                    <Checkbox 
                                      checked={isSelected}
                                      className="border-green-500 data-[state=checked]:bg-green-500 shrink-0 h-3.5 w-3.5 md:h-4 md:w-4"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[10px] md:text-xs text-white font-medium">
                                        {pick.label}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="text-[10px] md:text-xs font-bold text-green-400">
                                        @{pick.odds.toFixed(2)}
                                      </div>
                                      <div className="text-[9px] md:text-[10px] text-gray-400">
                                        {pick.confidence}%
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Resumen de selección */}
                            <div className="mt-2 pt-1.5 border-t border-gray-700/50 flex items-center justify-between">
                              <span className="text-[9px] md:text-[10px] text-gray-400">
                                {selectedIndices.length} pick{selectedIndices.length > 1 ? 's' : ''} seleccionado{selectedIndices.length > 1 ? 's' : ''}
                              </span>
                              <span className="text-[9px] md:text-[10px] text-green-400 font-medium">
                                Cuota: {(selectedIndices.map(i => pr.top3Picks[i]?.odds || 1).reduce((a, b) => a * b, 1)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Botón confirmar picks */}
                    {user && (
                      <div className="mt-3 pt-2 border-t border-gray-700">
                        <Button
                          onClick={handleConfirmPicks}
                          disabled={takingBet}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-black font-bold text-[10px] md:text-xs h-8 md:h-10"
                        >
                          <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
                          {takingBet ? 'Confirmando...' : 'Confirmar Apuesta'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Botón tomar apuesta (compatibilidad) */}
                {message.combinadas && message.combinadas.length > 0 && user && !message.pickResults && (
                  <Button
                    onClick={() => handleTakeBet(message.combinadas![0])}
                    disabled={takingBet}
                    className="bg-green-600 hover:bg-green-500 text-black font-bold flex items-center gap-1.5 w-fit text-[10px] md:text-xs h-7 md:h-9 px-3 md:px-4"
                  >
                    <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    {takingBet ? 'Guardando...' : 'Tomar Apuesta'}
                  </Button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 md:gap-3">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 md:w-4 md:h-4 text-black" />
              </div>
              <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-3 md:px-4 py-2 md:py-2.5 border border-gray-700">
                <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin text-green-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Commands */}
      <div className="px-2 md:px-4 py-1.5 border-t border-gray-800 shrink-0 bg-gray-900">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => sendMessage('ver partidos')} className="px-2.5 md:px-3 py-1 text-[10px] md:text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full whitespace-nowrap transition-colors border border-gray-700">
            📋 Ver partidos
          </button>
          <button onClick={() => sendMessage('automático')} className="px-2.5 md:px-3 py-1 text-[10px] md:text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full whitespace-nowrap transition-colors border border-gray-700">
            🤖 Automático
          </button>
          <button onClick={() => sendMessage('ayuda')} className="px-2.5 md:px-3 py-1 text-[10px] md:text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full whitespace-nowrap transition-colors border border-gray-700">
            ❓ Ayuda
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="p-2 md:p-3 border-t border-green-500/20 shrink-0 bg-gray-900">
        <div className="flex gap-1.5 md:gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe 'ver partidos'..."
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500 text-xs md:text-sm h-8 md:h-10"
            disabled={isLoading}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="bg-green-600 hover:bg-green-500 text-black shrink-0 h-8 md:h-10 w-8 md:w-10 p-0"
          >
            <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
