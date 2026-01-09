import { Play, Users, Zap, Link2, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import { useAuth } from "@/lib/auth";

const Index = () => {
  const [joinCode, setJoinCode] = useState("");
  const navigate = useNavigate();
  const { token, logout, user } = useAuth();

  const initials = (user?.username || user?.email || "").trim().slice(0, 2).toUpperCase();

  const handleCreateSession = () => {
    navigate("/create");
  };

  const handleJoinSession = () => {
    if (joinCode.trim()) {
      navigate(`/room/${joinCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-mesh overflow-hidden relative">
      {/* Floating Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-64 h-64 bg-pink-300/20 dark:bg-pink-500/10 rounded-full blur-3xl float" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-yellow-200/20 dark:bg-yellow-500/10 rounded-full blur-3xl float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-pink-200/15 dark:bg-pink-500/8 rounded-full blur-3xl float" style={{ animationDelay: "4s" }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center glow-pink">
              <Play className="w-5 h-5 text-primary-foreground fill-current" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Watch-Along</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {token ? (
              <div className="flex items-center gap-3">
                <GlassButton variant="ghost" size="sm" onClick={logout}>
                  Sign Out
                </GlassButton>
                <div className="w-9 h-9 rounded-full overflow-hidden glass-panel-subtle flex items-center justify-center text-xs font-semibold">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{initials || "U"}</span>
                  )}
                </div>
              </div>
            ) : (
              <GlassButton variant="ghost" size="sm" onClick={() => navigate("/auth")}
              >
                Sign In
              </GlassButton>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 px-6 pt-16 pb-28 md:pt-20 md:pb-36">
        <div className="max-w-7xl mx-auto">
          {/* Hero Content */}
          <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 glass-panel-subtle px-4 py-2 rounded-full mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full pulse-glow" />
              <span className="text-sm text-muted-foreground">Same video. Same moment.</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Press play.{" "}
              <span className="text-gradient">Everyone’s already there.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Open Watch-Along, paste a YouTube link, share a code, and you’re watching together in seconds. No installs, no awkward "pause, wait" moments.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <GlassButton size="lg" onClick={handleCreateSession}>
                <Play className="w-5 h-5" />
                Start a Session
              </GlassButton>
              <GlassButton variant="outline" size="lg" onClick={() => document.getElementById('join-section')?.scrollIntoView({ behavior: 'smooth' })}>
                <Link2 className="w-5 h-5" />
                Join with Code
              </GlassButton>
            </div>
            <div className="text-sm text-muted-foreground">
              Join from any device, it’s all on the web.
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative max-w-6xl mx-auto mb-28 animate-scale-in" style={{ animationDelay: "0.2s" }}>
            <GlassCard className="p-6 overflow-hidden">
              <div className="relative">
                <div className="absolute -inset-10 rounded-[32px] blur-3xl opacity-30 dark:opacity-25 bg-gradient-to-r from-pink-500/20 via-yellow-500/15 to-pink-500/20" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent rounded-xl" />

                <div className="relative h-[460px] md:h-[520px] lg:h-[580px]">
                  {/* Laptop */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[52%] w-[96%] md:w-[78%]">
                    <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm p-3 shadow-2xl">
                      <div className="rounded-xl overflow-hidden bg-black/80">
                        <div className="relative aspect-video">
                          <img src={heroBg} alt="Same video, same moment" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3">
                            <div className="flex items-center gap-3">
                              <div className="flex -space-x-2">
                                {["A", "B", "C"].map((ch, i) => (
                                  <div
                                    key={ch}
                                    className="w-8 h-8 rounded-full border-2 border-black/40 flex items-center justify-center text-xs font-medium"
                                    style={{ backgroundColor: i === 1 ? "#FFD166" : "#FFB3C6" }}
                                    title={i === 0 ? "Laptop" : i === 1 ? "Tablet" : "Phone"}
                                  >
                                    {ch}
                                  </div>
                                ))}
                              </div>
                              <div className="flex-1">
                                <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                                  <div className="h-full w-2/3 bg-primary rounded-full" />
                                </div>
                              </div>
                              <span className="text-xs md:text-sm text-white/80">12:34 / 18:52</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tablet */}
                  <div className="absolute left-3 md:left-8 top-10 md:top-14 w-48 md:w-60 rotate-[-6deg]">
                    <div className="rounded-3xl border border-white/10 bg-black/20 backdrop-blur-sm p-3 shadow-xl">
                      <div className="rounded-2xl overflow-hidden bg-black/80">
                        <div className="relative aspect-[3/4]">
                          <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3">
                            <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                              <div className="h-full w-2/3 bg-primary rounded-full" />
                            </div>
                            <div className="mt-2 text-[11px] text-white/80">12:34 / 18:52</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="absolute right-3 md:right-8 top-20 md:top-24 w-36 md:w-44 rotate-[8deg]">
                    <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-sm p-3 shadow-xl">
                      <div className="rounded-[22px] overflow-hidden bg-black/80">
                        <div className="relative aspect-[9/19]">
                          <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3">
                            <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                              <div className="h-full w-2/3 bg-primary rounded-full" />
                            </div>
                            <div className="mt-2 text-[11px] text-white/80">12:34 / 18:52</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-24">
            {[
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Same moment",
                description: "Everyone stays on the same timestamp — no drifting apart mid-scene.",
                bgColor: "bg-pink-100 dark:bg-pink-500/20",
                iconColor: "text-pink-600 dark:text-pink-400",
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Catch up instantly",
                description: "Late joiners jump right to where everyone is — no “wait, pause” messages.",
                bgColor: "bg-yellow-100 dark:bg-yellow-500/20",
                iconColor: "text-yellow-600 dark:text-yellow-400",
              },
              {
                icon: <Play className="w-6 h-6" />,
                title: "No interruptions",
                description: "Just the video and your friends — keep the vibe, keep the moment.",
                bgColor: "bg-pink-100 dark:bg-pink-500/20",
                iconColor: "text-pink-600 dark:text-pink-400",
              },
            ].map((feature, i) => (
              <GlassCard 
                key={feature.title} 
                hover 
                className="p-6 animate-fade-in"
                style={{ animationDelay: `${0.1 * (i + 1)}s` }}
              >
                <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4 ${feature.iconColor}`}>
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
          <p>Watch-Along — press play, everyone’s already there.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
