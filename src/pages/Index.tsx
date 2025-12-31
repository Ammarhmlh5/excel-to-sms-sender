import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { MessageCircle, Zap, Shield, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import SettingsDialog from '@/components/SettingsDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import FileUploader from '@/components/FileUploader';
import DataPreview from '@/components/DataPreview';

import SendButton from '@/components/SendButton';
import ColumnMapper, { ColumnMapping, autoDetectColumns } from '@/components/ColumnMapper';
interface Contact {
  name: string;
  phone: string;
  customMessage?: string;
}
interface RawData {
  [key: string]: any;
}
const Index = () => {
  const {
    user,
    signOut
  } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<RawData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    phone: '',
    name: '',
    message: ''
  });
  const [autoDetected, setAutoDetected] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  const [apiKey, setApiKey] = useState('');
  const [savedApiKeyId, setSavedApiKeyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const {
    toast
  } = useToast();

  // Load saved API key from database
  useEffect(() => {
    const loadApiKey = async () => {
      if (!user) return;
      const {
        data,
        error
      } = await supabase.from('api_keys').select('id, api_key').eq('user_id', user.id).eq('is_active', true).order('created_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (data && !error) {
        setApiKey(data.api_key);
        setSavedApiKeyId(data.id);
      }
    };
    loadApiKey();
  }, [user]);

  // Save API key to database when changed
  const handleApiKeyChange = async (newKey: string) => {
    setApiKey(newKey);
    if (!user || !newKey.trim()) return;
    try {
      if (savedApiKeyId) {
        // Update existing key
        await supabase.from('api_keys').update({
          api_key: newKey
        }).eq('id', savedApiKeyId);
      } else {
        // Insert new key
        const {
          data
        } = await supabase.from('api_keys').insert({
          user_id: user.id,
          api_key: newKey,
          key_name: 'Hudhud API Key'
        }).select('id').single();
        if (data) {
          setSavedApiKeyId(data.id);
        }
      }
    } catch (error) {
      console.error('Error saving API key:', error);
    }
  };
  // Phone number validation
  const validatePhoneNumber = useCallback((phone: string): { valid: boolean; cleaned: string; error?: string } => {
    if (!phone) {
      return { valid: false, cleaned: '', error: 'رقم الهاتف مطلوب' };
    }
    
    // Remove spaces, dashes, and other formatting
    const cleaned = phone.replace(/[\s\-()]/g, '');
    
    // Check for valid characters (digits, +)
    if (!/^[\d+]+$/.test(cleaned)) {
      return { valid: false, cleaned, error: 'رقم الهاتف يحتوي على أحرف غير صالحة' };
    }
    
    // Get digits only for length check
    const digitsOnly = cleaned.replace(/\D/g, '');
    
    if (digitsOnly.length < 9) {
      return { valid: false, cleaned, error: 'رقم الهاتف قصير جداً' };
    }
    
    if (digitsOnly.length > 15) {
      return { valid: false, cleaned, error: 'رقم الهاتف طويل جداً' };
    }
    
    return { valid: true, cleaned };
  }, []);

  const processContacts = useCallback((data: RawData[], mapping: ColumnMapping) => {
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
          customMessage: mapping.message ? String(row[mapping.message] || '').trim() : undefined
        });
      } else {
        invalidCount++;
      }
    }
    
    if (invalidCount > 0 && data.length > 0) {
      toast({
        title: `${invalidCount} رقم غير صالح`,
        description: 'تم تجاهل هذه الأرقام ولن يتم إرسال رسائل لها',
        variant: 'destructive'
      });
    }
    
    return validContacts;
  }, [validatePhoneNumber, toast]);
  const parseExcelFile = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: 'array'
      });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet) as RawData[];
      if (jsonData.length === 0) {
        toast({
          title: "لا توجد بيانات",
          description: "الملف لا يحتوي على بيانات صالحة.",
          variant: "destructive"
        });
        return;
      }

      // Extract headers from first row keys
      const extractedHeaders = Object.keys(jsonData[0] || {});
      setHeaders(extractedHeaders);
      setRawData(jsonData);

      // Auto-detect columns
      const detectedMapping = autoDetectColumns(extractedHeaders);
      const hasDetected = Boolean(detectedMapping.phone || detectedMapping.name || detectedMapping.message);
      setColumnMapping(detectedMapping);
      setAutoDetected(hasDetected);

      // Process contacts with detected mapping
      const parsedContacts = processContacts(jsonData, detectedMapping);
      setContacts(parsedContacts);
      toast({
        title: "تم تحميل الملف بنجاح",
        description: hasDetected ? `تم التعرف على الأعمدة تلقائياً. ${parsedContacts.length} جهة اتصال` : `تم العثور على ${extractedHeaders.length} أعمدة. الرجاء تحديد الأعمدة المطلوبة.`
      });
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast({
        title: "خطأ في قراءة الملف",
        description: "تعذر قراءة ملف Excel. تأكد من صحة الملف.",
        variant: "destructive"
      });
    }
  }, [toast, processContacts]);
  const handleMappingChange = useCallback((newMapping: ColumnMapping) => {
    setColumnMapping(newMapping);
    setAutoDetected(false);
    const parsedContacts = processContacts(rawData, newMapping);
    setContacts(parsedContacts);
  }, [rawData, processContacts]);
  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    parseExcelFile(selectedFile);
  }, [parseExcelFile]);
  const clearFile = useCallback(() => {
    setFile(null);
    setRawData([]);
    setHeaders([]);
    setColumnMapping({
      phone: '',
      name: '',
      message: ''
    });
    setContacts([]);
  }, []);
  const handleSend = async () => {
    if (contacts.length === 0) {
      toast({
        title: "لا توجد جهات اتصال",
        description: "الرجاء تحميل ملف Excel يحتوي على جهات الاتصال",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Prepare messages for the backend function - use message from Excel
      const messages = contacts.map(contact => ({
        to: contact.phone,
        message: contact.customMessage || ''
      })).filter(msg => msg.message.trim() !== '');

      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { messages }
      });

      if (error) {
        throw new Error(error.message || 'فشل في الإرسال');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "تم الإرسال بنجاح",
        description: data?.message || `تم إرسال ${contacts.length} رسالة بنجاح`
      });

      if (data?.skippedCount > 0) {
        toast({
          title: `تم تجاهل ${data.skippedCount} رقم`,
          description: 'بعض الأرقام غير صالحة ولم يتم إرسال رسائل لها',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error sending messages:', error);
      toast({
        title: "خطأ في الإرسال",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء إرسال الرسائل",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if contacts have messages from Excel
  const hasMessages = contacts.some(c => c.customMessage && c.customMessage.trim() !== '');
  const canSend = contacts.length > 0 && hasMessages;

  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-soft">
                <MessageCircle className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">مرسال الهدهد</h1>
                <p className="text-sm text-muted-foreground">إرسال رسائل SMS جماعية بسهولة</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.email}
              </span>
              <SettingsDialog 
                apiKey={apiKey} 
                onApiKeyChange={handleApiKeyChange} 
                savedApiKeyId={savedApiKeyId} 
              />
              <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                خروج
              </Button>
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
      <main className="container py-8 border-dashed">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Step 1: Upload File */}
          <div className="bg-card p-6 rounded-xl shadow-card animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                1
              </span>
              <h2 className="text-xl font-semibold text-foreground">رفع ملف Excel</h2>
            </div>
            <FileUploader onFileSelect={handleFileSelect} selectedFile={file} onClear={clearFile} />
            <div className="mt-4 p-3 bg-secondary rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  سيتم التعرف تلقائياً على أعمدة الهاتف والاسم والرسالة. يمكنك تعديلها يدوياً إذا لزم الأمر.
                </p>
              </div>
            </div>
          </div>

          {/* Column Mapping */}
          {headers.length > 0 && <div className="bg-card p-6 rounded-xl shadow-card animate-fade-in">
              <ColumnMapper headers={headers} mapping={columnMapping} onMappingChange={handleMappingChange} autoDetected={autoDetected} />
            </div>}

          {/* Data Preview */}
          {contacts.length > 0 && <div className="bg-card p-6 rounded-xl shadow-card animate-fade-in">
              <DataPreview data={contacts} />
            </div>}

          {/* Send Button */}
          <div className="animate-fade-in" style={{
          animationDelay: '200ms'
        }}>
            <SendButton onClick={handleSend} disabled={!canSend} isLoading={isLoading} contactCount={contacts.length} />
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
    </div>;
};
export default Index;