// config.js
export const config = {
  API_URL: process.env.NODE_ENV === 'production' 
    ? 'https://p-dtr-base.onrender.com'
    : 'http://localhost:3001',
//  
//  SUPABASE_URL: 'ваш_supabase_url',
//  SUPABASE_ANON_KEY: 'ваш_supabase_anon_key'
};