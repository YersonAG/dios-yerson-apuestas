'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, CheckCircle2, Calendar, MapPin, Clock, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  country: string;
  matchDate: string;
  status: string;
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
}

interface ChatProps {
  onCombinadasGenerated?: (combinadas: Combinada[]) => void;
  onTakeBet?: (combinada: Combinada) => void;
  user?: { id: string; username: string; email: string } | null;
}

const formatColombianDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { 
      day: 'numeric', 
      month: 'short',
      timeZone: 'America/Bogota'
    });
  } catch {
    return 'Fecha pendiente';
  }
};

const formatColombianTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Bogota'
    });
  } catch {
    return '--:--';
  }
};

// Determinar si es hoy o mañana en Colombia
const getDayLabel = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const colombiaDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const now = new Date();
    const colombiaNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    
    colombiaNow.setHours(0, 0, 0, 0);
    colombiaDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((colombiaDate.getTime() - colombiaNow.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '🔴 HOY';
    if (diffDays === 1) return '🟡 MAÑANA';
    return '';
  } catch {
    return '';
  }
};

// Verificar si partido ya comenzó
const hasMatchStarted = (dateStr: string): boolean => {
  try {
    const matchDate = new Date(dateStr);
    const now = new Date();
    // Si el partido comienza en menos de 30 minutos, se considera que ya comenzó
    return matchDate.getTime() <= now.getTime() + 30 * 60 * 1000;
  } catch {
    return false;
  }
};

export function Chat({ onCombinadasGenerated, onTakeBet, user }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `🎰 ${user?.username || 'Mi socio'}, hola mi ludopana favorito!

¿En qué partidos le vas a encomendar tu dinero?

Escribe **"ver partidos"** para ver los próximos partidos.

O usa los botones rápidos:
• **Automático** - 5 picks
• **Soñadora 12** - 12 picks  
• **Soñadora 20** - 20 picks

⏰ Horarios en hora Colombia (UTC-5)

*Agradece al Dios Yerson.* 🙏`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [takingBet, setTakingBet] = useState(false);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  // Guardar referencia a los partidos actuales para selección
  const [currentMatches, setCurrentMatches] = useState<Match[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const API_URL = 'https://dios-yerson-backend.onrender.com';

  // Auto scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText?: string, selectedMatches?: Match[]) => {
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
      
      // Si hay partidos seleccionados, enviarlos EXACTAMENTE
      if (selectedMatches && selectedMatches.length > 0) {
        body.selectedMatches = selectedMatches;
      } else if (selectedMatchIds.size > 0 && currentMatches.length > 0) {
        // Usar los partidos guardados en currentMatches
        const matchesToSend = currentMatches.filter(m => selectedMatchIds.has(m.id));
        if (matchesToSend.length > 0) {
          body.selectedMatches = matchesToSend;
        }
      }

      console.log('📤 Enviando:', { message: textToSend, selectedCount: body.selectedMatches?.length || 0 });

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
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Guardar los partidos actuales para selección
      if (data.availableMatches && data.availableMatches.length > 0) {
        // Filtrar partidos que ya comenzaron
        const futureMatches = data.availableMatches.filter((m: Match) => !hasMatchStarted(m.matchDate));
        setCurrentMatches(futureMatches);
      }
      
      if (data.combinadas) {
        setSelectedMatchIds(new Set());
        if (onCombinadasGenerated) {
          onCombinadasGenerated(data.combinadas);
        }
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

  const clearSelection = () => {
    setSelectedMatchIds(new Set());
  };

  const handleConfirmSelection = () => {
    if (selectedMatchIds.size === 0) return;
    
    // Obtener los partidos seleccionados EXACTAMENTE de currentMatches
    const selectedMatches = currentMatches.filter(m => selectedMatchIds.has(m.id));
    console.log(`🎯 Confirmando ${selectedMatches.length} partidos seleccionados`);
    
    if (selectedMatches.length > 0) {
      sendMessage('generar combinada con seleccionados', selectedMatches);
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
      {/* Header - Fijo */}
      <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 border-b border-green-500/20 shrink-0 bg-gray-900">
        <div className="relative">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Bot className="w-4 h-4 md:w-6 md:h-6 text-black" />
          </div>
          <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-green-400 absolute -top-1 -right-1 animate-pulse" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-green-400 text-sm md:text-base">El Dios Yerson</h3>
          <p className="text-[10px] md:text-xs text-gray-400">Motor v4.7 PRO • Bajo riesgo 🟢</p>
        </div>
      </div>

      {/* Messages - Con scroll */}
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
                
                {/* Mostrar partidos disponibles para seleccionar */}
                {message.matches && message.matches.length > 0 && (
                  <div className="bg-gray-800/50 rounded-lg p-2 md:p-3 border border-gray-700/50 mt-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] md:text-sm text-green-400 font-medium">
                        📋 {message.matches.length} partidos:
                      </p>
                      <div className="flex items-center gap-2">
                        {selectedMatchIds.size > 0 && (
                          <>
                            <span className="text-[10px] text-yellow-400">
                              {selectedMatchIds.size}/20
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={clearSelection}
                              className="text-gray-400 hover:text-white h-6 text-[10px] px-2"
                            >
                              Limpiar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 md:space-y-1.5 max-h-40 md:max-h-52 overflow-y-auto pr-1">
                      {message.matches
                        .filter(match => !hasMatchStarted(match.matchDate))
                        .map((match) => {
                        const isSelected = selectedMatchIds.has(match.id);
                        const dayLabel = getDayLabel(match.matchDate);
                        
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
                            <Checkbox 
                              checked={isSelected}
                              className="border-green-500 data-[state=checked]:bg-green-500 shrink-0 mt-0.5 h-3.5 w-3.5 md:h-4 md:w-4"
                            />
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] md:text-xs text-white font-medium truncate">
                                  {match.homeTeam} vs {match.awayTeam}
                                </span>
                                {dayLabel && (
                                  <span className="text-[8px] md:text-[9px] px-1 py-0.5 rounded bg-green-600/30 text-green-400 shrink-0">
                                    {dayLabel}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[9px] md:text-[10px] text-gray-400">
                                <span className="flex items-center gap-0.5 truncate max-w-[60px] md:max-w-[100px]">
                                  <MapPin className="w-2.5 h-2.5 text-green-500 shrink-0" /> 
                                  <span className="truncate">{match.league}</span>
                                </span>
                                <span className="flex items-center gap-0.5 shrink-0">
                                  <Calendar className="w-2.5 h-2.5 text-blue-400" /> 
                                  {formatColombianDate(match.matchDate)}
                                </span>
                                <span className="flex items-center gap-0.5 shrink-0 font-medium text-yellow-400">
                                  <Clock className="w-2.5 h-2.5 text-yellow-400" /> 
                                  {formatColombianTime(match.matchDate)}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Botón confirmar */}
                    {selectedMatchIds.size > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <Button
                          onClick={handleConfirmSelection}
                          disabled={isLoading}
                          className="w-full bg-green-600 hover:bg-green-500 text-black font-bold text-[10px] md:text-xs h-7 md:h-9"
                        >
                          {isLoading ? 'Generando...' : `Generar ${selectedMatchIds.size} picks`}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Botón tomar apuesta */}
                {message.combinadas && message.combinadas.length > 0 && user && (
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
          {/* Elemento invisible para scroll */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Commands - Fijo */}
      <div className="px-2 md:px-4 py-1.5 border-t border-gray-800 shrink-0 bg-gray-900">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => sendMessage('ver partidos')}
            className="px-2.5 md:px-3 py-1 text-[10px] md:text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full whitespace-nowrap transition-colors border border-gray-700"
          >
            📋 Ver partidos
          </button>
          <button
            onClick={() => sendMessage('automático')}
            className="px-2.5 md:px-3 py-1 text-[10px] md:text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full whitespace-nowrap transition-colors border border-gray-700"
          >
            🤖 Automático
          </button>
          <button
            onClick={() => sendMessage('soñadora 12')}
            className="px-2.5 md:px-3 py-1 text-[10px] md:text-xs bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-full whitespace-nowrap transition-colors border border-purple-700/50"
          >
            🌙 Soñadora 12
          </button>
          <button
            onClick={() => sendMessage('soñadora 20')}
            className="px-2.5 md:px-3 py-1 text-[10px] md:text-xs bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-full whitespace-nowrap transition-colors border border-purple-700/50"
          >
            🌙 Soñadora 20
          </button>
          <button
            onClick={() => sendMessage('ayuda')}
            className="px-2.5 md:px-3 py-1 text-[10px] md:text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full whitespace-nowrap transition-colors border border-gray-700"
          >
            ❓ Ayuda
          </button>
        </div>
      </div>

      {/* Input - Fijo */}
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
