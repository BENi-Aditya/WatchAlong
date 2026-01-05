import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  MessageCircle, 
  X, 
  Send,
  Users,
  Copy,
  Check,
  LogOut
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  color: string;
}

const WatchRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(35);
  const [showChat, setShowChat] = useState(true);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", user: "Alex", text: "This part is so good! 🎬", timestamp: "12:30", color: "#FFB3C6" },
    { id: "2", user: "Jordan", text: "I know right, the cinematography is insane", timestamp: "12:31", color: "#FFD166" },
    { id: "3", user: "Sam", text: "Wait for the next scene...", timestamp: "12:32", color: "#A8E6CF" },
  ]);

  const participants = [
    { name: "You (Host)", color: "#FFB3C6", isHost: true },
    { name: "Alex", color: "#FFD166" },
    { name: "Jordan", color: "#A8E6CF" },
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      user: "You",
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      color: "#FFB3C6",
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessage("");
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(sessionId || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Video Area */}
      <div 
        className={cn(
          "flex-1 relative flex flex-col transition-all duration-300",
          showChat ? "mr-0" : "mr-0"
        )}
        onMouseMove={handleMouseMove}
      >
        {/* Top Bar */}
        <div className={cn(
          "absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-background/80 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate("/")}
                className="glass-panel-subtle p-2 rounded-lg hover:bg-muted transition-smooth"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <div>
                <h1 className="font-semibold">Movie Night Session</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Code: {sessionId}</span>
                  <button 
                    onClick={handleCopyCode}
                    className="hover:text-foreground transition-smooth"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* Participants */}
              <div className="flex -space-x-2">
                {participants.map((p) => (
                  <div 
                    key={p.name}
                    className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                  >
                    {p.name[0]}
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="w-4 h-4" />
                {participants.length}
              </span>
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div className="flex-1 bg-foreground/95 flex items-center justify-center relative">
          {/* Placeholder Video Content */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-yellow-500/10" />
          
          <div className="text-center text-primary-foreground/50">
            <div className="w-24 h-24 rounded-full bg-primary/20 mx-auto mb-4 flex items-center justify-center">
              <Play className="w-12 h-12 text-primary" />
            </div>
            <p className="text-lg">Video Stream Area</p>
            <p className="text-sm opacity-60 mt-1">Synchronized playback active</p>
          </div>

          {/* Center Play/Pause */}
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
              showControls || !isPlaying ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="w-20 h-20 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform">
              {isPlaying ? (
                <Pause className="w-8 h-8 text-foreground" />
              ) : (
                <Play className="w-8 h-8 text-foreground ml-1" />
              )}
            </div>
          </button>
        </div>

        {/* Bottom Controls */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-background/80 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}>
          <GlassCard variant="subtle" className="p-4">
            {/* Progress Bar */}
            <div className="mb-4">
              <div 
                className="h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = ((e.clientX - rect.left) / rect.width) * 100;
                  setProgress(percent);
                }}
              >
                <div 
                  className="h-full bg-primary rounded-full relative transition-all"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-glow-pink" />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="hover:text-primary transition-smooth"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="hover:text-primary transition-smooth"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                <span className="text-sm text-muted-foreground">
                  {formatTime(progress * 6)} / 10:00
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowChat(!showChat)}
                  className={cn(
                    "p-2 rounded-lg transition-smooth",
                    showChat ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg hover:bg-muted transition-smooth">
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Chat Panel */}
      <div className={cn(
        "w-80 border-l border-border bg-card/50 backdrop-blur-sm flex flex-col transition-all duration-300",
        showChat ? "translate-x-0" : "translate-x-full w-0 border-0"
      )}>
        {showChat && (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <span className="font-medium">Chat</span>
              </div>
              <button 
                onClick={() => setShowChat(false)}
                className="p-1 rounded hover:bg-muted transition-smooth"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-slide-in-right">
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{ backgroundColor: msg.color }}
                    >
                      {msg.user[0]}
                    </div>
                    <span className="text-sm font-medium">{msg.user}</span>
                    <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                  </div>
                  <div className="ml-8 glass-panel-subtle px-3 py-2 rounded-xl rounded-tl-sm">
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <GlassInput
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 text-sm"
                />
                <GlassButton 
                  size="sm" 
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="px-3"
                >
                  <Send className="w-4 h-4" />
                </GlassButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WatchRoom;
