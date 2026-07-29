const sb = window.supabaseClient;
const resultArea = document.getElementById('result-area');

// 3. Tokenizer (Découpage du mot basé sur les briques de la DB)
async function tokenize(word) {
    const { data: briques, error } = await sb.from('briques').select('code, tag_machine, id');
    if (error || !briques) return null;
    
    briques.sort((a, b) => b.code.length - a.code.length);

    let remaining = word;
    let tokens = [];

    while (remaining.length > 0) {
        let found = false;
        for (let b of briques) {
            if (remaining.startsWith(b.code)) {
                tokens.push({ id: b.id, tag: b.tag_machine, valeur: b.code });
                remaining = remaining.slice(b.code.length);
                found = true;
                break;
            }
        }
        if (!found) return null;
    }
    return tokens;
}

// 4. Moteur principal de traduction
document.getElementById('translate-btn').addEventListener('click', async () => {
    const text = document.getElementById('source-text').value.trim();
    if (!text) return;

    resultArea.innerText = "Analyse en cours...";

    // A. Tokenisation du mot en entrée (ex: "niax")
    const tokens = await tokenize(text);
    if (!tokens) {
        resultArea.innerText = "Erreur : Mot inconnu ou malformé.";
        return;
    }
    
    const tagsOnly = tokens.map(t => t.tag);

    // B. Validation de la structure via regle_composition
    const { data: toutesLesRegles, error: errRegles } = await sb.from('regle_composition').select('ordre_tags, action, cat_final');
    if (errRegles) {
        resultArea.innerText = "Erreur de lecture des règles.";
        return;
    }

    const regle = toutesLesRegles.find(r => JSON.stringify(r.ordre_tags) === JSON.stringify(tagsOnly));
    if (!regle) {
        resultArea.innerText = "Structure de mot invalide (aucune règle correspondante).";
        return;
    }

    // C. Récupération des sens_fr de chaque atome via leur ID ou code
    const { data: briquesDetails, error: errBriques } = await sb.from('briques').select('id, code, sens_fr');
    if (errBriques) {
        resultArea.innerText = "Erreur de lecture des briques.";
        return;
    }

    // On associe chaque token à son sens_fr dans la base
    const sensAtomes = tokens.map(token => {
        const b = briquesDetails.find(b => b.id === token.id);
        return b ? b.sens_fr : "";
    });

    // Exemple : ["P1", "feminin", "pluriel"]
    console.log("Sens combinés des atomes :", sensAtomes);

    // D. Recherche du sens final dans la base (via mots_francais ou association)
    // Ici, on cherche par exemple si un mot français correspond à la catégorie et aux critères
    // (Tu peux adapter cette requête selon la structure exacte de ta table mots_francais)
    const { data: motsFr } = await sb.from('mots_francais').select('traduction_fr, contexte_fr');

    // Affichage dynamique combiné des sens_fr trouvés
    const sensBrutAssemble = sensAtomes.join(" + ");
    
    // Résultat affiché proprement
    resultArea.innerText = `Traduction : [${regle.cat_final}] -> ${sensBrutAssemble}`;
});
