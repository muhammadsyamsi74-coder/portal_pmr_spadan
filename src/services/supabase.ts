import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = "https://ndahxwqshyukqpnjkniw.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kYWh4d3FzaHl1a3Fwbmprbml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNjEzODUsImV4cCI6MjEwNDczNzM4NX0.lkxXa2M16275nkjNKnWN3KE5NT7J1BVoyEO7xVAxJt8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
