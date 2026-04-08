import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, User, Bot, Sparkles, Home, CreditCard, FileText, Smartphone, X } from "lucide-react";
import { chatWithAmber } from "./services/geminiService";

interface Message {
  role: "user" | "model";
  text: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "Hey there! I'm your Amber Student assistant. How can I help you find your perfect home today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setIsLoading(true);

    try {
      const chatHistory = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      chatHistory.push({ role: "user", parts: [{ text: userMsg }] });

      const text = await chatWithAmber(chatHistory);
      
      if (text) {
        setMessages(prev => [...prev, { role: "model", text: text }]);
      } else {
        setMessages(prev => [...prev, { role: "model", text: "Sorry, I couldn't generate a response. Please try again." }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: "model", text: "I'm having trouble connecting right now. Please check your connection." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { icon: <CreditCard size={16} />, text: "Price trends in London", query: "What's the best time to book in London?" },
    { icon: <FileText size={16} />, text: "Visa for UK", query: "What are the visa requirements for UK?" },
    { icon: <X size={16} />, text: "Cancellation policy", query: "How do I cancel a booking?" },
    { icon: <Smartphone size={16} />, text: "Mobile app", query: "Is there a mobile app?" }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center p-4 md:p-8 font-sans text-[#1A1A1A]">
      {/* Header */}
      <header className="w-full max-w-2xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF6321] rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <Home size={24} />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">Amber Assistant</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">AI Powered Support</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-tighter">Live</div>
        </div>
      </header>

      {/* Chat Container */}
      <main className="w-full max-w-2xl flex-1 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col overflow-hidden relative">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-[#FF6321]"
                  }`}>
                    {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-[#1A1A1A] text-white rounded-tr-none" 
                      : "bg-gray-50 text-gray-800 rounded-tl-none border border-gray-100"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex gap-3 items-center text-gray-400 text-xs ml-11">
                <Sparkles size={12} className="animate-pulse" />
                <span>Amber is thinking...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length < 3 && (
          <div className="px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(action.query);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium hover:border-orange-300 hover:text-orange-600 transition-all whitespace-nowrap shadow-sm"
              >
                {action.icon}
                {action.text}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-gray-50/50 border-t border-gray-100">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about pricing, visas, or bookings..."
              className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-inner"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-3 bg-[#FF6321] text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-[#FF6321] transition-all shadow-lg shadow-orange-200"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-[10px] text-center text-gray-400 mt-3 font-medium">
            Amber AI can make mistakes. Check important info.
          </p>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="mt-8 text-center text-gray-400 text-xs flex flex-col gap-2">
        <p>© 2026 Amber Student Housing Marketplace</p>
        <div className="flex justify-center gap-4">
          <a href="#" className="hover:text-gray-600">Privacy Policy</a>
          <a href="#" className="hover:text-gray-600">Terms of Service</a>
          <a href="#" className="hover:text-gray-600">Contact Us</a>
        </div>
      </footer>
    </div>
  );
}
