// 1. Initialisation
const sb = window.supabaseClient;
const resultArea = document.getElementById('result-area');

// 2. Définition des actions
const ActionsComposition = {
    assembler_pronom: (tags) => "Traduction pronom simple",
    assembler_pronom_inexgen: (tags) => "Traduction pronom complexe"
};

// 3. Tokenizer
async function tokenize(word) {
    const { data: briques, error } = await sb.from('briques').select('code, tag_machine');
    
    if (error) {
        console.error("Erreur briques:", error);
        return null;
    }
    
    briques.sort((a, b) => b.code.length - a.code.length);

    let remaining = word;
    let tokens = [];

    while (remaining.length > 0) {
        let found = false;
        for (let b of briques) {
            if (remaining.startsWith(b.code)) {
                tokens.push(b.tag_machine);
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

    // A. Découpage
    const tags = await tokenize(text);
    console.log("Tags identifiés :", tags);

    if (!tags) {
        resultArea.innerText = "Erreur : Mot inconnu ou découpage impossible.";
        return;
    }
    
    // B. Recherche de la règle dans Supabase
    // On transforme le tableau en texte pour correspondre au type 'varchar' de la base
    const tagsString = tags.join(','); 
    console.log("Recherche dans la base avec la chaîne :", tagsString);

    const { data: regle, error } = await sb
        .from('regle_composition')
        .select('*')
        .eq('ordre_tags', tagsString) // Utilisation de la chaîne de texte
        .maybeSingle(); // Plus sûr que .single()

    if (error || !regle) {
        console.error("Erreur règle:", error);
        resultArea.innerText = "Règle non trouvée pour : " + tagsString;
        return;
    }

    // C. Exécution de l'action
    if (typeof ActionsComposition[regle.action] === 'function') {
        resultArea.innerText = ActionsComposition[regle.action](tags);
    } else {
        resultArea.innerText = "Erreur : Action '" + regle.action + "' non définie.";
    }
});
