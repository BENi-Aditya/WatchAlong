import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, Play, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";

const CreateSession = () => {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreateSession = async () => {
    if (!youtubeUrl.trim()) return;
    
    setIsCreating(true);
    
    // Simulate session creation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate a random session code
    const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/room/${sessionCode}`);
  };

  const isValidYoutubeUrl = (url: string) => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+/;
    return pattern.test(url);
  };

  return (
    <div className="min-h-screen bg-mesh overflow-hidden">
      {/* Floating Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-10 w-64 h-64 bg-pink-300/20 rounded-full blur-3xl float" />
        <div className="absolute bottom-40 left-20 w-96 h-96 bg-yellow-200/20 rounded-full blur-3xl float" style={{ animationDelay: "2s" }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
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
                <div className="animate-fade-in">
                  <label className="block text-sm font-medium mb-2">Preview</label>
                  <div className="aspect-video bg-muted rounded-xl overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-2 flex items-center justify-center">
                          <Play className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">Video ready to stream</p>
                      </div>
                    </div>
                  </div>
                </div>
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
