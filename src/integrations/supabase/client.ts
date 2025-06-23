
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = 'https://krpzyvpwtbdxjaemqjab.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtycHp5dnB3dGJkeGphZW1xamFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4Mzk0MDUsImV4cCI6MjA2NTQxNTQwNX0.89nz9gLXXPI2208kGJhZ8xYXQzyfoxMxysNMK1b3oF0'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
