import React, { useState, useRef, useEffect } from 'react';
import { Music, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { AttachedMusic } from './DeezerMusicPickerModal';

interface FloatingMusicBadgeProps {
  music?: AttachedMusic | null;
  autoPlay?: boolean;
  className?: string;
  compact?: boolean;
}

export const FloatingMusicBadge: React.FC<FloatingMusicBadgeProps> = ({
  music,
  autoPlay = false,
  className = '',
  compact = false,
}) => {
  if (!music || !music.audioUrl) return null;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(music.audioUrl);
    audio.loop = true;
    audioRef.current = audio;

    if (autoPlay) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [music.audioUrl, autoPlay]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  if (compact) {
    return (
      <div 
        onClick={togglePlay}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/20 text-xs font-medium cursor-pointer shadow-lg hover:bg-slate-900 transition-all ${className}`}
      >
        <Music className={`w-3.5 h-3.5 text-indigo-400 ${isPlaying ? 'animate-bounce' : ''}`} />
        <span className="max-w-[120px] truncate text-[11px] font-semibold">{music.title}</span>
        <span className="text-[10px] text-slate-400 truncate max-w-[80px]">- {music.artist}</span>
        {isPlaying ? (
          <Pause className="w-3 h-3 text-indigo-300 ml-0.5 fill-current" />
        ) : (
          <Play className="w-3 h-3 text-indigo-300 ml-0.5 fill-current" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative group flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-black/75 backdrop-blur-md text-white border border-white/15 shadow-xl transition-all hover:bg-black/85 ${className}`}
    >
      {/* Album Cover Art */}
      <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0">
        <img
          src={music.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80'}
          alt={music.title}
          className={`w-full h-full object-cover transition-transform duration-700 ${
            isPlaying ? 'scale-110 rotate-3' : ''
          }`}
        />
        <button
          onClick={togglePlay}
          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-white text-white" />
          ) : (
            <Play className="w-4 h-4 fill-white text-white ml-0.5" />
          )}
        </button>
      </div>

      {/* Meta Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Music className={`w-3 h-3 text-indigo-400 flex-shrink-0 ${isPlaying ? 'animate-spin' : ''}`} />
          <h5 className="text-xs font-semibold text-white truncate max-w-[140px] leading-tight">
            {music.title}
          </h5>
        </div>
        <p className="text-[10px] text-slate-300 truncate max-w-[140px]">
          {music.artist}
        </p>
      </div>

      {/* Equalizer lines or audio controls */}
      <div className="flex items-center gap-1 flex-shrink-0 pl-1">
        {isPlaying ? (
          <div className="flex items-end gap-0.5 h-3 px-1" onClick={togglePlay}>
            <span className="w-0.5 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_100ms] h-full" />
            <span className="w-0.5 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_300ms] h-2/3" />
            <span className="w-0.5 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_200ms] h-4/5" />
          </div>
        ) : (
          <button
            type="button"
            onClick={togglePlay}
            className="w-6 h-6 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors"
          >
            <Play className="w-3 h-3 fill-white ml-0.5" />
          </button>
        )}

        <button
          type="button"
          onClick={toggleMute}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};

export default FloatingMusicBadge;
