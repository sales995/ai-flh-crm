-- Create first admin user
-- This will be handled by auth.users trigger which creates profile and assigns default role
-- We'll then update the role to admin

-- Note: You'll need to create the first admin user manually through Supabase Studio
-- or use the Admin API. Here's a template for reference:

-- After the user is created through Supabase Studio with email: admin@leadmanager.com
-- Run this to make them admin:

-- UPDATE public.user_roles 
-- SET role = 'admin'
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@leadmanager.com');

-- For now, let's add a helpful comment
COMMENT ON TABLE public.user_roles IS 'To create first admin: 1) Create user in Supabase Studio, 2) Update their role to admin in user_roles table';