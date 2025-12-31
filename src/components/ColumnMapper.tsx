import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Phone, User, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface ColumnMapping {
  phone: string;
  name: string;
  message: string;
}

interface ColumnMapperProps {
  headers: string[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  autoDetected: boolean;
}

const PHONE_PATTERNS = [
  /phone/i, /mobile/i, /رقم/i, /هاتف/i, /جوال/i, /موبايل/i, /tel/i, /cell/i
];

const NAME_PATTERNS = [
  /name/i, /اسم/i, /إسم/i, /مشترك/i, /عميل/i, /customer/i, /client/i
];

const MESSAGE_PATTERNS = [
  /message/i, /sms/i, /رسالة/i, /نص/i, /text/i, /msg/i, /content/i
];

export const detectColumnType = (header: string): 'phone' | 'name' | 'message' | null => {
  const normalizedHeader = header.toLowerCase().replace(/[_-]/g, '');
  
  if (PHONE_PATTERNS.some(pattern => pattern.test(normalizedHeader))) {
    return 'phone';
  }
  if (NAME_PATTERNS.some(pattern => pattern.test(normalizedHeader))) {
    return 'name';
  }
  if (MESSAGE_PATTERNS.some(pattern => pattern.test(normalizedHeader))) {
    return 'message';
  }
  return null;
};

export const autoDetectColumns = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = { phone: '', name: '', message: '' };
  
  headers.forEach((header) => {
    const type = detectColumnType(header);
    if (type && !mapping[type]) {
      mapping[type] = header;
    }
  });
  
  return mapping;
};

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
    { key: 'message' as const, label: 'نص الرسالة', icon: MessageSquare, required: true },
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
        <p className="text-sm text-destructive flex items-center gap-1">
          ⚠️ يجب تحديد عمود نص الرسالة
        </p>
      )}
    </div>
  );
};

export default ColumnMapper;
