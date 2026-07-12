import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Phone, User, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ColumnMapping } from '@/lib/columnDetection';


interface ColumnMapperProps {
  headers: string[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  autoDetected: boolean;
}

const ColumnMapper = ({ headers, mapping, onMappingChange, autoDetected }: ColumnMapperProps) => {
  const handleChange = (field: keyof ColumnMapping, value: string) => {
    onMappingChange({
      ...mapping,
      [field]: value === 'none' ? '' : value,
    });
  };

  const columns = [
    { key: 'phone' as const, label: 'رقم الهاتف', icon: Phone, required: true },
    { key: 'name' as const, label: 'اسم العميل', icon: User, required: false },
    { key: 'message' as const, label: 'نص الرسالة', icon: MessageSquare, required: false },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">تحديد الأعمدة</h3>
        {autoDetected && (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            تم التعرف تلقائياً
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(({ key, label, icon: Icon, required }) => (
          <div key={key} className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Icon className="w-4 h-4 text-muted-foreground" />
              {label}
              {required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={mapping[key] || 'none'}
              onValueChange={(value) => handleChange(key, value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`اختر عمود ${label}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- لا شيء --</SelectItem>
                {headers.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      
      {!mapping.phone && (
        <p className="text-sm text-destructive flex items-center gap-1">
          ⚠️ يجب تحديد عمود رقم الهاتف
        </p>
      )}
      {!mapping.message && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          💡 يمكنك تحديد عمود الرسالة أو كتابة رسالة افتراضية لاحقاً
        </p>
      )}
    </div>
  );
};

export default ColumnMapper;
