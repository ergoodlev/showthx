import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase credentials
const SUPABASE_URL = 'https://lufpjgmvkccrmefdykki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1ZnBqZ212a2Njcm1lZmR5a2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTE0OTcsImV4cCI6MjA3NzY2NzQ5N30.b0n4kLon25DdSlJ_rFn6EAf1JSczH2ToqaB49ZqtaDg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
