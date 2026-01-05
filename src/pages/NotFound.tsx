import { useNavigate } from "react-router-dom";
import { Home, AlertCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
      {/* Floating Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-pink-300/20 rounded-full blur-3xl float" />
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-yellow-200/20 rounded-full blur-3xl float" style={{ animationDelay: "2s" }} />
      </div>

      <GlassCard className="p-12 text-center max-w-md animate-scale-in">
        <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground" />
        </div>
        
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">
          This session doesn't exist or has ended
        </p>
        
        <GlassButton onClick={() => navigate("/")}>
          <Home className="w-4 h-4" />
          Back to Home
        </GlassButton>
      </GlassCard>
    </div>
  );
};

export default NotFound;
