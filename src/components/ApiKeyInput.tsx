import { useState } from 'react';
import { Key, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
}

const ApiKeyInput = ({ value, onChange }: ApiKeyInputProps) => {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Key className="w-4 h-4 text-primary" />
        مفتاح API لمنصة الهدهد (لإرسال الرسائل)
      </label>
      <div className="relative">
        <Input
          type={showKey ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="أدخل مفتاح API الخاص بمنصة الهدهد..."
          className="pl-12 h-12 text-base"
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded transition-colors"
        >
          {showKey ? (
            <EyeOff className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Eye className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        هذا المفتاح مختلف عن كلمة مرور حسابك - يمكنك الحصول عليه من لوحة تحكم منصة الهدهد للرسائل
      </p>
    </div>
  );
};

export default ApiKeyInput;
