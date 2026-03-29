
CREATE POLICY "Users can search other profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
