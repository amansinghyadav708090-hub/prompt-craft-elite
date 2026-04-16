import React, { useState, useEffect } from 'react';
import { Copy, Check, BarChart3, Lightbulb, RefreshCw, MessageSquarePlus, Layers, ShieldAlert } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { Message } from '@/src/lib/gemini';

interface PromptResultProps {
  prompt: string;
  analysis?: {
    score: number;
    securityScore: number;
    suggestions: string[];
    securityAudit: string;
  };
  onRefine: () => void;
  onFeedback: (feedback: string) => void;
  isRefining: boolean;
  messages: Message[];
}

export default function PromptResult({ prompt, analysis, onRefine, onFeedback, isRefining, messages }: PromptResultProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [displayedPrompt, setDisplayedPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (prompt) {
      setIsTyping(true);
      setDisplayedPrompt('');
      let i = 0;
      const interval = setInterval(() => {
        setDisplayedPrompt(prompt.slice(0, i));
        i += 5; // Type 5 characters at a time for speed
        if (i > prompt.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 10);
      return () => clearInterval(interval);
    }
  }, [prompt]);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim()) {
      onFeedback(feedback);
      setFeedback('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Result Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative"
      >
        {/* Hacking Grid Background Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] bg-[size:20px_20px]" />

        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-emerald-500 font-bold">
              Generated Elite Prompt
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={onRefine}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-emerald-500 font-mono text-[9px] tracking-widest transition-all group"
              title="Edit Synthesis Parameters"
            >
              <Layers size={12} className="group-hover:rotate-12 transition-transform" />
              SWITCH TO SYNTHESIS
            </motion.button>
            <motion.button
              whileHover={{ rotate: 180 }}
              onClick={onRefine}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
              title="Start Over"
            >
              <RefreshCw size={16} />
            </motion.button>
          </div>
        </div>
        <div className="p-6 prose prose-invert max-w-none relative z-10">
          <div className="bg-zinc-950 rounded-xl p-6 font-mono text-sm leading-relaxed border border-zinc-800/50 whitespace-pre-wrap min-h-[100px] relative text-justify">
            {displayedPrompt}
            {isTyping && (
              <motion.span 
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="inline-block w-2 h-4 bg-emerald-500 ml-1 align-middle"
              />
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 hover:border-emerald-500/50 rounded-lg text-xs font-mono transition-all text-zinc-300 hover:text-emerald-400 shadow-lg"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copied ? 'Copied to Clipboard' : 'Copy Elite Prompt'}
            </motion.button>
          </div>
        </div>

        {/* Chat Log Section */}
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="border-t border-zinc-800 bg-zinc-950/20 p-6 space-y-4 max-h-[400px] overflow-y-auto relative z-10"
            >
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600 mb-4">
                Consultation History
              </div>
              {messages.map((msg, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    msg.role === 'user' ? "bg-zinc-800" : "bg-emerald-500/10 border border-emerald-500/20"
                  )}>
                    {msg.role === 'user' ? <MessageSquarePlus size={14} className="text-zinc-400" /> : <Lightbulb size={14} className="text-emerald-500" />}
                  </div>
                  <div className={cn(
                    "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed text-justify relative group/msg",
                    msg.role === 'user' 
                      ? "bg-zinc-800 text-zinc-100 rounded-tr-none" 
                      : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none"
                  )}>
                    {msg.role === 'assistant' && msg.content.length > 100 && (
                      <div className="text-[8px] font-mono text-emerald-500/50 mb-2 tracking-widest uppercase">
                        // Refined Synthesis Output
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    
                    {msg.role === 'assistant' && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={(e) => {
                            navigator.clipboard.writeText(msg.content);
                            const target = e.currentTarget as HTMLButtonElement;
                            if (target) {
                              const originalText = target.innerHTML;
                              target.innerHTML = '<span class="flex items-center gap-1 text-emerald-500"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg> Copied</span>';
                              setTimeout(() => { target.innerHTML = originalText; }, 2000);
                            }
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 bg-zinc-950/50 hover:bg-zinc-950 border border-zinc-800 rounded text-[10px] font-mono text-zinc-500 hover:text-emerald-500 transition-all"
                          title="Copy to Clipboard"
                        >
                          <Copy size={10} />
                          <span>Copy Response</span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isRefining && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none flex items-center gap-3">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full" 
                    />
                    <span className="text-xs font-mono tracking-widest text-emerald-500/70 animate-pulse">
                      ACTIVATING THINKING ENGINE...
                    </span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Input */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 relative z-10">
          <form onSubmit={handleSubmitFeedback} className="flex gap-3">
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Ask a question or provide refinement feedback..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              disabled={isRefining}
            />
            <motion.button
              type="submit"
              disabled={isRefining || !feedback.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isRefining ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" 
                />
              ) : (
                'Send'
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>

      {/* Analysis Section */}
      {analysis && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center space-y-2"
            >
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
                <BarChart3 size={14} /> Quality Score
              </div>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                className="text-5xl font-bold text-emerald-500"
              >
                {analysis.score}<span className="text-zinc-700 text-2xl">/10</span>
              </motion.div>
            </motion.div>

            {/* Security Score Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center space-y-2"
            >
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
                <ShieldAlert size={14} /> Security Score
              </div>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.1 }}
                className={cn(
                  "text-5xl font-bold",
                  analysis.securityScore >= 8 ? "text-emerald-500" : analysis.securityScore >= 5 ? "text-amber-500" : "text-red-500"
                )}
              >
                {analysis.securityScore}<span className="text-zinc-700 text-2xl">/10</span>
              </motion.div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Suggestions Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
                <Lightbulb size={14} /> Refinement Suggestions
              </div>
              <ul className="space-y-3">
                {analysis.suggestions.map((suggestion, i) => (
                  <motion.li 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + (i * 0.1) }}
                    className="flex items-start gap-3 text-sm text-zinc-300"
                  >
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    {suggestion}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Security Audit Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
                <ShieldAlert size={14} /> Security Audit
              </div>
              <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                <p className="text-sm text-zinc-400 font-mono leading-relaxed">
                  {analysis.securityAudit}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600 uppercase">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  analysis.securityScore >= 8 ? "bg-emerald-500" : analysis.securityScore >= 5 ? "bg-amber-500" : "bg-red-500"
                )} />
                {analysis.securityScore >= 8 ? "System Robustness: High" : analysis.securityScore >= 5 ? "System Robustness: Moderate" : "System Robustness: Low"}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
