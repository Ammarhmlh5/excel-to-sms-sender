import { Button } from '@/shared/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showLabels?: boolean;
}

export default function Pagination({ page, totalPages, onPageChange, className = '', showLabels = true }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronRight className="w-4 h-4 ml-1" />
        {showLabels && 'السابق'}
      </Button>
      {showLabels && (
        <span className="text-sm text-muted-foreground px-3">
          الصفحة {page} من {totalPages}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {showLabels && 'التالي'}
        <ChevronLeft className="w-4 h-4 mr-1" />
      </Button>
    </div>
  );
}
