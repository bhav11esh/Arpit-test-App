ALTER TABLE public.screenshots DROP CONSTRAINT IF EXISTS screenshots_type_check;
ALTER TABLE public.screenshots ADD CONSTRAINT screenshots_type_check 
  CHECK (type IN ('PAYMENT', 'FOLLOW', 'RAPIDO', 'PLATFORM_PAYMENT', 'FRAUD_DETECTION') OR type LIKE 'FRAUD_DETECTION:%' OR type LIKE 'CUSTOMER_CALL_LOG:%');
