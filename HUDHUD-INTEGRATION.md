# تكامل Hudhud (الهدهد) — إعداد، اختبار، ونشر

مستند مختصر يشرح المتغيرات البيئية المطلوبة، تشغيل الاختبارات المحلية، ونشر دوال Supabase المتعلقة ببوابة Hudhud.

## المتغيرات البيئية المطلوبة
- `SUPABASE_URL` — عنوان مشروع Supabase (مثال: `https://xxxxx.supabase.co`)
- `SUPABASE_ANON_KEY` — مفتاح نشر (publishable) لاستخدام الواجهات الأمامية
- `SUPABASE_SERVICE_ROLE_KEY` — مفتاح الخدمة (service_role) لاستخدام الدوال التي تتطلب صلاحيات كتابة
- `HUDHUD_API_KEY` — مفتاح Hudhud (يمكن وضعه في متغير البيئة أو حفظه في جدول `hudhud_settings`)
- `HUDHUD_SENDER_ID` — (اختياري) معرّف المرسل الذي يرسله المزود
- `HUDHUD_BASE_URL` — (اختياري) عنوان نهاية الويب المخصص لمزود Hudhud
- Vite (واجهة الويب): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

## أين تحفظ الإعدادات
- يمكن حفظ مفتاح Hudhud وخصائصه في جدول `hudhud_settings` عبر الدالة: `/functions/v1/manage-hudhud-settings?action=save` (يوجد واجهة إدارة في لوحة المشرف: صفحة `وسائط الإرسال`).
- التكوين يتم على مستوى المشرف فقط: لا يوجد إعداد اتصال Hudhud في واجهة المستخدم العامة، ويتم استخدام هذا المفتاح العالمي لجميع عمليات إرسال SMS.

## الحالة النهائية لتسليم الرسائل
- يتم إرسال الرسائل إلى Hudhud عبر الدالة `send-sms`.
- إذا أجاب Hudhud بأن الرسالة قيد المعالجة أو مقبولة، فهذا يُسجّل كـ `queued` في النظام.
- الحالة النهائية تعتمد على webhook من Hudhud إلى `webhook-provider`.
- تأكد من توجيه Hudhud إلى عنوان Webhook الصحيح لإكمال حالة الطلب وتحديث `campaign_messages` و`delivery_attempts`.

## تشغيل الاختبارات المحلية (موصل Hudhud)
1. ثبّت Deno محليًا إن لم يكن مثبتًا. على Windows (PowerShell):
```powershell
iwr https://deno.land/install.ps1 -useb | iex
```
2. من جذر المشروع شغّل اختبارات الموفر:
```powershell
deno test supabase/functions/_shared/providers --allow-net --allow-env --unstable
```

3. لتشغيل اختبار نهاية إلى نهاية لمحاكاة Webhook Hudhud:
```powershell
npm run e2e:webhook-test -- --url https://jqilueudbhgcgskvkvhe.supabase.co --key service_role_xxx
```

> ملاحظة: هذا السكربت ينشئ حملة ورسالة اختبارية، ثم يرسل أحداث `accepted` و `delivered` إلى دالة `webhook-provider` ويعرض الحالة النهائية من `delivery_attempts`, `campaign_messages`, و `campaigns`.

> ملاحظة: بعض الاختبارات تعتمد على محاكاة `fetch` ولا تحتاج لمفتاح، بينما اختبار التكامل الحقيقي سيتخطى ما لم يتم تعيين `HUDHUD_API_KEY` في البيئة.

## تشغيل دوال Supabase محليًا
- تتطلب Supabase CLI لتشغيل الدوال محليًا. بعد تثبيت `supabase` وتسجيل الدخول، يمكنك تشغيل:
```bash
supabase functions serve send-sms
```
أو تشغيل جميع الدوال محليًا باستخدام `supabase functions serve` وفقًا لبرنامج Supabase CLI.

## نشر الدوال و القاعدة
- لنشر قواعد البيانات والمهاجرات:
```bash
npm run deploy:db
```
- لنشر كل الدوال المحددة (موجودة في `package.json`):
```bash
npm run deploy:functions
```
- لنشر كل شيء (DB + functions):
```bash
npm run deploy:all
```

## إعداد الويب هوك (Webhook)
- إن كانت Hudhud توفر webhooks للردود/حالات التسليم، فعّنوا عنوان الاستقبال إلى دالة `webhook-provider` (نقطة النهاية الموجودة في Supabase Functions). تأكد من أن Supabase Functions URL معروفة في لوحة Hudhud.

## ملاحظات أمان وممارسات
- لا تحتفظ بمفاتيح `SUPABASE_SERVICE_ROLE_KEY` أو `HUDHUD_API_KEY` في الكود أو المستودع العام. استخدم متغيرات بيئة أو Secrets في CI/CD.
- اختبارات CI: تم إضافة عمل GitHub Actions باسم `Deno tests` لتشغيل اختبارات Deno الخاصة بالموفر.

## الخطوات التالية المقترحة
1. إذا تريد، أنشئ سرّ (`Secret`) في مستودع GitHub (HUDHUD_API_KEY) لتشغيل اختبار التكامل في CI.
2. أريد تنفيذ نشر تجريبي للدوال إلى بيئة اختبارية — أخبرني أي خيار تفضّل (محلي، staging، production).

---
ملف هذا يهدف لتسهيل النشر والاختبار. أخبرني إذا أحببت أن أضيف مثالًا عمليًا لتعيين `hudhud_settings` عبر سكربت أو واجهة.
