-- Example SQL logic for fetching business hours for a given date and day_of_week
-- This query checks for a scheduled override first, then falls back to the default business_hours

-- Replace :target_date and :target_day_of_week with your actual values

-- 1. Try to get a scheduled override for the date
SELECT * FROM scheduled_business_hours
WHERE day_of_week = :target_day_of_week
  AND effective_date <= :target_date
  AND is_active = TRUE
ORDER BY effective_date DESC
LIMIT 1;

-- 2. If no result, fallback to the default business_hours
SELECT * FROM business_hours
WHERE day_of_week = :target_day_of_week
  AND is_active = TRUE;

-- In your backend logic, use the first query. If it returns no rows, use the second query as fallback.
-- This allows you to display the correct schedule for any date, including future overrides set by admin.
