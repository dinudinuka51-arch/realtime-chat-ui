import { Phone, PhoneOff, Mic, MicOff, Copy, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceCallContext } from '@/contexts/VoiceCallContext';

export const GlobalCallUI = () => {
  const {
    callStatus,
    callerProfile,
    isMuted,
    callDuration,
    callError,
    formatDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    clearError,
    copyError,
  } = useVoiceCallContext();

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

  // Error dialog with copy functionality
  if (callError) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl"
        >
          <div className="flex flex-col items-center gap-6 p-8 max-w-md text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Call Failed</h2>
              <div className="bg-muted/50 rounded-lg p-3 mb-2">
                <p className="text-sm text-muted-foreground font-mono break-all select-all">
                  {callError}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={copyError} variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Copy Error
              </Button>
              <Button onClick={clearError} variant="secondary">
                Close
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (callStatus === 'idle' || callStatus === 'ended' || !callerProfile) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        {/* Background blur */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background/95 to-background/95 backdrop-blur-xl" />
        
        {/* Call content */}
        <div className="relative flex flex-col items-center gap-8 p-8 w-full max-w-sm">
          {/* Incoming call indicator for ringing */}
          {callStatus === 'ringing' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-0 left-0 right-0 flex justify-center"
            >
              <div className="bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium">
                📞 Incoming Voice Call
              </div>
            </motion.div>
          )}

          {/* Avatar with pulse animation */}
          <motion.div
            animate={callStatus !== 'connected' ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="relative"
          >
            {/* Pulse rings */}
            {callStatus !== 'connected' && (
              <>
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
              </>
            )}
            
            {/* Connected indicator */}
            {callStatus === 'connected' && (
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
              </div>
            )}
            
            <Avatar className="w-32 h-32 border-4 border-primary/50 shadow-2xl shadow-primary/30 relative z-10">
              <AvatarImage src={callerProfile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                {getInitials(callerProfile.full_name, callerProfile.username)}
              </AvatarFallback>
            </Avatar>
          </motion.div>

          {/* Name and status */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {callerProfile.full_name || callerProfile.username}
            </h2>
            <motion.p
              className="text-lg text-muted-foreground"
              animate={callStatus !== 'connected' ? { opacity: [0.5, 1, 0.5] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {getStatusText()}
            </motion.p>
            {callStatus === 'connected' && (
              <p className="text-sm text-green-500 mt-1 flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Connected
              </p>
            )}
          </div>

          {/* Call controls */}
          <div className="flex items-center gap-6 mt-4">
            {callStatus === 'ringing' ? (
              <>
                {/* Reject call */}
                <motion.div 
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-destructive/30 rounded-full animate-ping" />
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-16 h-16 rounded-full shadow-lg shadow-destructive/30 relative"
                    onClick={rejectCall}
                  >
                    <PhoneOff className="w-7 h-7" />
                  </Button>
                </motion.div>

                {/* Accept call */}
                <motion.div 
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-green-500/30 rounded-full animate-ping" />
                  <Button
                    size="lg"
                    className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30 relative"
                    onClick={acceptCall}
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
                    variant={isMuted ? 'destructive' : 'secondary'}
                    size="lg"
                    className="w-14 h-14 rounded-full"
                    onClick={toggleMute}
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
                    onClick={endCall}
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
                  onClick={endCall}
                >
                  <PhoneOff className="w-7 h-7" />
                </Button>
              </motion.div>
            )}
          </div>

          {/* Cancel button for calling state */}
          {callStatus === 'calling' && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-muted-foreground"
              onClick={endCall}
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
