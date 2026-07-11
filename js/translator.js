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

async function tokenize(word) {
    const { data: briques, error } = await sb.from('briques').select('lettre, tag');
    if (error) { console.error("Erreur briques:", error); return null; }
    
    // TRÈS IMPORTANT : Trie par longueur décroissante
    // Cela permet de tester "nia" avant de tester "n"
    briques.sort((a, b) => b.lettre.length - a.lettre.length);

    let remaining = word;
    let tokens = [];

    while (remaining.length > 0) {
        let found = false;
        for (let b of briques) {
            if (remaining.startsWith(b.lettre)) {
                tokens.push(b.tag);
                remaining = remaining.slice(b.lettre.length);
                found = true;
                break;
            }
        }
        if (!found) {
            console.warn("Impossible de découper : " + remaining);
            return null; 
        }
    }
    return tokens;
}

document.getElementById('translate-btn').addEventListener('click', async () => {
    const text = document.getElementById('source-text').value.trim();
    const tags = await tokenize(text);
    
    console.log("Tags identifiés :", tags); // <-- REGARDE ÇA DANS LA CONSOLE

    if (!tags) {
        resultArea.innerText = "Mot inconnu.";
        return;
    }

    const { data: regle, error } = await sb
        .from('regles_composition')
        .select('*')
        .eq('ordre_tags', tags) // Supabase va comparer le tableau
        .single();
    
    console.log("Règle trouvée :", regle); // <-- REGARDE SI C'EST NULL
    // ... reste du code
});
