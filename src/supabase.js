import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://ydxshxiemmdygumddzyx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeHNoeGllbW1keWd1bWRkenl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0Nzc0MzYsImV4cCI6MjA5ODA1MzQzNn0.Huaa2WXjKu5LLHacQVoa3Ya_P5WvbbDe7kKdQUhgDYw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
