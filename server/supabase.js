// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Create Supabase client using your .env values
const supabase = createClient(
  process.env.SUPABASE_URL,      // Your project URL
  process.env.SUPABASE_ANON_KEY  // Your anon key
);

// Export so other files can use it
module.exports = supabase;