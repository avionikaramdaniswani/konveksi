import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_REPLIES = [
  { label: "🛍️ Produk apa saja?", text: "Produk apa saja yang tersedia di Vanny Konveksi?" },
  { label: "💰 Info harga", text: "Berapa kisaran harga untuk pembuatan seragam?" },
  { label: "📦 Min. order", text: "Berapa minimum order yang bisa dipesan?" },
  { label: "⏱️ Lama produksi", text: "Berapa lama proses produksinya?" },
  { label: "🎨 Metode cetak", text: "Metode cetak apa saja yang tersedia?" },
  { label: "🚚 Info pengiriman", text: "Apakah tersedia pengiriman ke seluruh Indonesia?" },
];

export default function PortalChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Halo! Saya asisten virtual Vanny Konveksi 👋\nAda yang bisa saya bantu hari ini?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [open]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setShowQuickReplies(false);
    const userMsg: Message = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error("Request gagal");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.content) {
              assistantContent += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Maaf, terjadi kesalahan. Silakan coba lagi." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasOnlyGreeting = messages.length === 1;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white"
            style={{ backgroundColor: "#0d9488" }}
            aria-label="Buka chat"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", bounce: 0.18, duration: 0.32 }}
            className="fixed z-50 bg-white shadow-2xl flex flex-col overflow-hidden border border-gray-100
              /* Mobile: full width, anchored to bottom */
              bottom-0 left-0 right-0 rounded-t-2xl h-[85dvh]
              /* Desktop: floating card */
              sm:bottom-5 sm:right-5 sm:left-auto sm:w-[380px] sm:h-[560px] sm:max-h-[calc(100dvh-80px)] sm:rounded-2xl"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 text-white flex-shrink-0"
              style={{ backgroundColor: "#0d9488" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">Asisten Vanny</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                    <p className="text-xs text-teal-100 leading-tight">Online · Siap membantu</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Tutup chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                      msg.role === "assistant" ? "bg-teal-600" : "bg-gray-300"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Bot className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <div
                    className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      msg.role === "assistant"
                        ? "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
                        : "text-white rounded-br-sm"
                    }`}
                    style={msg.role === "user" ? { backgroundColor: "#0d9488" } : undefined}
                  >
                    {msg.content || (
                      <span className="inline-flex gap-1 items-center py-0.5">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-teal-600 flex-shrink-0 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm border border-gray-100">
                    <span className="inline-flex gap-1 items-center py-0.5">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Replies */}
              {showQuickReplies && hasOnlyGreeting && !loading && (
                <div className="pt-1">
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-400 font-medium">
                    <Sparkles className="w-3 h-3" />
                    Pertanyaan populer
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_REPLIES.map((qr) => (
                      <button
                        key={qr.label}
                        onClick={() => sendMessage(qr.text)}
                        className="text-xs px-3 py-1.5 rounded-full border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 active:scale-95 transition-all font-medium"
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-3 py-3 border-t border-gray-100 bg-white safe-area-bottom">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-teal-400 transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ketik pesan..."
                  disabled={loading}
                  className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400 disabled:opacity-50 min-w-0"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  style={{ backgroundColor: "#0d9488" }}
                  aria-label="Kirim"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
