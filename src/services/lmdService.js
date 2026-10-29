const { db } = require('../db/database');

/**
 * Moteur de calcul LMD (Conforme au Cahier des Charges - Sujet 2)
 * Règle d'évaluation académique :
 * Toute matière manquante (non saisie), étudiant absent ou tricherie/fraude est comptabilisée à 0/20.
 */

function round2(val) {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Math.round(val * 100) / 100;
}

/**
 * Déterminer le semestre d'une matière (1 ou 2)
 */
function getMatiereSemestre(m, allClassMatieres = []) {
  if (m.semestre === 1 || m.semestre === 2) return Number(m.semestre);
  if (allClassMatieres && allClassMatieres.length > 1) {
    const idx = allClassMatieres.findIndex(item => item.id === m.id);
    if (idx !== -1) {
      const half = Math.ceil(allClassMatieres.length / 2);
      return idx < half ? 1 : 2;
    }
  }
  return 1;
}

/**
 * Calculer la moyenne d'une matière pour un étudiant
 * Règle stricte : Toute note manquante, statut ABSENT ou FRAUDE compte pour 0.
 */
function calculerMoyenneMatiere(matiere, notesEtudiantMatiere = [], allClassMatieres = []) {
  const noteExam = notesEtudiantMatiere.find(n => n.type === 'EXAMEN');
  const noteDS = notesEtudiantMatiere.find(n => n.type === 'DS');
  const noteTP = notesEtudiantMatiere.find(n => n.type === 'TP');

  const getEffectiveValue = (note) => {
    if (!note) return 0; // Épreuve manquante = 0
    if (note.statut === 'ABSENT' || note.statut === 'FRAUDE') return 0;
    const v = Number(note.valeur);
    return isNaN(v) ? 0 : Math.max(0, Math.min(20, v));
  };

  const examVal = noteExam ? Number(noteExam.valeur) : null;
  const dsVal = noteDS ? Number(noteDS.valeur) : null;
  const tpVal = noteTP ? Number(noteTP.valeur) : null;

  const effExam = getEffectiveValue(noteExam);
  const effDS = getEffectiveValue(noteDS);
  const effTP = getEffectiveValue(noteTP);

  const hasAnyNote = Boolean(noteExam || noteDS || noteTP);

  let moyenne = 0;
  if (matiere.hasTP) {
    // Formule 10a: (Examen x 70%) + (DS x 20%) + (TP x 10%)
    moyenne = (effExam * 0.70) + (effDS * 0.20) + (effTP * 0.10);
  } else {
    // Formule 10b: (Examen x 80%) + (DS x 20%)
    moyenne = (effExam * 0.80) + (effDS * 0.20);
  }

  const moyenneArrondie = round2(moyenne);
  const estValidee = moyenneArrondie >= 10.0;
  const creditsObtenus = estValidee ? Number(matiere.credits) : 0;
  const semestre = getMatiereSemestre(matiere, allClassMatieres);

  return {
    matiereId: matiere.id,
    code: matiere.code,
    intitule: matiere.intitule,
    uniteEnseignement: matiere.uniteEnseignement || 'UE Générale',
    coefficient: Number(matiere.coefficient),
    credits: Number(matiere.credits),
    hasTP: Boolean(matiere.hasTP),
    enseignant: matiere.enseignant || 'Non assigné',
    classe: matiere.classe,
    semestre,
    notes: {
      ds: dsVal,
      examen: examVal,
      tp: tpVal,
      dsStatut: noteDS?.statut || (noteDS ? 'PRESENT' : 'NON_SAISI'),
      examStatut: noteExam?.statut || (noteExam ? 'PRESENT' : 'NON_SAISI'),
      tpStatut: noteTP?.statut || (noteTP ? 'PRESENT' : 'NON_SAISI')
    },
    moyenne: moyenneArrondie,
    estValidee,
    creditsObtenus,
    estComplet: Boolean(noteExam && noteDS && (!matiere.hasTP || noteTP)),
    hasAnyNote
  };
}

/**
 * Calculer la délibération complète d'un étudiant selon les règles LMD
 * Sépare Semestre 1 et Semestre 2, et applique la règle du 0 pour toute absence, fraude ou matière non saisie.
 */
function calculerDeliberationEtudiant(etudiantId) {
  const etudiant = db.collection('etudiants').findById(etudiantId);
  if (!etudiant) return null;

  let matieres = db.collection('matieres').find({ isActive: true });
  if (etudiant.classe) {
    const classMat = matieres.filter(m => !m.classe || m.classe === etudiant.classe);
    if (classMat.length > 0) matieres = classMat;
  }

  const allNotes = db.collection('notes').find({ etudiantId });

  const detailsMatieres = matieres.map(m => {
    const notesMatiere = allNotes.filter(n => n.matiereId === m.id);
    return calculerMoyenneMatiere(m, notesMatiere, matieres);
  });

  // Calcul pour le Semestre 1 et le Semestre 2
  const matieresS1 = detailsMatieres.filter(m => Number(m.semestre) === 1);
  const matieresS2 = detailsMatieres.filter(m => Number(m.semestre) === 2);

  let sumProdS1 = 0, coefS1 = 0, credsValS1 = 0, credsTotS1 = 0;
  for (const m of matieresS1) {
    credsTotS1 += m.credits;
    sumProdS1 += (m.moyenne * m.coefficient);
    coefS1 += m.coefficient;
    if (m.estValidee) credsValS1 += m.creditsObtenus;
  }
  const moyenneS1 = coefS1 > 0 ? round2(sumProdS1 / coefS1) : 0;

  let sumProdS2 = 0, coefS2 = 0, credsValS2 = 0, credsTotS2 = 0;
  for (const m of matieresS2) {
    credsTotS2 += m.credits;
    sumProdS2 += (m.moyenne * m.coefficient);
    coefS2 += m.coefficient;
    if (m.estValidee) credsValS2 += m.creditsObtenus;
  }
  const moyenneS2 = coefS2 > 0 ? round2(sumProdS2 / coefS2) : 0;

  // Calcul Global Annuel
  let sommeProduits = sumProdS1 + sumProdS2;
  let totalCoefficients = coefS1 + coefS2;
  let creditsValides = credsValS1 + credsValS2;
  let creditsTotaux = credsTotS1 + credsTotS2;

  const matieresCapitalisees = detailsMatieres
    .filter(m => m.estValidee)
    .map(m => ({
      code: m.code,
      intitule: m.intitule,
      moyenne: m.moyenne,
      credits: m.creditsObtenus,
      semestre: m.semestre
    }));

  const moyenneGenerale = totalCoefficients > 0 ? round2(sommeProduits / totalCoefficients) : 0;

  // Détermination de la mention et du statut LMD
  let mention = 'Ajourné';
  let statut = 'Ajourné';
  let observation = '';

  const seuilCreditsRachat = creditsTotaux >= 60 ? 45 : Math.round(creditsTotaux * 0.75);

  if (moyenneGenerale >= 10.0) {
    statut = 'Admis';
    if (moyenneGenerale >= 16.0) {
      mention = 'Très Bien';
    } else if (moyenneGenerale >= 14.0) {
      mention = 'Bien';
    } else if (moyenneGenerale >= 12.0) {
      mention = 'Assez Bien';
    } else {
      mention = 'Passable';
    }
    observation = `Année validée avec succès (${creditsValides}/${creditsTotaux} crédits ECTS).`;
  } else if (moyenneGenerale >= 9.0 && creditsValides >= seuilCreditsRachat) {
    statut = 'Admis par Rachat';
    mention = 'Passable';
    observation = `Admis par décision du jury (Rachat LMD: Moyenne >= 9.0 et ${creditsValides}/${creditsTotaux} crédits validés >= seuil ${seuilCreditsRachat}).`;
  } else {
    statut = 'Ajourné';
    mention = 'Ajourné';
    observation = `Ajourné(e) avec capitalisation de ${matieresCapitalisees.length} matière(s) validée(s) (>= 10/20). Session de rattrapage requise.`;
  }

  return {
    etudiant: {
      id: etudiant.id,
      nom: etudiant.nom,
      prenom: etudiant.prenom,
      classe: etudiant.classe,
      email: etudiant.email,
      numeroEtudiant: etudiant.numeroEtudiant,
      isActive: etudiant.isActive
    },
    semestre1: {
      moyenne: moyenneS1,
      totalCoefficients: coefS1,
      creditsValides: credsValS1,
      creditsTotaux: credsTotS1,
      matieres: matieresS1
    },
    semestre2: {
      moyenne: moyenneS2,
      totalCoefficients: coefS2,
      creditsValides: credsValS2,
      creditsTotaux: credsTotS2,
      matieres: matieresS2
    },
    moyenneGenerale,
    creditsValides,
    creditsTotaux,
    mention,
    statut,
    observation,
    matieresCapitalisees,
    detailsMatieres,
    dateCalcul: new Date().toISOString()
  };
}

/**
 * Calculer le classement officiel pour une classe ou l'ensemble de l'établissement
 */
function calculerClassementClasse(classe) {
  let etudiants = db.collection('etudiants').find({ isActive: true });
  if (classe && classe !== 'ALL' && classe !== 'TOUTES' && classe !== 'Toutes') {
    etudiants = etudiants.filter(e => e.classe === classe);
  }
  const deliberations = etudiants.map(e => calculerDeliberationEtudiant(e.id)).filter(Boolean);

  // Trier par moyenne générale décroissante
  deliberations.sort((a, b) => b.moyenneGenerale - a.moyenneGenerale);

  return deliberations.map((d, index) => ({
    rang: index + 1,
    ...d
  }));
}

/**
 * Statistiques d'ensemble (matières et classe)
 */
function calculerStatistiquesGlobales() {
  const matieres = db.collection('matieres').find({ isActive: true });
  const etudiants = db.collection('etudiants').find({ isActive: true });

  const statsMatieres = matieres.map(m => {
    const allNotesMatiere = db.collection('notes').find({ matiereId: m.id });
    const notesValues = allNotesMatiere.map(n => Number(n.valeur));

    const examNotes = allNotesMatiere.filter(n => n.type === 'EXAMEN').map(n => Number(n.valeur));
    const dsNotes = allNotesMatiere.filter(n => n.type === 'DS').map(n => Number(n.valeur));
    const tpNotes = allNotesMatiere.filter(n => n.type === 'TP').map(n => Number(n.valeur));

    const moy = notesValues.length ? round2(notesValues.reduce((a, b) => a + b, 0) / notesValues.length) : null;
    const min = notesValues.length ? Math.min(...notesValues) : null;
    const max = notesValues.length ? Math.max(...notesValues) : null;
    const reussiteCount = notesValues.filter(v => v >= 10.0).length;
    const tauxReussite = notesValues.length ? round2((reussiteCount / notesValues.length) * 100) : 0;

    return {
      matiereId: m.id,
      code: m.code,
      intitule: m.intitule,
      enseignant: m.enseignant,
      hasTP: m.hasTP,
      credits: m.credits,
      coefficient: m.coefficient,
      nbNotesTotal: notesValues.length,
      moyenneGlobale: moy,
      noteMinimale: min,
      noteMaximale: max,
      tauxReussite,
      moyExam: examNotes.length ? round2(examNotes.reduce((a,b)=>a+b,0)/examNotes.length) : null,
      moyDS: dsNotes.length ? round2(dsNotes.reduce((a,b)=>a+b,0)/dsNotes.length) : null,
      moyTP: tpNotes.length ? round2(tpNotes.reduce((a,b)=>a+b,0)/tpNotes.length) : null
    };
  });

  const allDeliberations = etudiants.map(e => calculerDeliberationEtudiant(e.id)).filter(Boolean);
  const totalEtudiants = allDeliberations.length;
  const admisCount = allDeliberations.filter(d => d.statut === 'Admis').length;
  const rachatCount = allDeliberations.filter(d => d.statut === 'Admis par Rachat').length;
  const ajourneCount = allDeliberations.filter(d => d.statut === 'Ajourné').length;
  const moyennePromo = totalEtudiants ? round2(allDeliberations.reduce((a, b) => a + b.moyenneGenerale, 0) / totalEtudiants) : 0;

  return {
    totalEtudiants,
    admisCount,
    rachatCount,
    ajourneCount,
    tauxReussiteGlobal: totalEtudiants ? round2(((admisCount + rachatCount) / totalEtudiants) * 100) : 0,
    moyennePromotion: moyennePromo,
    matieres: statsMatieres
  };
}

module.exports = {
  round2,
  calculerMoyenneMatiere,
  calculerDeliberationEtudiant,
  calculerClassementClasse,
  calculerStatistiquesGlobales
};
