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

    // B. Validation et récupération de la règle via regle_composition
    // On peut y ajouter un champ par exemple 'traduction_id' ou lier via la catégorie
    const { data: toutesLesRegles, error: errRegles } = await sb.from('regle_composition').select('*');
    if (errRegles) {
        resultArea.innerText = "Erreur de lecture des règles.";
        return;
    }

    const regle = toutesLesRegles.find(r => JSON.stringify(r.ordre_tags) === JSON.stringify(tagsOnly));
    if (!regle) {
        resultArea.innerText = "Structure de mot invalide (aucune règle correspondante).";
        return;
    }

    // C. Récupération du mot français associé dans la base
    // Si ta règle est liée à un mot français/rather (via un ID de liaison ou une correspondance de catégorie)
    const { data: motsFr, error: errMots } = await sb
        .from('mots_francais')
        .select('traduction_fr, categorie');

    if (errMots) {
        resultArea.innerText = "Erreur de lecture du dictionnaire français.";
        return;
    }

    // On cherche le mot français qui correspond à la catégorie finale de la règle (ex: "PRONOM")
    // (Ou mieux : si tu ajoutes une colonne 'mot_id' ou 'traduction_defaut' dans regle_composition)
    const correspondanceFr = motsFr.find(m => m.categorie === regle.cat_final);

    if (correspondanceFr) {
        // Affiche simplement le mot propre (ex: "nous", sans fioritures)
        resultArea.innerText = `Traduction : ${correspondanceFr.traduction_fr}`;
    } else {
        resultArea.innerText = `Traduction : [${regle.cat_final}] (Mot français non lié)`;
    }
});
