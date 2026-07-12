import { Send, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SendButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  contactCount: number;
  sendMode?: 'sms' | 'email';
}

const SendButton = ({ onClick, disabled, isLoading, contactCount, sendMode = 'email' }: SendButtonProps) => {
  const isEmail = sendMode === 'email';
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
          {isEmail ? 'جاري إرسال البريد...' : 'جاري الإرسال...'}
        </>
      ) : (
        <>
          {isEmail ? (
            <Mail className="w-5 h-5 ml-2" />
          ) : (
            <Send className="w-5 h-5 ml-2" />
          )}
          {isEmail ? `إرسال عبر البريد (${contactCount} جهة اتصال)` : `إرسال SMS (${contactCount} جهة اتصال)`}
        </>
      )}
    </Button>
  );
};

export default SendButton;
