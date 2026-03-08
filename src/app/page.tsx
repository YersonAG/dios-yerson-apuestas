'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Sparkles, 
  Menu, 
  X,
  History,
  BarChart3,
  MessageCircle,
  Wallet,
  LogOut,
  User as UserIcon,
  Loader2
} from 'lucide-react';
import { Chat } from '@/components/Chat';
import { BetCard } from '@/components/BetCard';
import { ActiveBets } from '@/components/ActiveBets';
import { StatsPanel } from '@/components/StatsPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import { AuthPage } from '@/components/AuthPage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const API_URL = 'https://dios-yerson-backend.onrender.com';

interface User {
  id: string;
  username: string;
  email: string;
}

interface Combinada {
  id: string;
  picks: any[];
  totalOdds: number;
  totalProbability: number;
  risk: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [combinadas, setCombinadas] = useState<Combinada[]>([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [stats, setStats] = useState({
    totalBets: 0,
    wonBets: 0,
    lostBets: 0,
    winRate: 0,
  });

  // Helper para obtener token
  const getSessionToken = () => {
    if (typeof window === 'undefined') return null;
    const localToken = localStorage.getItem('session_token');
    if (localToken) return localToken;
    return document.cookie.split('; ').find(row => row.startsWith('session='))?.split('=')[1] || null;
  };

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getSessionToken();
      if (!token) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.authenticated && data.user) {
          setUser(data.user);
          // Fetch stats after setting user
          const statsResponse = await fetch(`${API_URL}/api/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const handleAuthSuccess = (newUser: User) => {
    setUser(newUser);
    // Fetch stats after login
    setTimeout(async () => {
      const token = getSessionToken();
      if (token) {
        try {
          const statsResponse = await fetch(`${API_URL}/api/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const statsData = await statsResponse.json();
          setStats(statsData);
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
      }
    }, 500);
  };

  const handleLogout = async () => {
    const token = getSessionToken();
    try {
      await fetch(`${API_URL}/api/auth/logout`, { 
        method: 'POST',
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
    // Limpiar sesión local
    localStorage.removeItem('session_token');
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setUser(null);
    setCombinadas([]);
    setStats({ totalBets: 0, wonBets: 0, lostBets: 0, winRate: 0 });
  };

  const handleCombinadasGenerated = (newCombinadas: Combinada[]) => {
    setCombinadas(newCombinadas);
    setActiveTab('picks');
  };

  const handleTakeBet = async (combinada: Combinada) => {
    const token = getSessionToken();
    if (!token) {
      alert('No hay sesión activa. Por favor inicia sesión de nuevo.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/bets`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ combinada }),
      });

      const data = await response.json();

      if (data.success) {
        setCombinadas(prev => prev.filter(c => c.id !== combinada.id));
        // Refresh stats
        const statsResponse = await fetch(`${API_URL}/api/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData = await statsResponse.json();
        setStats(statsData);
        setActiveTab('active');
      }
    } catch (error) {
      console.error('Error taking bet:', error);
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center px-4">
          <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-green-400 mx-auto mb-3 md:mb-4" />
          <p className="text-gray-400 text-sm md:text-base">El Dios Yerson está verificando tu identidad...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Tab configuration
  const tabs = [
    { id: 'chat', icon: MessageCircle, label: 'Chat', badge: undefined },
    { id: 'picks', icon: Target, label: 'Picks', badge: combinadas.length },
    { id: 'active', icon: Wallet, label: 'Activas', badge: undefined },
    { id: 'history', icon: History, label: 'Historial', badge: undefined },
    { id: 'stats', icon: BarChart3, label: 'Stats', badge: undefined },
  ];

  // Main app
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-green-500/20">
        <div className="max-w-7xl mx-auto px-2 md:px-4 py-2 md:py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 md:gap-3">
              <motion.div 
                className="relative"
                initial={{ rotate: -10 }}
                animate={{ rotate: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                  <Trophy className="w-5 h-5 md:w-6 md:h-6 text-black" />
                </div>
                <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </motion.div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-lg font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent truncate">
                  EL DIOS YERSON
                </h1>
                <p className="text-[9px] md:text-xs text-gray-400 hidden sm:block">Sistema Premium de Apuestas</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {tabs.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(item.id)}
                  className={`text-[11px] md:text-xs ${activeTab === item.id ? 'bg-green-600 text-black' : 'text-gray-400'}`}
                >
                  <item.icon className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5" />
                  {item.label}
                  {item.badge && item.badge > 0 && (
                    <Badge className="ml-1 md:ml-1.5 bg-yellow-500 text-black text-[9px] md:text-[10px] px-1 md:px-1.5">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </nav>

            {/* User Menu & Mobile Menu */}
            <div className="flex items-center gap-1 md:gap-2">
              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1 md:gap-2 text-gray-300 hover:text-white p-1.5 md:p-2">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <UserIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-black" />
                    </div>
                    <span className="hidden sm:inline text-xs md:text-sm truncate max-w-[80px] md:max-w-[100px]">{user.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 md:w-56 bg-gray-900 border-gray-700">
                  <DropdownMenuLabel className="text-gray-400">
                    <div className="flex flex-col">
                      <span className="text-white text-xs md:text-sm">{user.username}</span>
                      <span className="text-[10px] md:text-xs truncate">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-400 focus:text-red-400 cursor-pointer text-xs md:text-sm"
                  >
                    <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-gray-400 p-1.5"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Dropdown */}
          <AnimatePresence>
            {showMobileMenu && (
              <motion.nav
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden mt-2 md:mt-3 pb-2 border-t border-gray-800 pt-2 md:pt-3"
              >
                <div className="grid grid-cols-5 gap-0.5 md:gap-1">
                  {tabs.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setShowMobileMenu(false);
                      }}
                      className={`flex flex-col items-center py-1.5 md:py-2 px-1 rounded-lg transition-colors relative ${
                        activeTab === item.id 
                          ? 'text-green-400 bg-green-500/10' 
                          : 'text-gray-500 hover:text-gray-400'
                      }`}
                    >
                      <item.icon className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="text-[9px] md:text-[10px] mt-0.5">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 md:w-4 md:h-4 bg-yellow-500 text-black text-[9px] md:text-[10px] rounded-full flex items-center justify-center font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Stats Bar - Desktop */}
      <div className="hidden md:block bg-gradient-to-r from-gray-900 to-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-1.5 md:py-2">
          <div className="flex items-center justify-center gap-3 md:gap-6 text-[10px] md:text-sm">
            <div className="flex items-center gap-1 md:gap-1.5">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-400">Total:</span>
              <span className="text-white font-bold">{stats.totalBets}</span>
            </div>
            <div className="flex items-center gap-1 md:gap-1.5">
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-400" />
              <span className="text-gray-400">Ganadas:</span>
              <span className="text-green-400 font-bold">{stats.wonBets}</span>
            </div>
            <div className="flex items-center gap-1 md:gap-1.5">
              <span className="text-gray-400">Perdidas:</span>
              <span className="text-red-400 font-bold">{stats.lostBets}</span>
            </div>
            <div className="flex items-center gap-1 md:gap-1.5">
              <span className="text-gray-400">Acierto:</span>
              <Badge className={`text-[10px] md:text-xs ${
                stats.winRate >= 0.5 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {(stats.winRate * 100).toFixed(1)}%
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Stats Bar - Compact */}
      <div className="md:hidden bg-gray-900/50 border-b border-gray-800 px-2 py-1 sticky top-[48px] md:top-0 z-40">
        <div className="flex items-center justify-around text-[9px]">
          <div className="text-center px-1.5">
            <div className="text-gray-500">Total</div>
            <div className="text-white font-bold text-xs">{stats.totalBets}</div>
          </div>
          <div className="text-center px-1.5 border-l border-gray-800">
            <div className="text-gray-500">Ganadas</div>
            <div className="text-green-400 font-bold text-xs">{stats.wonBets}</div>
          </div>
          <div className="text-center px-1.5 border-l border-gray-800">
            <div className="text-gray-500">Perdidas</div>
            <div className="text-red-400 font-bold text-xs">{stats.lostBets}</div>
          </div>
          <div className="text-center px-1.5 border-l border-gray-800">
            <div className="text-gray-500">Acierto</div>
            <Badge className={`text-[9px] px-1 ${
              stats.winRate >= 0.5 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {(stats.winRate * 100).toFixed(0)}%
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 md:px-4 py-2 md:py-4">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="h-[calc(100vh-180px)] md:h-[calc(100vh-220px)]"
            >
              <Chat 
                onCombinadasGenerated={handleCombinadasGenerated} 
                onTakeBet={handleTakeBet}
                user={user} 
              />
            </motion.div>
          )}

          {activeTab === 'picks' && (
            <motion.div
              key="picks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {combinadas.length === 0 ? (
                <div className="text-center py-6 md:py-16 px-4">
                  <Target className="w-10 h-10 md:w-16 md:h-16 text-gray-600 mx-auto mb-2 md:mb-4" />
                  <h2 className="text-sm md:text-xl font-bold text-gray-400 mb-1 md:mb-2">
                    No hay combinadas generadas
                  </h2>
                  <p className="text-gray-500 mb-4 md:mb-6 text-[10px] md:text-base">
                    Pide combinadas en el chat para verlas aquí
                  </p>
                  <Button
                    onClick={() => setActiveTab('chat')}
                    className="bg-green-600 hover:bg-green-500 text-black text-xs md:text-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                    Ir al Chat
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2 md:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                  {combinadas.map((combinada) => (
                    <BetCard
                      key={combinada.id}
                      combinada={combinada}
                      onTakeBet={handleTakeBet}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'active' && (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <ActiveBets />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <HistoryPanel />
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto"
            >
              <StatsPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-gray-800 lg:hidden z-50 safe-area-pb">
        <div className="flex items-center justify-around py-1 px-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-1.5 px-2 rounded-lg transition-colors relative ${
                activeTab === item.id 
                  ? 'text-green-400' 
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              <item.icon className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-[9px] md:text-[10px] mt-0.5">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 md:w-4 md:h-4 bg-yellow-500 text-black text-[9px] md:text-[10px] rounded-full flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Footer - Desktop only */}
      <footer className="hidden md:block fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-gray-800 py-1.5 md:py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 md:gap-4 text-[10px] md:text-xs text-gray-500">
          <span>🎰 El Dios Yerson - Sistema de Apuestas</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">⚡ Powered by AI</span>
          <span>|</span>
          <span className="text-green-400 text-[9px] md:text-xs">
            ¡Agradece al Dios Yerson cuando ganes!
          </span>
        </div>
      </footer>
    </div>
  );
}
