import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ntmwazhdwegdhiiitxli.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bXdhemhkd2VnZGhpaWl0eGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MzExMTQsImV4cCI6MjA3MTIwNzExNH0.CUQqnRtRW2xivigIN3riMo7fylwxzNg9_6kMTRoOYy8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);