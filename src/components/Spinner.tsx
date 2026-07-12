interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-4',
};

export function Spinner({ size = 'md', color = 'border-current', className = '' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="جاري التحميل"
      className={`${sizeMap[size]} ${color} border-t-transparent rounded-full animate-spin ${className}`}
    >
      <span className="sr-only">جاري التحميل...</span>
    </div>
  );
}
