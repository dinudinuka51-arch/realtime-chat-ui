-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Only super admin can manage roles" ON public.admin_roles;

-- Also drop the monetization policy that references admin_roles
DROP POLICY IF EXISTS "Admins can manage monetization applications" ON public.monetization_applications;

-- Recreate admin_roles policies using the security definer functions
-- These functions bypass RLS since they are SECURITY DEFINER

-- Allow users to view their own role
-- Keep existing: "Users can view own role" which uses (auth.uid() = user_id)

-- Recreate admin view policy using function
CREATE POLICY "Admins can view all admin roles" 
ON public.admin_roles 
FOR SELECT 
USING (public.check_is_admin(auth.uid()) OR auth.uid() = user_id);

-- Recreate super admin manage policy using function
CREATE POLICY "Super admins can manage admin roles" 
ON public.admin_roles 
FOR ALL 
USING (public.check_is_super_admin(auth.uid()))
WITH CHECK (public.check_is_super_admin(auth.uid()));

-- Recreate monetization admin policy using function
CREATE POLICY "Admins can manage monetization applications" 
ON public.monetization_applications 
FOR ALL 
USING (public.check_is_admin(auth.uid()))
WITH CHECK (public.check_is_admin(auth.uid()));