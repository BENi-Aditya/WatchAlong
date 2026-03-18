import { supabase } from "./supabase";
import { nanoid } from "nanoid";

// Generate a 6-character join code
function createJoinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const id = nanoid(10);
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    const idx = id.charCodeAt(i) % alphabet.length;
    code += alphabet[idx];
  }
  return code;
}

// Extract YouTube ID from URL
function extractYoutubeId(url: string): string | null {
  const raw = url.trim();
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
    return null;
  }
  const normalized = (id || "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(normalized)) return normalized;
  return null;
}

export interface WatchSession {
  id: string;
  joinCode: string;
  hostUserId: string;
  youtubeUrl: string;
  youtubeId: string;
  allowParticipantControl: boolean;
  playlistId: string | null;
  playlistIndex: number;
  playlistVideoIds: string[];
  createdAt: string;
}

export interface PlaybackState {
  sessionId: string;
  isPlaying: boolean;
  positionSec: number;
  rate: number;
  serverTime: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  replyToId: string | null;
  replyToUsername: string | null;
  replyToText: string | null;
  videoTimeSec: number;
  createdAt: string;
}

export interface Presence {
  userId: string;
  username: string;
  avatarUrl: string | null;
  status: 'online' | 'in_room' | 'away';
  updatedAt: string;
}

// Session API
export const sessionApi = {
  // Create a new watch session
  async create(youtubeUrl: string): Promise<{ session: WatchSession; playback: PlaybackState }> {
    console.log("sessionApi.create called with:", youtubeUrl);
    const youtubeId = extractYoutubeId(youtubeUrl);
    if (!youtubeId) throw new Error("Invalid YouTube URL");

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Not authenticated");
    
    console.log("Creating session for user:", userData.user.id, "with youtubeId:", youtubeId);

    // Try to create with unique join code
    let created = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const joinCode = createJoinCode();
      console.log(`Attempt ${attempt + 1}: trying join code ${joinCode}`);
      
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          join_code: joinCode,
          host_user_id: userData.user.id,
          youtube_url: youtubeUrl,
          youtube_id: youtubeId,
          allow_participant_control: true,
        })
        .select()
        .single();

      console.log("Session insert result - data:", data, "error:", error);

      if (error) {
        const isUniqueViolation = String((error as any)?.code || "") === "23505";
        console.log("Insert error code:", (error as any)?.code, "Is unique violation:", isUniqueViolation);
        if (!isUniqueViolation) {
          throw new Error(`Session insert failed: ${error.message || JSON.stringify(error)}`);
        }
        // Continue to next attempt for unique violation
        continue;
      }
      
      if (data) {
        created = data;
        console.log("Session created successfully:", created);
        break;
      }
      
      console.log("No error but also no data - this shouldn't happen");
    }

    if (!created) throw new Error("Failed to generate a unique join code");

    console.log("Creating playback for session:", created.id);

    // Create initial playback state
    const { data: playbackData, error: playbackError } = await supabase
      .from("session_playback")
      .insert({
        session_id: created.id,
        is_playing: false,
        position_sec: 0,
        rate: 1,
      })
      .select()
      .single();

    console.log("Playback creation result:", { data: playbackData, error: playbackError });

    if (playbackError) {
      console.error("Playback creation failed, cleaning up session:", playbackError);
      // Clean up session if playback creation failed
      try {
        await supabase.from("sessions").delete().eq("id", created.id);
      } catch (cleanupErr) {
        console.error("Session cleanup also failed:", cleanupErr);
      }
      throw new Error(`Playback setup failed: ${playbackError.message || JSON.stringify(playbackError)}`);
    }

    console.log("Session and playback created successfully!");

    return {
      session: this.transformSession(created),
      playback: this.transformPlayback(playbackData),
    };
  },

  // Join a session by code - FIXED with better error handling
  async join(joinCode: string): Promise<{ session: WatchSession; playback: PlaybackState } | null> {
    const upperCode = joinCode.toUpperCase().trim();
    console.log("Joining session with code:", upperCode);
    
    let { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("join_code", upperCode)
      .maybeSingle();
    
    console.log("Join query result:", { data: sessionData, error: sessionError });

    if (!sessionData) {
        console.error("Session lookup failed. codeRaw:", joinCode, "codeUpper:", upperCode, "error:", sessionError);
        
        // Try one more time with just the base query
        const { data: retryData, error: retryErr } = await supabase
          .from("sessions")
          .select("id, join_code, youtube_id, host_user_id, allow_participant_control")
          .eq("join_code", upperCode)
          .maybeSingle();
          
        console.log("Retry result:", { retryData, retryErr });
        
        if (!retryData) {
          throw new Error("Session not found - the room may not exist or you may not have permission to view it");
        }
        
        sessionData = retryData;
      }
    
    if (!sessionData) {
      console.error("No session found for code:", upperCode);
      return null;
    }

    const { data: playbackData, error: playbackError } = await supabase
      .from("session_playback")
      .select("*")
      .eq("session_id", sessionData.id)
      .maybeSingle();

    if (playbackError) {
      console.error("Playback lookup error:", playbackError);
    }

    return {
      session: this.transformSession(sessionData),
      playback: playbackData ? this.transformPlayback(playbackData) : {
        sessionId: sessionData.id,
        isPlaying: false,
        positionSec: 0,
        rate: 1,
        serverTime: new Date().toISOString(),
      },
    };
  },

  // Get session by join code
  async getByJoinCode(joinCode: string): Promise<WatchSession | null> {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("join_code", joinCode.toUpperCase())
      .single();

    if (error || !data) return null;
    return this.transformSession(data);
  },

  // Get playback state
  async getPlayback(sessionId: string): Promise<PlaybackState | null> {
    const { data, error } = await supabase
      .from("session_playback")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (error || !data) return null;
    return this.transformPlayback(data);
  },

  // Update playback state
  async updatePlayback(
    sessionId: string,
    updates: Partial<Pick<PlaybackState, 'isPlaying' | 'positionSec' | 'rate'>>
  ): Promise<void> {
    const updateData: any = {};
    if (updates.isPlaying !== undefined) updateData.is_playing = updates.isPlaying;
    if (updates.positionSec !== undefined) updateData.position_sec = updates.positionSec;
    if (updates.rate !== undefined) updateData.rate = updates.rate;

    const { error } = await supabase
      .from("session_playback")
      .update(updateData)
      .eq("session_id", sessionId);

    if (error) throw new Error(error.message);
  },

  // Update session permissions (host only)
  async updatePermissions(sessionId: string, allowParticipantControl: boolean): Promise<void> {
    const { error } = await supabase
      .from("sessions")
      .update({ allow_participant_control: allowParticipantControl })
      .eq("id", sessionId);

    if (error) throw new Error(error.message);
  },

  transformSession(data: any): WatchSession {
    return {
      id: data.id,
      joinCode: data.join_code,
      hostUserId: data.host_user_id,
      youtubeUrl: data.youtube_url,
      youtubeId: data.youtube_id,
      allowParticipantControl: data.allow_participant_control,
      playlistId: data.playlist_id,
      playlistIndex: data.playlist_index,
      playlistVideoIds: data.playlist_video_ids || [],
      createdAt: data.created_at,
    };
  },

  transformPlayback(data: any): PlaybackState {
    return {
      sessionId: data.session_id,
      isPlaying: data.is_playing,
      positionSec: Number(data.position_sec),
      rate: Number(data.rate),
      serverTime: data.server_time,
    };
  },
};

// Presence API (using session_messages for online status via a special system message)
export const presenceApi = {
  // Update presence via a lightweight heartbeat in local storage for now
  // Full presence system can be added later with a presence table
  async update(sessionId: string, status: 'online' | 'in_room' | 'away'): Promise<void> {
    // Store in localStorage for immediate UI feedback
    const key = `presence_${sessionId}`;
    localStorage.setItem(key, JSON.stringify({ status, timestamp: Date.now() }));
  },

  // Get presence from other sources (for now returns empty, extend with presence table later)
  async getAll(sessionId: string): Promise<Presence[]> {
    // For now, return empty - can be extended with a presence table
    return [];
  },

  // Remove presence
  async remove(sessionId: string): Promise<void> {
    const key = `presence_${sessionId}`;
    localStorage.removeItem(key);
  },
};

// Chat API
export const chatApi = {
  // Send a message
  async send(
    sessionId: string, 
    text: string, 
    videoTimeSec: number,
    replyTo?: { id: string; username: string; text: string } | null
  ): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Not authenticated");

    // Get username from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userData.user.id)
      .single();

    const insertData: any = {
      session_id: sessionId,
      user_id: userData.user.id,
      username: profile?.username || "Unknown",
      text,
      video_time_sec: videoTimeSec,
    };

    if (replyTo) {
      insertData.reply_to_id = replyTo.id;
      insertData.reply_to_username = replyTo.username;
      insertData.reply_to_text = replyTo.text;
    }

    const { error } = await supabase.from("session_messages").insert(insertData);
    if (error) throw new Error(error.message);
  },

  // Get recent messages
  async getRecent(sessionId: string, limit: number = 100): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from("session_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error || !data) return [];

    return data.map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      username: m.username,
      text: m.text,
      replyToId: m.reply_to_id,
      replyToUsername: m.reply_to_username,
      replyToText: m.reply_to_text,
      videoTimeSec: Number(m.video_time_sec),
      createdAt: m.created_at,
    }));
  },
};

// Realtime subscriptions
export const realtimeApi = {
  // Subscribe to playback changes
  subscribeToPlayback(sessionId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`playback:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_playback",
          filter: `session_id=eq.${sessionId}`,
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to session updates
  subscribeToSession(sessionId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to chat messages
  subscribeToChat(sessionId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`chat:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        callback
      )
      .subscribe();
  },

  // Unsubscribe from a channel
  unsubscribe(channel: any) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  },
};
