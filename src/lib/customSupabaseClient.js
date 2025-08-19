import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yyjarlodmftfngnevwjd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amFybG9kbWZ0Zm5nbmV2d2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MzY4MjAsImV4cCI6MjA3MTIxMjgyMH0.jgg8nzfXk5nMjRoqNPbyRx8Qe-okWxq1e3QMiS2Tapg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);