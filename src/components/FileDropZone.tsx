import { useState, useCallback } from 'react';
import { Upload, FileCheck, X, HardDrive } from 'lucide-react';

interface FileDropZoneProps {
  onFileSelect?: (files: File[]) => void;
  acceptAll?: boolean;
  accept?: string;
  title?: string;
  hint?: string;
  maxSizeText?: string;
  progress?: Record<string, number>;
  uploadingFileName?: string;
  error?: string;
}

const DEFAULT_ACCEPT = '.rom,.bin,.cap,.hpm,.iso,.exe';

function matchesAccept(file: File, accept: string) {
  const accepts = accept.split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  const fileName = file.name.toLowerCase();
  return accepts.some(item => item.startsWith('.') ? fileName.endsWith(item) : file.type === item);
}

export default function FileDropZone({
  onFileSelect,
  acceptAll = false,
  accept = DEFAULT_ACCEPT,
  title = '拖拽固件文件到此处',
  hint = '或点击浏览文件 (.rom, .bin, .cap, .hpm, .iso)',
  maxSizeText = '最大文件大小: 2 GB',
  progress,
  uploadingFileName,
  error,
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const acceptedFiles = acceptAll ? files : files.filter(f => matchesAccept(f, accept));

    if (acceptedFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...acceptedFiles]);
      onFileSelect?.(acceptedFiles);
    }
  }, [acceptAll, accept, onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const acceptedFiles = acceptAll ? files : files.filter(f => matchesAccept(f, accept));
    if (acceptedFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...acceptedFiles]);
      onFileSelect?.(acceptedFiles);
    }
  }, [acceptAll, accept, onFileSelect]);

  const removeFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-500 overflow-hidden ${
          isDragOver
            ? 'border-[#36F4C2] bg-amax/5 shadow-[0_0_30px_rgba(54,244,194,0.1)]'
            : 'border-white/10 bg-white/[0.02] hover:border-white/20'
        }`}
        style={{
          boxShadow: isDragOver
            ? '0 0 30px rgba(54, 244, 194, 0.15), inset 0 0 30px rgba(54, 244, 194, 0.05)'
            : undefined,
        }}
      >
        {/* Electric animation on drag */}
        {isDragOver && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 rounded-2xl"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(54,244,194,0.05), transparent)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          </div>
        )}

        <label className="flex flex-col items-center justify-center py-12 px-6 cursor-pointer">
          <input
            type="file"
            multiple
            accept={acceptAll ? undefined : accept}
            onChange={handleFileInput}
            className="hidden"
          />

          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
            isDragOver
              ? 'bg-amax/20 scale-110'
              : 'bg-white/5'
          }`}>
            <Upload className={`w-8 h-8 transition-colors ${
              isDragOver ? 'text-amax' : 'text-tm'
            }`} />
          </div>

          <p className="text-white font-medium text-base mb-1">
            {isDragOver ? '释放以上传文件' : title}
          </p>
          <p className="text-tm text-sm mb-3">
            {hint}
          </p>

          <div className="flex items-center gap-2 text-xs text-tm">
            <HardDrive className="w-3 h-3" />
            <span>{maxSizeText}</span>
          </div>
        </label>
      </div>

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((file) => {
            const percent = progress?.[file.name] ?? 100;
            return (
            <div
              key={file.name}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
            >
              <FileCheck className="w-5 h-5 text-amax flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white truncate">{file.name}</span>
                  <button
                    onClick={() => removeFile(file.name)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                  >
                    <X className="w-3 h-3 text-tm" />
                  </button>
                </div>

                {error && file.name === uploadingFileName && (
                  <p className="text-xs text-tdf mb-2">{error}</p>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amax rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-tm font-mono-data w-10 text-right">
                    {Math.round(percent)}%
                  </span>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
