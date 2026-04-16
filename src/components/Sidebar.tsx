import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Plus, Trash2, Clock, ChevronLeft, ChevronRight, LogOut, User as UserIcon, Download } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Message, PromptComponents } from '@/src/lib/gemini';
import { useAuth } from './AuthProvider';
import { logout } from '../lib/firebase';

export interface Session {
  id: string;
  uid: string;
  title: string;
  timestamp: number;
  generatedPrompt: string | null;
  analysis: { 
    score: number; 
    securityScore: number;
    suggestions: string[];
    securityAudit: string;
  } | null;
  lastComponents: PromptComponents | null;
  messages: Message[];
}

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  installPrompt: any;
  onInstall: () => void;
  isInstalled: boolean;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isOpen,
  setIsOpen,
  installPrompt,
  onInstall,
  isInstalled
}: SidebarProps) {
  const { user, isAdmin } = useAuth();

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-50 p-2 bg-zinc-900 border border-zinc-800 rounded-r-xl text-emerald-500 transition-all duration-300",
          isOpen ? "left-64" : "left-0"
        )}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -256 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-0 left-0 bottom-0 w-64 bg-zinc-950 border-r border-zinc-900 z-50 flex flex-col"
      >
        <div className="p-4 border-b border-zinc-900">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-emerald-500 flex items-center justify-center rounded-sm">
              <MessageSquare className="text-black" size={18} />
            </div>
            <h2 className="font-bold tracking-tighter text-sm uppercase">Synthesis History</h2>
          </div>

          <button
            onClick={onNewSession}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-emerald-500 text-xs font-mono tracking-widest transition-all group"
          >
            <Plus size={14} className="group-hover:rotate-90 transition-transform" />
            NEW SYNTHESIS
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {sessions.length === 0 ? (
            <div className="p-8 text-center">
              <Clock size={24} className="mx-auto text-zinc-800 mb-2" />
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">No history found</p>
            </div>
          ) : (
            sessions.sort((a, b) => b.timestamp - a.timestamp).map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group relative flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer",
                  activeSessionId === session.id
                    ? "bg-zinc-900 border border-zinc-800"
                    : "hover:bg-zinc-900/50 border border-transparent"
                )}
                onClick={() => onSelectSession(session.id)}
              >
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  activeSessionId === session.id ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-800"
                )} />
                
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-[11px] font-medium truncate",
                    activeSessionId === session.id ? "text-emerald-500" : "text-zinc-400 group-hover:text-zinc-200"
                  )}>
                    {session.title || "Untitled Synthesis"}
                  </p>
                  <p className="text-[9px] font-mono text-zinc-600 uppercase mt-0.5">
                    {new Date(session.timestamp).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 text-zinc-600 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-zinc-900">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-zinc-700" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 border border-zinc-700">
                <UserIcon size={14} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-300 truncate">{user?.displayName || 'User'}</p>
              <p className="text-[8px] font-mono text-zinc-600 truncate uppercase tracking-tighter">{isAdmin ? 'ADMIN_ACCESS' : 'USER_ACCESS'}</p>
            </div>
            <button 
              onClick={() => logout()}
              className="p-1.5 text-zinc-600 hover:text-emerald-500 transition-colors"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>

          {installPrompt && !isInstalled && (
            <button
              onClick={onInstall}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <Download size={14} />
              Install App
            </button>
          )}

          <div className="mt-4 text-[9px] font-mono text-zinc-700 uppercase tracking-widest text-center">
            System v1.0.4 // DSL_CORE
          </div>
        </div>
      </motion.aside>
    </>
  );
}
