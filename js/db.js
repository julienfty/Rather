const SUPABASE_URL = "https://hfrdzcjfienvegrofszz.supabase.co";
const SUPABASE_KEY = "sb_publishable_U6qUMbeePU0ykN99-OQsNg_FGYTo0iZ";

// On crée une variable globale 'supabaseClient'
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
