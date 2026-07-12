const sb = window.supabaseClient;
const resultArea = document.getElementById('result-area');

// 3. Tokenizer (Dynamique : utilise la base pour découper)
async function tokenize(word) {
    const { data: briques, error } = await sb.from('briques').select('code, tag_machine');
    if (error || !briques) return null;
    
    // Tri par longueur descendante pour éviter de couper "nia" si "ni" existe
    briques.sort((a, b) => b.code.length - a.code.length);

    let remaining = word;
    let tokens = [];

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
        if (!found) return null; // Mot impossible à découper avec les briques actuelles
    }
    return tokens;
}

// 4. Traducteur dynamique (Additionne les sens trouvés en base)
async function construireSensFinal(tokens) {
    // Récupère toutes les briques pour avoir les sens_fr
    const { data: briques } = await sb.from('briques').select('code, sens_fr');
    
    const sensParts = tokens.map(token => {
        const brique = briques.find(b => b.code === token.valeur);
        return brique ? brique.sens_fr : "???";
    });

    return sensParts.join(" + ");
}

// 5. Moteur principal
document.getElementById('translate-btn').addEventListener('click', async () => {
    const text = document.getElementById('source-text').value.trim();
    if (!text) return;

    resultArea.innerText = "Analyse en cours...";

    // A. Découpage
    const tokens = await tokenize(text);
    if (!tokens) {
        resultArea.innerText = "Erreur : Ce mot ne semble pas exister dans la base.";
        return;
    }
    
    const tagsOnly = tokens.map(t => t.tag);

    // B. Vérification de la règle en base
    const { data: toutesLesRegles, error } = await sb.from('regle_composition').select('ordre_tags, action');
    
    if (error) {
        resultArea.innerText = "Erreur de connexion base.";
        return;
    }

    const regle = toutesLesRegles.find(r => JSON.stringify(r.ordre_tags) === JSON.stringify(tagsOnly));

    if (!regle) {
        resultArea.innerText = "Syntaxe correcte mais aucune règle de composition définie pour ces tags.";
        return;
    }

    // C. Assemblage dynamique du sens
    const sensFinal = await construireSensFinal(tokens);
    
    // Affichage : "Traduction : 1P + feminin + pluriel"
    resultArea.innerText = `Traduction : ${sensFinal}`;
    
    console.log("Règle appliquée :", regle.action);
    console.log("Sens détaillé :", sensFinal);
});
