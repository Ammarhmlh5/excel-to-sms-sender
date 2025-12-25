import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SendButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  contactCount: number;
}

const SendButton = ({ onClick, disabled, isLoading, contactCount }: SendButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="w-full h-14 text-lg font-semibold gradient-primary hover:opacity-90 transition-opacity disabled:opacity-50"
      size="lg"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 ml-2 animate-spin" />
          جاري الإرسال...
        </>
      ) : (
        <>
          <Send className="w-5 h-5 ml-2" />
          إرسال الرسائل ({contactCount} جهة اتصال)
        </>
      )}
    </Button>
  );
};

export default SendButton;
