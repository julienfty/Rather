const searchInput = document.getElementById("search");
const resultsDiv = document.getElementById("results");
const searchContainer = document.getElementById("search-container");
const seeAllTrigger = document.getElementById("see-all-trigger");
const closeExpanded = document.getElementById("close-expanded");
const expandedResults = document.getElementById("expanded-results");
const mainFilterBar = document.getElementById("main-filter-bar");
const subFilterBar = document.getElementById("sub-filter-bar");

let currentMainFilter = "Tous";
let currentSubFilter = "Tous";

function highlight(text, query){
  if(!text || !query) return text || "";
  const regex = new RegExp(`\\b(${query})\\b|(${query})`, 'gi');
  return text.replace(regex, `<span class="highlight">$1$2</span>`);
}

function createEtymHtml(etymText) {
  if (!etymText) return '';
  return `<span class="etym-container">
            <span class="info-icon" data-title="Étymologie" data-text="${etymText.replace(/"/g, '&quot;')}">i</span>
          </span>`;
}

function displayWordFromSupabase(row, query, targetContainer) {
  const div = document.createElement("div");
  div.classList.add("result");

  const category = row.categorie || "Mot";
  const subcategory = row.sous_categorie || null;
  let traductions = [];
  if (row.mots_francais) {
    traductions = Array.isArray(row.mots_francais) ? row.mots_francais : [row.mots_francais];
  }

  let html = "";

  if (row.directionRecherche === "FR_TO_RATHER") {
    const principalFr = traductions[0] ? traductions[0].traduction_fr : "Mot français";
    const contexteFr = traductions[0]?.contexte_fr ? `<span class="category" style="background:none; padding:0; color:#555; font-size:12px; margin-right:5px; font-style:italic;">(${traductions[0].contexte_fr})</span> ` : '';
     
    html += `<div class="word-line">`;
    html += `<span class="category">${category}</span>`;
    if(subcategory) {
      html += `<span class="category subcategory-badge">${subcategory}</span>`;
    }
    html += `<span>${contexteFr}${highlight(principalFr, query)} :</span>`;
    if (traductions[0]?.etymologie) {
      html += ` ${createEtymHtml(traductions[0].etymologie)}`;
    }
    html += `</div>`;
     
    html += `<div class="subword" style="font-size: 0.9em; color: rgba(0,0,0,0.75); margin-top: 2px;">
              ➔ Traduction en Rather : <strong style="color: #000;">${highlight(row.mot, query)}</strong>
              ${row.etymologie ? createEtymHtml(row.etymologie) : ''}
            </div>`;

  } else {
    html += `<div class="word-line">`;
    html += `<span class="category">${category}</span>`;
    if(subcategory) {
      html += `<span class="category subcategory-badge">${subcategory}</span>`;
    }
    html += `<span>${highlight(row.mot, query)} :</span>`;
    if (row.etymologie) {
      html += ` ${createEtymHtml(row.etymologie)}`;
    }
    html += `</div>`;

    if (traductions.length > 0) {
      traductions.forEach(sig => {
        const contexte = sig.contexte_fr ? `<span class="category" style="background:none; padding:0; color:#555; font-size:12px; margin-right:3px;">(${sig.contexte_fr})</span> ` : '';
        html += `<div class="subword">
                  ${contexte}${highlight(sig.traduction_fr, query)}
                  ${createEtymHtml(sig.etymologie)}
                </div>`;
      });
    } else {
      html += `<div class="subword" style="color: #666; font-style: italic;">Aucune traduction enregistrée</div>`;
    }
  }

  div.innerHTML = html;
  targetContainer.appendChild(div);
}

function applyFiltersInExpanded() {
  expandedResults.innerHTML = "";
  if (!window.allWordsCache) return;

  let query = searchInput.value.toLowerCase().trim();

  const filtered = window.allWordsCache.filter(item => {
    if (currentMainFilter !== "Tous") {
      const catItem = (item.categorie || "Mot").toLowerCase().trim();
      if (catItem !== currentMainFilter.toLowerCase().trim()) return false;
    }

    if (currentSubFilter !== "Tous") {
      const subCatItem = (item.sous_categorie || "").toLowerCase().trim();
      if (subCatItem !== currentSubFilter.toLowerCase().trim()) return false;
    }
     
    const matchRather = item.mot && item.mot.toLowerCase().includes(query);
    const matchFr = item.mots_francais && (Array.isArray(item.mots_francais) ? item.mots_francais : [item.mots_francais]).some(f => f.traduction_fr && f.traduction_fr.toLowerCase().includes(query));
     
    return matchRather || matchFr;
  });

  if(filtered.length === 0) {
    expandedResults.innerHTML = "<div style='color:#666; text-align:center; padding-top:20px; font-size:14px;'>Aucun résultat trouvé.</div>";
  } else {
    filtered.forEach(row => displayWordFromSupabase(row, query, expandedResults));
  }
}

function updateSubCategoryBar() {
  subFilterBar.innerHTML = "";
  currentSubFilter = "Tous";

  if (currentMainFilter === "Tous" || !window.allWordsCache) {
    subFilterBar.style.display = "none";
    return;
  }

  const subCategories = new Set();
  window.allWordsCache.forEach(item => {
    const itemCat = (item.categorie || "").trim().toLowerCase();
    if (itemCat === currentMainFilter.toLowerCase() && item.sous_categorie) {
      subCategories.add(item.sous_categorie.trim());
    }
  });

  if (subCategories.size === 0) {
    subFilterBar.style.display = "none";
    return;
  }

  subFilterBar.style.display = "flex";
  const sortedSubCategories = ["Tous", ...Array.from(subCategories).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))];

  sortedSubCategories.forEach(subCat => {
    const btn = document.createElement("button");
    btn.classList.add("filter-btn");
    if(subCat === "Tous") btn.classList.add("active");
    btn.textContent = subCat;

    btn.addEventListener("click", () => {
      subFilterBar.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentSubFilter = subCat;
      applyFiltersInExpanded();
    });

    subFilterBar.appendChild(btn);
  });
}

function buildMainFilterButtons(data) {
  mainFilterBar.innerHTML = "";
  subFilterBar.innerHTML = "";
  subFilterBar.style.display = "none";
  currentMainFilter = "Tous";
  currentSubFilter = "Tous";

  const categories = new Set();
  data.forEach(item => {
    if(item.categorie) categories.add(item.categorie.trim());
  });

  const sortedCategories = ["Tous", ...Array.from(categories).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))];

  sortedCategories.forEach(cat => {
    const btn = document.createElement("button");
    btn.classList.add("filter-btn");
    if(cat === "Tous") btn.classList.add("active");
    btn.textContent = cat;

    btn.addEventListener("click", () => {
      mainFilterBar.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentMainFilter = cat;
       
      updateSubCategoryBar();
      applyFiltersInExpanded();
    });

    mainFilterBar.appendChild(btn);
  });
}

seeAllTrigger.addEventListener("click", async () => {
  searchContainer.classList.add("expanded");
  seeAllTrigger.style.opacity = "0";
  seeAllTrigger.style.pointerEvents = "none";
  mainFilterBar.innerHTML = "";
  subFilterBar.innerHTML = "";
  subFilterBar.style.display = "none";
  expandedResults.innerHTML = "<div style='color:#666; text-align:center; padding-top:30px; font-size:14px;'>Chargement complet de la base de données...</div>";
  resultsDiv.innerHTML = "";
  searchInput.value = "";
  searchInput.placeholder = "Rechercher dans tout le ditctionaire";

  let allRecords = [];
  let from = 0;
  let to = 99;
  let hasMore = true;

  try {
    while (hasMore) {
      const { data, error } = await supabaseClient
        .from('mots_rather')
        .select('mot, categorie, sous_categorie, etymologie, mots_francais(traduction_fr, contexte_fr, etymologie)')
        .order('mot', { ascending: true })
        .range(from, to);

      if (error) throw error;

      if (data && data.length > 0) {
        allRecords = allRecords.concat(data);
        from += 100;
        to += 100;
        if (data.length < 100) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    window.allWordsCache = allRecords.map(item => ({ ...item, directionRecherche: "RATHER_TO_FR" }));
     
    buildMainFilterButtons(window.allWordsCache);
    applyFiltersInExpanded();

  } catch (err) {
    expandedResults.innerHTML = "<div style='color:#666; text-align:center; padding-top:20px;'>Erreur lors du chargement des mots.</div>";
  }
});

closeExpanded.addEventListener("click", () => {
  searchContainer.classList.remove("expanded");
  seeAllTrigger.style.opacity = "1";
  seeAllTrigger.style.pointerEvents = "auto";
  searchInput.value = "";
  searchInput.placeholder = "Rechercher";
  expandedResults.innerHTML = "";
  mainFilterBar.innerHTML = "";
  subFilterBar.innerHTML = "";
  subFilterBar.style.display = "none";
  window.allWordsCache = null;
});

searchInput.addEventListener("input", async () => {
  let rawQuery = searchInput.value.toLowerCase();
  
  if (searchContainer.classList.contains("expanded")) {
    applyFiltersInExpanded();
    return;
  }

  resultsDiv.innerHTML = "";
  if(!rawQuery.trim()) return;

  let effectiveQuery = rawQuery;
  const parts = rawQuery.split(" ").filter(p => p !== "");
  if (rawQuery.endsWith(" ") && parts.length > 0) {
    effectiveQuery = parts.join(" ");
  }
  const currentQueryParts = effectiveQuery.trim().split(" ").filter(p => p !== "");
  const expectedWordCount = currentQueryParts.length;

  const requeteRather = supabaseClient
    .from('mots_rather')
    .select('mot, categorie, sous_categorie, etymologie, mots_francais(traduction_fr, contexte_fr, etymologie)')
    .ilike('mot', `%${effectiveQuery.trim()}%`);

  // MODIFICATION ICI : On va chercher la correspondance globale
  const requeteFrancais = supabaseClient
    .from('mots_francais')
    .select('traduction_fr, contexte_fr, etymologie, mots_rather(mot, categorie, sous_categorie, etymologie)');

  // Pour éviter de saturer Supabase, on filtre de manière ciblée sur le premier mot saisi
  const premierMotRecherche = currentQueryParts[0] || "";
  requeteFrancais.ilike('traduction_fr', `%${premierMotRecherche}%`);

  const [resRather, resFrancais] = await Promise.all([requeteRather, requeteFrancais]);

  const donneesRather = resRather.data || [];
  const donneesFrancais = [];

  if (resFrancais.data) {
    resFrancais.data.forEach(item => {
      if (item.mots_rather) {
        const ratherObj = Array.isArray(item.mots_rather) ? item.mots_rather[0] : item.mots_rather;
        if (ratherObj) {
          // On vérifie si la requête matche soit le mot complet, soit l'assemblage mot + contexte
          const chaineCompleteFr = `${item.traduction_fr || ''} ${item.contexte_fr || ''}`.toLowerCase().trim();
          if (chaineCompleteFr.includes(effectiveQuery.trim())) {
            donneesFrancais.push({
              mot: ratherObj.mot,
              categorie: ratherObj.categorie,
              sous_categorie: ratherObj.sous_categorie,
              etymologie: ratherObj.etymologie,
              mots_francais: [item]
            });
          }
        }
      }
    });
  }

  const listePlat = [...donneesRather, ...donneesFrancais];
  let meilleurScoreRatherGlobal = 0;
  let meilleurScoreFrGlobal = 0;

  const resultatsScorés = listePlat.map(item => {
    const ratherMot = item.mot ? item.mot.toLowerCase().trim() : "";
     
    let scoreRather = 0;
    if (ratherMot === effectiveQuery.trim()) scoreRather = 100;
    else if (ratherMot.startsWith(effectiveQuery.trim())) scoreRather = 50;
    else if (ratherMot.includes(effectiveQuery.trim())) scoreRather = 10;

    if (ratherMot) {
      const diffTaille = ratherMot.length - effectiveQuery.trim().length;
      scoreRather -= diffTaille * 0.5;
    }
    if (scoreRather > meilleurScoreRatherGlobal) meilleurScoreRatherGlobal = scoreRather;

    let scoreFr = 0;
    let aUnMatchFr = false;

    if (item.mots_francais && Array.isArray(item.mots_francais)) {
      item.mots_francais.forEach(f => {
        // MATCH VIRTUEL : On combine traduction + contexte pour le scoring (ex: "nous inclusif")
        const tradVirtuelle = `${f.traduction_fr || ''} ${f.contexte_fr || ''}`.replace(/[()]/g, '').replace(/\s+/g, ' ').toLowerCase().trim();
        
        if (tradVirtuelle) {
          let currentFrScore = 0;
          if (tradVirtuelle === effectiveQuery.trim()) currentFrScore = 100;
          else if (tradVirtuelle.startsWith(effectiveQuery.trim())) currentFrScore = 50;
          else if (tradVirtuelle.includes(effectiveQuery.trim())) currentFrScore = 10;

          if (currentFrScore > 0) aUnMatchFr = true;

          const diffTailleFr = tradVirtuelle.length - effectiveQuery.trim().length;
          currentFrScore -= diffTailleFr * 0.5;

          if (currentFrScore > scoreFr) scoreFr = currentFrScore;
        }
      });
    }
    if (scoreFr > meilleurScoreFrGlobal) meilleurScoreFrGlobal = scoreFr;

    return { ...item, scoreRather, scoreFr, aUnMatchFr };
  });

  const modeExclusif = meilleurScoreRatherGlobal >= meilleurScoreFrGlobal ? "RATHER_ONLY" : "FR_ONLY";

  let resultatsFiltrés = resultatsScorés.filter(item => {
    return modeExclusif === "RATHER_ONLY" ? item.scoreRather > 0 : item.aUnMatchFr;
  }).map(item => {
    return {
      ...item,
      finalScore: modeExclusif === "RATHER_ONLY" ? item.scoreRather : item.scoreFr,
      directionRecherche: modeExclusif === "RATHER_ONLY" ? "RATHER_TO_FR" : "FR_TO_RATHER"
    };
  });

  resultatsFiltrés.sort((a, b) => b.finalScore - a.finalScore);

  const motsAutorises = new Set();
  const limiteMaxMotsDistincts = 5;

  resultatsFiltrés.forEach(item => {
    let cleMotEtudie = "";
    let contexteUnique = "";
    let blocsDAnalyseCount = 0;

    if (item.directionRecherche === "FR_TO_RATHER" && item.mots_francais && item.mots_francais[0]) {
      const f = item.mots_francais[0];
      cleMotEtudie = f.traduction_fr.toLowerCase().trim();
      contexteUnique = f.contexte_fr ? f.contexte_fr.toLowerCase().trim() : "";
      
      // LOGIQUE DU PALIER : On crée une chaîne virtuelle combinée "mot contexte" pour l'analyse de blocs
      const chaineVirtuelleEtudiee = `${cleMotEtudie} ${contexteUnique}`.trim().replace(/\s+/g, ' ');
      blocsDAnalyseCount = chaineVirtuelleEtudiee.split(" ").filter(p => p !== "").length;
    } else {
      cleMotEtudie = item.mot.toLowerCase().trim();
      blocsDAnalyseCount = cleMotEtudie.split(" ").filter(p => p !== "").length;
    }

    const cleUniqueCombinee = `${cleMotEtudie}|${contexteUnique}`;

    // COMPARAISON DES BLOCS STRICTE
    // Si l'utilisateur a écrit 1 bloc ("nous"), on ne garde que les éléments virtuels à 1 bloc (donc "nous" sans contexte).
    // Si l'utilisateur écrit 2 blocs ("nous inc"), on n'autorise que les assemblages à 2 blocs (donc "nous" + un contexte à 1 mot).
    if (blocsDAnalyseCount !== expectedWordCount) {
      return;
    }

    const chaineDeMatchScoring = item.directionRecherche === "FR_TO_RATHER" && item.mots_francais && item.mots_francais[0]
      ? `${item.mots_francais[0].traduction_fr || ''} ${item.mots_francais[0].contexte_fr || ''}`.toLowerCase().trim().replace(/\s+/g, ' ')
      : cleMotEtudie;

    const estCorrespondanceExacte = (chaineDeMatchScoring === effectiveQuery.trim());
    
    if (estCorrespondanceExacte) {
      displayWordFromSupabase(item, effectiveQuery.trim(), resultsDiv);
    } else if (motsAutorises.has(cleUniqueCombinee) || motsAutorises.size < limiteMaxMotsDistincts) {
      motsAutorises.add(cleUniqueCombinee);
      displayWordFromSupabase(item, effectiveQuery.trim(), resultsDiv);
    }
  });
});

