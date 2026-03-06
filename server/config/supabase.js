const { createClient } = require('@supabase/supabase-js');
const memoryDB = require('./memoryDB');

require('dotenv').config();

let supabase;

// Try to use Supabase if configured, otherwise use in-memory DB
try {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  
  // Check if Supabase is properly configured (not placeholder values)
  if (url && key && 
      url.startsWith('https://') && 
      !url.includes('placeholder') && 
      key.length > 20 && 
      !key.includes('placeholder')) {
    supabase = createClient(url, key);
    console.log('✅ Using Supabase database');
  } else {
    throw new Error('Supabase not configured');
  }
} catch (error) {
  console.log('⚠️  Supabase not configured, using in-memory database');
  supabase = memoryDB;
}

module.exports = supabase;