/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Cpu, Zap, Github, MessageSquarePlus, Plus, MessageSquare, ShieldAlert, LogIn, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import PromptForm from './components/PromptForm';
import PromptResult from './components/PromptResult';
import Sidebar, { Session } from './components/Sidebar';
import { generateElitePrompt, analyzePrompt, processInteraction, PromptComponents, Message } from './lib/gemini';
import { db, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, deleteDoc, handleFirestoreError, OperationType } from './lib/firebase';
import { Download } from 'lucide-react';

// Individual Letter Component for Hacking Aesthetic
const Letter = ({ char, delay = 0, trigger = 0 }: { char: string; delay?: number; trigger?: number }) => {
  const [displayChar, setDisplayChar] = useState(char);
  const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  useEffect(() => {
    let iteration = 0;
    let interval: NodeJS.Timeout;
    
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        setDisplayChar(chars[Math.floor(Math.random() * chars.length)]);
        
        if (iteration >= 10) {
          clearInterval(interval);
          setDisplayChar(char);
        }
        iteration++;
      }, 40 + Math.random() * 30);
    }, delay * 1000);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [char, trigger, delay]);

  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ 
        y: -8, 
        color: '#10b981',
        textShadow: '0 0 20px rgba(16,185,129,1)',
        scale: 1.3,
        transition: { duration: 0.2 }
      }}
      className="inline-block transition-colors duration-300 cursor-default"
    >
      {displayChar}
    </motion.span>
  );
};

const Word = ({ text, delay = 0, trigger = 0 }: { text: string; delay?: number; trigger?: number }) => (
  <span className="inline-flex">
    {text.split('').map((char, i) => (
      <Letter key={i} char={char} delay={delay + (i * 0.03)} trigger={trigger} />
    ))}
  </span>
);

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{ 
    score: number; 
    securityScore: number;
    suggestions: string[];
    securityAudit: string;
  } | null>(null);
  const [lastComponents, setLastComponents] = useState<PromptComponents | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [headingTrigger, setHeadingTrigger] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // PWA Install Logic
  useEffect(() => {
    const checkInstalled = () => {
      setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);
    };
    
    checkInstalled();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkInstalled);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Local Storage Session Sync
  useEffect(() => {
    const savedSessions = localStorage.getItem('promptcraft_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed.sort((a: Session, b: Session) => b.timestamp - a.timestamp));
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
  }, []);

  const saveSessionsToLocal = (updatedSessions: Session[]) => {
    localStorage.setItem('promptcraft_sessions', JSON.stringify(updatedSessions));
    setSessions(updatedSessions.sort((a, b) => b.timestamp - a.timestamp));
  };

  const isQuotaError = (error: any) => {
    const msg = error?.message?.toLowerCase() || "";
    return msg.includes("quota") || msg.includes("429") || msg.includes("rate limit");
  };

  const handleGenerate = async (components: PromptComponents) => {
    setIsLoading(true);
    setGeneratedPrompt(null);
    setAnalysis(null);
    setMessages([]);
    setLastComponents(components);

    try {
      const prompt = await generateElitePrompt(components);
      setGeneratedPrompt(prompt);
      
      const result = await analyzePrompt(prompt);
      setAnalysis(result);

      const sessionTitle = components.task.slice(0, 30) + (components.task.length > 30 ? '...' : '');
      const sessionId = activeSessionId || crypto.randomUUID();
      
      const sessionData: Session = {
        id: sessionId,
        uid: 'guest',
        title: sessionTitle,
        timestamp: Date.now(),
        generatedPrompt: prompt,
        analysis: result,
        lastComponents: components,
        messages: []
      };

      const updatedSessions = activeSessionId 
        ? sessions.map(s => s.id === sessionId ? sessionData : s)
        : [sessionData, ...sessions];
      
      saveSessionsToLocal(updatedSessions);
      setActiveSessionId(sessionId);
    } catch (error: any) {
      console.error("Generation failed:", error);
      let errorMessage = "An unexpected error occurred during synthesis. Please try again.";
      
      if (isQuotaError(error)) {
        errorMessage = "The AI service is currently at its capacity or you've hit a rate limit. Please wait a minute and try again.";
      } else if (error?.message?.includes("API key")) {
        errorMessage = "The Gemini API key is missing or invalid. Please check your environment configuration.";
      } else if (error?.message) {
        errorMessage = `Synthesis failed: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (input: string) => {
    if (!generatedPrompt || !lastComponents) return;
    
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    
    // Determine the latest prompt to refine
    // It's either the initial generatedPrompt or the last refinement in messages
    let latestPrompt = generatedPrompt;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].content.length > 100) { // Heuristic for a prompt
        latestPrompt = messages[i].content;
        break;
      }
    }

    setIsRefining(true);
    try {
      const result = await processInteraction(latestPrompt, input, lastComponents, messages);
      
      if (result.type === 'refinement') {
        const newAssistantMsg: Message = { role: 'assistant', content: result.content };
        setMessages(prev => [...prev, newAssistantMsg]);
        
        const newAnalysis = await analyzePrompt(result.content);
        setAnalysis(newAnalysis);

        if (activeSessionId) {
          const updatedSessions = sessions.map(s => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: [...messages, userMsg, newAssistantMsg],
                analysis: newAnalysis,
                timestamp: Date.now()
              };
            }
            return s;
          });
          saveSessionsToLocal(updatedSessions);
        }
      } else {
        const newAssistantMsg: Message = { role: 'assistant', content: result.content };
        setMessages(prev => [...prev, newAssistantMsg]);

        if (activeSessionId) {
          const updatedSessions = sessions.map(s => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: [...messages, userMsg, newAssistantMsg],
                timestamp: Date.now()
              };
            }
            return s;
          });
          saveSessionsToLocal(updatedSessions);
        }
      }
    } catch (error) {
      console.error("Interaction failed:", error);
      const content = isQuotaError(error) 
        ? "I've hit a temporary rate limit or quota. Please wait about 60 seconds and try again. This happens when the AI is processing many requests at once."
        : "I encountered an error while processing your request. This might be due to a temporary connection issue or an invalid response format. Please try rephrasing your request or clicking 'New Synthesis' to start fresh.";
      
      setMessages(prev => [...prev, { role: 'assistant', content }]);
    } finally {
      setIsRefining(false);
    }
  };

  const handleNewChat = () => {
    setGeneratedPrompt(null);
    setAnalysis(null);
    setLastComponents(null);
    setMessages([]);
    setActiveSessionId(null);
  };

  const handleSelectSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setActiveSessionId(id);
      setGeneratedPrompt(session.generatedPrompt);
      setAnalysis(session.analysis);
      setLastComponents(session.lastComponents);
      setMessages(session.messages);
      setIsSidebarOpen(false); // Close on mobile
    }
  };

  const handleDeleteSession = (id: string) => {
    const updatedSessions = sessions.filter(s => s.id !== id);
    saveSessionsToLocal(updatedSessions);
    if (activeSessionId === id) {
      handleNewChat();
    }
  };

  const handleBackToSynthesis = () => {
    setGeneratedPrompt(null);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30 relative font-sans flex">
      <Sidebar 
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={() => {
          handleNewChat();
          setIsSidebarOpen(false);
        }}
        onDeleteSession={handleDeleteSession}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        installPrompt={deferredPrompt}
        onInstall={handleInstallClick}
        isInstalled={isInstalled}
      />

      <AnimatePresence>
        {deferredPrompt && !isInstalled && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80 z-[100] bg-zinc-950 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 flex items-center justify-center rounded-lg">
                    <Cpu className="text-black" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-tight">Install PromptCraft</p>
                    <p className="text-[10px] text-zinc-500 font-mono">Access Elite Synthesis from your home screen.</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleInstallClick}
                  className="flex-1 py-2 bg-emerald-500 text-black rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all"
                >
                  Install Now
                </button>
                <button 
                  onClick={() => setDeferredPrompt(null)}
                  className="px-4 py-2 bg-zinc-900 text-zinc-500 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:text-zinc-300 transition-all"
                >
                  Later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        "flex-1 transition-all duration-300",
        isSidebarOpen ? "md:ml-64" : "ml-0"
      )}>
        {/* Dark Star Labs Style Background */}
      <div 
        className="fixed inset-0 opacity-[0.15] pointer-events-none z-0"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          filter: 'grayscale(100%) brightness(0.3)',
        }}
      />
      <div className="fixed inset-0 hero-gradient pointer-events-none z-0" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24">
        {/* Header - DSL Minimalist Style */}
        <header className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-lg text-emerald-500"
              >
                <MessageSquare size={20} />
              </motion.button>
              <motion.div 
                animate={{ rotate: [0, 90, 180, 270, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 bg-emerald-500 md:flex items-center justify-center rounded-sm shadow-[0_0_20px_rgba(16,185,129,0.4)] hidden"
              >
                <Cpu className="text-black" size={28} />
              </motion.div>
              <motion.div 
                animate={{ rotate: [0, 90, 180, 270, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="md:hidden text-emerald-500"
              >
                <Cpu size={32} />
              </motion.div>
              <div className="h-px w-24 bg-emerald-500/50" />
            </div>
            <h1 
              onMouseEnter={() => setHeadingTrigger(prev => prev + 1)}
              className="text-4xl md:text-7xl font-bold tracking-tighter leading-none relative group flex flex-wrap items-center gap-x-6 cursor-default"
            >
              <motion.div className="relative">
                <Word text="PROMPT" delay={0.2} trigger={headingTrigger} />
                {/* Glitch Overlay */}
                <motion.span 
                  animate={{ 
                    x: [-2, 2, -1, 0],
                    opacity: [0, 0.5, 0],
                  }}
                  transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
                  className="absolute inset-0 text-emerald-500/30 blur-[1px] pointer-events-none group-hover:opacity-100 group-hover:text-emerald-400/50 transition-all"
                >
                  PROMPT
                </motion.span>
              </motion.div>
              
              <motion.div className="text-emerald-500 text-glow relative">
                <Word text="CRAFT" delay={0.5} trigger={headingTrigger} />
                {/* Glitch Overlay */}
                <motion.span 
                  animate={{ 
                    x: [2, -2, 1, 0],
                    opacity: [0, 0.5, 0],
                  }}
                  transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 4 }}
                  className="absolute inset-0 text-white/20 blur-[1px] pointer-events-none group-hover:opacity-100 group-hover:text-white/40 transition-all"
                >
                  CRAFT
                </motion.span>
              </motion.div>
 
              <motion.div className="relative">
                <Word text="ELITE" delay={0.8} trigger={headingTrigger} />
              </motion.div>
            </h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-zinc-500 font-mono text-sm tracking-widest uppercase flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              // Engineering the Future of Interaction
            </motion.p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col items-start md:items-end gap-2 text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              SYSTEMS OPERATIONAL
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500/50">ACCESS_LEVEL:</span> ROOT
            </div>
            <div>VER: 1.0.4 // BUILD: OPTIMIZED</div>
 
            <AnimatePresence>
              {(generatedPrompt || messages.length > 0) && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNewChat}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-emerald-500 font-mono text-[10px] tracking-[0.2em] transition-all group"
                >
                  <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                  NEW SYNTHESIS
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </header>
 
        <main className="space-y-32">
          <section className="relative">
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              onMouseEnter={() => setHeadingTrigger(prev => prev + 1)}
              className="flex items-center gap-4 mb-12 overflow-hidden group cursor-default"
            >
              <motion.span 
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                className="text-emerald-500 font-mono text-sm"
              >
                01
              </motion.span>
              <h2 className="text-2xl font-bold tracking-tight uppercase whitespace-nowrap">
                <Word text="Synthesis" delay={0.1} trigger={headingTrigger} /> <span className="text-emerald-500/50"><Word text="Engine" delay={0.4} trigger={headingTrigger} /></span>
              </h2>
              
              {/* Section HUD Decor */}
              <div className="hidden md:flex items-center gap-2 text-[8px] font-mono text-zinc-700">
                <div className="w-1 h-1 bg-emerald-500/30 rounded-full group-hover:bg-emerald-500 transition-colors" />
                CORE_MODULE_ACTIVE
              </div>
            </motion.div>
            
            <AnimatePresence mode="wait">
              {!generatedPrompt ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="relative"
                >
                  <PromptForm onGenerate={handleGenerate} isLoading={isLoading} initialComponents={lastComponents} />
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.6, type: "spring", damping: 20 }}
                >
                  <div className="flex items-center justify-between mb-8">
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      onMouseEnter={() => setHeadingTrigger(prev => prev + 1)}
                      className="flex items-center gap-4 group cursor-default"
                    >
                      <span className="text-emerald-500 font-mono text-sm">02</span>
                      <h2 className="text-2xl font-bold tracking-tight uppercase">
                        <Word text="Output" delay={0.1} trigger={headingTrigger} /> <span className="text-emerald-500/50">&</span> <Word text="Analysis" delay={0.4} trigger={headingTrigger} />
                      </h2>
                    </motion.div>
                    <motion.button 
                      whileHover={{ scale: 1.05, x: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleNewChat}
                      className="text-[10px] font-mono text-zinc-500 hover:text-emerald-500 transition-colors uppercase tracking-widest"
                    >
                      [ New Synthesis ]
                    </motion.button>
                  </div>
                  <PromptResult 
                    prompt={generatedPrompt} 
                    analysis={analysis || undefined} 
                    onRefine={handleBackToSynthesis}
                    onFeedback={handleFeedback}
                    isRefining={isRefining}
                    messages={messages}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Footer Info */}
          <footer className="pt-20 border-t border-zinc-900 space-y-8">
            <div className="bg-zinc-900/30 border border-zinc-800/50 p-4 rounded-xl flex items-center gap-4">
              <ShieldAlert className="text-emerald-500/50 shrink-0" size={20} />
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Security Best Practice</p>
                <p className="text-[9px] text-zinc-600 font-mono leading-relaxed">
                  Always review generated prompts for unintended instructions. Never include real API keys, passwords, or sensitive PII in your synthesis components.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-zinc-600 font-mono text-[10px] uppercase tracking-widest">
              <div className="flex items-center gap-6">
                <span>© 2026 PROMPTCRAFT SYSTEMS</span>
                <span className="hidden md:inline">|</span>
                <span>ENGINEERED FOR EXCELLENCE</span>
              </div>
              <div className="flex items-center gap-6">
                <a href="#" className="hover:text-emerald-500 transition-colors flex items-center gap-1.5">
                  <Github size={12} /> REPOSITORY
                </a>
                <a href="#" className="hover:text-emerald-500 transition-colors">DOCUMENTATION</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  </div>
);
}

