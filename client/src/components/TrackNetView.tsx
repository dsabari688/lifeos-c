import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, Activity, CheckCircle, AlertCircle, PlaySquare, Eye } from "lucide-react";
import { useStore } from "../store/useStore";

export const TrackNetView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animationIndex, setAnimationIndex] = useState(0);
  const { token } = useStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    
    const formData = new FormData();
    formData.append("video", file);

    try {
      const response = await fetch("/api/vision/track", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process video.");
      }

      setResult(data);
      setAnimationIndex(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Canvas drawing effect for trajectory plotting
  useEffect(() => {
    if (!result || !result.trajectory || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const points = result.trajectory;
    const width = result.width || 640;
    const height = result.height || 480;

    const draw = () => {
      // Clear
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw radar grid lines
      ctx.strokeStyle = "rgba(79, 70, 229, 0.15)";
      ctx.lineWidth = 1;
      
      // Vertical grid lines
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      // Horizontal grid lines
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw tracking targets/coordinates
      if (points.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2.5;
        
        // Scale points to canvas dimensions
        const scaleX = canvas.width / width;
        const scaleY = canvas.height / height;

        ctx.moveTo(points[0][0] * scaleX, points[0][1] * scaleY);
        
        // Limit path drawing up to active animation index
        const drawLimit = Math.min(points.length, animationIndex + 1);
        for (let i = 1; i < drawLimit; i++) {
          ctx.lineTo(points[i][0] * scaleX, points[i][1] * scaleY);
        }
        ctx.stroke();

        // Draw active tracking reticle at current sample
        const currentPtIdx = Math.min(points.length - 1, animationIndex);
        const curX = points[currentPtIdx][0] * scaleX;
        const curY = points[currentPtIdx][1] * scaleY;

        ctx.beginPath();
        ctx.arc(curX, curY, 8, 0, Math.PI * 2);
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw reticle crosshair lines
        ctx.beginPath();
        ctx.moveTo(curX - 15, curY);
        ctx.lineTo(curX + 15, curY);
        ctx.moveTo(curX, curY - 15);
        ctx.lineTo(curX, curY + 15);
        ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Output coordinates overlay
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px JetBrains Mono";
        ctx.fillText(`Target Centroid: X:${points[currentPtIdx][0]} Y:${points[currentPtIdx][1]}`, 10, 20);
      }

      // Scanline animation visual
      const scanY = (Date.now() / 8) % canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(canvas.width, scanY);
      ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [result, animationIndex]);

  // Telemetry frame loop timer
  useEffect(() => {
    if (!result || !result.trajectory) return;
    const interval = setInterval(() => {
      setAnimationIndex((prev) => (prev + 1) % result.trajectory.length);
    }, 100);
    return () => clearInterval(interval);
  }, [result]);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white tracking-tight">TrackNet Intelligence</h2>
          <p className="text-xs text-slate-500 dark:text-slate-450 font-sans mt-0.5">Deep Learning Object Tracking Engine</p>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-150 rounded-lg px-2.5 py-1 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            ENGINE: ONLINE
          </span>
        </div>
      </div>

      {/* Upload Interface */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <div 
          className="border-2 border-dashed border-slate-350 dark:border-slate-800 rounded-xl p-12 text-center hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="video/mp4,video/x-m4v,video/*" 
            className="hidden" 
          />
          
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/20 rounded-full flex items-center justify-center">
              <UploadCloud className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-slate-850 dark:text-slate-250 mb-2 font-display">
            {file ? file.name : "Initialize Video Upload"}
          </h3>
          <p className="text-sm text-slate-550 dark:text-slate-400 max-w-sm mx-auto mb-6">
            {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB payload ready for inference.` : "Select or drag a video file to engage the deep learning tracking protocol."}
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUpload();
            }}
            disabled={!file || isProcessing}
            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 mx-auto ${
              !file 
                ? "bg-slate-100 text-slate-400 dark:bg-slate-850 cursor-not-allowed" 
                : isProcessing
                  ? "bg-amber-500 text-slate-950 animate-pulse cursor-wait"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:shadow-md"
            }`}
          >
            {isProcessing ? (
              <>
                <Activity className="w-4 h-4 animate-spin" /> Processing Inference...
              </>
            ) : (
              <>
                <PlaySquare className="w-4 h-4" /> Engage TrackNet
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results/Error Panel */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/35 rounded-xl p-5 flex items-start gap-4 mt-6 animate-in slide-in-from-top-4">
          <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-800 dark:text-rose-450 text-sm">System Error</h4>
            <p className="text-xs text-rose-650 dark:text-rose-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 animate-in fade-in duration-300">
          
          {/* Canvas Plotter Panel */}
          <div className="lg:col-span-2 bg-slate-950 border border-slate-850 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4 font-mono">
              <div className="flex items-center gap-2">
                <Eye className="w-4.5 h-4.5 text-amber-500" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Visual Radar Coordinate Plot</span>
              </div>
              <span className="text-[10px] text-amber-400 font-bold uppercase">Sample Point: {animationIndex + 1}/{result.trajectory.length}</span>
            </div>
            
            <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-900">
              <canvas 
                ref={canvasRef} 
                width={640} 
                height={360} 
                className="w-full h-full object-cover block"
              />
            </div>
            
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest text-right mt-3">
              Telemetry rendering rate: 100ms per sample node
            </div>
          </div>

          {/* Metadata Analytics Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <h3 className="font-display font-bold text-slate-850 dark:text-white text-sm">Inference Telemetry</h3>
              </div>

              <div className="space-y-4 font-mono text-xs text-slate-700 dark:text-slate-350">
                <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-850 space-y-3.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Status:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{result.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Analyzed Payload:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold max-w-[120px] truncate" title={result.file_analyzed}>{result.file_analyzed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Resolution Vector:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">{result.width} x {result.height}px</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Inference Rate:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">{result.fps} FPS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Telemetry Samples:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">{result.frame_count} frames</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-850 text-slate-300 p-4 rounded-xl text-[11px] leading-relaxed italic">
                  💡 "{result.message}"
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-sans border-t border-slate-100 dark:border-slate-800 pt-3 mt-4">
              Visual analytics coordinates dynamically synced with Personal Command Cockpit database channels.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};