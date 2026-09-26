import React, { useState } from 'react';
import api from '../api/client';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Boxes,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CopilotDrawer = ({ onOpenRop, onOpenShrinkage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "👋 Hi! I'm **StockSense Copilot**, your real-time inventory intelligence assistant. Ask me anything about stockout risks, replenishment suggestions, or financial valuation!",
      suggestedActions: [
        { label: '🚨 What should I reorder this week?', prompt: 'What should I reorder this week?' },
        { label: '📊 Analyze stockout risks', prompt: 'Which products are at risk of stockout?' },
        { label: '💰 Total inventory valuation', prompt: 'What is our total inventory valuation?' },
        { label: '📉 Financial shrinkage loss', prompt: 'Show me total shrinkage and damaged goods loss' },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSend = async (queryText) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    // Add user message
    setMessages((prev) => [...prev, { sender: 'user', text: textToSend }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/copilot/ask', { question: textToSend });
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: res.data.answer,
          suggestedActions: res.data.suggestedActions || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: "⚠️ Sorry, I couldn't reach the copilot service right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action) => {
    if (action.prompt) {
      handleSend(action.prompt);
    } else if (action.action === 'open_rop') {
      if (onOpenRop) onOpenRop();
    } else if (action.action === 'open_shrinkage') {
      if (onOpenShrinkage) onOpenShrinkage();
    } else if (action.action === 'view_low_stock') {
      navigate('/products?lowStockOnly=true');
      setIsOpen(false);
    } else if (action.action === 'view_dashboard') {
      navigate('/dashboard');
      setIsOpen(false);
    } else if (action.action === 'view_adjustments') {
      navigate('/operations/adjustments');
      setIsOpen(false);
    } else if (action.action === 'view_warehouses') {
      navigate('/settings/warehouses');
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white rounded-full shadow-xl shadow-indigo-300 hover:shadow-indigo-400 hover:scale-105 active:scale-95 transition-all group"
      >
        <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-bold tracking-wide">AI Copilot</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </button>

      {/* Slide-over Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">StockSense Copilot</h3>
                  <p className="text-[11px] text-indigo-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Real-Time Knowledge Engine
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-xs space-y-2 ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-xs font-medium'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-line leading-relaxed">
                      {msg.text.split('**').map((part, i) =>
                        i % 2 === 1 ? <strong key={i} className="font-bold">{part}</strong> : part
                      )}
                    </div>

                    {/* Action buttons if available */}
                    {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1.5 border-t border-slate-100">
                        {msg.suggestedActions.map((act, i) => (
                          <button
                            key={i}
                            onClick={() => handleActionClick(act)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-[11px] border border-indigo-200 transition-colors flex items-center gap-1 text-left"
                          >
                            <span>{act.label}</span>
                            <ArrowRight className="w-3 h-3 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      U
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Analyzing inventory ledger data...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about reorders, risks, valuation..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
