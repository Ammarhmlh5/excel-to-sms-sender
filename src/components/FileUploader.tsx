import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

function isValidExcelFile(file: File): boolean {
  const validExtensions = ['.xlsx', '.xls'];
  const validMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  const hasValidMimeType = validMimeTypes.includes(file.type);
  return hasValidExtension || hasValidMimeType;
}

function validateFile(file: File): boolean {
  if (!isValidExcelFile(file)) {
    toast.error('صيغة الملف غير صالحة — الرجاء استخدام .xlsx أو .xls');
    return false;
  }
  if (file.size > MAX_FILE_SIZE) {
    toast.error(`الملف أكبر من ${MAX_FILE_SIZE_MB} ميجابايت — الرجاء تقليل حجم الملف`);
    return false;
  }
  return true;
}

const FileUploader = ({ onFileSelect, selectedFile, onClear }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  if (selectedFile) {
    return (
      <div className="flex items-center justify-between p-4 bg-accent/10 border-2 border-accent/30 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 gradient-accent rounded-lg flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} كيلوبايت
            </p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="p-2 hover:bg-destructive/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-destructive" />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-secondary/50"
      )}
    >
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileInput}
        className="hidden"
      />
      <div className={cn(
        "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300",
        isDragging ? "gradient-primary" : "bg-secondary"
      )}>
        <Upload className={cn(
          "w-8 h-8 transition-colors",
          isDragging ? "text-primary-foreground" : "text-primary"
        )} />
      </div>
      <p className="text-lg font-medium text-foreground mb-1">
        اسحب وأفلت ملف Excel هنا
      </p>
      <p className="text-sm text-muted-foreground">
        أو انقر لاختيار ملف (xlsx, xls)
      </p>
    </label>
  );
};

export default FileUploader;
