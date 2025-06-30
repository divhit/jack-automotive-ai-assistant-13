import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Use environment variables instead of hardcoded values
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://dgzadilmtuqvimolzxms.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnejFkaWxtdHVxdmltb2x6eG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5MDEyMzMsImV4cCI6MjA0OTQ3NzIzM30.e80AhUU44MNlXZpJR4LPcQB8sWhRn-kNLjFDFPuwCx4'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
