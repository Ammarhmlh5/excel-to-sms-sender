import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertCircle, Mail, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import FileUploader from '@/components/FileUploader';
import DataPreview from '@/components/DataPreview';
import ColumnMapper from '@/components/ColumnMapper';
import SendButton from '@/components/SendButton';
import { ColumnMapping, autoDetectColumns } from '@/lib/columnDetection';

interface Contact {
  name: string;
  phone: string;
  customMessage?: string;
}

type RawData = Record<string, string | number | boolean | null>;

interface NewSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
}

export default function NewSendDialog({ open, onOpenChange, onSent }: NewSendDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<RawData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ phone: '', name: '', message: '' });
  const [autoDetected, setAutoDetected] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [defaultMessage, setDefaultMessage] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [sendMode, setSendMode] = useState<'sms' | 'email'>('email');
  const [isLoading, setIsLoading] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setRawData([]);
    setHeaders([]);
    setColumnMapping({ phone: '', name: '', message: '' });
    setContacts([]);
    setDefaultMessage('');
    setCampaignName('');
  }, []);

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (!/^[\d+]+$/.test(cleaned)) return { valid: false, cleaned };
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 15) return { valid: false, cleaned };
    return { valid: true, cleaned };
  };

  const processContacts = useCallback((data: RawData[], mapping: ColumnMapping): Contact[] => {
    if (!mapping.phone) return [];
    const out: Contact[] = [];
    let invalid = 0;
    for (const row of data) {
      const raw = String(row[mapping.phone] || '').trim();
      if (!raw) continue;
      const v = validatePhone(raw);
      if (v.valid) {
        out.push({
          phone: v.cleaned,
          name: mapping.name ? String(row[mapping.name] || '').trim() : '',
          customMessage: mapping.message ? String(row[mapping.message] || '').trim() : undefined,
        });
      } else {
        invalid++;
      }
    }
    if (invalid > 0) {
      toast({ title: `${invalid} رقم غير صالح`, description: 'تم تجاهلها', variant: 'destructive' });
    }
    return out;
  }, [toast]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    try {
      const buf = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet) as RawData[];
      if (json.length === 0) {
        toast({ title: 'لا توجد بيانات', variant: 'destructive' });
        return;
      }
      const hdrs = Object.keys(json[0] || {});
      setHeaders(hdrs);
      setRawData(json);
      const detected = autoDetectColumns(hdrs);
      const has = Boolean(detected.phone || detected.name || detected.message);
      setColumnMapping(detected);
      setAutoDetected(has);
      setContacts(processContacts(json, detected));
    } catch {
      toast({ title: 'خطأ في قراءة الملف', variant: 'destructive' });
    }
  }, [processContacts, toast]);

  const handleMappingChange = useCallback((m: ColumnMapping) => {
    setColumnMapping(m);
    setAutoDetected(false);
    setContacts(processContacts(rawData, m));
  }, [rawData, processContacts]);

  const handleSend = async () => {
    if (contacts.length === 0) return;
    setIsLoading(true);
    try {
      const messages = contacts
        .map(c => ({ to: c.phone, name: c.name || undefined, message: c.customMessage || defaultMessage }))
        .filter(m => m.message.trim() !== '')
        .slice(0, 1000);
      if (messages.length === 0) {
        toast({ title: 'لا توجد رسائل لإرسالها', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      const endpoint = sendMode === 'email' ? 'send-email' : 'send-sms';
      const payload = sendMode === 'email'
        ? { messages: messages.map(m => ({ phone: m.to, name: m.name, message: m.message })), campaign_name: campaignName.trim() || undefined }
        : { messages, campaign_name: campaignName.trim() || undefined };
      const { data, error } = await supabase.functions.invoke(endpoint, { body: payload });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: 'تم الإرسال بنجاح', description: data?.message || `تم إرسال ${messages.length} رسالة` });
      reset();
      onOpenChange(false);
      onSent?.();
    } catch (e) {
      toast({ title: 'خطأ في الإرسال', description: e instanceof Error ? e.message : 'حدث خطأ', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const hasMessages = defaultMessage.trim() !== '' || contacts.some(c => c.customMessage?.trim());
  const canSend = contacts.length > 0 && hasMessages;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>إرسال جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="bg-card p-4 rounded-xl border">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">1</span>
              <h3 className="text-lg font-semibold">رفع ملف Excel</h3>
            </div>
            <FileUploader onFileSelect={handleFileSelect} selectedFile={file} onClear={reset} />
            <div className="mt-3 p-3 bg-secondary rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">سيتم التعرف تلقائياً على أعمدة الهاتف والاسم والرسالة.</p>
            </div>
          </div>

          {headers.length > 0 && (
            <div className="bg-card p-4 rounded-xl border">
              <ColumnMapper headers={headers} mapping={columnMapping} onMappingChange={handleMappingChange} autoDetected={autoDetected} />
            </div>
          )}

          {contacts.length > 0 && (
            <div className="bg-card p-4 rounded-xl border">
              <DataPreview data={contacts} />
            </div>
          )}

          {contacts.length > 0 && (
            <div className="bg-card p-4 rounded-xl border space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">2</span>
                <h3 className="text-lg font-semibold">الرسالة</h3>
              </div>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="اسم الحملة (اختياري)"
                className="w-full p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <textarea
                value={defaultMessage}
                onChange={(e) => setDefaultMessage(e.target.value)}
                placeholder={contacts.some(c => c.customMessage) ? 'رسالة بديلة للجهات بدون رسالة في الملف' : 'اكتب الرسالة هنا'}
                className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          {contacts.length > 0 && (
            <div className="bg-card p-4 rounded-xl border">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">3</span>
                <h3 className="text-lg font-semibold">طريقة الإرسال</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSendMode('email')}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${sendMode === 'email' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}
                >
                  <Mail className="w-5 h-5" />
                  <div className="text-right">
                    <p className="font-medium">إرسال عبر البريد</p>
                    <p className="text-xs opacity-70">JSON إلى بريدك</p>
                  </div>
                </button>
                <button
                  onClick={() => setSendMode('sms')}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${sendMode === 'sms' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <div className="text-right">
                    <p className="font-medium">إرسال SMS مباشر</p>
                    <p className="text-xs opacity-70">عبر Hudhud API</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          <SendButton onClick={handleSend} disabled={!canSend} isLoading={isLoading} contactCount={contacts.length} sendMode={sendMode} />
        </div>
      </DialogContent>
    </Dialog>
  );
}