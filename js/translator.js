// Tu n'as pas besoin de faire autre chose, il est déjà chargé !
// On crée un raccourci local pour rendre le code plus lisible
const sb = window.supabaseClient;

// Maintenant, tu peux l'utiliser sans erreur :
async function testConnection() {
    if (!sb) {
        console.error("Le client Supabase n'est pas encore prêt !");
        return;
    }
    
    // Exemple d'utilisation
    const { data, error } = await sb.from('briques').select('*');
    if (error) console.error(error);
    else console.log("Données reçues :", data);
}

// Appel de ta fonction quand tu veux :
testConnection();
