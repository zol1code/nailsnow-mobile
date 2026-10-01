-- Allows logged-in customers to view designers' public portfolios.
CREATE POLICY "Authenticated users can view public portfolios"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'designer-portfolios');