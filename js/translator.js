// Utilise la variable globale définie dans db.js
const sb = window.supabaseClient;

// 1. Définition des actions
const ActionsComposition = {
    assembler_pronom: (tags) => "Nous (pronom simple)",
    assembler_pronom_inexgen: (tags) => "Nous (inclusif/exclusif/général)"
};

// 2. Le Tokenizer (découpe le mot en tags)
async function tokenize(word) {
    // Utilisation de sb ici
    const { data: briques, error } = await sb.from('briques').select('lettre, tag');
    if (error) { console.error("Erreur briques:", error); return null; }
    
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
        if (!found) return null; // Mot inconnu
    }
    return tokens;
}

// 3. Le moteur principal
document.getElementById('translate-btn').addEventListener('click', async () => {
    const text = document.getElementById('source-text').value.trim();
    const resultArea = document.getElementById('result-area');
    
    if (!text) return;

    // A. Découpage
    const tags = await tokenize(text);
    if (!tags) {
        resultArea.innerText = "Erreur : Mot inconnu dans le dictionnaire.";
        return;
    }
    
    // B. Recherche de la règle dans Supabase
    // Utilisation de sb ici
    const { data: regle, error } = await sb
        .from('regles_composition')
        .select('*')
        .eq('ordre_tags', tags)
        .single();

    if (error) {
        console.error("Erreur recherche règle:", error);
        resultArea.innerText = "Erreur de connexion base.";
        return;
    }
    
    if (!regle) {
        resultArea.innerText = "Règle non trouvée pour : " + tags.join(' + ');
        return;
    }

    // C. Exécution de l'action
    if (typeof ActionsComposition[regle.action] === 'function') {
        const traduction = ActionsComposition[regle.action](tags);
        resultArea.innerText = traduction;
    } else {
        resultArea.innerText = "Erreur : Action '" + regle.action + "' non définie.";
    }
});
