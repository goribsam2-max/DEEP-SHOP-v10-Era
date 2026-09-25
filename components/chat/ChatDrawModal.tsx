import React, { useRef, useState, useEffect } from 'react';
import { X, Send, Undo2, Trash2, Eraser, Pen, Palette } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendDrawing: (dataUrl: string) => void;
}

const COLORS = [
  '#000000', // Black
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#FFFFFF', // White
];

const BRUSH_SIZES = [
  { label: 'Fine', size: 3 },
  { label: 'Medium', size: 6 },
  { label: 'Bold', size: 12 },
];

export const ChatDrawModal: React.FC<ChatDrawModalProps> = ({
  isOpen,
  onClose,
  onSendDrawing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#3B82F6');
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas internal resolution
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        // Fill white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
        setHistory([canvas.toDataURL()]);
      }
    }
  }, [isOpen]);

  const saveHistoryState = () => {
    if (canvasRef.current) {
      const data = canvasRef.current.toDataURL();
      setHistory((prev) => [...prev.slice(-15), data]);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isEraser ? '#FFFFFF' : color;
    ctx.lineWidth = brushSize;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveHistoryState();
    }
  };

  const handleUndo = () => {
    if (history.length <= 1 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop();
    const previousState = newHistory[newHistory.length - 1];
    setHistory(newHistory);

    const img = new Image();
    img.src = previousState;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
    };
  };

  const handleClear = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    saveHistoryState();
  };

  const handleSend = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSendDrawing(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-base">Quick Draw</span>
            <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">New</span>
          </div>
          <button
            type="button"
            onClick={handleSend}
            className="px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>

        {/* Canvas Area */}
        <div className="relative w-full h-80 sm:h-96 bg-white overflow-hidden touch-none select-none cursor-crosshair">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 space-y-3">
          {/* Colors */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  setIsEraser(false);
                }}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-full shrink-0 border-2 transition-transform ${
                  color === c && !isEraser
                    ? 'border-white scale-125 shadow-md'
                    : 'border-zinc-700 hover:scale-110'
                }`}
              />
            ))}
          </div>

          {/* Tools & Size */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEraser(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  !isEraser ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Pen className="w-3.5 h-3.5" />
                <span>Pen</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEraser(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  isEraser ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Eraser</span>
              </button>
            </div>

            {/* Brush Sizes */}
            <div className="flex items-center gap-1.5 bg-zinc-800/80 p-1 rounded-xl">
              {BRUSH_SIZES.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => setBrushSize(b.size)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    brushSize === b.size ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length <= 1}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 transition"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-red-400 transition"
                title="Clear Canvas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
