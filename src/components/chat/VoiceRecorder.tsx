import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  conversationId: string;
  onVoiceSent: () => void;
}

export const VoiceRecorder = ({ conversationId, onVoiceSent }: VoiceRecorderProps) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
    setAudioBlob(null);
    setRecordingTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob || !user) return;

    setUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}.webm`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(uploadData.path);

      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: '🎤 Voice message',
        media_url: urlData.publicUrl,
        media_type: 'audio',
        message_type: 'audio',
      });

      if (msgError) throw msgError;

      setAudioBlob(null);
      setRecordingTime(0);
      toast.success('Voice message sent');
      onVoiceSent();
    } catch (error: any) {
      console.error('Error sending voice message:', error);
      toast.error('Failed to send voice message');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioBlob) {
    return (
      <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-2">
        <audio src={URL.createObjectURL(audioBlob)} controls className="h-8 max-w-[150px]" />
        <span className="text-xs text-muted-foreground">{formatTime(recordingTime)}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={cancelRecording}
          className="h-8 w-8 text-destructive"
        >
          <X className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          onClick={sendVoiceMessage}
          disabled={uploading}
          className="h-8 w-8"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-destructive/10 rounded-xl px-3 py-2">
        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm text-destructive font-medium">{formatTime(recordingTime)}</span>
        <span className="text-xs text-muted-foreground">Recording...</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={cancelRecording}
          className="h-8 w-8 text-destructive"
        >
          <X className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          onClick={stopRecording}
          className="h-8 w-8 bg-destructive hover:bg-destructive/90"
        >
          <Square className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={startRecording}
      className="h-12 w-12 rounded-xl text-muted-foreground hover:text-foreground"
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
};
