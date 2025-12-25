import { Users, Phone, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Contact {
  name: string;
  phone: string;
  customMessage?: string;
}

interface DataPreviewProps {
  data: Contact[];
  message: string;
}

const DataPreview = ({ data, message }: DataPreviewProps) => {
  if (data.length === 0) return null;

  const hasCustomMessages = data.some(contact => contact.customMessage);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            معاينة البيانات ({data.length} جهة اتصال)
          </h3>
        </div>
        {hasCustomMessages && (
          <Badge variant="secondary" className="gap-1">
            <MessageSquare className="w-3 h-3" />
            رسائل مخصصة من الملف
          </Badge>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-secondary sticky top-0">
            <tr>
              <th className="p-3 text-right text-sm font-medium text-foreground">#</th>
              <th className="p-3 text-right text-sm font-medium text-foreground">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  الاسم
                </div>
              </th>
              <th className="p-3 text-right text-sm font-medium text-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  رقم الهاتف
                </div>
              </th>
              {hasCustomMessages && (
                <th className="p-3 text-right text-sm font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    الرسالة
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 50).map((contact, index) => (
              <tr 
                key={index} 
                className="border-t border-border hover:bg-secondary/50 transition-colors"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                <td className="p-3 text-sm text-foreground font-medium">{contact.name || '-'}</td>
                <td className="p-3 text-sm text-foreground font-mono" dir="ltr">{contact.phone}</td>
                {hasCustomMessages && (
                  <td className="p-3 text-sm text-foreground max-w-xs truncate" title={contact.customMessage}>
                    {contact.customMessage || '-'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 50 && (
          <div className="p-3 bg-secondary text-center text-sm text-muted-foreground">
            عرض 50 من أصل {data.length} جهة اتصال
          </div>
        )}
      </div>

      {message && !hasCustomMessages && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">نص الرسالة:</span>
          </div>
          <p className="text-foreground whitespace-pre-wrap">{message}</p>
        </div>
      )}

      {hasCustomMessages && (
        <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-accent" />
            <span className="text-sm text-foreground">
              سيتم استخدام الرسائل المخصصة من ملف Excel لكل جهة اتصال.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataPreview;
