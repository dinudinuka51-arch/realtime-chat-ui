import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const ADMIN_EMAIL = 'dinudinuka51@gmail.com';

export const useAdminAccess = () => {
  const { user } = useAuth();
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setCanAccessAdmin(false);
        setNeedsPassword(false);
        setLoading(false);
        return;
      }

      // Check if user email is the admin email
      if (user.email === ADMIN_EMAIL) {
        // Check if user already has admin role
        const { data: adminRole } = await supabase
          .from('admin_roles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        // If not an admin yet, create admin role
        if (!adminRole) {
          await supabase
            .from('admin_roles')
            .insert({ user_id: user.id, role: 'super_admin' });
        }

        setCanAccessAdmin(true);
        
        // Check session storage for password verification
        const verified = sessionStorage.getItem('admin_verified') === 'true';
        setIsVerified(verified);
        setNeedsPassword(!verified);
      } else {
        // Check if user has admin role in database
        const { data: adminRole } = await supabase
          .from('admin_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (adminRole) {
          setCanAccessAdmin(true);
          const verified = sessionStorage.getItem('admin_verified') === 'true';
          setIsVerified(verified);
          setNeedsPassword(!verified);
        } else {
          setCanAccessAdmin(false);
          setNeedsPassword(false);
        }
      }

      setLoading(false);
    };

    checkAccess();
  }, [user]);

  const verifyPassword = () => {
    setIsVerified(true);
    setNeedsPassword(false);
  };

  return { canAccessAdmin, needsPassword, isVerified, loading, verifyPassword };
};
