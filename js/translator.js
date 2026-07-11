const sb = window.supabaseClient;
const resultArea = document.getElementById('result-area');

// 2. Fonctions de composition (Les Algorithmes)
const ActionsComposition = {
    // Exemple : ["PRONOM", "GENRE", "FLEXION"]
    assembler_pronom: (tokens) => {
        const p = tokens.find(t => t.tag === 'PRONOM')?.valeur || '';
        const g = tokens.find(t => t.tag === 'GENRE')?.valeur || '';
        // Ton algo ici
        if (p === 'nia' && g === 'x') return "Je";
        return "Pronom inconnu";
    },

    // Exemple : ["NOMBRE", "GENRE", "PRONOM", "GENRE", "FLEXION"]
    assembler_pronom_inex: (tokens) => {
        // Accède aux morceaux nécessaires pour ton algo
        const pronom = tokens.find(t => t.tag === 'PRONOM')?.valeur;
        // ... ici tu fais tes calculs de fusion, de transformation, etc.
        return `Traduction complexe pour le pronom ${pronom}`;
    }
};

// 3. Tokenizer amélioré (garde la valeur ET le tag)
async function tokenize(word) {
    const { data: briques, error } = await sb.from('briques').select('code, tag_machine');
    if (error) return null;
    
    briques.sort((a, b) => b.code.length - a.code.length);

    let remaining = word;
    let tokens = []; // Maintenant un tableau d'objets {tag, valeur}

    while (remaining.length > 0) {
        let found = false;
        for (let b of briques) {
            if (remaining.startsWith(b.code)) {
                tokens.push({ tag: b.tag_machine, valeur: b.code });
                remaining = remaining.slice(b.code.length);
                found = true;
                break;
            }
        }
        if (!found) return null;
    }
    return tokens;
}

// 4. Moteur principal
document.getElementById('translate-btn').addEventListener('click', async () => {
    const text = document.getElementById('source-text').value.trim();
    if (!text) return;

    resultArea.innerText = "Recherche...";

    const tokens = await tokenize(text);
    if (!tokens) {
        resultArea.innerText = "Erreur : Mot inconnu.";
        return;
    }
    
    // On extrait juste les tags pour la recherche en base
    const tagsOnly = tokens.map(t => t.tag);
    
   // B. Recherche de la règle (Version robuste)
const { data: regles, error } = await sb
    .from('regle_composition')
    .select('*')
    .contains('ordre_tags', tagsOnly) // Vérifie que notre tableau est contenu dans la base
    .filter('ordre_tags', 'cs', tagsOnly); // 'cs' (contains) assure que les tailles sont identiques

    if (error || !regles || regles.length === 0) {
        resultArea.innerText = "Règle non trouvée.";
        return;
    }

    const regle = regles[0];
    
    // C. Exécution de l'algorithme (on passe les tokens complets)
    if (typeof ActionsComposition[regle.action] === 'function') {
        resultArea.innerText = ActionsComposition[regle.action](tokens);
    } else {
        resultArea.innerText = "Action '" + regle.action + "' non définie.";
    }
});
