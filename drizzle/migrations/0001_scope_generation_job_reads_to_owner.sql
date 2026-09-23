DROP POLICY IF EXISTS "jobs readable by authenticated" ON public.content_generation_jobs;
CREATE POLICY "users read own generation jobs"
ON public.content_generation_jobs
FOR SELECT
TO authenticated
USING (triggered_by = auth.uid());

DROP POLICY IF EXISTS "rejections readable by authenticated" ON public.generation_job_rejections;
CREATE POLICY "users read own generation job rejections"
ON public.generation_job_rejections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.content_generation_jobs AS job
    WHERE job.id = generation_job_rejections.job_id
      AND job.triggered_by = auth.uid()
  )
);