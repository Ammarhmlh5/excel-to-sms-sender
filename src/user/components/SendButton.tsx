import { useState } from 'react';
import { Send, Loader2, Mail } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

interface SendButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  contactCount: number;
  sendMode?: 'sms' | 'email';
}

const SendButton = ({ onClick, disabled, isLoading, contactCount, sendMode = 'email' }: SendButtonProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isEmail = sendMode === 'email';

  const handleClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    onClick();
  };

  return (
    <>
      <Button
        onClick={handleClick}
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
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="تأكيد الإرسال"
        description={`هل أنت متأكد من إرسال ${contactCount} ${isEmail ? 'بريد إلكتروني' : 'رسالة SMS'}؟ لا يمكن التراجع عن هذا الإجراء.`}
        onConfirm={handleConfirm}
      />
    </>
  );
};

export default SendButton;
