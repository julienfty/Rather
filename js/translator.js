const sb = window.supabaseClient;
const resultArea = document.getElementById('result-area');

const ActionsComposition = {
    assembler_pronom: (tags) => "Traduction pronom simple",
    assembler_pronom_inexgen: (tags) => "Traduction pronom complexe"
};

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

    // A. Découpage (Simple et propre)
    const tags = await tokenize(text);
    console.log("Tags identifiés :", tags);

    if (!tags) {
        resultArea.innerText = "Erreur : Mot inconnu.";
        return;
    }
    
    // B. Recherche de la règle
    console.log("Recherche dans la base...");
    const { data: regles, error } = await sb
        .from('regle_composition')
        .select('*')
        .contains('ordre_tags', tags);

    if (error) {
        console.error("Erreur Supabase:", error);
        resultArea.innerText = "Erreur DB.";
    } else if (!regles || regles.length === 0) {
        resultArea.innerText = "Aucune règle trouvée.";
    } else {
        const regle = regles[0];
        if (typeof ActionsComposition[regle.action] === 'function') {
            resultArea.innerText = ActionsComposition[regle.action](tags);
        } else {
            resultArea.innerText = "Action non définie.";
        }
    }
});
