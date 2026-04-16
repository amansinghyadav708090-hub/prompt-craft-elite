import React, { useState, useEffect } from 'react';
import { cn } from '@/src/lib/utils';
import { PromptComponents } from '@/src/lib/gemini';
import { Sparkles, Terminal, Info, ShieldAlert, FileJson, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PromptFormProps {
  onGenerate: (components: PromptComponents) => void;
  isLoading: boolean;
  initialComponents?: PromptComponents | null;
}

// Simple Scramble Hook for Labels
const useScramble = (text: string, isFocused: boolean) => {
  const [display, setDisplay] = useState(text);
  const chars = '!@#$%^&*()_+';

  useEffect(() => {
    if (!isFocused) {
      setDisplay(text);
      return;
    }

    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((char, index) => {
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );

      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 2;
    }, 30);

    return () => clearInterval(interval);
  }, [isFocused, text]);

  return display;
};

const FormLabel = ({ label, icon: Icon, isFocused, value }: { label: string; icon: any; isFocused: boolean; value: string }) => {
  const scrambledLabel = useScramble(label, isFocused);
  const hasValue = value.trim().length > 0;

  // Color logic based on user request:
  // 1. Initially White (Empty & Not Focused)
  // 2. Red until filled (Empty & Focused)
  // 3. Green once filled
  let colorClass = "text-white/70";
  if (hasValue) {
    colorClass = "text-emerald-500";
  } else if (isFocused) {
    colorClass = "text-red-500";
  }
  
  return (
    <label className={cn(
      "flex items-center gap-2 text-xs font-mono uppercase tracking-wider transition-all duration-300",
      isFocused ? "translate-x-1" : "",
      colorClass
    )}>
      <motion.div
        animate={isFocused ? { rotate: [0, 15, -15, 0], scale: 1.2 } : {}}
      >
        <Icon size={14} />
      </motion.div>
      {scrambledLabel}
      {isFocused && (
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "text-[8px] px-1 rounded ml-auto",
            hasValue ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
          )}
        >
          {hasValue ? "DATA_ACQUIRED" : "AWAITING_INPUT"}
        </motion.span>
      )}
    </label>
  );
};

const GenerateButton = ({ isLoading, isDisabled }: { isLoading: boolean; isDisabled: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);
  const text = isLoading ? "Activating Thinking Engine..." : "Generate Elite Prompt";
  const scrambledText = useScramble(text, isHovered && !isLoading);

  return (
    <motion.button
      type="submit"
      disabled={isDisabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "w-full py-5 rounded-xl font-mono text-sm uppercase tracking-[0.3em] transition-all duration-500 relative overflow-hidden group",
        isLoading 
          ? "bg-emerald-600 text-white shadow-[0_0_40px_rgba(16,185,129,0.3)]" 
          : "bg-red-600 text-white shadow-[0_0_40px_rgba(220,38,38,0.3)]",
        "disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-4"
      )}
    >
      {isLoading ? (
        <div className="flex items-center gap-3 relative z-10">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" 
          />
          <span className="font-bold tracking-widest">{text}</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 relative z-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles size={20} />
          </motion.div>
          <span className="font-bold tracking-widest">{scrambledText}</span>
        </div>
      )}
    </motion.button>
  );
};

export default function PromptForm({ onGenerate, isLoading, initialComponents }: PromptFormProps) {
  const [components, setComponents] = useState<PromptComponents>(initialComponents || {
    role: '',
    task: '',
    context: '',
    constraints: '',
    outputFormat: '',
    examples: '',
    mode: 'elite',
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Record<string, string[]>>({});

  const MAX_CHARS = 10000;

  const detectSensitiveData = (text: string) => {
    const found: string[] = [];
    // Common API Key patterns
    if (/(sk-[a-zA-Z0-9]{20,})|(AIza[0-9A-Za-z-_]{35})/.test(text)) {
      found.push("Potential API Key detected");
    }
    // Email pattern
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) {
      found.push("Email address detected");
    }
    return found;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value.length > MAX_CHARS) return;

    setComponents(prev => ({ ...prev, [name]: value }));
    
    const sensitive = detectSensitiveData(value);
    setWarnings(prev => ({ ...prev, [name]: sensitive }));
  };

  const handleModeChange = (mode: 'elite' | 'creative' | 'concise') => {
    setComponents(prev => ({ ...prev, mode }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(components);
  };

  const fields = [
    { name: 'role', label: 'Persona / Role', icon: Terminal, placeholder: 'e.g. Expert Senior Software Architect...' },
    { name: 'task', label: 'Core Task', icon: Sparkles, placeholder: 'e.g. Refactor this legacy Python code...' },
    { name: 'context', label: 'Context / Background', icon: Info, placeholder: 'e.g. This code runs in a serverless environment...' },
    { name: 'constraints', label: 'Constraints / Rules', icon: ShieldAlert, placeholder: 'e.g. Do not use external libraries...' },
    { name: 'outputFormat', label: 'Output Format', icon: FileJson, placeholder: 'e.g. Return a JSON object...' },
    { name: 'examples', label: 'Few-Shot Examples', icon: Layers, placeholder: 'e.g. Input: x, Output: y...' },
  ];

  const modes = [
    { 
      id: 'elite', 
      label: 'Elite', 
      desc: 'Structured & Engineered',
      info: 'Optimized for complex reasoning and high-precision outputs. Uses advanced engineering techniques like Chain-of-Thought and Role Prompting.'
    },
    { 
      id: 'creative', 
      label: 'Creative', 
      desc: 'Imaginative & Expressive',
      info: 'Best for storytelling, brainstorming, and artistic projects. Prioritizes variety, descriptive language, and an expressive tone.'
    },
    { 
      id: 'concise', 
      label: 'Concise', 
      desc: 'Short & Direct',
      info: 'Ideal for quick commands and minimal output. Strips away all non-essential language to focus on extreme brevity and directness.'
    },
  ] as const;

  const activeModeInfo = modes.find(m => m.id === components.mode)?.info;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Security Banner */}
      <AnimatePresence>
        {Object.values(warnings).some(w => w.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 overflow-hidden"
          >
            <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={18} />
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Security Alert: Sensitive Data Detected</p>
              <p className="text-[10px] text-zinc-400 font-mono">
                We detected potential API keys or PII in your input. For your security, avoid sending sensitive information to AI models.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode Selector */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Layers size={12} /> Synthesis Mode Selection
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleModeChange(mode.id)}
              className={cn(
                "flex flex-col items-start p-3 rounded-xl border transition-all duration-300 text-left group",
                components.mode === mode.id
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                  : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
              )}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  components.mode === mode.id ? "text-emerald-500" : "text-zinc-400 group-hover:text-zinc-200"
                )}>
                  {mode.label}
                </span>
                {components.mode === mode.id && (
                  <motion.div 
                    layoutId="active-mode"
                    className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" 
                  />
                )}
              </div>
              <span className="text-[10px] text-zinc-600 font-mono leading-tight">
                {mode.desc}
              </span>
            </button>
          ))}
        </div>
        
        {/* Mode Info Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={components.mode}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-start gap-3 p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-lg"
          >
            <Info size={14} className="text-emerald-500/50 shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-500 font-mono leading-relaxed italic">
              {activeModeInfo}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map((field, index) => (
          <motion.div 
            key={field.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              scale: focusedField === field.name ? 1.02 : 1,
            }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "space-y-2 group relative p-1 rounded-xl transition-all duration-300",
              focusedField === field.name ? "bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : ""
            )}
          >
            <FormLabel 
              label={field.label} 
              icon={field.icon} 
              isFocused={focusedField === field.name} 
              value={(components as any)[field.name]}
            />
            <div className="relative">
              <textarea
                name={field.name}
                value={(components as any)[field.name]}
                onChange={handleChange}
                onFocus={() => setFocusedField(field.name)}
                onBlur={() => setFocusedField(null)}
                placeholder={field.placeholder}
                className={cn(
                  "w-full bg-zinc-900/30 border rounded-lg p-3 text-sm outline-none transition-all min-h-[80px] resize-none relative z-10",
                  focusedField === field.name 
                    ? (components as any)[field.name].trim()
                      ? "border-emerald-500/50 ring-1 ring-emerald-500/20 bg-zinc-900/50" 
                      : "border-red-500/50 ring-1 ring-red-500/20 bg-zinc-900/50"
                    : (components as any)[field.name].trim()
                      ? "border-emerald-500/30"
                      : "border-zinc-800 group-hover:border-zinc-700"
                )}
              />
              <div className="absolute bottom-2 right-2 z-20 flex items-center gap-2">
                <span className={cn(
                  "text-[8px] font-mono",
                  (components as any)[field.name].length > MAX_CHARS * 0.9 ? "text-red-500" : "text-zinc-600"
                )}>
                  {(components as any)[field.name].length}/{MAX_CHARS}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <GenerateButton 
        isLoading={isLoading} 
        isDisabled={isLoading || !components.task} 
      />
    </form>
  );
}
