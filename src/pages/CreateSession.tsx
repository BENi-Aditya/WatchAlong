import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, Play, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/components/ui/sonner";
import { nanoid } from "nanoid";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

function createJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const id = nanoid(10);
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    const idx = id.charCodeAt(i) % alphabet.length;
    code += alphabet[idx];
  }
  return code;
}

const CreateSession = () => {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreateSession = async () => {
    if (!youtubeUrl.trim()) return;
    if (!user?.id) {
      toast.error("Please sign in first");
      return;
    }
    
    setIsCreating(true);
    
    try {
      const youtubeUrlTrim = youtubeUrl.trim();
      const youtubeId = extractYoutubeId(youtubeUrlTrim);
      if (!youtubeId) {
        toast.error("Invalid YouTube URL");
        return;
      }

      let created: { id: string; join_code: string } | null = null;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const joinCode = createJoinCode();
        const { data, error } = await supabase
          .from("sessions")
          .insert({
            join_code: joinCode,
            host_user_id: user.id,
            youtube_url: youtubeUrlTrim,
            youtube_id: youtubeId,
            allow_participant_control: true,
          })
          .select("id, join_code")
          .single();

        if (!error && data) {
          created = data;
          break;
        }

        const isUniqueViolation = String((error as any)?.code || "") === "23505";
        if (!isUniqueViolation) {
          throw new Error(error?.message || "Failed to create session");
        }
      }

      if (!created) throw new Error("Failed to generate a unique join code");

      await supabase
        .from("session_playback")
        .insert({
          session_id: created.id,
          is_playing: false,
          position_sec: 0,
          rate: 1,
        });

      navigate(`/room/${created.join_code}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create session";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const isValidYoutubeUrl = (url: string) => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+/;
    return pattern.test(url);
  };

  const extractYoutubeId = (url: string) => {
    const raw = String(url || "").trim();
    if (!raw) return null;
    let id: string | null = null;
    try {
      const u = new URL(raw);
      if (u.hostname === "youtu.be") {
        id = u.pathname.replace("/", "");
      } else if (u.hostname.endsWith("youtube.com")) {
        if (u.pathname === "/watch") id = u.searchParams.get("v");
        if (!id && u.pathname.startsWith("/embed/")) id = u.pathname.split("/embed/")[1];
        if (!id && u.pathname.startsWith("/shorts/")) id = u.pathname.split("/shorts/")[1];
      }
    } catch {
      id = null;
    }
    const normalized = String(id || "").trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(normalized)) return normalized;
    return null;
  };

  return (
    <div className="min-h-screen bg-mesh overflow-hidden relative">
      {/* Floating Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 right-10 w-64 h-64 bg-pink-300/20 dark:bg-pink-500/10 rounded-full blur-3xl float" />
        <div className="absolute bottom-40 left-20 w-96 h-96 bg-yellow-200/20 dark:bg-yellow-500/10 rounded-full blur-3xl float" style={{ animationDelay: "2s" }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <ThemeToggle />
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 px-6 pt-12">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-6 flex items-center justify-center glow-pink">
              <Play className="w-8 h-8 text-primary-foreground fill-current" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Create a Session</h1>
            <p className="text-muted-foreground">
              Paste a YouTube link and invite your friends to watch together
            </p>
          </div>

          <GlassCard className="p-8 animate-scale-in" style={{ animationDelay: "0.1s" }}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">YouTube URL</label>
                <GlassInput
                  icon={<Link2 className="w-5 h-5" />}
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
                {youtubeUrl && !isValidYoutubeUrl(youtubeUrl) && (
                  <p className="text-sm text-destructive mt-2">
                    Please enter a valid YouTube URL
                  </p>
                )}
              </div>

              {/* Video Preview (placeholder) */}
              {isValidYoutubeUrl(youtubeUrl) && (
                (() => {
                  const youtubeId = extractYoutubeId(youtubeUrl);
                  const thumb = youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : null;
                  return (
                <div className="animate-fade-in">
                  <label className="block text-sm font-medium mb-2">Preview</label>
                  <div className="aspect-video bg-muted rounded-xl overflow-hidden relative">
                    {thumb ? (
                      <img src={thumb} alt="YouTube thumbnail" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-2 flex items-center justify-center">
                            <Play className="w-6 h-6 text-primary" />
                          </div>
                          <p className="text-sm text-muted-foreground">Video ready to play</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                  );
                })()
              )}

              <GlassButton 
                className="w-full" 
                size="lg"
                onClick={handleCreateSession}
                disabled={!isValidYoutubeUrl(youtubeUrl) || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Create & Start Watching
                  </>
                )}
              </GlassButton>
            </div>
          </GlassCard>

          <div className="mt-8 text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <p>A shareable link and code will be generated after creation</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateSession;
