import { Phone, PhoneOff, Mic, MicOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Profile } from '@/types/chat';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceCallUIProps {
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  otherUser: Profile;
  isMuted: boolean;
  callDuration: number;
  formatDuration: (seconds: number) => string;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
}

export const VoiceCallUI = ({
  callStatus,
  otherUser,
  isMuted,
  callDuration,
  formatDuration,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
}: VoiceCallUIProps) => {
  const getInitials = (name: string | null, username: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'calling':
        return 'Calling...';
      case 'ringing':
        return 'Incoming call...';
      case 'connected':
        return formatDuration(callDuration);
      default:
        return '';
    }
  };

  if (callStatus === 'idle' || callStatus === 'ended') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl"
      >
        <div className="flex flex-col items-center gap-8 p-8">
          {/* Avatar with animation */}
          <motion.div
            animate={callStatus === 'calling' || callStatus === 'ringing' ? {
              scale: [1, 1.1, 1],
            } : {}}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative"
          >
            <div className={`absolute inset-0 rounded-full bg-primary/30 ${callStatus === 'connected' ? '' : 'animate-ping'}`} 
                 style={{ transform: 'scale(1.2)' }} />
            <Avatar className="w-32 h-32 border-4 border-primary shadow-lg shadow-primary/30">
              <AvatarImage src={otherUser.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                {getInitials(otherUser.full_name, otherUser.username)}
              </AvatarFallback>
            </Avatar>
          </motion.div>

          {/* Name and status */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {otherUser.full_name || otherUser.username}
            </h2>
            <motion.p 
              className="text-lg text-muted-foreground"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {getStatusText()}
            </motion.p>
          </div>

          {/* Call controls */}
          <div className="flex items-center gap-6 mt-8">
            {callStatus === 'ringing' ? (
              <>
                {/* Reject call */}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-16 h-16 rounded-full shadow-lg shadow-destructive/30"
                    onClick={onReject}
                  >
                    <PhoneOff className="w-7 h-7" />
                  </Button>
                </motion.div>

                {/* Accept call */}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
                    onClick={onAccept}
                  >
                    <Phone className="w-7 h-7" />
                  </Button>
                </motion.div>
              </>
            ) : callStatus === 'connected' ? (
              <>
                {/* Mute toggle */}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant={isMuted ? "destructive" : "secondary"}
                    size="lg"
                    className="w-14 h-14 rounded-full"
                    onClick={onToggleMute}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </Button>
                </motion.div>

                {/* End call */}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-16 h-16 rounded-full shadow-lg shadow-destructive/30"
                    onClick={onEnd}
                  >
                    <PhoneOff className="w-7 h-7" />
                  </Button>
                </motion.div>
              </>
            ) : (
              /* Calling - show end button */
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-16 h-16 rounded-full shadow-lg shadow-destructive/30"
                  onClick={onEnd}
                >
                  <PhoneOff className="w-7 h-7" />
                </Button>
              </motion.div>
            )}
          </div>

          {/* Close button */}
          {callStatus === 'calling' && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-muted-foreground"
              onClick={onEnd}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
