import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwccezmpzqoohiachjje.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53Y2Nlem1wenFvb2hpYWNoamplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyOTgwNDAsImV4cCI6MjA2ODg3NDA0MH0.C3HEtOaUszUVrcJgnApPrkeBwa7lvdvhckNx3PE68PE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);