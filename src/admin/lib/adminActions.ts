import { supabase } from '@/shared/integrations/supabase/client';
import { toast } from 'sonner';

export async function toggleAdminRole(
  userId: string,
  currentlyAdmin: boolean,
  onSuccess?: () => void
): Promise<void> {
  const newRole = currentlyAdmin ? 'user' : 'admin';

  const { error } = await supabase.functions.invoke('admin-manage-users', {
    body: { action: 'set_role', user_id: userId, role: newRole },
  });

  if (error) {
    toast.error(error.message || 'فشلت العملية');
    return;
  }

  toast.success(currentlyAdmin ? 'تم إزالة صلاحية المشرف' : 'تم منح صلاحية المشرف');
  onSuccess?.();
}
