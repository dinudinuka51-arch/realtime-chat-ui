-- Drop existing policies on admin_roles that cause recursion
DROP POLICY IF EXISTS "Users can view their own admin role" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admins can view all admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admins can insert admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admins can update admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admins can delete admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.admin_roles;

-- Create a security definer function to check admin status without triggering RLS
CREATE OR REPLACE FUNCTION public.check_is_admin(checking_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = checking_user_id
  )
$$;

-- Create a security definer function to check super admin status
CREATE OR REPLACE FUNCTION public.check_is_super_admin(checking_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = checking_user_id AND role = 'super_admin'
  )
$$;

-- Now create simple RLS policies that don't cause recursion
-- Allow users to view their own admin role
CREATE POLICY "Users can view own role"
ON public.admin_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow super admins to manage all roles (using the security definer function)
CREATE POLICY "Super admins full access"
ON public.admin_roles
FOR ALL
TO authenticated
USING (public.check_is_super_admin(auth.uid()))
WITH CHECK (public.check_is_super_admin(auth.uid()));