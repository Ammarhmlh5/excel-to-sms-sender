import { Users, Phone, MessageSquare } from 'lucide-react';

interface Contact {
  name: string;
  phone: string;
}

interface DataPreviewProps {
  data: Contact[];
  message: string;
}

const DataPreview = ({ data, message }: DataPreviewProps) => {
  if (data.length === 0) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">
          معاينة البيانات ({data.length} جهة اتصال)
        </h3>
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
                <td className="p-3 text-sm text-foreground font-medium">{contact.name}</td>
                <td className="p-3 text-sm text-foreground font-mono" dir="ltr">{contact.phone}</td>
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

      {message && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">نص الرسالة:</span>
          </div>
          <p className="text-foreground whitespace-pre-wrap">{message}</p>
        </div>
      )}
    </div>
  );
};

export default DataPreview;
