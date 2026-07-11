// js/db.js
const SUPABASE_URL = "https://hfrdzcjfienvegrofszz.supabase.co";
const SUPABASE_KEY = "sb_publishable_U6qUMbeePU0ykN99-OQsNg_FGYTo0iZ";

// On attache le client à la fenêtre (l'objet global)
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase est prêt !");
