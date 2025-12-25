import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { MessageCircle, Zap, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FileUploader from '@/components/FileUploader';
import DataPreview from '@/components/DataPreview';
import ApiKeyInput from '@/components/ApiKeyInput';
import MessageInput from '@/components/MessageInput';
import SendButton from '@/components/SendButton';

interface Contact {
  name: string;
  phone: string;
}

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [message, setMessage] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const parseExcelFile = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
      
      // Skip header row and parse data
      const parsedContacts: Contact[] = jsonData
        .slice(1)
        .filter((row) => row[0] && row[1])
        .map((row) => ({
          name: String(row[0]).trim(),
          phone: String(row[1]).trim().replace(/\s/g, ''),
        }));

      if (parsedContacts.length === 0) {
        toast({
          title: "لا توجد بيانات",
          description: "الملف لا يحتوي على بيانات صالحة. تأكد من وجود أعمدة الاسم ورقم الهاتف.",
          variant: "destructive",
        });
        return;
      }

      setContacts(parsedContacts);
      toast({
        title: "تم تحميل الملف بنجاح",
        description: `تم العثور على ${parsedContacts.length} جهة اتصال`,
      });
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast({
        title: "خطأ في قراءة الملف",
        description: "تعذر قراءة ملف Excel. تأكد من صحة الملف.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    parseExcelFile(selectedFile);
  }, [parseExcelFile]);

  const clearFile = useCallback(() => {
    setFile(null);
    setContacts([]);
  }, []);

  const handleSend = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "مفتاح API مطلوب",
        description: "الرجاء إدخال مفتاح API الخاص بالهدهد",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "نص الرسالة مطلوب",
        description: "الرجاء كتابة نص الرسالة",
        variant: "destructive",
      });
      return;
    }

    if (contacts.length === 0) {
      toast({
        title: "لا توجد جهات اتصال",
        description: "الرجاء تحميل ملف Excel يحتوي على جهات الاتصال",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare JSON payload for Hudhud API
      const payload = {
        api_key: apiKey,
        messages: contacts.map((contact) => ({
          to: contact.phone,
          message: message.replace('{name}', contact.name),
        })),
      };

      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      // Call Hudhud API
      const response = await fetch('https://www.hloov.com/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "تم الإرسال بنجاح",
          description: `تم إرسال ${contacts.length} رسالة بنجاح`,
        });
      } else {
        throw new Error(result.message || 'فشل في الإرسال');
      }
    } catch (error) {
      console.error('Error sending messages:', error);
      toast({
        title: "خطأ في الإرسال",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء إرسال الرسائل",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canSend = contacts.length > 0 && message.trim() && apiKey.trim();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-soft">
              <MessageCircle className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">مرسال الهدهد</h1>
              <p className="text-sm text-muted-foreground">إرسال رسائل SMS جماعية بسهولة</p>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="border-b border-border bg-secondary/30">
        <div className="container py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg shadow-card">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">سريع وفعال</p>
                <p className="text-sm text-muted-foreground">إرسال آلاف الرسائل بضغطة زر</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg shadow-card">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">آمن وموثوق</p>
                <p className="text-sm text-muted-foreground">بياناتك محمية بشكل كامل</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg shadow-card">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">سهل الاستخدام</p>
                <p className="text-sm text-muted-foreground">ارفع ملف Excel وابدأ الإرسال</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Step 1: Upload File */}
          <div className="bg-card p-6 rounded-xl shadow-card animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                1
              </span>
              <h2 className="text-xl font-semibold text-foreground">رفع ملف Excel</h2>
            </div>
            <FileUploader
              onFileSelect={handleFileSelect}
              selectedFile={file}
              onClear={clearFile}
            />
            <div className="mt-4 p-3 bg-secondary rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  تأكد من أن الملف يحتوي على عمودين: الأول للاسم والثاني لرقم الهاتف
                </p>
              </div>
            </div>
          </div>

          {/* Data Preview */}
          {contacts.length > 0 && (
            <div className="bg-card p-6 rounded-xl shadow-card animate-fade-in">
              <DataPreview data={contacts} message={message} />
            </div>
          )}

          {/* Step 2: Message */}
          <div className="bg-card p-6 rounded-xl shadow-card animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                2
              </span>
              <h2 className="text-xl font-semibold text-foreground">كتابة الرسالة</h2>
            </div>
            <MessageInput value={message} onChange={setMessage} />
            <p className="mt-2 text-xs text-muted-foreground">
              💡 نصيحة: استخدم {'{name}'} لتضمين اسم المستلم تلقائياً
            </p>
          </div>

          {/* Step 3: API Key */}
          <div className="bg-card p-6 rounded-xl shadow-card animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                3
              </span>
              <h2 className="text-xl font-semibold text-foreground">مفتاح API</h2>
            </div>
            <ApiKeyInput value={apiKey} onChange={setApiKey} />
          </div>

          {/* Send Button */}
          <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <SendButton
              onClick={handleSend}
              disabled={!canSend}
              isLoading={isLoading}
              contactCount={contacts.length}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 mt-12">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">
            مرسال الهدهد - نظام إرسال رسائل SMS جماعية
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
