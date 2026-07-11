// 1. Définition des actions (le "cerveau" qui construit la traduction)
const ActionsComposition = {
    assembler_pronom: (tags) => {
        return "Traduction pronom simple (ex: nous)";
    },
    assembler_pronom_inexgen: (tags) => {
        return "Traduction pronom complexe (ex: nous exclusif)";
    }
};

// 2. Le Tokenizer (découpe le mot en tags)
async function tokenize(word) {
    const { data: briques } = await supabase.from('briques').select('lettre, tag');
    
    // On trie les briques par longueur (les plus longues d'abord)
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
    const { data: regle, error } = await supabase
        .from('regles_composition')
        .select('*')
        .eq('ordre_tags', tags)
        .single();

    if (error || !regle) {
        resultArea.innerText = "Règle de composition non trouvée pour : " + tags.join(' + ');
        return;
    }

    // C. Exécution de l'action
    if (typeof ActionsComposition[regle.action] === 'function') {
        const traduction = ActionsComposition[regle.action](tags);
        resultArea.innerText = traduction;
    } else {
        resultArea.innerText = "Erreur : Action '" + regle.action + "' non définie dans le code.";
    }
});
