import { useState, useEffect, useRef } from "react";
import {
  Send,
  Copy,
  Check,
  Plus,
  Trash2,
  MessageSquare,
  Menu,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  ChevronDown,
  Search,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from '@/config/api';

type MessageType = "default" | "success" | "alert" | "info";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  type?: MessageType;
  metadata?: {
    processingTime?: number;
    confidence?: number;
  };
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  category?: string;
}

const formatTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateObj.toDateString() === today.toDateString()) {
    return "Today";
  } else if (dateObj.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
};

const detectMessageType = (content: string): MessageType => {
  const lowerContent = content.toLowerCase();
  if (
    lowerContent.includes("alert") ||
    lowerContent.includes("warning") ||
    lowerContent.includes("urgent") ||
    lowerContent.includes("critical") ||
    lowerContent.includes("error")
  ) {
    return "alert";
  }
  if (
    lowerContent.includes("success") ||
    lowerContent.includes("confirmed") ||
    lowerContent.includes("completed") ||
    lowerContent.includes("approved")
  ) {
    return "success";
  }
  if (
    lowerContent.includes("note:") ||
    lowerContent.includes("tip:") ||
    lowerContent.includes("info:")
  ) {
    return "info";
  }
  return "default";
};

const getMessageStyles = (type: MessageType) => {
  switch (type) {
    case "success":
      return {
        border: "border-emerald-200",
        bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
        icon: CheckCircle2,
        iconColor: "text-emerald-600",
        accentBar: "bg-gradient-to-b from-emerald-400 to-emerald-600",
      };
    case "alert":
      return {
        border: "border-red-200",
        bg: "bg-gradient-to-br from-red-50 to-red-100/50",
        icon: AlertTriangle,
        iconColor: "text-red-600",
        accentBar: "bg-gradient-to-b from-red-400 to-red-600",
      };
    case "info":
      return {
        border: "border-amber-200",
        bg: "bg-gradient-to-br from-amber-50 to-amber-100/50",
        icon: Info,
        iconColor: "text-amber-600",
        accentBar: "bg-gradient-to-b from-amber-400 to-amber-600",
      };
    default:
      return {
        border: "border-slate-200",
        bg: "bg-gradient-to-br from-white to-slate-50",
        icon: Bot,
        iconColor: "text-slate-600",
        accentBar: "bg-gradient-to-b from-slate-400 to-slate-600",
      };
  }
};

const generateId = () => Math.random().toString(36).substring(2, 15);

const QUICK_ACTIONS = [
  {
    icon: "📊",
    label: "Fleet Overview",
    question: "Provide a comprehensive overview of our entire fleet including total vehicles, allocation status, and key metrics.",
    category: "Analytics",
  },
  {
    icon: "🚗",
    label: "Vehicle Status",
    question: "What is the current status of all vehicles? Show me allocated vs spare vehicles with details.",
    category: "Fleet",
  },
  {
    icon: "👥",
    label: "Driver Management",
    question: "List all drivers with their assigned vehicles and performance metrics.",
    category: "Drivers",
  },
  {
    icon: "🔧",
    label: "Maintenance Schedule",
    question: "Show me all vehicles requiring maintenance, scheduled services, and overdue items.",
    category: "Maintenance",
  },
  {
    icon: "💰",
    label: "Cost Analysis",
    question: "Analyze our fleet costs including fuel, maintenance, and operational expenses.",
    category: "Finance",
  },
  {
    icon: "⚡",
    label: "Performance Metrics",
    question: "What are the key performance indicators for our fleet? Include utilization rates and efficiency metrics.",
    category: "Analytics",
  },
];

export default function ChatBot() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem("chatbot_sessions_v2");
    return saved ? JSON.parse(saved) : [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const saved = localStorage.getItem("chatbot_active_session_v2");
    return saved;
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const chatAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [questionInput, setQuestionInput] = useState<string>("");

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const userName = 'Fleet Manager';
  const userInitials = 'FM';

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem("chatbot_sessions_v2", JSON.stringify(sessions));
  }, [sessions]);

  // Save active session ID
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem("chatbot_active_session_v2", activeSessionId);
    }
  }, [activeSessionId]);

  // Scroll to bottom with smooth animation
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTo({
        top: chatAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [activeSession?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
    }
  }, [questionInput]);

  const createNewSession = () => {
    const newSession: Session = {
      id: generateId(),
      title: "New Conversation",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  // Ensure a session exists
  useEffect(() => {
    if (activeSessionId) return;
    if (sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    } else {
      createNewSession();
    }
  }, [sessions, activeSessionId]);

  const deleteSession = (sessionId: string) => {
    if (!window.confirm('Delete this conversation? This action cannot be undone.')) return;
    setSessions(sessions.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      const remainingSessions = sessions.filter((s) => s.id !== sessionId);
      setActiveSessionId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
    }
  };

  const updateSessionTitle = (sessionId: string, newTitle: string) => {
    setSessions(
      sessions.map((s) =>
        s.id === sessionId ? { ...s, title: newTitle, updatedAt: new Date() } : s
      )
    );
  };

  const deleteMessage = (sessionId: string, messageId: string) => {
    if (!window.confirm('Delete this message?')) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId 
          ? { ...s, messages: s.messages.filter((m) => m.id !== messageId), updatedAt: new Date() } 
          : s
      )
    );
  };

  const clearConversation = (sessionId: string | null) => {
    if (!sessionId) return;
    if (!window.confirm('Clear all messages in this conversation?')) return;
    setSessions((prev) => 
      prev.map((s) => 
        s.id === sessionId 
          ? { ...s, messages: [], updatedAt: new Date() } 
          : s
      )
    );
  };

  const sendMessage = async (directQuestion?: string) => {
    if (isProcessing) return;

    let currentSession = activeSession;
    if (!currentSession) {
      const newSession: Session = {
        id: generateId(),
        title: 'New Conversation',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      currentSession = newSession;
    }

    const question = (directQuestion || questionInput).trim();
    if (!question) return;

    const sessionId = currentSession.id;
    const startTime = Date.now();

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: question,
      createdAt: new Date(),
      type: "default",
    };

    setSessions(prev => 
      prev.map(s => 
        s.id === sessionId 
          ? { ...s, messages: [...(s.messages || []), userMessage], updatedAt: new Date() } 
          : s
      )
    );

    if ((currentSession as Session).messages.length === 0) {
      const title = question.substring(0, 60) + (question.length > 60 ? "..." : "");
      updateSessionTitle(sessionId, title);
    }

    setQuestionInput("");
    setIsProcessing(true);

    try {
      const history = [...(currentSession.messages || []), userMessage].map(m => ({ 
        role: m.role, 
        content: m.content 
      }));

      const base = API_BASE_URL || '';
      const response = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          history,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      const botMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: data.response || "No response received",
        createdAt: new Date(),
        type: detectMessageType(data.response || ""),
        metadata: {
          processingTime,
          confidence: data.confidence,
        },
      };

      setSessions(prev => 
        prev.map(s => 
          s.id === sessionId 
            ? { ...s, messages: [...(s.messages || []), botMessage], updatedAt: new Date() } 
            : s
        )
      );
    } catch (err) {
      console.error("Chat error:", err);

      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: `⚠️ **Connection Error**\n\nUnable to reach the AI service. Please ensure:\n- The backend service is running\n- Network connection is stable\n- API endpoint is configured correctly`,
        createdAt: new Date(),
        type: "alert",
      };

      setSessions(prev => 
        prev.map(s => 
          s.id === sessionId 
            ? { ...s, messages: [...(s.messages || []), errorMessage], updatedAt: new Date() } 
            : s
        )
      );
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  const askQuickQuestion = (question: string) => {
    setQuestionInput(question);
    sendMessage(question);
  };

  const handleCopy = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedSessions = filteredSessions.reduce((acc, session) => {
    const date = formatDate(session.updatedAt);
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 overflow-hidden">
      {/* Enhanced Sidebar */}
      <div
        className={`${
          isSidebarOpen ? "w-80" : "w-0"
        } transition-all duration-300 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col overflow-hidden shadow-2xl border-r border-slate-700/50`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-700/50 bg-slate-900/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Fleet AI</h2>
                <p className="text-xs text-slate-400">Pro Assistant</p>
              </div>
            </div>
          </div>

          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl hover:shadow-xl hover:scale-105 transition-all font-semibold group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            New Conversation
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-700/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {Object.entries(groupedSessions).map(([date, sessionsInGroup]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-slate-400 px-3 mb-2 uppercase tracking-wider">
                {date}
              </p>
              <div className="space-y-1">
                {sessionsInGroup.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative p-3 rounded-xl cursor-pointer transition-all ${
                      activeSessionId === session.id
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
                        : "hover:bg-slate-800/50 text-slate-300 hover:text-white"
                    }`}
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare size={14} className="flex-shrink-0" />
                          <p className="text-sm font-medium truncate leading-tight">
                            {session.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs opacity-70">
                          <span>{session.messages.length} messages</span>
                          <span>•</span>
                          <span>{formatTime(session.updatedAt)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/20 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* User Info */}
        <div className="border-t border-slate-700/50 p-4 bg-slate-900/50">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate text-sm">{userName}</p>
              <p className="text-xs text-slate-400">Premium Account</p>
            </div>
            <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <Settings size={16} className="text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Enhanced Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: '#27549D', fontFamily: 'MontBold' }}>
                  <span className="text-xl">🚗</span>
                  Fleet AI Assistant
                </h1>
                <p className="text-xs" style={{ color: '#646F86', fontFamily: 'MontRegular' }}>
                  Chat & Analytics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => createNewSession()} 
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all font-medium text-xs flex items-center gap-1"
              >
                <Plus size={16} />
                New
              </button>
              <button
                onClick={() => (window.location.href = '/fleet-dashboard')}
                className="px-3 py-2 text-white rounded-lg hover:shadow-lg transition-all font-medium text-xs flex items-center gap-1"
                style={{ background: '#27549D' }}
              >
                <Zap size={16} />
                Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div
          ref={chatAreaRef}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {!activeSession?.messages || activeSession.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-xl">
                <Sparkles size={40} className="text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-slate-800 mb-3">
                Welcome to Fleet AI Assistant
              </h2>
              <p className="text-lg text-slate-600 mb-8 max-w-2xl">
                Your intelligent partner for comprehensive fleet management, analytics, and decision-making
              </p>

              <div className="w-full max-w-4xl">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Zap size={16} className="text-blue-600" />
                    Quick Actions
                  </p>
                  <p className="text-xs text-slate-500">Click to ask</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {QUICK_ACTIONS.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => askQuickQuestion(action.question)}
                      className="group relative bg-white border-2 border-slate-200 p-4 rounded-2xl hover:border-blue-400 hover:shadow-xl transition-all text-left overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{action.icon}</span>
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            {action.category}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 mb-1 text-sm">
                          {action.label}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {action.question}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                  <p className="text-sm text-slate-700 text-center">
                    <strong>💡 Pro Tip:</strong> Ask complex, multi-part questions for comprehensive analysis and insights
                  </p>
                </div>
              </div>
            </div>
          ) : (
            activeSession.messages.map((message) => {
              const messageType =
                message.role === "assistant"
                  ? message.type || detectMessageType(message.content)
                  : "default";
              const styles =
                message.role === "assistant" ? getMessageStyles(messageType) : null;
              const IconComponent = styles?.icon;

              return (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div
                    className={`group relative max-w-[85%] md:max-w-[75%] ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl rounded-br-md px-6 py-4 shadow-lg"
                        : `${styles?.bg} border-2 ${styles?.border} rounded-3xl rounded-bl-md shadow-lg overflow-hidden`
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${styles?.accentBar} rounded-l-3xl`} />
                    )}

                    <div className={message.role === "assistant" ? "pl-5 pr-6 py-4" : ""}>
                      {message.role === "assistant" && IconComponent && (
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-8 h-8 rounded-xl ${styles?.bg} border ${styles?.border} flex items-center justify-center`}>
                            <IconComponent className={`w-4 h-4 ${styles?.iconColor}`} />
                          </div>
                          <span className={`text-xs font-bold uppercase tracking-wider ${styles?.iconColor}`}>
                            {messageType === "success" ? "✓ Confirmed" : messageType === "alert" ? "⚠ Alert" : messageType === "info" ? "ℹ Information" : "AI Response"}
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">
                            {message.content}
                          </p>
                          
                          <div className={`flex items-center gap-3 mt-3 text-xs ${message.role === "user" ? "text-blue-100" : "text-slate-400"}`}>
                            <span className="font-medium">{formatTime(message.createdAt)}</span>
                            
                            {message.metadata?.processingTime && (
                              <>
                                <span>•</span>
                                <span>{(message.metadata.processingTime / 1000).toFixed(1)}s</span>
                              </>
                            )}
                            
                            {message.role === "assistant" && (
                              <div className="flex items-center gap-1 ml-auto">
                                <button
                                  onClick={() => handleCopy(message.id, message.content)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-200"
                                  title="Copy message"
                                >
                                  {copiedId === message.id ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => deleteMessage(activeSessionId as string, message.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-100"
                                  title="Delete message"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            )}
                            
                            {message.role === "user" && (
                              <button
                                onClick={() => deleteMessage(activeSessionId as string, message.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/20 ml-auto"
                                title="Delete message"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isProcessing && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl rounded-bl-md px-6 py-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <RefreshCw size={16} className="text-white animate-spin" />
                  </div>
                  <div className="flex gap-1.5">
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-slate-600">Analyzing...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Input Area */}
        <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200/50 p-6 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder="Ask comprehensive questions about your fleet, drivers, maintenance, costs, performance metrics..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isProcessing) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={!activeSession}
                  rows={1}
                  className="w-full px-6 py-4 pr-12 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed resize-none text-sm bg-white"
                  style={{ maxHeight: '150px' }}
                />
                <div className="absolute right-4 bottom-4 text-xs text-slate-400">
                  {questionInput.length > 0 && `${questionInput.length} chars`}
                </div>
              </div>
              <button
                onClick={sendMessage}
                disabled={isProcessing || !activeSession || !questionInput.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold flex items-center gap-2"
              >
                <Send size={20} />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">
              Press <kbd className="px-2 py-1 bg-slate-100 rounded border border-slate-200">Enter</kbd> to send, <kbd className="px-2 py-1 bg-slate-100 rounded border border-slate-200">Shift + Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}