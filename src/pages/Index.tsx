import { Play, Users, Zap, Link2, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const [joinCode, setJoinCode] = useState("");
  const navigate = useNavigate();

  const handleCreateSession = () => {
    navigate("/create");
  };

  const handleJoinSession = () => {
    if (joinCode.trim()) {
      navigate(`/room/${joinCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-mesh overflow-hidden">
      {/* Floating Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-pink-300/20 rounded-full blur-3xl float" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-yellow-200/20 rounded-full blur-3xl float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-pink-200/15 rounded-full blur-3xl float" style={{ animationDelay: "4s" }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center glow-pink">
              <Play className="w-5 h-5 text-primary-foreground fill-current" />
            </div>
            <span className="text-xl font-semibold">SyncWatch</span>
          </div>
          <GlassButton variant="ghost" size="sm">
            Sign In
          </GlassButton>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 px-6 pt-12 pb-24">
        <div className="max-w-7xl mx-auto">
          {/* Hero Content */}
          <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 glass-panel-subtle px-4 py-2 rounded-full mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full pulse-glow" />
              <span className="text-sm text-muted-foreground">Perfect sync, every time</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Watch Together,{" "}
              <span className="text-gradient">Truly Together</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              No ads. No drift. No "wait, pause." Server-authoritative playback keeps everyone perfectly synchronized, down to the millisecond.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <GlassButton size="lg" onClick={handleCreateSession}>
                <Play className="w-5 h-5" />
                Start a Session
              </GlassButton>
              <GlassButton variant="outline" size="lg" onClick={() => document.getElementById('join-section')?.scrollIntoView({ behavior: 'smooth' })}>
                <Link2 className="w-5 h-5" />
                Join with Code
              </GlassButton>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative max-w-4xl mx-auto mb-24 animate-scale-in" style={{ animationDelay: "0.2s" }}>
            <GlassCard className="p-2 overflow-hidden">
              <img 
                src={heroBg} 
                alt="SyncWatch experience" 
                className="w-full h-auto rounded-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent rounded-xl" />
              
              {/* Floating UI Preview */}
              <div className="absolute bottom-8 left-8 right-8">
                <GlassCard variant="subtle" className="p-4 flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div 
                        key={i} 
                        className="w-8 h-8 rounded-full bg-pink-300 border-2 border-background flex items-center justify-center text-xs font-medium"
                        style={{ backgroundColor: i === 1 ? '#FFB3C6' : i === 2 ? '#FFD166' : '#FFB3C6' }}
                      >
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1">
                    <div className="h-1.5 bg-pink-200 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-primary rounded-full" />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">12:34 / 18:52</span>
                </GlassCard>
              </div>
            </GlassCard>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-24">
            {[
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Zero Drift",
                description: "Server-controlled playback ensures everyone sees the same frame at the same time.",
                color: "bg-pink-100",
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Instant Sync",
                description: "Late joiners are immediately synced to the current timestamp. No awkward catches up.",
                color: "bg-yellow-100",
              },
              {
                icon: <Play className="w-6 h-6" />,
                title: "Ad-Free",
                description: "Direct stream ingestion means no ads, no interruptions, no divergence.",
                color: "bg-pink-100",
              },
            ].map((feature, i) => (
              <GlassCard 
                key={feature.title} 
                hover 
                className="p-6 animate-fade-in"
                style={{ animationDelay: `${0.1 * (i + 1)}s` }}
              >
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4 text-foreground`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </GlassCard>
            ))}
          </div>

          {/* Join Section */}
          <div id="join-section" className="max-w-md mx-auto">
            <GlassCard className="p-8 text-center">
              <h2 className="text-2xl font-semibold mb-2">Join a Session</h2>
              <p className="text-muted-foreground mb-6">Enter the code shared by the host</p>
              
              <div className="space-y-4">
                <GlassInput
                  placeholder="Enter session code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="text-center text-lg tracking-widest uppercase"
                  maxLength={6}
                />
                <GlassButton 
                  className="w-full" 
                  onClick={handleJoinSession}
                  disabled={!joinCode.trim()}
                >
                  Join Session
                  <ArrowRight className="w-4 h-4" />
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-border/50">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>SyncWatch — Watch together, truly together.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
