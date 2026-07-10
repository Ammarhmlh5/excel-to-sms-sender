-- ============================================================
-- تنظيف الدوال القديمة غير المستخدمة
-- ============================================================

-- حذف الدالة القديمة `update_campaign_updated_at` (استُبدلت بـ `set_updated_at`)
DROP FUNCTION IF EXISTS public.update_campaign_updated_at();

-- حذف الدالة القديمة `update_updated_at_column` (استُبدلت بـ `set_updated_at`)
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- تأكيد أن `handle_new_user` الحديثة هي الوحيدة المتبقية
-- (تم استبدالها بالنسخة المحسّنة في migration 20260708)
-- لا نحذفها لأنها مطلوبة للtrigger on_auth_user_created
