import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { VoiceCall, CallSignal } from '@/types/chat';
import { toast } from 'sonner';

interface UseVoiceCallProps {
  conversationId: string;
  otherUserId: string;
}

export const useVoiceCall = ({ conversationId, otherUserId }: UseVoiceCallProps) => {
  const { user } = useAuth();
  const [currentCall, setCurrentCall] = useState<VoiceCall | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Initialize audio elements
  useEffect(() => {
    remoteAudioRef.current = new Audio();
    remoteAudioRef.current.autoplay = true;
    
    // Create ringtone
    ringtoneRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleT4IMYHL5MCAbBw2i9n5xmUVK3vO9ct2Gi194/rNdhkyd+r9zXEZMXnv/c5wGTF68P3OcBkxe/H9z3AZMXvy/c9wGTF78/3PcBkxe/T9z3AZMXv1/c9wGTF79v3PcBkxe/f9z3AZMXv4/c9wGTF7+f3PcBkxe/r9z3AZMXv7/c9wGTF7/P3PcBkxe/39z3AZMXv+/c9wGTF7//3PcBkxfAD+z3AZMXwB/s9wGTF8Av7PcBkxfAP+z3AZMXwE/s9wGTF8Bf7PcBkxfAb+z3AZMXwH/s9wGTF8CP7PcBkxfAn+z3AZMXwK/s9wGTF8C/7PcBkxfAz+z3AZMXwN/s9wGTF8Dv7PcBkxfA/+z3AZMXwQ/s9wGTF8Ef7PcBkxfBL+z3AZMXwT/s9wGTF8FP7PcBkxfBX+z3AZMXwW/s9wGTF8F/7PcBkxfBj+z3AZMXwZ/s9wGTF8Gv7PcBkxfBv+z3AZMXwc/s9wGTF8Hf7PcBkxfB7+z3AZMXwf/s9wGTF8IP7PcBkxfCH+z3AZMXwi/s9wGTF8I/7PcBkxfCT+z3AZ');
    ringtoneRef.current.loop = true;

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    
    setCallDuration(0);
    setIsMuted(false);
  }, []);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`calls:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_calls',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const call = payload.new as VoiceCall;
          if (call.receiver_id === user.id && call.status === 'calling') {
            setCurrentCall(call);
            setCallStatus('ringing');
            ringtoneRef.current?.play().catch(console.error);
            toast.info('Incoming call...');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'voice_calls',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const call = payload.new as VoiceCall;
          
          if (call.status === 'accepted' && currentCall?.id === call.id) {
            setCurrentCall(call);
            setCallStatus('connected');
            ringtoneRef.current?.pause();
            startCallTimer();
          } else if (['rejected', 'ended', 'missed'].includes(call.status)) {
            if (currentCall?.id === call.id) {
              toast.info(call.status === 'rejected' ? 'Call declined' : 'Call ended');
              endCall();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, currentCall]);

  // Listen for WebRTC signals
  useEffect(() => {
    if (!user || !currentCall) return;

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
          if (signal.receiver_id === user.id) {
            await handleSignal(signal);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCall, user]);

  const handleSignal = async (signal: CallSignal) => {
    if (!peerConnectionRef.current) return;

    try {
      if (signal.signal_type === 'offer') {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(signal.signal_data)
        );
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        await sendSignal('answer', answer);
      } else if (signal.signal_type === 'answer') {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(signal.signal_data)
        );
      } else if (signal.signal_type === 'ice-candidate') {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(signal.signal_data)
        );
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  };

  const sendSignal = async (type: string, data: any) => {
    if (!user || !currentCall) return;

    const receiverId = currentCall.caller_id === user.id 
      ? currentCall.receiver_id 
      : currentCall.caller_id;

    await supabase.from('call_signals').insert({
      call_id: currentCall.id,
      sender_id: user.id,
      receiver_id: receiverId,
      signal_type: type,
      signal_data: data,
    });
  };

  const setupPeerConnection = async () => {
    peerConnectionRef.current = new RTCPeerConnection(iceServers);

    peerConnectionRef.current.onicecandidate = async (event) => {
      if (event.candidate) {
        await sendSignal('ice-candidate', event.candidate);
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    // Get local audio stream
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      
      localStreamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, localStreamRef.current!);
      });
    } catch (error) {
      console.error('Error getting audio stream:', error);
      toast.error('Microphone access denied');
      throw error;
    }
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const startCall = async () => {
    if (!user) return;

    try {
      setCallStatus('calling');
      
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
      
      setCurrentCall(call as VoiceCall);
      
      // Setup WebRTC
      await setupPeerConnection();
      
      // Create and send offer
      const offer = await peerConnectionRef.current!.createOffer();
      await peerConnectionRef.current!.setLocalDescription(offer);
      await sendSignal('offer', offer);
      
      toast.info('Calling...');
      
      // Auto-end if not answered within 30 seconds
      setTimeout(async () => {
        if (callStatus === 'calling') {
          await supabase
            .from('voice_calls')
            .update({ status: 'missed' })
            .eq('id', call.id);
          endCall();
          toast.info('No answer');
        }
      }, 30000);
      
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
      cleanup();
      setCallStatus('idle');
    }
  };

  const acceptCall = async () => {
    if (!user || !currentCall) return;

    try {
      ringtoneRef.current?.pause();
      
      // Setup WebRTC
      await setupPeerConnection();
      
      // Update call status
      await supabase
        .from('voice_calls')
        .update({ 
          status: 'accepted',
          started_at: new Date().toISOString()
        })
        .eq('id', currentCall.id);
      
      setCallStatus('connected');
      startCallTimer();
      toast.success('Call connected');
      
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
      cleanup();
      setCallStatus('idle');
    }
  };

  const rejectCall = async () => {
    if (!currentCall) return;

    try {
      ringtoneRef.current?.pause();
      
      await supabase
        .from('voice_calls')
        .update({ status: 'rejected' })
        .eq('id', currentCall.id);
      
      cleanup();
      setCurrentCall(null);
      setCallStatus('idle');
      
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  };

  const endCall = async () => {
    if (currentCall) {
      try {
        await supabase
          .from('voice_calls')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', currentCall.id);
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
    
    cleanup();
    setCurrentCall(null);
    setCallStatus('idle');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    callStatus,
    currentCall,
    isMuted,
    callDuration,
    formatDuration,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  };
};
