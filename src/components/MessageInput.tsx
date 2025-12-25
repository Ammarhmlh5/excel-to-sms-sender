import { MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
}

const MessageInput = ({ value, onChange }: MessageInputProps) => {
  const charCount = value.length;
  const smsCount = Math.ceil(charCount / 70) || 1;

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MessageSquare className="w-4 h-4 text-primary" />
        نص الرسالة النصية
      </label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="اكتب نص الرسالة هنا..."
        className="min-h-32 text-base resize-none"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{charCount} حرف</span>
        <span>{smsCount} رسالة SMS</span>
      </div>
    </div>
  );
};

export default MessageInput;
