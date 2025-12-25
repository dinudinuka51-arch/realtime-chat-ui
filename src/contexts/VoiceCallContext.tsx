import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { VoiceCall, CallSignal, Profile } from '@/types/chat';
import { toast } from 'sonner';

interface VoiceCallContextType {
  currentCall: VoiceCall | null;
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  isMuted: boolean;
  callDuration: number;
  callError: string | null;
  callerProfile: Profile | null;
  formatDuration: (seconds: number) => string;
  startCall: (conversationId: string, otherUserId: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  clearError: () => void;
  copyError: () => void;
}

const VoiceCallContext = createContext<VoiceCallContextType | null>(null);

export const useVoiceCallContext = () => {
  const context = useContext(VoiceCallContext);
  if (!context) {
    throw new Error('useVoiceCallContext must be used within VoiceCallProvider');
  }
  return context;
};

export const VoiceCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentCall, setCurrentCall] = useState<VoiceCall | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState<string | null>(null);
  const [callerProfile, setCallerProfile] = useState<Profile | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const isSettingRemoteDescRef = useRef(false);
  const currentCallIdRef = useRef<string | null>(null);

  // Better ICE servers with TURN fallback
  const iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
  };

  // Initialize audio elements
  useEffect(() => {
    remoteAudioRef.current = new Audio();
    remoteAudioRef.current.autoplay = true;
    (remoteAudioRef.current as any).playsInline = true;

    // Ringtone
    ringtoneRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleT4IMYHL5MCAbBw2i9n5xmUVK3vO9ct2Gi194/rNdhkyd+r9zXEZMXnv/c5wGTF68P3OcBkxe/H9z3AZMXvy/c9wGTF78/3PcBkxe/T9z3AZMXv1/c9wGTF79v3PcBkxe/f9z3AZMXv4/c9wGTF7+f3PcBkxe/r9z3AZMXv7/c9wGTF7/P3PcBkxe/39z3AZMXv+/c9wGTF7//3PcBkxfAD+z3AZMXwB/s9wGTF8Av7PcBkxfAP+z3AZMXwE/s9wGTF8Bf7PcBkxfAb+z3AZMXwH/s9wGTF8CP7PcBkxfAn+z3AZMXwK/s9wGTF8C/7PcBkxfAz+z3AZMXwN/s9wGTF8Dv7PcBkxfA/+z3AZMXwQ/s9wGTF8Ef7PcBkxfBL+z3AZMXwT/s9wGTF8FP7PcBkxfBX+z3AZMXwW/s9wGTF8F/7PcBkxfBj+z3AZMXwZ/s9wGTF8Gv7PcBkxfBv+z3AZMXwc/s9wGTF8Hf7PcBkxfB7+z3AZMXwf/s9wGTF8IP7PcBkxfCH+z3AZMXwi/s9wGTF8I/7PcBkxfCT+z3AZ');
    ringtoneRef.current.loop = true;

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    console.log('[VoiceCall] Cleanup called');
    
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[VoiceCall] Stopped local track:', track.kind);
      });
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    pendingIceCandidatesRef.current = [];
    isSettingRemoteDescRef.current = false;
    currentCallIdRef.current = null;
    setCallDuration(0);
    setIsMuted(false);
  }, []);

  // Fetch caller profile for incoming calls
  const fetchCallerProfile = async (callerId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', callerId)
      .single();
    
    if (data) {
      setCallerProfile(data as Profile);
    }
  };

  // Global listener for ALL incoming calls
  useEffect(() => {
    if (!user) return;

    console.log('[VoiceCall] Setting up global call listener for user:', user.id);

    const channel = supabase
      .channel('global-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_calls',
        },
        async (payload) => {
          const call = payload.new as VoiceCall;
          console.log('[VoiceCall] New call detected:', call);
          
          if (call.receiver_id === user.id && call.status === 'calling') {
            console.log('[VoiceCall] Incoming call for me!');
            setCurrentCall(call);
            currentCallIdRef.current = call.id;
            setCallStatus('ringing');
            await fetchCallerProfile(call.caller_id);
            
            try {
              await ringtoneRef.current?.play();
            } catch (e) {
              console.log('[VoiceCall] Could not play ringtone:', e);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'voice_calls',
        },
        async (payload) => {
          const call = payload.new as VoiceCall;
          console.log('[VoiceCall] Call updated:', call);

          if (!currentCallIdRef.current || call.id !== currentCallIdRef.current) return;

          if (call.status === 'accepted') {
            console.log('[VoiceCall] Call accepted');
            setCurrentCall(call);
            setCallStatus('connected');
            ringtoneRef.current?.pause();
            startCallTimer();
          } else if (['rejected', 'ended', 'missed'].includes(call.status)) {
            console.log('[VoiceCall] Call ended with status:', call.status);
            toast.info(call.status === 'rejected' ? 'Call declined' : 'Call ended');
            cleanup();
            setCurrentCall(null);
            setCallerProfile(null);
            setCallStatus('idle');
          }
        }
      )
      .subscribe((status) => {
        console.log('[VoiceCall] Global channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, cleanup]);

  // Listen for WebRTC signals
  useEffect(() => {
    if (!user || !currentCall) return;

    console.log('[VoiceCall] Setting up signal listener for call:', currentCall.id);

    const channel = supabase
      .channel(`signals:${currentCall.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `call_id=eq.${currentCall.id}`,
        },
        async (payload) => {
          const signal = payload.new as CallSignal;
          console.log('[VoiceCall] Signal received:', signal.signal_type);
          
          if (signal.receiver_id === user.id) {
            await handleSignal(signal);
          }
        }
      )
      .subscribe((status) => {
        console.log('[VoiceCall] Signal channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCall, user]);

  const handleSignal = async (signal: CallSignal) => {
    console.log('[VoiceCall] Handling signal:', signal.signal_type);

    try {
      if (signal.signal_type === 'offer') {
        console.log('[VoiceCall] Processing offer');
        
        if (!peerConnectionRef.current) {
          await setupPeerConnection();
        }
        
        isSettingRemoteDescRef.current = true;
        await peerConnectionRef.current!.setRemoteDescription(
          new RTCSessionDescription(signal.signal_data)
        );
        isSettingRemoteDescRef.current = false;

        // Process pending ICE candidates
        console.log('[VoiceCall] Processing', pendingIceCandidatesRef.current.length, 'pending ICE candidates');
        for (const candidate of pendingIceCandidatesRef.current) {
          await peerConnectionRef.current!.addIceCandidate(candidate);
        }
        pendingIceCandidatesRef.current = [];

        const answer = await peerConnectionRef.current!.createAnswer();
        await peerConnectionRef.current!.setLocalDescription(answer);
        await sendSignal('answer', answer);
        console.log('[VoiceCall] Answer sent');

      } else if (signal.signal_type === 'answer') {
        console.log('[VoiceCall] Processing answer');
        
        if (peerConnectionRef.current) {
          isSettingRemoteDescRef.current = true;
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(signal.signal_data)
          );
          isSettingRemoteDescRef.current = false;

          // Process pending ICE candidates
          console.log('[VoiceCall] Processing', pendingIceCandidatesRef.current.length, 'pending ICE candidates');
          for (const candidate of pendingIceCandidatesRef.current) {
            await peerConnectionRef.current.addIceCandidate(candidate);
          }
          pendingIceCandidatesRef.current = [];
        }

      } else if (signal.signal_type === 'ice-candidate') {
        console.log('[VoiceCall] Processing ICE candidate');
        
        const candidate = new RTCIceCandidate(signal.signal_data);
        
        if (peerConnectionRef.current?.remoteDescription && !isSettingRemoteDescRef.current) {
          await peerConnectionRef.current.addIceCandidate(candidate);
          console.log('[VoiceCall] ICE candidate added');
        } else {
          console.log('[VoiceCall] Queuing ICE candidate');
          pendingIceCandidatesRef.current.push(candidate);
        }
      }
    } catch (error) {
      console.error('[VoiceCall] Error handling signal:', error);
      setCallError(`Signal error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  const sendSignal = async (type: string, data: any) => {
    if (!user || !currentCall) return;

    const receiverId = currentCall.caller_id === user.id
      ? currentCall.receiver_id
      : currentCall.caller_id;

    console.log('[VoiceCall] Sending signal:', type, 'to:', receiverId);

    await supabase.from('call_signals').insert({
      call_id: currentCall.id,
      sender_id: user.id,
      receiver_id: receiverId,
      signal_type: type,
      signal_data: data,
    });
  };

  const setupPeerConnection = async () => {
    console.log('[VoiceCall] Setting up peer connection');
    
    peerConnectionRef.current = new RTCPeerConnection(iceServers);

    peerConnectionRef.current.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('[VoiceCall] New ICE candidate');
        await sendSignal('ice-candidate', event.candidate.toJSON());
      }
    };

    peerConnectionRef.current.oniceconnectionstatechange = () => {
      const state = peerConnectionRef.current?.iceConnectionState;
      console.log('[VoiceCall] ICE connection state:', state);
      
      if (state === 'connected') {
        console.log('[VoiceCall] ICE connected - audio should flow now');
      } else if (state === 'failed') {
        setCallError('Connection failed. Please try again.');
      }
    };

    peerConnectionRef.current.onconnectionstatechange = () => {
      console.log('[VoiceCall] Connection state:', peerConnectionRef.current?.connectionState);
    };

    peerConnectionRef.current.ontrack = (event) => {
      console.log('[VoiceCall] Remote track received:', event.track.kind);
      
      remoteStreamRef.current = event.streams[0];
      
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().then(() => {
          console.log('[VoiceCall] Remote audio playing');
        }).catch((e) => {
          console.error('[VoiceCall] Remote audio play error:', e);
        });
      }
    };

    // Get local audio stream with optimized settings
    try {
      console.log('[VoiceCall] Requesting microphone access');
      
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: false,
      });

      console.log('[VoiceCall] Got local stream, adding tracks');
      
      localStreamRef.current.getTracks().forEach(track => {
        console.log('[VoiceCall] Adding track:', track.kind, 'enabled:', track.enabled);
        peerConnectionRef.current?.addTrack(track, localStreamRef.current!);
      });

    } catch (error: any) {
      console.error('[VoiceCall] Error getting audio stream:', error);
      throw error;
    }
  };

  const startCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const startCall = async (conversationId: string, otherUserId: string) => {
    if (!user) return;

    console.log('[VoiceCall] Starting call to:', otherUserId);

    try {
      setCallStatus('calling');
      setCallError(null);

      // Fetch other user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', otherUserId)
        .single();
      
      if (profileData) {
        setCallerProfile(profileData as Profile);
      }

      // Create call record
      const { data: call, error } = await supabase
        .from('voice_calls')
        .insert({
          conversation_id: conversationId,
          caller_id: user.id,
          receiver_id: otherUserId,
          status: 'calling',
        })
        .select()
        .single();

      if (error) throw error;

      console.log('[VoiceCall] Call created:', call.id);
      setCurrentCall(call as VoiceCall);
      currentCallIdRef.current = call.id;

      // Setup WebRTC
      await setupPeerConnection();

      // Create and send offer
      console.log('[VoiceCall] Creating offer');
      const offer = await peerConnectionRef.current!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await peerConnectionRef.current!.setLocalDescription(offer);
      
      // Wait a moment for ICE gathering
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await sendSignal('offer', peerConnectionRef.current!.localDescription);
      console.log('[VoiceCall] Offer sent');

      // Auto-end if not answered within 30 seconds
      setTimeout(async () => {
        if (callStatus === 'calling' && currentCallIdRef.current === call.id) {
          await supabase
            .from('voice_calls')
            .update({ status: 'missed' })
            .eq('id', call.id);
          cleanup();
          setCurrentCall(null);
          setCallerProfile(null);
          setCallStatus('idle');
          toast.info('No answer');
        }
      }, 30000);

    } catch (error: any) {
      console.error('[VoiceCall] Error starting call:', error);
      const errorMessage = error?.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow microphone access to make calls.'
        : error?.message || 'Failed to start call';
      setCallError(errorMessage);
      cleanup();
      setCallStatus('idle');
    }
  };

  const acceptCall = async () => {
    if (!user || !currentCall) return;

    console.log('[VoiceCall] Accepting call:', currentCall.id);

    try {
      ringtoneRef.current?.pause();
      setCallError(null);

      // Setup WebRTC first (this will process the pending offer)
      await setupPeerConnection();

      // Update call status
      await supabase
        .from('voice_calls')
        .update({
          status: 'accepted',
          started_at: new Date().toISOString(),
        })
        .eq('id', currentCall.id);

      setCallStatus('connected');
      startCallTimer();
      console.log('[VoiceCall] Call accepted successfully');

    } catch (error: any) {
      console.error('[VoiceCall] Error accepting call:', error);
      const errorMessage = error?.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow microphone access.'
        : error?.message || 'Failed to accept call';
      setCallError(errorMessage);
      cleanup();
      setCallStatus('idle');
    }
  };

  const rejectCall = async () => {
    if (!currentCall) return;

    console.log('[VoiceCall] Rejecting call:', currentCall.id);

    try {
      ringtoneRef.current?.pause();

      await supabase
        .from('voice_calls')
        .update({ status: 'rejected' })
        .eq('id', currentCall.id);

      cleanup();
      setCurrentCall(null);
      setCallerProfile(null);
      setCallStatus('idle');

    } catch (error) {
      console.error('[VoiceCall] Error rejecting call:', error);
    }
  };

  const endCall = async () => {
    console.log('[VoiceCall] Ending call');

    if (currentCall) {
      try {
        await supabase
          .from('voice_calls')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', currentCall.id);
      } catch (error) {
        console.error('[VoiceCall] Error ending call:', error);
      }
    }

    cleanup();
    setCurrentCall(null);
    setCallerProfile(null);
    setCallStatus('idle');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        console.log('[VoiceCall] Mute toggled, track enabled:', track.enabled);
      });
      setIsMuted(!isMuted);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const clearError = () => setCallError(null);

  const copyError = () => {
    if (callError) {
      navigator.clipboard.writeText(callError);
      toast.success('Error copied to clipboard');
    }
  };

  return (
    <VoiceCallContext.Provider
      value={{
        currentCall,
        callStatus,
        isMuted,
        callDuration,
        callError,
        callerProfile,
        formatDuration,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        clearError,
        copyError,
      }}
    >
      {children}
    </VoiceCallContext.Provider>
  );
};
