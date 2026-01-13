import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Play, 
  Pause, 
  Plus,
  ListVideo,
  Volume2, 
  VolumeX, 
  Link2,
  Loader2,
  Maximize, 
  Video,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  PhoneOff,
  Minimize2,
  Pin,
  Smile,
  MessageCircle, 
  X, 
  Send,
  Reply,
  Users,
  Copy,
  Check,
  LogOut,
  Lock,
  Unlock
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface Message {
  id: string;
  userId: string;
  user: string;
  text: string;
  timestamp: string;
  color: string;
  replyTo?: {
    id: string;
    user: string;
    text: string;
  };
}

type Presence = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  status: string;
  updatedMs: number;
  isTyping?: boolean;
};

type PlaybackState = {
  isPlaying: boolean;
  positionSec: number;
  rate: number;
  serverTimeMs: number;
};

type SessionPermissions = {
  allowParticipantControl: boolean;
};

type PendingCommand = {
  action: "play" | "pause" | "seek";
  untilMs: number;
};

 type VideoSignalBase = {
   kind: "video";
   roomId: string;
   fromUserId: string;
   toUserId?: string;
   ts: number;
 };

 type VideoSignalInvite = VideoSignalBase & {
   type: "invite";
   fromUsername: string;
 };

 type VideoSignalJoin = VideoSignalBase & {
   type: "join";
   fromUsername: string;
 };

 type VideoSignalLeave = VideoSignalBase & {
   type: "leave";
 };

 type VideoSignalOffer = VideoSignalBase & {
   type: "offer";
   sdp: RTCSessionDescriptionInit;
 };

 type VideoSignalAnswer = VideoSignalBase & {
   type: "answer";
   sdp: RTCSessionDescriptionInit;
 };

 type VideoSignalIce = VideoSignalBase & {
   type: "ice";
   candidate: RTCIceCandidateInit;
 };

 type VideoSignal =
   | VideoSignalInvite
   | VideoSignalJoin
   | VideoSignalLeave
   | VideoSignalOffer
   | VideoSignalAnswer
   | VideoSignalIce;

const WatchRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showChat, setShowChat] = useState(true);
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [replyColumnsReady, setReplyColumnsReady] = useState(true);
  const [copied, setCopied] = useState(false);
  const [watchMoreOpen, setWatchMoreOpen] = useState(false);
  const [watchMoreMode, setWatchMoreMode] = useState<"video" | "playlist">("video");
  const [watchMoreUrl, setWatchMoreUrl] = useState("");
  const [watchMorePlaylistUrl, setWatchMorePlaylistUrl] = useState("");
  const [isSwitchingVideo, setIsSwitchingVideo] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [interactionRequired, setInteractionRequired] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubSec, setScrubSec] = useState<number>(0);
  const [ambientA, setAmbientA] = useState<string | null>(null);
  const [ambientB, setAmbientB] = useState<string | null>(null);

  const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [playlistIndex, setPlaylistIndex] = useState<number>(0);
  const [playlistVideoIds, setPlaylistVideoIds] = useState<string[]>([]);
  const [playlistPanelOpen, setPlaylistPanelOpen] = useState(false);
  const [playlistMetaById, setPlaylistMetaById] = useState<Record<string, { title?: string }>>({});
  const [presence, setPresence] = useState<Presence[]>([]);
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [permissions, setPermissions] = useState<SessionPermissions>({ allowParticipantControl: true });

   const [videoInviteOpen, setVideoInviteOpen] = useState(false);
   const [videoInviteFrom, setVideoInviteFrom] = useState<{ userId: string; username: string } | null>(null);
   const [inVideoCall, setInVideoCall] = useState(false);
   const [videoMinimized, setVideoMinimized] = useState(false);
   const [videoMicMuted, setVideoMicMuted] = useState(true);
   const [videoCamOff, setVideoCamOff] = useState(false);
   const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
   const [videoPanel, setVideoPanel] = useState<{ x: number; y: number; w: number; h: number }>(() => ({
     x: 24,
     y: 92,
     w: 520,
     h: 520,
   }));
   const [pipPanel, setPipPanel] = useState<{ x: number; y: number; w: number }>(() => ({ x: 12, y: 12, w: 180 }));
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastTypingSentMsRef = useRef<number>(0);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef(false);
  const loadedYoutubeIdRef = useRef<string | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const lastServerStateRef = useRef<PlaybackState | null>(null);
  const clockOffsetMsRef = useRef(0);
  const lastSeekMsRef = useRef(0);
  const userGestureRef = useRef(false);
  const pendingCommandRef = useRef<PendingCommand | null>(null);
  const hostUserIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const resolvedSessionIdRef = useRef<string | null>(null);
  const playlistIdRef = useRef<string | null>(null);
  const playlistIndexRef = useRef<number>(0);
  const playlistVideoIdsRef = useRef<string[]>([]);
  const playlistMetaByIdRef = useRef<Record<string, { title?: string }>>({});
  const autoAdvanceLockRef = useRef<number>(0);
  const autoAdvanceFromVideoIdRef = useRef<string | null>(null);
  const inVideoCallRef = useRef(false);
  const videoDragRef = useRef<{ active: boolean; startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const videoResizeRef = useRef<{ active: boolean; startX: number; startY: number; baseW: number; baseH: number } | null>(null);
  const pipAspectRef = useRef<number>(16 / 9);
  const pipDragRef = useRef<{ active: boolean; startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const pipResizeRef = useRef<{ active: boolean; startX: number; startY: number; baseW: number } | null>(null);
  const mainVideoWrapRef = useRef<HTMLDivElement | null>(null);
  const mainRemoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [durationSec, setDurationSec] = useState<number>(0);

   const localStreamRef = useRef<MediaStream | null>(null);
   const localAudioTrackRef = useRef<MediaStreamTrack | null>(null);
   const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
   const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
   const [remoteStreams, setRemoteStreams] = useState<Array<{ userId: string; stream: MediaStream }>>([]);
   const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const participants = presence.map((p) => ({
    key: `${p.userId}-${p.updatedMs}`,
    name: p.userId === user?.id ? `${p.username} (You)` : p.username,
    color: p.userId === hostUserId ? "#FFB3C6" : "#FFD166",
    isHost: p.userId === hostUserId,
  }));

  const typingUsers = presence
    .filter((p) => Boolean(p.isTyping) && p.userId !== user?.id)
    .map((p) => p.username)
    .slice(0, 3);

  const avatarByUserId = new Map(presence.map((p) => [p.userId, p.avatarUrl] as const));

  const attachStream = (el: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!el || !stream) return;
    if ((el as any).srcObject !== stream) (el as any).srcObject = stream;
  };

  const initialsFor = (name: string) => {
    const s = (name || "").trim();
    if (!s) return "U";
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
    return s.slice(0, 2).toUpperCase();
  };

  const formatClock12 = (value: string | null) => {
    const d = value ? new Date(value) : new Date();
    if (!Number.isFinite(d.getTime())) return "";
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${String(minutes).padStart(2, "0")} ${ampm}`;
  };

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  const isHost = Boolean(user?.id && hostUserId && user.id === hostUserId);
  const canControlPlayback = isHost || Boolean(permissions.allowParticipantControl);
  const canSendPlaybackCommands = canControlPlayback && wsConnected && hasSnapshot;

  const mainRemoteUserId = pinnedUserId || (remoteStreams[0]?.userId || null);
  const mainRemoteStream = mainRemoteUserId
    ? (remoteStreams.find((r) => r.userId === mainRemoteUserId)?.stream || null)
    : null;
  const otherRemoteStreams = mainRemoteUserId
    ? remoteStreams.filter((r) => r.userId !== mainRemoteUserId)
    : remoteStreams;
  const showGridLayout = remoteStreams.length >= 2 && !pinnedUserId;

   useEffect(() => {
     userIdRef.current = user?.id || null;
   }, [user?.id]);

   const updateRemoteStreamsState = () => {
     const list = Array.from(remoteStreamsRef.current.entries()).map(([userId, stream]) => ({ userId, stream }));
     setRemoteStreams(list);
   };

   const getIceServers = () => {
     return [
       { urls: "stun:stun.l.google.com:19302" },
       { urls: "stun:stun1.l.google.com:19302" },
     ];
   };

   const sendVideoSignal = async (signal: VideoSignal) => {
     const channel = channelRef.current;
     if (!channel) return;
     try {
       await channel.send({ type: "broadcast", event: "video", payload: signal });
     } catch {
     }
   };

   const ensureLocalVideoStream = async () => {
     const existing = localStreamRef.current;
     if (existing && existing.getVideoTracks().length) return existing;
     const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
     localStreamRef.current = stream;
     return stream;
   };

   const ensureLocalAudioTrack = async () => {
     if (localAudioTrackRef.current) return localAudioTrackRef.current;
     const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
     const track = stream.getAudioTracks()[0] || null;
     if (!track) return null;
     localAudioTrackRef.current = track;
     return track;
   };

   const replaceOutgoingAudioTrack = async (next: MediaStreamTrack | null) => {
     for (const pc of peerConnectionsRef.current.values()) {
       try {
         for (const t of pc.getTransceivers()) {
           if (t.receiver?.track?.kind === "audio") {
             await t.sender.replaceTrack(next);
           }
         }
       } catch {
       }
     }
   };

   const stopLocalAudio = async () => {
     const t = localAudioTrackRef.current;
     localAudioTrackRef.current = null;
     await replaceOutgoingAudioTrack(null);
     if (t) {
       try {
         t.stop();
       } catch {
       }
     }
   };

   useEffect(() => {
     if (!inVideoCallRef.current) return;
     if (videoMicMuted) {
       void stopLocalAudio();
       return;
     }
     void (async () => {
       const t = await ensureLocalAudioTrack();
       if (!t) return;
       await replaceOutgoingAudioTrack(t);
     })();
   }, [videoMicMuted]);

   useEffect(() => {
     const stream = localStreamRef.current;
     if (!stream) return;
     for (const t of stream.getVideoTracks()) t.enabled = !videoCamOff;
   }, [videoCamOff]);

   const closePeer = (peerUserId: string) => {
     const pc = peerConnectionsRef.current.get(peerUserId);
     peerConnectionsRef.current.delete(peerUserId);
     if (pc) {
       try {
         pc.ontrack = null;
         pc.onicecandidate = null;
         pc.onconnectionstatechange = null;
         pc.close();
       } catch {
       }
     }
     remoteStreamsRef.current.delete(peerUserId);
     updateRemoteStreamsState();
   };

   const createPeerConnection = async (peerUserId: string) => {
     const existing = peerConnectionsRef.current.get(peerUserId);
     if (existing) return existing;

     const pc = new RTCPeerConnection({ iceServers: getIceServers() });
     peerConnectionsRef.current.set(peerUserId, pc);

     try {
       pc.addTransceiver("audio", { direction: "sendrecv" });
     } catch {
     }

     const local = await ensureLocalVideoStream();
     for (const track of local.getVideoTracks()) {
       try {
         pc.addTrack(track, local);
       } catch {
       }
     }

     pc.onicecandidate = (e) => {
       const candidate = e.candidate;
       if (!candidate) return;
       const roomId = resolvedSessionIdRef.current;
       const fromUserId = userIdRef.current;
       if (!roomId || !fromUserId) return;
       void sendVideoSignal({
         kind: "video",
         type: "ice",
         roomId,
         fromUserId,
         toUserId: peerUserId,
         candidate: candidate.toJSON(),
         ts: Date.now(),
       });
     };

     pc.ontrack = (e) => {
       const stream = e.streams?.[0];
       if (!stream) return;
       remoteStreamsRef.current.set(peerUserId, stream);
       updateRemoteStreamsState();
     };

     pc.onconnectionstatechange = () => {
       const state = pc.connectionState;
       if (state === "failed" || state === "closed" || state === "disconnected") {
         closePeer(peerUserId);
       }
     };

     return pc;
   };

   const startCallForMe = async () => {
     if (inVideoCallRef.current) return;
     if (!resolvedSessionIdRef.current) return;
     if (!user?.id) return;

     try {
       await ensureLocalVideoStream();
       setInVideoCall(true);
       setVideoMinimized(false);
       setVideoMicMuted(true);
       setVideoCamOff(false);
       await stopLocalAudio();

       const roomId = resolvedSessionIdRef.current;
       await sendVideoSignal({
         kind: "video",
         type: "join",
         roomId,
         fromUserId: user.id,
         fromUsername: user.username,
         ts: Date.now(),
       });
     } catch (e: any) {
       toast.error(e?.message ? String(e.message) : "Unable to start video");
       setInVideoCall(false);
     }
   };

   const leaveCallForMe = async () => {
     setInVideoCall(false);
     setVideoInviteOpen(false);
     setVideoInviteFrom(null);
     setPinnedUserId(null);

     const roomId = resolvedSessionIdRef.current;
     const fromUserId = userIdRef.current;
     if (roomId && fromUserId) {
       void sendVideoSignal({ kind: "video", type: "leave", roomId, fromUserId, ts: Date.now() });
     }

     for (const peerUserId of Array.from(peerConnectionsRef.current.keys())) {
       closePeer(peerUserId);
     }

     void stopLocalAudio();

     const stream = localStreamRef.current;
     localStreamRef.current = null;
     if (stream) {
       for (const t of stream.getTracks()) {
         try {
           t.stop();
         } catch {
         }
       }
     }
   };

   const inviteRoomToVideo = async () => {
     if (!resolvedSessionIdRef.current) return;
     if (!user?.id) return;
     await sendVideoSignal({
       kind: "video",
       type: "invite",
       roomId: resolvedSessionIdRef.current,
       fromUserId: user.id,
       fromUsername: user.username,
       ts: Date.now(),
     });
     void startCallForMe();
   };

  const activePlaylistIndex = Number.isFinite(playlistIndex) ? playlistIndex : 0;
  const activePlaylistVideoId = playlistVideoIds[activePlaylistIndex] || null;

  useEffect(() => {
    resolvedSessionIdRef.current = resolvedSessionId;
  }, [resolvedSessionId]);

  useEffect(() => {
    playlistIdRef.current = playlistId;
  }, [playlistId]);

  useEffect(() => {
    playlistIndexRef.current = Number.isFinite(playlistIndex) ? playlistIndex : 0;
  }, [playlistIndex]);

  useEffect(() => {
    playlistVideoIdsRef.current = Array.isArray(playlistVideoIds) ? playlistVideoIds : [];
  }, [playlistVideoIds]);

  useEffect(() => {
    playlistMetaByIdRef.current = playlistMetaById;
  }, [playlistMetaById]);

  useEffect(() => {
    if (!playlistVideoIds.length) return;

    let cancelled = false;
    const ids = playlistVideoIds.slice(0, 50);
    const existing = playlistMetaByIdRef.current;
    const missing = ids.filter((id) => !existing[id]?.title);
    if (!missing.length) return;

    void (async () => {
      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              const res = await fetch(
                `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`
              );
              if (!res.ok) return [id, undefined] as const;
              const json: any = await res.json();
              const title = json?.title ? String(json.title) : undefined;
              return [id, title] as const;
            } catch {
              return [id, undefined] as const;
            }
          })
        );

        if (cancelled) return;
        setPlaylistMetaById((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const [id, title] of results) {
            if (!title) continue;
            if (next[id]?.title === title) continue;
            changed = true;
            next[id] = { ...(next[id] || {}), title };
          }
          return changed ? next : prev;
        });
      } catch {
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playlistVideoIds]);

  const isTypingTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if ((el as any).isContentEditable) return true;
    return false;
  };

  const toggleFullscreen = async () => {
    const el = videoContainerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
    }
  };

  useEffect(() => {
    hostUserIdRef.current = hostUserId;
  }, [hostUserId]);

  useEffect(() => {
    userIdRef.current = user?.id || null;
  }, [user?.id]);

  useEffect(() => {
    inVideoCallRef.current = inVideoCall;
  }, [inVideoCall]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const expectedPositionNow = (state: PlaybackState) => {
    if (!state.isPlaying) return state.positionSec;
    const serverNowMs = Date.now() + clockOffsetMsRef.current;
    const elapsed = (serverNowMs - state.serverTimeMs) / 1000;
    return state.positionSec + elapsed * (state.rate || 1);
  };

  const reconcileToServer = (state: PlaybackState) => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current || !window.YT) return;

    const pending = pendingCommandRef.current;
    const nowLocalMs = Date.now();
    if (pending && pending.untilMs <= nowLocalMs) {
      pendingCommandRef.current = null;
    }

    const duration = Number(player.getDuration?.());
    const rawTarget = expectedPositionNow(state);
    const target = Number.isFinite(duration) && duration > 0
      ? Math.max(0, Math.min(duration, rawTarget))
      : rawTarget;
    const current = Number.isFinite(player.getCurrentTime?.()) ? Number(player.getCurrentTime()) : 0;
    const drift = target - current;

    const playerState = Number(player.getPlayerState?.());
    const YTState = window.YT?.PlayerState;
    const isPausedLike = playerState === YTState?.PAUSED || playerState === YTState?.ENDED;
    const isPlayingLike = playerState === YTState?.PLAYING;
    const isBufferingLike = playerState === YTState?.BUFFERING;
    const isUnstartedLike = playerState === YTState?.UNSTARTED || playerState === YTState?.CUED;

    if (pendingCommandRef.current?.action === "play" && !state.isPlaying) {
      return;
    }

    if (pendingCommandRef.current?.action === "pause" && state.isPlaying) {
      return;
    }

    const now = Date.now();
    const canSeekNow = now - lastSeekMsRef.current > 900;
    const seekTo = (sec: number) => {
      if (!canSeekNow) return;
      lastSeekMsRef.current = Date.now();
      player.seekTo?.(Math.max(0, sec), true);
    };

    const supportedRates: number[] = Array.isArray(player.getAvailablePlaybackRates?.())
      ? (player.getAvailablePlaybackRates() as number[])
      : [];
    const canRateAdjust = supportedRates.includes(0.95) && supportedRates.includes(1.05);
    const setRate = (rate: number) => {
      if (!canRateAdjust) return;
      player.setPlaybackRate?.(rate);
    };

    if (
      playerState === YTState?.ENDED &&
      state.isPlaying &&
      Number.isFinite(duration) &&
      duration > 0 &&
      target >= duration - 0.25
    ) {
      setRate(1);
      return;
    }

    const seekThreshold = canRateAdjust ? 0.6 : 1.2;
    const hardSeekThreshold = canRateAdjust ? 2.5 : 4.0;

    if (!state.isPlaying) {
      if (!isPausedLike) player.pauseVideo?.();
      if (Math.abs(drift) > 0.35) {
        seekTo(target);
      }
      setRate(1);
      setInteractionRequired(false);
      return;
    }

    if (!isPlayingLike && !isBufferingLike) player.playVideo?.();

    if (!userGestureRef.current && !isPlayingLike && !isBufferingLike) {
      setInteractionRequired(true);
    } else {
      setInteractionRequired(false);
    }

    if (Math.abs(drift) > hardSeekThreshold) {
      seekTo(target);
      setRate(1);
      return;
    }

    if (!isBufferingLike && !isUnstartedLike && Math.abs(drift) > seekThreshold) {
      seekTo(target);
      setRate(1);
      return;
    }

    if (!isBufferingLike && canRateAdjust && Math.abs(drift) > 0.15) {
      setRate(drift > 0 ? 1.05 : 0.95);
      return;
    }

    setRate(1);
  };

  useEffect(() => {
    const run = async () => {
      if (!sessionId) return;
      try {
        const codeRaw = String(sessionId || "").trim();
        const codeUpper = codeRaw.toUpperCase();

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeRaw);

        const baseSelect = "id, join_code, youtube_id, host_user_id, allow_participant_control";
        const selectWithPlaylist = `${baseSelect}, playlist_id, playlist_index, playlist_video_ids`;

        let sessionRow: any = null;
        let sessionErr: any = null;

        const firstQuery = supabase.from("sessions").select(selectWithPlaylist);
        const first = await (isUuid
          ? firstQuery.eq("id", codeRaw)
          : firstQuery.eq("join_code", codeUpper)
        ).maybeSingle();

        sessionRow = first.data;
        sessionErr = first.error;

        if (sessionErr) {
          const msg = sessionErr.message || "";
          const looksLikeMissingPlaylistCols = /playlist_id|playlist_index|playlist_video_ids|schema cache|does not exist/i.test(msg);
          if (!looksLikeMissingPlaylistCols) throw new Error(sessionErr.message);

          const fallbackQuery = supabase.from("sessions").select(baseSelect);
          const fallback = await (isUuid
            ? fallbackQuery.eq("id", codeRaw)
            : fallbackQuery.eq("join_code", codeUpper)
          ).maybeSingle();

          if (fallback.error) throw new Error(fallback.error.message);
          sessionRow = fallback.data;
        }

        if (!sessionRow) throw new Error("Session not found");

        setResolvedSessionId(sessionRow.id);
        setJoinCode(sessionRow.join_code);
        setYoutubeId(sessionRow.youtube_id);
        setHostUserId(sessionRow.host_user_id);
        setPermissions({ allowParticipantControl: Boolean(sessionRow.allow_participant_control) });

        const nextPlaylistId = sessionRow.playlist_id ? String(sessionRow.playlist_id) : null;
        const nextPlaylistIndex = Number(sessionRow.playlist_index || 0);
        let nextPlaylistVideoIds: string[] = [];
        const rawIds = sessionRow.playlist_video_ids;
        if (Array.isArray(rawIds)) {
          nextPlaylistVideoIds = rawIds.map((v: any) => String(v)).filter(Boolean);
        } else if (typeof rawIds === "string") {
          try {
            const parsed = JSON.parse(rawIds);
            if (Array.isArray(parsed)) nextPlaylistVideoIds = parsed.map((v: any) => String(v)).filter(Boolean);
          } catch {
          }
        }

        setPlaylistId(nextPlaylistId);
        setPlaylistIndex(Number.isFinite(nextPlaylistIndex) ? nextPlaylistIndex : 0);
        setPlaylistVideoIds(nextPlaylistVideoIds);
        setPlaylistPanelOpen(Boolean(nextPlaylistId));

        const { data: playbackRow, error: playbackErr } = await supabase
          .from("session_playback")
          .select("is_playing, position_sec, rate, server_time")
          .eq("session_id", sessionRow.id)
          .maybeSingle();

        if (playbackErr) throw new Error(playbackErr.message);
        if (playbackRow) {
          const serverTimeMs = new Date(String(playbackRow.server_time)).getTime();
          const p: PlaybackState = {
            isPlaying: Boolean(playbackRow.is_playing),
            positionSec: Number(playbackRow.position_sec || 0),
            rate: Number(playbackRow.rate || 1),
            serverTimeMs: Number.isFinite(serverTimeMs) ? serverTimeMs : Date.now(),
          };
          setPlayback(p);
          lastServerStateRef.current = p;
          setIsPlaying(Boolean(p.isPlaying));
          setHasSnapshot(true);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to join session";
        toast.error(message);
        navigate("/");
      }
    };

    void run();
  }, [sessionId, navigate]);

  useEffect(() => {
    const run = async () => {
      if (!resolvedSessionId) return;
      const selectBase = "id, user_id, username, text, video_time_sec, created_at";
      const selectWithReply = `${selectBase}, reply_to_id, reply_to_username, reply_to_text`;

      let data: any[] | null = null;

      const first = await supabase
        .from("session_messages")
        .select(selectWithReply)
        .eq("session_id", resolvedSessionId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (first.error) {
        const msg = first.error.message || "";
        const looksLikeMissingReplyCols = /reply_to_id|schema cache|does not exist/i.test(msg);
        if (!looksLikeMissingReplyCols) {
          toast.error(first.error.message);
          return;
        }
        setReplyColumnsReady(false);
        const fallback = await supabase
          .from("session_messages")
          .select(selectBase)
          .eq("session_id", resolvedSessionId)
          .order("created_at", { ascending: true })
          .limit(200);
        if (fallback.error) {
          toast.error(fallback.error.message);
          return;
        }
        data = fallback.data as any[];
      } else {
        data = first.data as any[];
      }

      const list: Message[] = (data || []).map((row: any) => {
        const ts = formatClock12(row.created_at ? String(row.created_at) : null);
        const name = String(row.username || "Unknown");
        const color = String(row.user_id) === hostUserIdRef.current ? "#FFB3C6" : "#FFD166";
        const replyId = row.reply_to_id ? String(row.reply_to_id) : null;
        const replyUser = row.reply_to_username ? String(row.reply_to_username) : null;
        const replyText = row.reply_to_text ? String(row.reply_to_text) : null;
        return {
          id: String(row.id || `${row.created_at || ""}-${name}`),
          userId: String(row.user_id || ""),
          user: name,
          text: String(row.text || ""),
          timestamp: ts,
          color,
          replyTo: replyId && replyUser && replyText ? { id: replyId, user: replyUser, text: replyText } : undefined,
        };
      });
      setMessages(list);
    };

    void run();
  }, [resolvedSessionId]);

  useEffect(() => {
    if (!youtubeId) return;
    if (!playerHostRef.current) return;

    const host = playerHostRef.current;

    const ensureScript = () => {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (existing) return;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    };

    const createPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player(host, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            playerReadyRef.current = true;
            loadedYoutubeIdRef.current = youtubeId;
            try {
              if (isMuted) playerRef.current?.mute?.();
              else playerRef.current?.unMute?.();
            } catch {
            }
            const d = Number(playerRef.current?.getDuration?.());
            if (Number.isFinite(d) && d > 0) setDurationSec(d);
            const st = lastServerStateRef.current;
            if (st) reconcileToServer(st);
          },
          onStateChange: (event: any) => {
            const d = Number(playerRef.current?.getDuration?.());
            if (Number.isFinite(d) && d > 0) setDurationSec(d);

            const st = Number(event?.data);
            if (st === window.YT?.PlayerState?.ENDED) {
              const sid = resolvedSessionIdRef.current;
              if (!sid) return;
              const uid = userIdRef.current;
              if (!uid) return;
              if (!hostUserIdRef.current || hostUserIdRef.current !== uid) return;

              const pid = playlistIdRef.current;
              const ids = playlistVideoIdsRef.current;
              if (!pid || !ids.length) return;

              const fromVideoId = loadedYoutubeIdRef.current;
              if (fromVideoId && autoAdvanceFromVideoIdRef.current === fromVideoId) return;

              const now = Date.now();
              if (now - autoAdvanceLockRef.current < 3500) return;
              autoAdvanceLockRef.current = now;

              const idxFromId = fromVideoId ? ids.indexOf(fromVideoId) : -1;
              const idx = idxFromId >= 0
                ? idxFromId
                : (Number.isFinite(playlistIndexRef.current) ? playlistIndexRef.current : 0);
              const nextIdx = idx + 1;
              if (nextIdx >= ids.length) {
                void (async () => {
                  const { error } = await supabase
                    .from("session_playback")
                    .update({ is_playing: false })
                    .eq("session_id", sid);
                  if (error) toast.error(error.message);
                })();
                return;
              }

              const nextId = ids[nextIdx];
              if (!nextId) return;
              if (fromVideoId) autoAdvanceFromVideoIdRef.current = fromVideoId;
              void (async () => {
                const { error: sessionErr } = await supabase
                  .from("sessions")
                  .update({ playlist_index: nextIdx, youtube_id: nextId })
                  .eq("id", sid);
                if (sessionErr) {
                  toast.error(sessionErr.message);
                  return;
                }
                const { error: playbackErr } = await supabase
                  .from("session_playback")
                  .update({ is_playing: true, position_sec: 0, rate: 1 })
                  .eq("session_id", sid);
                if (playbackErr) toast.error(playbackErr.message);
              })();
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      createPlayer();
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      createPlayer();
    };

    ensureScript();
  }, [youtubeId, isMuted]);

  useEffect(() => {
    if (!youtubeId) return;
    const player = playerRef.current;
    if (!player || !playerReadyRef.current) return;
    if (loadedYoutubeIdRef.current === youtubeId) return;

    try {
      player.loadVideoById?.(youtubeId, 0);
    } catch {
    }
    loadedYoutubeIdRef.current = youtubeId;
    autoAdvanceFromVideoIdRef.current = null;
    setDurationSec(0);
    setProgress(0);
    setIsScrubbing(false);
    setScrubSec(0);
  }, [youtubeId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const key = e.key;
      if (key === " " || key.toLowerCase() === "k") {
        e.preventDefault();
        if (!canSendPlaybackCommands) return;
        if (isPlaying) sendPlaybackCommand("pause");
        else sendPlaybackCommand("play");
        return;
      }

      if (key.toLowerCase() === "j" || key === "ArrowLeft") {
        e.preventDefault();
        if (!canSendPlaybackCommands) return;
        seekRelative(-10);
        return;
      }

      if (key.toLowerCase() === "l" || key === "ArrowRight") {
        e.preventDefault();
        if (!canSendPlaybackCommands) return;
        seekRelative(10);
        return;
      }

      if (key.toLowerCase() === "f") {
        e.preventDefault();
        void toggleFullscreen();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [canSendPlaybackCommands, isPlaying, durationSec]);

  useEffect(() => {
    if (!youtubeId) return;
    const url = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = 64;
        const h = 36;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        const avgInRegion = (x0: number, y0: number, x1: number, y1: number) => {
          let r = 0;
          let g = 0;
          let b = 0;
          let n = 0;
          for (let y = y0; y < y1; y += 1) {
            for (let x = x0; x < x1; x += 1) {
              const idx = (y * w + x) * 4;
              const rr = data[idx];
              const gg = data[idx + 1];
              const bb = data[idx + 2];
              const lum = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
              if (lum < 8) continue;
              r += rr;
              g += gg;
              b += bb;
              n += 1;
            }
          }
          if (!n) return { r: 255, g: 105, b: 180 };
          return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
        };

        const a = avgInRegion(0, 0, Math.floor(w / 2), h);
        const b = avgInRegion(Math.floor(w / 2), 0, w, h);
        setAmbientA(`rgb(${a.r}, ${a.g}, ${a.b})`);
        setAmbientB(`rgb(${b.r}, ${b.g}, ${b.b})`);
      } catch {
        setAmbientA(null);
        setAmbientB(null);
      }
    };
    img.onerror = () => {
      setAmbientA(null);
      setAmbientB(null);
    };
  }, [youtubeId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current) return;
    try {
      if (isMuted) player.mute?.();
      else player.unMute?.();
    } catch {
    }
  }, [isMuted]);

  useEffect(() => {
    if (!resolvedSessionId) return;
    if (!user?.id) return;

    const toPresenceList = (channel: RealtimeChannel) => {
      const state = channel.presenceState() as Record<string, any[]>;
      const list: Presence[] = [];
      for (const key of Object.keys(state)) {
        const entries = state[key] || [];
        for (const item of entries) {
          list.push({
            userId: String(item.userId || key),
            username: String(item.username || "Unknown"),
            avatarUrl: (item.avatarUrl as string | null) || null,
            status: String(item.status || "in_room"),
            updatedMs: Number(item.updatedMs || Date.now()),
            isTyping: Boolean(item.isTyping),
          });
        }
      }
      return list;
    };

    const channel = supabase.channel(`room:${resolvedSessionId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => setPresence(toPresenceList(channel)));
    channel.on("presence", { event: "join" }, () => setPresence(toPresenceList(channel)));
    channel.on("presence", { event: "leave" }, () => setPresence(toPresenceList(channel)));

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "session_playback", filter: `session_id=eq.${resolvedSessionId}` },
      (payload) => {
        const row: any = (payload as any)?.new;
        if (!row) return;

        const serverTimeMs = new Date(String(row.server_time)).getTime();
        const safeServerTimeMs = Number.isFinite(serverTimeMs) ? serverTimeMs : Date.now();
        const estimate = safeServerTimeMs - Date.now();
        clockOffsetMsRef.current = clockOffsetMsRef.current * 0.9 + estimate * 0.1;

        const p: PlaybackState = {
          isPlaying: Boolean(row.is_playing),
          positionSec: Number(row.position_sec || 0),
          rate: Number(row.rate || 1),
          serverTimeMs: safeServerTimeMs,
        };

        setPlayback(p);
        lastServerStateRef.current = p;
        setIsPlaying(Boolean(p.isPlaying));
        setHasSnapshot(true);

        const pending = pendingCommandRef.current;
        if (pending && ((pending.action === "play" && p.isPlaying) || (pending.action === "pause" && !p.isPlaying))) {
          pendingCommandRef.current = null;
        }
        reconcileToServer(p);
      }
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${resolvedSessionId}` },
      (payload) => {
        const row: any = (payload as any)?.new;
        if (!row) return;
        if (row.join_code) setJoinCode(String(row.join_code));
        if (row.youtube_id) setYoutubeId(String(row.youtube_id));
        if (row.host_user_id) setHostUserId(String(row.host_user_id));
        if (row.playlist_id !== undefined) {
          const nextId = row.playlist_id ? String(row.playlist_id) : null;
          setPlaylistId(nextId);
          setPlaylistPanelOpen(Boolean(nextId));
        }
        if (row.playlist_index !== undefined) {
          const idx = Number(row.playlist_index || 0);
          setPlaylistIndex(Number.isFinite(idx) ? idx : 0);
        }
        if (row.playlist_video_ids !== undefined) {
          const raw = row.playlist_video_ids;
          if (Array.isArray(raw)) {
            setPlaylistVideoIds(raw.map((v: any) => String(v)).filter(Boolean));
          } else if (typeof raw === "string") {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) setPlaylistVideoIds(parsed.map((v: any) => String(v)).filter(Boolean));
            } catch {
            }
          }
        }
        if (row.allow_participant_control !== undefined) {
          setPermissions({ allowParticipantControl: Boolean(row.allow_participant_control) });
        }
      }
    );

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "session_messages", filter: `session_id=eq.${resolvedSessionId}` },
      (payload) => {
        const row: any = (payload as any)?.new;
        if (!row) return;
        const ts = formatClock12(row.created_at ? String(row.created_at) : null);
        const name = String(row.username || "Unknown");
        const color = String(row.user_id) === hostUserIdRef.current ? "#FFB3C6" : "#FFD166";
        const replyId = row.reply_to_id ? String(row.reply_to_id) : null;
        const replyUser = row.reply_to_username ? String(row.reply_to_username) : null;
        const replyText = row.reply_to_text ? String(row.reply_to_text) : null;
        const newMessage: Message = {
          id: String(row.id || Date.now()),
          userId: String(row.user_id || ""),
          user: name,
          text: String(row.text || ""),
          timestamp: ts,
          color,
          replyTo: replyId && replyUser && replyText ? { id: replyId, user: replyUser, text: replyText } : undefined,
        };
        setMessages((prev) => [...prev, newMessage]);
      }
    );

    channel.on("broadcast", { event: "video" }, async ({ payload }) => {
      const msg = payload as VideoSignal;
      if (!msg || (msg as any).kind !== "video") return;
      if (msg.roomId !== resolvedSessionIdRef.current) return;
      const me = userIdRef.current;
      if (!me) return;
      if (msg.fromUserId === me) return;
      if (msg.toUserId && msg.toUserId !== me) return;

      if (msg.type === "invite") {
        if (inVideoCallRef.current) return;
        setVideoInviteFrom({ userId: msg.fromUserId, username: msg.fromUsername });
        setVideoInviteOpen(true);
        return;
      }

      if (msg.type === "leave") {
        closePeer(msg.fromUserId);
        return;
      }

      if (msg.type === "join") {
        if (!inVideoCallRef.current) return;
        const peerId = msg.fromUserId;
        const shouldInitiate = String(me) < String(peerId);
        if (!shouldInitiate) return;
        const pc = await createPeerConnection(peerId);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          const roomId = resolvedSessionIdRef.current;
          const fromUserId = userIdRef.current;
          if (!roomId || !fromUserId) return;
          await sendVideoSignal({
            kind: "video",
            type: "offer",
            roomId,
            fromUserId,
            toUserId: peerId,
            sdp: offer,
            ts: Date.now(),
          });
        } catch {
        }
        return;
      }

      if (msg.type === "offer") {
        if (!inVideoCallRef.current) return;
        const peerId = msg.fromUserId;
        const pc = await createPeerConnection(peerId);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          const roomId = resolvedSessionIdRef.current;
          const fromUserId = userIdRef.current;
          if (!roomId || !fromUserId) return;
          await sendVideoSignal({
            kind: "video",
            type: "answer",
            roomId,
            fromUserId,
            toUserId: peerId,
            sdp: answer,
            ts: Date.now(),
          });
        } catch {
        }
        return;
      }

      if (msg.type === "answer") {
        if (!inVideoCallRef.current) return;
        const peerId = msg.fromUserId;
        const pc = peerConnectionsRef.current.get(peerId);
        if (!pc) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        } catch {
        }
        return;
      }

      if (msg.type === "ice") {
        if (!inVideoCallRef.current) return;
        const peerId = msg.fromUserId;
        const pc = peerConnectionsRef.current.get(peerId);
        if (!pc) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch {
        }
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setWsConnected(true);
        await channel.track({
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          status: "in_room",
          updatedMs: Date.now(),
          isTyping: false,
        });
      }
    });

    return () => {
      setWsConnected(false);
      channelRef.current = null;
      void leaveCallForMe();
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [resolvedSessionId, user?.id, user?.username, user?.avatarUrl]);

   useEffect(() => {
     const el = localVideoRef.current;
     const stream = localStreamRef.current;
     if (!el || !stream) return;
     if ((el as any).srcObject !== stream) {
       (el as any).srcObject = stream;
     }
   }, [inVideoCall]);

  useEffect(() => {
    if (!inVideoCall) return;
    const onMove = (e: PointerEvent) => {
      const d = videoDragRef.current;
      if (d?.active) {
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        setVideoPanel((prev) => ({ ...prev, x: d.baseX + dx, y: d.baseY + dy }));
      }
      const r = videoResizeRef.current;
      if (r?.active) {
        const dx = e.clientX - r.startX;
        const dy = e.clientY - r.startY;
        let w = Math.max(260, r.baseW + dx);
        let h = Math.max(180, r.baseH + dy);

        const el = mainRemoteVideoRef.current;
        const targetAspect = el && el.videoWidth > 0 && el.videoHeight > 0 ? el.videoWidth / el.videoHeight : null;
        if (targetAspect) {
          const aspect = w / h;
          const relDiff = Math.abs(aspect - targetAspect) / targetAspect;
          if (relDiff < 0.06) {
            if (Math.abs(dx) >= Math.abs(dy)) {
              h = Math.max(180, Math.round(w / targetAspect));
            } else {
              w = Math.max(260, Math.round(h * targetAspect));
            }
          }
        }

        setVideoPanel((prev) => ({
          ...prev,
          w,
          h,
        }));
      }

      const pd = pipDragRef.current;
      if (pd?.active) {
        const wrap = mainVideoWrapRef.current;
        if (wrap) {
          const rect = wrap.getBoundingClientRect();
          const pad = 10;
          const dx = e.clientX - pd.startX;
          const dy = e.clientY - pd.startY;
          setPipPanel((prev) => {
            const pipW = prev.w;
            const pipH = pipW / pipAspectRef.current;
            const maxX = Math.max(pad, rect.width - pipW - pad);
            const maxY = Math.max(pad, rect.height - pipH - pad);
            return {
              ...prev,
              x: Math.max(pad, Math.min(maxX, pd.baseX + dx)),
              y: Math.max(pad, Math.min(maxY, pd.baseY + dy)),
            };
          });
        }
      }

      const pr = pipResizeRef.current;
      if (pr?.active) {
        const wrap = mainVideoWrapRef.current;
        if (wrap) {
          const rect = wrap.getBoundingClientRect();
          const pad = 10;
          const dx = e.clientX - pr.startX;
          setPipPanel((prev) => {
            const aspect = pipAspectRef.current;
            const minW = 120;
            const maxWByX = Math.max(minW, rect.width - prev.x - pad);
            const maxWByY = Math.max(minW, (rect.height - prev.y - pad) * aspect);
            const maxW = Math.max(minW, Math.min(maxWByX, maxWByY));
            const nextW = Math.max(minW, Math.min(maxW, pr.baseW + dx));
            return { ...prev, w: nextW };
          });
        }
      }
    };
    const onUp = () => {
      if (videoDragRef.current) videoDragRef.current = { ...videoDragRef.current, active: false };
      if (videoResizeRef.current) videoResizeRef.current = { ...videoResizeRef.current, active: false };
      if (pipDragRef.current) pipDragRef.current = { ...pipDragRef.current, active: false };
      if (pipResizeRef.current) pipResizeRef.current = { ...pipResizeRef.current, active: false };
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [inVideoCall]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || !playerReadyRef.current) return;
      const cur = Number(player.getCurrentTime?.());
      const dur = Number(player.getDuration?.());
      if (Number.isFinite(dur) && dur > 0) {
        setDurationSec(dur);
        const pct = Number.isFinite(cur) ? (cur / dur) * 100 : 0;
        setProgress(Math.max(0, Math.min(100, pct)));
      }
    }, 250);

    return () => {
      window.clearInterval(id);
    };
  }, [youtubeId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const st = lastServerStateRef.current;
      if (!st) return;
      reconcileToServer(st);
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, []);

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

    if (!resolvedSessionId) return;
    if (!user?.id) return;

    const st = lastServerStateRef.current;
    const videoTimeSec = st ? expectedPositionNow(st) : 0;

    const text = message.trim();
    void (async () => {
      const insertRow: Record<string, any> = {
        session_id: resolvedSessionId,
        user_id: user.id,
        username: user.username,
        text,
        video_time_sec: videoTimeSec,
      };

      if (replyColumnsReady && replyTo) {
        insertRow.reply_to_id = replyTo.id;
        insertRow.reply_to_username = replyTo.user;
        insertRow.reply_to_text = replyTo.text;
      }

      const { error } = await supabase.from("session_messages").insert(insertRow);
      if (error) {
        const msg = error.message || "";
        const looksLikeMissingReplyCols = /reply_to_id|schema cache|does not exist/i.test(msg);
        if (looksLikeMissingReplyCols) {
          setReplyColumnsReady(false);
          const { error: fallbackError } = await supabase.from("session_messages").insert({
            session_id: resolvedSessionId,
            user_id: user.id,
            username: user.username,
            text,
            video_time_sec: videoTimeSec,
          });
          if (fallbackError) toast.error(fallbackError.message);
          else {
            setMessage("");
            setReplyTo(null);
          }
          return;
        }
        toast.error(error.message);
        return;
      }
      setMessage("");
      setReplyTo(null);
    })();
  };

  const setTyping = (isTyping: boolean) => {
    const channel = channelRef.current;
    if (!channel || !user?.id) return;
    const now = Date.now();
    if (isTyping && now - lastTypingSentMsRef.current < 400) return;
    lastTypingSentMsRef.current = now;
    void channel.track({
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      status: "in_room",
      updatedMs: Date.now(),
      isTyping,
    });
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(joinCode || sessionId || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const extractPlaylistId = (url: string) => {
    const raw = String(url || "").trim();
    if (!raw) return null;
    try {
      const u = new URL(raw);
      const list = u.searchParams.get("list");
      return list ? String(list).trim() : null;
    } catch {
      const m = raw.match(/[?&]list=([^&]+)/i);
      return m?.[1] ? String(m[1]).trim() : null;
    }
  };

  const readPlaylistFromPlayer = async (id: string) => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current) return null;

    const restoreVideoId = loadedYoutubeIdRef.current || youtubeId;
    const restoreTime = Number(player.getCurrentTime?.()) || 0;
    const restoreState = Number(player.getPlayerState?.());
    const restoreWasPlaying = restoreState === window.YT?.PlayerState?.PLAYING;

    const restore = () => {
      try {
        if (restoreVideoId) {
          player.loadVideoById?.(restoreVideoId, Math.max(0, restoreTime));
          if (!restoreWasPlaying) player.pauseVideo?.();
        }
      } catch {
      }
    };

    try {
      player.cuePlaylist?.({ listType: "playlist", list: id, index: 0, startSeconds: 0 });
    } catch {
      try {
        player.cuePlaylist?.(id);
      } catch {
      }
    }

    const deadline = Date.now() + 2500;
    while (Date.now() < deadline) {
      try {
        const ids: any = player.getPlaylist?.();
        if (Array.isArray(ids) && ids.length > 0) {
          const cleaned = ids.map((v) => String(v)).filter(Boolean);
          restore();
          return cleaned;
        }
      } catch {
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    restore();
    return null;
  };

  const handleWatchMore = () => {
    if (!isHost) return;
    if (!resolvedSessionId) return;
    if (!watchMoreUrl.trim()) return;

    const urlTrim = watchMoreUrl.trim();
    const nextYoutubeId = extractYoutubeId(urlTrim);
    if (!nextYoutubeId) {
      toast.error("Invalid YouTube URL");
      return;
    }

    const playlistFromVideoUrl = extractPlaylistId(urlTrim);
    const canAttemptPlaylist = Boolean(playlistFromVideoUrl && playerRef.current && playerReadyRef.current);

    setIsSwitchingVideo(true);
    void (async () => {
      try {
        if (canAttemptPlaylist && playlistFromVideoUrl) {
          const ids = await readPlaylistFromPlayer(playlistFromVideoUrl);
          if (ids && ids.length > 0) {
            const idx = ids.indexOf(nextYoutubeId);
            const startIdx = idx >= 0 ? idx : 0;
            const startId = ids[startIdx] || ids[0];

            const player = playerRef.current;
            if (player && playerReadyRef.current && startId) {
              try {
                player.loadVideoById?.(startId, 0);
                loadedYoutubeIdRef.current = startId;
              } catch {
              }
            }

            const { error: sessionErr } = await supabase
              .from("sessions")
              .update({
                youtube_url: urlTrim,
                youtube_id: startId,
                playlist_id: playlistFromVideoUrl,
                playlist_index: startIdx,
                playlist_video_ids: ids,
              })
              .eq("id", resolvedSessionId);

            if (sessionErr) {
              const msg = sessionErr.message || "";
              const looksLikeMissingPlaylistCols = /playlist_id|playlist_index|playlist_video_ids|schema cache|does not exist/i.test(msg);
              if (!looksLikeMissingPlaylistCols) throw new Error(sessionErr.message);
              toast.error("Playlist support needs a small Supabase schema update");
            } else {
              setPlaylistPanelOpen(true);
            }
          } else {
            const { error: sessionErr } = await supabase
              .from("sessions")
              .update({ youtube_url: urlTrim, youtube_id: nextYoutubeId })
              .eq("id", resolvedSessionId);
            if (sessionErr) throw new Error(sessionErr.message);
          }
        } else {
          const { error: sessionErr } = await supabase
            .from("sessions")
            .update({ youtube_url: urlTrim, youtube_id: nextYoutubeId })
            .eq("id", resolvedSessionId);
          if (sessionErr) throw new Error(sessionErr.message);

          const clearAttempt = await supabase
            .from("sessions")
            .update({ playlist_id: null, playlist_index: 0, playlist_video_ids: [] })
            .eq("id", resolvedSessionId);
          if (clearAttempt.error) {
            const msg = clearAttempt.error.message || "";
            const looksLikeMissingPlaylistCols = /playlist_id|playlist_index|playlist_video_ids|schema cache|does not exist/i.test(msg);
            if (!looksLikeMissingPlaylistCols) throw new Error(clearAttempt.error.message);
          }
        }

        const { error: playbackErr } = await supabase
          .from("session_playback")
          .update({ is_playing: true, position_sec: 0, rate: 1 })
          .eq("session_id", resolvedSessionId);
        if (playbackErr) throw new Error(playbackErr.message);

        setWatchMoreUrl("");
        setWatchMoreOpen(false);
        toast.success("Updated playback");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to switch video";
        toast.error(message);
      } finally {
        setIsSwitchingVideo(false);
      }
    })();
  };

  const jumpToPlaylistIndex = (idx: number) => {
    const sid = resolvedSessionIdRef.current;
    if (!sid) return;

    if (!canControlPlayback) {
      toast.error("Playback controls are locked by the host");
      return;
    }

    const ids = playlistVideoIdsRef.current;
    if (!ids.length) return;
    const nextIdx = Math.max(0, Math.min(ids.length - 1, idx));
    const nextId = ids[nextIdx];
    if (!nextId) return;

    void (async () => {
      const { error: sessionErr } = await supabase
        .from("sessions")
        .update({ playlist_index: nextIdx, youtube_id: nextId })
        .eq("id", sid);
      if (sessionErr) {
        toast.error(sessionErr.message);
        return;
      }
      const { error: playbackErr } = await supabase
        .from("session_playback")
        .update({ is_playing: true, position_sec: 0, rate: 1 })
        .eq("session_id", sid);
      if (playbackErr) toast.error(playbackErr.message);
    })();
  };

  const handleAddPlaylist = () => {
    if (!isHost) return;
    if (!resolvedSessionId) return;
    if (!watchMorePlaylistUrl.trim()) return;

    const urlTrim = watchMorePlaylistUrl.trim();
    const nextPlaylistId = extractPlaylistId(urlTrim);
    if (!nextPlaylistId) {
      toast.error("Invalid playlist link");
      return;
    }

    if (!playerRef.current || !playerReadyRef.current) {
      toast.error("Video is still loading. Try again in a moment.");
      return;
    }

    setIsSwitchingVideo(true);
    void (async () => {
      try {
        const ids = await readPlaylistFromPlayer(nextPlaylistId);
        if (!ids || ids.length === 0) throw new Error("Could not load playlist");

        const player = playerRef.current;
        if (player && playerReadyRef.current && ids[0]) {
          try {
            player.loadVideoById?.(ids[0], 0);
            loadedYoutubeIdRef.current = ids[0];
          } catch {
          }
        }

        const { error: sessionErr } = await supabase
          .from("sessions")
          .update({
            youtube_url: urlTrim,
            youtube_id: ids[0],
            playlist_id: nextPlaylistId,
            playlist_index: 0,
            playlist_video_ids: ids,
          })
          .eq("id", resolvedSessionId);
        if (sessionErr) throw new Error(sessionErr.message);

        const { error: playbackErr } = await supabase
          .from("session_playback")
          .update({ is_playing: true, position_sec: 0, rate: 1 })
          .eq("session_id", resolvedSessionId);
        if (playbackErr) throw new Error(playbackErr.message);

        setWatchMorePlaylistUrl("");
        setWatchMoreOpen(false);
        setPlaylistPanelOpen(true);
        toast.success("Playlist started");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to start playlist";
        if (/playlist_id|playlist_index|playlist_video_ids/i.test(message)) {
          toast.error("Playlist support needs a small Supabase schema update");
        } else {
          toast.error(message);
        }
      } finally {
        setIsSwitchingVideo(false);
      }
    })();
  };

  const sendPlaybackCommand = (action: "play" | "pause" | "seek", payload?: any) => {
    if (!canControlPlayback) {
      toast.error("Playback controls are locked by the host");
      return;
    }

    if (!resolvedSessionId || !wsConnected || !hasSnapshot) {
      toast.error("Connecting… please wait a moment");
      return;
    }

    const st = lastServerStateRef.current;
    const current = st ? expectedPositionNow(st) : 0;
    const rate = st?.rate || 1;
    const isPlayingNow = Boolean(st?.isPlaying);

    const nowServerMs = Date.now() + clockOffsetMsRef.current;
    const applyOptimistic = (next: PlaybackState) => {
      setPlayback(next);
      lastServerStateRef.current = next;
      setIsPlaying(Boolean(next.isPlaying));
      setHasSnapshot(true);
      reconcileToServer(next);
    };

    if (action === "play") {
      userGestureRef.current = true;
      pendingCommandRef.current = { action: "play", untilMs: Date.now() + 5000 };
      applyOptimistic({
        isPlaying: true,
        positionSec: current,
        rate,
        serverTimeMs: nowServerMs,
      });
      const player = playerRef.current;
      if (player && playerReadyRef.current) {
        try {
          player.playVideo?.();
        } catch {
        }
      }
    }

    if (action === "pause") {
      pendingCommandRef.current = { action: "pause", untilMs: Date.now() + 5000 };
      applyOptimistic({
        isPlaying: false,
        positionSec: current,
        rate,
        serverTimeMs: nowServerMs,
      });
    }

    if (action === "seek") {
      const positionSec = Number(payload?.positionSec);
      applyOptimistic({
        isPlaying: isPlayingNow,
        positionSec: Number.isFinite(positionSec) ? positionSec : current,
        rate,
        serverTimeMs: nowServerMs,
      });

      const player = playerRef.current;
      if (player && playerReadyRef.current) {
        try {
          player.seekTo?.(Number.isFinite(positionSec) ? positionSec : current, true);
        } catch {
        }
      }

      void (async () => {
        const { error } = await supabase.from("session_playback").update({
          is_playing: isPlayingNow,
          position_sec: positionSec,
          rate,
        }).eq("session_id", resolvedSessionId);
        if (error) toast.error(error.message);
      })();
      return;
    }

    if (action === "play") {
      void (async () => {
        const { error } = await supabase.from("session_playback").update({
          is_playing: true,
          position_sec: current,
          rate,
        }).eq("session_id", resolvedSessionId);
        if (error) toast.error(error.message);
      })();
      return;
    }

    if (action === "pause") {
      void (async () => {
        const { error } = await supabase.from("session_playback").update({
          is_playing: false,
          position_sec: current,
          rate,
        }).eq("session_id", resolvedSessionId);
        if (error) toast.error(error.message);
      })();
    }
  };

  const seekRelative = (deltaSec: number) => {
    if (!durationSec) return;
    const st = lastServerStateRef.current;
    const base = st ? expectedPositionNow(st) : 0;
    const next = Math.max(0, Math.min(durationSec, base + deltaSec));
    sendPlaybackCommand("seek", { positionSec: next });
  };

  const toggleControlLock = () => {
    if (!isHost) return;
    if (!resolvedSessionId) return;
    void (async () => {
      const { error } = await supabase
        .from("sessions")
        .update({ allow_participant_control: !permissions.allowParticipantControl })
        .eq("id", resolvedSessionId);
      if (error) toast.error(error.message);
    })();
  };

  const videoArea = (
    <div
      className={cn(
        "h-full relative flex flex-col transition-all duration-300",
        showChat ? "mr-0" : "mr-0"
      )}
      onMouseMove={handleMouseMove}
    >
      {/* Top Bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-background/80 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
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
                <span>Code: {joinCode || sessionId}</span>
                <button onClick={handleCopyCode} className="hover:text-foreground transition-smooth">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            <button
              type="button"
              className={cn(
                "glass-panel-subtle p-2 rounded-lg transition-smooth",
                inVideoCall ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              title={inVideoCall ? "Video call" : "Start video call"}
              onClick={() => {
                if (inVideoCall) setVideoMinimized((v) => !v);
                else void inviteRoomToVideo();
              }}
            >
              <Video className="w-4 h-4" />
            </button>

            {playlistId && (
              <button
                type="button"
                className={cn(
                  "glass-panel-subtle px-3 py-2 rounded-lg transition-smooth hover:bg-muted inline-flex items-center gap-2 text-sm",
                  playlistPanelOpen && "bg-muted/40"
                )}
                title={playlistPanelOpen ? "Hide playlist" : "Show playlist"}
                onClick={() => setPlaylistPanelOpen((v) => !v)}
              >
                <ListVideo className="w-4 h-4" />
                Playlist
              </button>
            )}

            {isHost && (
              <Popover open={watchMoreOpen} onOpenChange={setWatchMoreOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="glass-panel-subtle px-3 py-2 rounded-lg transition-smooth hover:bg-muted inline-flex items-center gap-2 text-sm"
                    title="Switch video or playlist"
                  >
                    <Plus className="w-4 h-4" />
                    Watch more
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-4">
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Watch more</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm transition-smooth",
                          watchMoreMode === "video" ? "glass-panel-subtle" : "hover:bg-muted"
                        )}
                        onClick={() => setWatchMoreMode("video")}
                      >
                        Video
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm transition-smooth",
                          watchMoreMode === "playlist" ? "glass-panel-subtle" : "hover:bg-muted"
                        )}
                        onClick={() => setWatchMoreMode("playlist")}
                      >
                        Playlist
                      </button>
                    </div>

                    {watchMoreMode === "video" ? (
                      <>
                        <div className="text-xs text-muted-foreground">Paste a YouTube link to switch this room to a new video.</div>
                        <GlassInput
                          icon={<Link2 className="w-4 h-4" />}
                          placeholder="https://youtube.com/watch?v=..."
                          value={watchMoreUrl}
                          onChange={(e) => setWatchMoreUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleWatchMore();
                            }
                          }}
                        />
                        <GlassButton
                          className="w-full"
                          onClick={handleWatchMore}
                          disabled={!watchMoreUrl.trim() || isSwitchingVideo}
                        >
                          {isSwitchingVideo ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Switching…
                            </>
                          ) : (
                            "Switch video"
                          )}
                        </GlassButton>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-muted-foreground">Paste a playlist link to autoplay videos one by one.</div>
                        <GlassInput
                          icon={<ListVideo className="w-4 h-4" />}
                          placeholder="https://youtube.com/playlist?list=..."
                          value={watchMorePlaylistUrl}
                          onChange={(e) => setWatchMorePlaylistUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddPlaylist();
                            }
                          }}
                        />
                        <GlassButton
                          className="w-full"
                          onClick={handleAddPlaylist}
                          disabled={!watchMorePlaylistUrl.trim() || isSwitchingVideo}
                        >
                          {isSwitchingVideo ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Starting…
                            </>
                          ) : (
                            "Start playlist"
                          )}
                        </GlassButton>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {isHost && (
              <button
                onClick={toggleControlLock}
                className={cn(
                  "glass-panel-subtle p-2 rounded-lg transition-smooth",
                  permissions.allowParticipantControl ? "hover:bg-muted" : "bg-primary text-primary-foreground"
                )}
                title={permissions.allowParticipantControl ? "Lock controls" : "Unlock controls"}
              >
                {permissions.allowParticipantControl ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </button>
            )}

            {/* Participants */}
            <div className="flex -space-x-2">
              {participants.map((p) => (
                <div
                  key={p.key}
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

      <AlertDialog open={videoInviteOpen} onOpenChange={setVideoInviteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Join video call?</AlertDialogTitle>
            <AlertDialogDescription>
              {videoInviteFrom ? `${videoInviteFrom.username} started a video call in this room.` : "A video call started in this room."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setVideoInviteOpen(false);
                setVideoInviteFrom(null);
              }}
            >
              Not now
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setVideoInviteOpen(false);
                void startCallForMe();
              }}
            >
              Join
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {inVideoCall && (
        <div
          className="fixed z-40"
          style={{
            left: videoPanel.x,
            top: videoPanel.y,
            width: videoMinimized ? 320 : videoPanel.w,
            height: videoMinimized ? 76 : videoPanel.h,
          }}
        >
          <div
            className={cn(
              "h-full w-full rounded-2xl overflow-hidden",
              "border border-white/20 dark:border-white/10",
              "bg-white/10 dark:bg-white/5",
              "backdrop-blur-2xl",
              "shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2",
                "border-b border-white/10",
                "cursor-grab active:cursor-grabbing",
                "select-none"
              )}
              onPointerDown={(e) => {
                const target = e.target as HTMLElement | null;
                if (target && target.closest("button")) return;
                videoDragRef.current = {
                  active: true,
                  startX: e.clientX,
                  startY: e.clientY,
                  baseX: videoPanel.x,
                  baseY: videoPanel.y,
                };
                try {
                  (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                } catch {
                }
              }}
            >
              <div className="text-sm font-medium">Video</div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-white/10 transition-smooth"
                  title={videoMinimized ? "Expand" : "Minimize"}
                  onClick={() => setVideoMinimized((v) => !v)}
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-white/10 transition-smooth"
                  title="Leave call"
                  onClick={() => void leaveCallForMe()}
                >
                  <PhoneOff className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!videoMinimized && (
              <div className="p-3 h-[calc(100%-40px)] flex flex-col relative">
                <div className="flex-1 min-h-0 relative">
                  {showGridLayout ? (
                    <div className="h-full grid grid-cols-2 gap-3">
                      {remoteStreams.map((r) => (
                        <div key={r.userId} className="relative rounded-2xl overflow-hidden bg-black/30 border border-white/10">
                          <video
                            autoPlay
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover"
                            ref={(el) => attachStream(el, r.stream)}
                          />
                          <button
                            type="button"
                            className="absolute top-2 right-2 p-2 rounded-xl bg-black/30 hover:bg-black/40 text-white transition-smooth"
                            title={pinnedUserId === r.userId ? "Unpin" : "Pin"}
                            onClick={() => setPinnedUserId((prev) => (prev === r.userId ? null : r.userId))}
                          >
                            <Pin className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="relative rounded-2xl overflow-hidden bg-black/30 border border-white/10">
                        <video
                          autoPlay
                          playsInline
                          muted
                          className="absolute inset-0 w-full h-full object-cover"
                          ref={(el) => attachStream(el, localStreamRef.current)}
                        />
                        <div className="absolute bottom-2 left-2 text-[11px] px-2 py-1 rounded-lg bg-black/30 text-white">You</div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full relative rounded-2xl overflow-hidden bg-black/30 border border-white/10">
                      {mainRemoteStream ? (
                        <video
                          autoPlay
                          playsInline
                          className="absolute inset-0 w-full h-full object-cover"
                          ref={(el) => {
                            mainRemoteVideoRef.current = el;
                            attachStream(el, mainRemoteStream);
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                          Waiting for others…
                        </div>
                      )}

                      <div ref={mainVideoWrapRef} className="absolute inset-0">
                        <div
                          className="absolute rounded-2xl overflow-hidden bg-black/30 border border-white/10 cursor-move select-none"
                          style={{
                            left: pipPanel.x,
                            top: pipPanel.y,
                            width: pipPanel.w,
                            height: pipPanel.w / pipAspectRef.current,
                          }}
                          onPointerDown={(e) => {
                            const target = e.target as HTMLElement | null;
                            if (target && target.closest("button")) return;
                            e.stopPropagation();
                            pipDragRef.current = {
                              active: true,
                              startX: e.clientX,
                              startY: e.clientY,
                              baseX: pipPanel.x,
                              baseY: pipPanel.y,
                            };
                            try {
                              (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                            } catch {
                            }
                          }}
                        >
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="absolute inset-0 w-full h-full object-cover"
                          onLoadedMetadata={() => {
                            const el = localVideoRef.current;
                            if (!el) return;
                            if (el.videoWidth > 0 && el.videoHeight > 0) {
                              pipAspectRef.current = el.videoWidth / el.videoHeight;
                            }
                          }}
                        />
                        <div className="absolute bottom-2 left-2 text-[11px] px-2 py-1 rounded-lg bg-black/30 text-white">You</div>

                        <button
                          type="button"
                          className={cn(
                            "absolute right-1.5 bottom-1.5",
                            "w-9 h-9",
                            "rounded-2xl",
                            "bg-transparent",
                            "cursor-se-resize",
                            "group"
                          )}
                          title="Resize"
                          aria-label="Resize local video"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            pipResizeRef.current = {
                              active: true,
                              startX: e.clientX,
                              startY: e.clientY,
                              baseW: pipPanel.w,
                            };
                            try {
                              (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
                            } catch {
                            }
                          }}
                        >
                          <span
                            className={cn(
                              "pointer-events-none absolute right-1.5 bottom-1.5",
                              "w-5 h-5",
                              "rounded-br-xl",
                              "border-r-[5px] border-b-[5px]",
                              "border-white/70 group-hover:border-white/90",
                              "shadow-[0_0_0_1px_rgba(0,0,0,0.10)]"
                            )}
                          />
                        </button>
                      </div>
                    </div>
                    </div>
                  )}
                </div>

                {!showGridLayout && otherRemoteStreams.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hidden">
                    {otherRemoteStreams.map((r) => (
                      <button
                        key={r.userId}
                        type="button"
                        className="relative shrink-0 w-28 aspect-video rounded-xl overflow-hidden bg-black/30 border border-white/10"
                        onClick={() => setPinnedUserId((prev) => (prev === r.userId ? null : r.userId))}
                        title="Pin"
                      >
                        <video
                          autoPlay
                          playsInline
                          className="absolute inset-0 w-full h-full object-cover"
                          ref={(el) => attachStream(el, r.stream)}
                        />
                        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/30 text-white">
                          <Pin className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-start gap-3">
                  <button
                    type="button"
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center transition-smooth",
                      "border border-white/20",
                      videoMicMuted ? "bg-black/35 text-white" : "bg-white/20 text-white"
                    )}
                    title={videoMicMuted ? "Turn mic on" : "Turn mic off"}
                    onClick={() => setVideoMicMuted((v) => !v)}
                  >
                    {videoMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>

                  <button
                    type="button"
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center transition-smooth",
                      "border border-white/20",
                      videoCamOff ? "bg-black/35 text-white" : "bg-white/20 text-white"
                    )}
                    title={videoCamOff ? "Turn camera on" : "Turn camera off"}
                    onClick={() => setVideoCamOff((v) => !v)}
                  >
                    {videoCamOff ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                  </button>
                </div>

                <button
                  type="button"
                  className={cn(
                    "absolute right-2 bottom-2",
                    "w-12 h-12",
                    "rounded-2xl",
                    "bg-transparent",
                    "transition-smooth",
                    "cursor-se-resize",
                    "group"
                  )}
                  title="Resize"
                  aria-label="Resize"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    videoResizeRef.current = {
                      active: true,
                      startX: e.clientX,
                      startY: e.clientY,
                      baseW: videoPanel.w,
                      baseH: videoPanel.h,
                    };
                    try {
                      (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
                    } catch {
                    }
                  }}
                >
                  <span
                    className={cn(
                      "pointer-events-none absolute right-1.5 bottom-1.5",
                      "w-7 h-7",
                      "rounded-br-2xl",
                      "border-r-[6px] border-b-[6px]",
                      "border-white/70 group-hover:border-white/90",
                      "shadow-[0_0_0_1px_rgba(0,0,0,0.10)]"
                    )}
                  />
                </button>
              </div>
            )}

            {videoMinimized && (
              <div className="px-3 py-2 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">{remoteStreams.length} connected</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-smooth",
                      "border border-white/20",
                      videoMicMuted ? "bg-black/35 text-white" : "bg-white/20 text-white"
                    )}
                    title={videoMicMuted ? "Turn mic on" : "Turn mic off"}
                    onClick={() => setVideoMicMuted((v) => !v)}
                  >
                    {videoMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-smooth",
                      "border border-white/20",
                      videoCamOff ? "bg-black/35 text-white" : "bg-white/20 text-white"
                    )}
                    title={videoCamOff ? "Turn camera on" : "Turn camera off"}
                    onClick={() => setVideoCamOff((v) => !v)}
                  >
                    {videoCamOff ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Player */}
      <div ref={videoContainerRef} className="flex-1 bg-background flex items-center justify-center relative">
        <div className="absolute inset-0 p-6">
          <div className="w-full h-full relative rounded-2xl">
            <div
              className="absolute -inset-10 rounded-[32px] blur-3xl opacity-40 dark:opacity-35"
              style={
                ambientA && ambientB
                  ? {
                      background: `radial-gradient(circle at 22% 30%, ${ambientA}, transparent 58%), radial-gradient(circle at 78% 70%, ${ambientB}, transparent 58%)`,
                    }
                  : undefined
              }
            />
            <div className="absolute -inset-2 rounded-[28px] bg-gradient-to-b from-black/10 to-black/20 dark:from-black/30 dark:to-black/60" />

            <div className="w-full h-full rounded-2xl overflow-hidden bg-black/90 relative">
              <div className="w-full h-full object-contain relative">
                <div ref={playerHostRef} className="w-full h-full" />
                <div className="absolute inset-0 pointer-events-none" />
                {interactionRequired && (
                  <button
                    className="absolute inset-0 flex items-center justify-center bg-black/50"
                    onClick={() => {
                      userGestureRef.current = true;
                      setInteractionRequired(false);
                      const st = lastServerStateRef.current;
                      if (st) reconcileToServer(st);
                    }}
                  >
                    <div className="glass-panel px-6 py-4 rounded-xl">
                      <div className="font-semibold">Click to start playback</div>
                      <div className="text-sm text-muted-foreground">Your browser requires a tap before audio/video can play.</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {playlistId && (
          <div
            className={cn(
              "absolute right-6 top-24 bottom-24 w-80 z-30 transition-all duration-200",
              playlistPanelOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6 pointer-events-none"
            )}
          >
            <div className="h-full glass-panel border border-white/10 rounded-2xl overflow-hidden flex flex-col">
              <div className="p-3 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <ListVideo className="w-4 h-4 text-primary shrink-0" />
                  <div className="text-sm font-medium truncate">Playlist</div>
                  {playlistVideoIds.length > 0 && (
                    <div className="text-xs text-muted-foreground shrink-0">{activePlaylistIndex + 1}/{playlistVideoIds.length}</div>
                  )}
                </div>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-muted transition-smooth"
                  onClick={() => setPlaylistPanelOpen(false)}
                  title="Hide"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hidden p-2 space-y-2">
                {playlistVideoIds.map((id, idx) => {
                  const isActive = idx === activePlaylistIndex;
                  const title = playlistMetaById[id]?.title;
                  const thumb = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
                  return (
                    <button
                      key={`${id}-${idx}`}
                      type="button"
                      className={cn(
                        "w-full text-left rounded-xl transition-smooth flex gap-3 p-2",
                        isActive ? "bg-primary/15 border border-primary/30" : "hover:bg-muted/40 border border-transparent"
                      )}
                      onClick={() => jumpToPlaylistIndex(idx)}
                    >
                      <div className="w-24 shrink-0">
                        <div className="rounded-lg overflow-hidden bg-black/40 border border-white/10 aspect-video">
                          <img
                            src={thumb}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={cn("text-sm font-medium truncate", isActive && "text-primary")}
                          title={title || undefined}
                        >
                          {title || `Video ${idx + 1}`}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                          <span>#{idx + 1}</span>
                          {id === activePlaylistVideoId && <span>Now playing</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Center Play/Pause */}
        <button
          onClick={() => {
            if (isPlaying) {
              sendPlaybackCommand("pause");
            } else {
              sendPlaybackCommand("play");
            }
          }}
          disabled={!canSendPlaybackCommands}
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
            showControls || !isPlaying ? "opacity-100" : "opacity-0"
          )}
        >
          <div
            className={cn(
              "w-20 h-20 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform",
              !canSendPlaybackCommands && "opacity-60"
            )}
          >
            {isPlaying ? <Pause className="w-8 h-8 text-foreground" /> : <Play className="w-8 h-8 text-foreground ml-1" />}
          </div>
        </button>
      </div>

      {/* Bottom Controls */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-background/80 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <GlassCard variant="subtle" className="p-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <Slider
              value={[isScrubbing ? scrubSec : durationSec ? (progress / 100) * durationSec : 0]}
              max={Math.max(1, durationSec || 1)}
              step={0.25}
              onValueChange={(v) => {
                setIsScrubbing(true);
                setScrubSec(Number(v?.[0] || 0));
              }}
              onValueCommit={(v) => {
                const next = Number(v?.[0] || 0);
                setIsScrubbing(false);
                setScrubSec(next);
                sendPlaybackCommand("seek", { positionSec: next });
              }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (isPlaying) sendPlaybackCommand("pause");
                  else sendPlaybackCommand("play");
                }}
                disabled={!canSendPlaybackCommands}
                className={cn("hover:text-primary transition-smooth", !canSendPlaybackCommands && "opacity-60")}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              <button
                onClick={() => seekRelative(-10)}
                className={cn("hover:text-primary transition-smooth", !canSendPlaybackCommands && "opacity-60")}
                disabled={!canSendPlaybackCommands}
                title="Back 10s"
              >
                -10s
              </button>

              <button
                onClick={() => seekRelative(10)}
                className={cn("hover:text-primary transition-smooth", !canSendPlaybackCommands && "opacity-60")}
                disabled={!canSendPlaybackCommands}
                title="Forward 10s"
              >
                +10s
              </button>

              <button onClick={() => setIsMuted(!isMuted)} className="hover:text-primary transition-smooth">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <span className="text-sm text-muted-foreground">
                {(() => {
                  const player = playerRef.current;
                  const current = player && Number.isFinite(player.getCurrentTime?.()) ? Number(player.getCurrentTime()) : 0;
                  const duration = durationSec;
                  return `${formatTime(current)} / ${duration ? formatTime(duration) : "--:--"}`;
                })()}
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
              <button
                onClick={() => void toggleFullscreen()}
                className="p-2 rounded-lg hover:bg-muted transition-smooth"
                title="Fullscreen"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );

  const chatPanel = (
    <div className="h-full border-l border-border bg-card/50 backdrop-blur-sm flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <span className="font-medium">Chat</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-smooth"
          >
            <span>
              Code: {joinCode || sessionId}
            </span>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
          <button onClick={() => setShowChat(false)} className="p-1 rounded hover:bg-muted transition-smooth" type="button">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hidden">
        {messages.map((msg, idx) => {
          const isMine = msg.userId === user?.id;
          const avatarUrl = avatarByUserId.get(msg.userId) || null;

          const prev = idx > 0 ? messages[idx - 1] : null;
          const next = idx < messages.length - 1 ? messages[idx + 1] : null;

          const isFirstInCluster = !prev || prev.userId !== msg.userId;
          const isLastInCluster = !next || next.userId !== msg.userId;

          const showIdentity = isFirstInCluster;
          const topGap = idx === 0 ? "" : (isFirstInCluster ? "mt-4" : "mt-1");

          const bubbleShape = isMine
            ? cn(
              isFirstInCluster ? "rounded-tr-sm" : "rounded-tr-xl",
              isLastInCluster ? "rounded-br-sm" : "rounded-br-xl",
            )
            : cn(
              isFirstInCluster ? "rounded-tl-sm" : "rounded-tl-xl",
              isLastInCluster ? "rounded-bl-sm" : "rounded-bl-xl",
            );

          const sideInset = isMine ? "mr-8" : "ml-8";

          return (
            <div
              key={msg.id}
              className={cn(topGap, "animate-slide-in-right", isMine && "flex flex-col items-end")}
            >
              {showIdentity && (
                <div className={cn("flex items-center gap-2 mb-1 w-full", isMine ? "justify-end" : "justify-start")}>
                  <div
                    className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-semibold"
                    style={{ backgroundColor: msg.color }}
                    title={msg.user}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={msg.user}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{initialsFor(msg.user)}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                </div>
              )}

              {!showIdentity && (
                <div className={cn("w-full flex mb-1", isMine ? "justify-end" : "justify-start")}>
                  <div className={cn("w-6", !isMine && "ml-0")} />
                </div>
              )}

              <div className={cn("w-full flex", isMine ? "justify-end" : "justify-start")}>
                <div className={cn("relative max-w-[70%]", sideInset)}>
                  <button
                    type="button"
                    onClick={() => setReplyTo(msg)}
                    disabled={!replyColumnsReady}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-smooth opacity-60 hover:opacity-100 focus-visible:opacity-100",
                      isMine ? "-right-9" : "-left-9"
                    )}
                    title="Reply"
                  >
                    <Reply className="w-4 h-4" />
                  </button>

                  <div className={cn("glass-panel-subtle px-3 py-2 rounded-xl w-fit max-w-full", bubbleShape)}>
                    {msg.replyTo && (
                      <div className="mb-2 px-2 py-1 rounded-lg bg-black/10 dark:bg-white/5 border border-white/10">
                        <div className="text-xs font-medium text-muted-foreground">Replying to {msg.replyTo.user}</div>
                        <div className="text-xs truncate">{msg.replyTo.text}</div>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {typingUsers.length > 0 && (
          <div className="w-full flex justify-start animate-fade-in">
            <div className="ml-8 max-w-[70%]">
              <div className="glass-panel-subtle px-3 py-2 rounded-xl rounded-tl-sm w-fit max-w-full">
                <div className="flex items-center gap-1">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce"
                    style={{ animationDelay: "120ms" }}
                  />
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce"
                    style={{ animationDelay: "240ms" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border">
        {replyTo && (
          <div className="mb-2 px-3 py-2 rounded-xl glass-panel-subtle flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-muted-foreground">Replying to {replyTo.user}</div>
              <div className="text-xs truncate">{replyTo.text}</div>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="p-1 rounded hover:bg-muted transition-smooth"
              title="Cancel reply"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="shrink-0 w-11 h-11 flex items-center justify-center glass-panel-subtle rounded-xl hover:bg-muted transition-smooth"
                title="Emoji"
                type="button"
              >
                <Smile className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-3">
              <div className="grid grid-cols-8 gap-1">
                {[
                  "😀","😁","😂","🤣","😊","😍","😘","😎",
                  "😅","😭","😡","🤯","🤔","🙌","👏","🔥",
                  "❤️","💛","💚","💙","💜","✨","✅","❌",
                  "👍","👎","🙏","🎉","💯","😴","🥶","🤝",
                ].map((emo) => (
                  <button
                    key={emo}
                    type="button"
                    className="h-8 w-8 rounded-md hover:bg-muted transition-smooth text-lg"
                    onClick={() => setMessage((prev) => `${prev}${emo}`)}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex-1 min-w-0">
            <textarea
              placeholder="Type a message..."
              value={message}
              onChange={(e) => {
                const next = e.target.value;
                setMessage(next);
                setTyping(Boolean(next.trim()));
                if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = window.setTimeout(() => {
                  setTyping(false);
                }, 1100);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
              className={cn(
                "w-full glass-panel-subtle px-4 py-3 rounded-xl",
                "text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                "transition-smooth text-sm resize-none"
              )}
            />
          </div>
          <GlassButton
            size="sm"
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="shrink-0 w-11 h-11 p-0"
          >
            <Send className="w-4 h-4" />
          </GlassButton>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div
        className="h-full grid"
        style={{
          gridTemplateColumns: showChat ? "1fr minmax(320px, 420px)" : "1fr 0px",
        }}
      >
        <div className="min-w-0 h-full">
          {videoArea}
        </div>
        <div
          className={cn(
            "h-full overflow-hidden transition-opacity duration-200",
            showChat ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {chatPanel}
        </div>
      </div>
    </div>
  );
};

export default WatchRoom;
