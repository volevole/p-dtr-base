import { createClient } from '@supabase/supabase-js' 

const supabaseUrl = 'https://btqttycwerqqbvfzmqlo.supabase.co' 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cXR0eWN3ZXJxcWJ2ZnptcWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODEwMjgsImV4cCI6MjA2ODE1NzAyOH0.Y5btj0hHvC2fUK2oxjWyQHfAno75KlNAvRytTWVgfX8' ;
export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' } ,
auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

//window.supabase = supabase; // Делаем глобальным

