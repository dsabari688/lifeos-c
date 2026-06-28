import React, { useState, useRef } from "react";
import { UploadCloud, Activity, CheckCircle, AlertCircle, PlaySquare } from "lucide-react";

export const TrackNetView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const token = localStorage.getItem("token") || localStorage.getItem("lifeos_token");
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">TrackNet Intelligence</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Deep Learning Object Tracking Engine</p>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-150 rounded-lg px-2.5 py-1 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            ENGINE: ONLINE
          </span>
        </div>
      </div>

      {/* Upload Interface */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div 
          className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer"
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
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
              <UploadCloud className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            {file ? file.name : "Initialize Video Upload"}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
            {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB payload ready for inference.` : "Select or drag a video file to engage the deep learning tracking protocol."}
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUpload();
            }}
            disabled={!file || isProcessing}
            className={`px-6 py-3 rounded-lg font-bold text-sm transition-all shadow-sm flex items-center gap-2 mx-auto ${
              !file 
                ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                : isProcessing
                  ? "bg-amber-500 text-white animate-pulse cursor-wait"
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
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 flex items-start gap-4 mt-6">
          <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-800 text-sm">System Error</h4>
            <p className="text-sm text-rose-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start gap-4 mt-6">
          <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
          <div className="w-full">
            <h4 className="font-bold text-emerald-800 text-sm">Inference Complete</h4>
            <div className="mt-3 bg-white/60 rounded-lg p-4 border border-emerald-100 font-mono text-xs text-slate-700 space-y-2">
              <p><span className="font-bold text-slate-500">Status:</span> {result.status}</p>
              <p><span className="font-bold text-slate-500">File Analyzed:</span> {result.file_analyzed}</p>
              <p><span className="font-bold text-slate-500">Message:</span> {result.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};