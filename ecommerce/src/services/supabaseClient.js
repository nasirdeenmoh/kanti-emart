// ecommerce/src/services/supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Your actual KantiPlus Supabase credentials
const supabaseUrl = 'https://zfvwjycqjddewtqekwij.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmdndqeWNxamRkZXd0cWVrd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTM2MDYsImV4cCI6MjA4OTM4OTYwNn0.fmwXO8uhhjIeMMq21mE1WgnTvY4lW2ESUclBkO3HFJI';

// This creates the connection once and exports it for the whole app
export const supabase = createClient(supabaseUrl, supabaseKey);