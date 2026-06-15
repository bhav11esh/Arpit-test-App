-- Update Apple Auto Volkswagen with the provided URL
UPDATE dealerships 
SET google_sync_url = 'https://script.google.com/macros/s/AKfycbw0iMcJa6Eyhx4r5ybp2iBHRukHIJBM4yAxp0ndNoPscjiI96aMa7Q8ZM2l3-RBb9xe/exec'
WHERE name ILIKE '%Apple Auto%';
