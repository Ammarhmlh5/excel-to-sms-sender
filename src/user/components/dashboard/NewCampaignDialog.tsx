import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/shared/integrations/supabase/client';
import FileUploader from '@/user/components/FileUploader';
import ColumnMapper from '@/user/components/ColumnMapper';
import DataPreview from '@/user/components/DataPreview';
import SendButton from '@/user/components/SendButton';
import { ColumnMapping, autoDetectColumns } from '@/user/lib/columnDetection';
import { Mail, MessageSquare, AlertCircle } from 'lucide-react';

interface Contact {
  name: string;
  phone: string;
  customMessage?: string;
}

interface RawData {
  [key: string]: string | number | boolean | null;
}

interface NewCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCampaignSent: () => void;
}

export function NewCampaignDialog({ open, onOpenChange, onCampaignSent }: NewCampaignDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<RawData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ phone: '', name: '', message: '' });
  const [autoDetected, setAutoDetected] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [defaultMessage, setDefaultMessage] = useState('');
  const [sendMode, setSendMode] = useState<'sms' | 'email'>('sms');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const validatePhoneNumber = useCallback((phone: string): { valid: boolean; cleaned: string; error?: string } => {
    if (!phone) return { valid: false, cleaned: '', error: 'رقم الهاتف مطلوب' };
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (!/^[\d+]+$/.test(cleaned)) return { valid: false, cleaned, error: 'رقم الهاتف يحتوي على أحرف غير صالحة' };
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length < 9) return { valid: false, cleaned, error: 'رقم الهاتف قصير جداً' };
    if (digitsOnly.length > 15) return { valid: false, cleaned, error: 'رقم الهاتف طويل جداً' };
    return { valid: true, cleaned };
  }, []);

  const processContacts = useCallback((data: RawData[], mapping: ColumnMapping): Contact[] => {
    if (!mapping.phone) return [];
    const validContacts: Contact[] = [];
    let invalidCount = 0;
    for (const row of data) {
      const rawPhone = String(row[mapping.phone] || '').trim();
      if (!rawPhone) continue;
      const validation = validatePhoneNumber(rawPhone);
      if (validation.valid) {
        validContacts.push({
          phone: validation.cleaned,
          name: mapping.name ? String(row[mapping.name] || '').trim() : '',
          customMessage: mapping.message ? String(row[mapping.message] || '').trim() : undefined,
        });
      } else {
        invalidCount++;
      }
    }
    if (invalidCount > 0) {
      toast(`${invalidCount} رقم غير صالح — تم تجاهلها`, { style: { background: '#fef2f2', color: '#dc2626' } });
    }
    return validContacts;
  }, [validatePhoneNumber]);

  const parseExcelFile = useCallback(async (selectedFile: File) => {
    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet) as RawData[];
      if (jsonData.length === 0) {
        toast('الملف لا يحتوي على بيانات', { style: { background: '#fef2f2', color: '#dc2626' } });
        return;
      }
      const extractedHeaders = Object.keys(jsonData[0] || {});
      setHeaders(extractedHeaders);
      setRawData(jsonData);
      const detectedMapping = autoDetectColumns(extractedHeaders);
      const hasDetected = Boolean(detectedMapping.phone || detectedMapping.name || detectedMapping.message);
      setColumnMapping(detectedMapping);
      setAutoDetected(hasDetected);
      const parsedContacts = processContacts(jsonData, detectedMapping);
      setContacts(parsedContacts);
      setStep(2);
      toast(`تم تحميل الملف — ${parsedContacts.length} جهة اتصال`, { style: { background: '#f0fdf4', color: '#16a34a' } });
    } catch {
      toast('خطأ في قراءة الملف', { style: { background: '#fef2f2', color: '#dc2626' } });
    }
  }, [processContacts]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    parseExcelFile(selectedFile);
  }, [parseExcelFile]);

  const handleMappingChange = useCallback((newMapping: ColumnMapping) => {
    setColumnMapping(newMapping);
    setAutoDetected(false);
    const parsedContacts = processContacts(rawData, newMapping);
    setContacts(parsedContacts);
  }, [rawData, processContacts]);

  const clearAll = useCallback(() => {
    setFile(null);
    setRawData([]);
    setHeaders([]);
    setColumnMapping({ phone: '', name: '', message: '' });
    setContacts([]);
    setDefaultMessage('');
    setCampaignName('');
    setStep(1);
  }, []);

  const invokeEdgeFunction = useCallback(async (name: string, body: unknown) => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!accessToken || !anonKey || !supabaseUrl) {
      throw new Error('لم تتوفر بيانات المصادقة المطلوبة');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    let payload: unknown = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `فشل الطلب (${response.status})`;
      throw new Error(message);
    }

    return payload;
  }, []);

  const handleSend = async () => {
    if (contacts.length === 0) return;
    setIsLoading(true);
    try {
      const messages = contacts.map(c => ({
        to: c.phone,
        name: c.name || undefined,
        message: c.customMessage || defaultMessage,
      })).filter(msg => msg.message.trim() !== '');

      if (messages.length === 0) {
        toast('لا توجد رسائل لإرسالها', { style: { background: '#fef2f2', color: '#dc2626' } });
        setIsLoading(false);
        return;
      }

      const cappedMessages = messages.slice(0, 1000);
      const savePayload = {
        messages: cappedMessages.map(m => ({ phone: m.to, name: m.name, message: m.message })),
        campaign_name: campaignName.trim() || undefined,
      };

      const saveData = await invokeEdgeFunction('save-campaign', savePayload);
      if (typeof saveData === 'object' && saveData !== null && 'error' in saveData && typeof (saveData as { error?: unknown }).error === 'string') {
        throw new Error((saveData as { error: string }).error);
      }

      const campaignId = typeof saveData === 'object' && saveData !== null && 'campaign_id' in saveData
        ? (saveData as { campaign_id?: string }).campaign_id
        : undefined;
      if (!campaignId) throw new Error('لم يتم إنشاء حملة محفوظة');

      const endpoint = sendMode === 'email' ? 'send-email' : 'send-sms';
      const payload = sendMode === 'email'
        ? { messages: cappedMessages.map(m => ({ phone: m.to, name: m.name, message: m.message })), campaign_id: campaignId, campaign_name: campaignName.trim() || undefined }
        : { messages: cappedMessages, campaign_id: campaignId, campaign_name: campaignName.trim() || undefined };

      const data = await invokeEdgeFunction(endpoint, payload);
      if (typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error?: unknown }).error === 'string') {
        throw new Error((data as { error: string }).error);
      }

      toast(`تم حفظ الحملة وإرسالها بنجاح — ${Math.min(cappedMessages.length, 1000)} رسالة`, { style: { background: '#f0fdf4', color: '#16a34a' } });
      clearAll();
      onOpenChange(false);
      onCampaignSent();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'حدث خطأ أثناء الإرسال', { style: { background: '#fef2f2', color: '#dc2626' } });
    } finally {
      setIsLoading(false);
    }
  };

  const hasMessages = defaultMessage.trim() !== '' || contacts.some(c => c.customMessage && c.customMessage.trim() !== '');
  const canSend = contacts.length > 0 && hasMessages;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) clearAll(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg">حملة إرسال جديدة</DialogTitle>
          <DialogDescription className="sr-only">إنشاء حملة إرسال رسائل SMS جديدة</DialogDescription>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 text-sm">
          <span className={`px-3 py-1 rounded-full ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-500'}`}>1 رفع الملف</span>
          <span className="text-gray-300">←</span>
          <span className={`px-3 py-1 rounded-full ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-500'}`}>2 الإعداد</span>
          <span className="text-gray-300">←</span>
          <span className={`px-3 py-1 rounded-full ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-500'}`}>3 الإرسال</span>
        </div>

        <div className="space-y-5">
          {/* Step 1: Upload */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-sm mb-3">رفع ملف Excel</h3>
            <FileUploader onFileSelect={handleFileSelect} selectedFile={file} onClear={clearAll} />
            <div className="mt-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-500">
                سيتم التعرف تلقائياً على أعمدة الهاتف والاسم والرسالة. يمكنك تعديلها يدوياً.
              </p>
            </div>
          </div>

          {/* Column Mapping */}
          {headers.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-sm mb-3">تحديد الأعمدة</h3>
              <ColumnMapper headers={headers} mapping={columnMapping} onMappingChange={handleMappingChange} autoDetected={autoDetected} />
            </div>
          )}

          {/* Data Preview */}
          {contacts.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <DataPreview data={contacts} />
            </div>
          )}

          {/* Message + Campaign Name */}
          {contacts.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h3 className="font-medium text-sm">إعدادات الحملة</h3>
              <div>
                <Label htmlFor="campaign-name-dialog" className="text-xs">اسم الحملة (اختياري)</Label>
                <Input
                  id="campaign-name-dialog"
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="مثال: حملة ترويجية"
                  className="mt-1"
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="default-message-dialog" className="text-xs">
                  {contacts.some(c => c.customMessage) ? 'الرسالة الافتراضية (لجهات بدون رسالة في الملف)' : 'الرسالة الافتراضية'}
                </Label>
                <textarea
                  id="default-message-dialog"
                  value={defaultMessage}
                  onChange={(e) => setDefaultMessage(e.target.value)}
                  placeholder={contacts.some(c => c.customMessage) ? 'الرسالة مأخوذة من الملف — أدخل رسالة هنا كبديل' : 'اكتب الرسالة هنا — سيتم إرسالها لجميع جهات الاتصال'}
                  className="w-full min-h-[80px] mt-1 p-3 rounded-lg border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  dir="rtl"
                />
              </div>

              {/* Send Mode */}
              <div>
                <Label className="text-xs mb-2 block">طريقة الإرسال</Label>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="طريقة الإرسال">
                  <button
                    role="radio"
                    aria-checked={sendMode === 'sms'}
                    onClick={() => setSendMode('sms')}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm transition-all ${
                      sendMode === 'sms'
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>إرسال SMS</span>
                  </button>
                  <button
                    role="radio"
                    aria-checked={sendMode === 'email'}
                    onClick={() => setSendMode('email')}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm transition-all ${
                      sendMode === 'email'
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>إرسال بريد</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Send Button */}
          {contacts.length > 0 && (
            <SendButton
              onClick={handleSend}
              disabled={!canSend}
              isLoading={isLoading}
              contactCount={contacts.length}
              sendMode={sendMode}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
