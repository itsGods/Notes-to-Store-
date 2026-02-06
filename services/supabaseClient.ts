import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kjhcnutkenzkiigfpnrk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqaGNudXRrZW56a2lpZ2ZwbnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzczOTMsImV4cCI6MjA4NTk1MzM5M30.p51_cy0KR5p6xxRQaHTKMCEbVHR6DQzNBDMVu7_U2IM';

export const supabase = createClient(supabaseUrl, supabaseKey);