const { db } = require('../db/database');

/**
 * Moteur de calcul LMD (Conforme au Cahier des Charges - Sujet 2)
 */

function round2(val) {
  if (val === null || val === undefined || isNaN(val)) return null;
  return Math.round(val * 100) / 100;
}

/**
 * Calculer la moyenne d'une matière pour un étudiant
 */
function calculerMoyenneMatiere(matiere, notesEtudiantMatiere) {
  const noteExam = notesEtudiantMatiere.find(n => n.type === 'EXAMEN');
  const noteDS = notesEtudiantMatiere.find(n => n.type === 'DS');
  const noteTP = notesEtudiantMatiere.find(n => n.type === 'TP');

  const examVal = noteExam ? Number(noteExam.valeur) : null;
  const dsVal = noteDS ? Number(noteDS.valeur) : null;
  const tpVal = noteTP ? Number(noteTP.valeur) : null;

  let moyenne = null;
  let complet = false;

  if (matiere.hasTP) {
    if (examVal !== null && dsVal !== null && tpVal !== null) {
      // Formule 10a: (Examen x 70%) + (DS x 20%) + (TP x 10%)
      moyenne = (examVal * 0.70) + (dsVal * 0.20) + (tpVal * 0.10);
      complet = true;
    } else {
      // Moyenne partielle si notes disponibles
      const parts = [];
      let weights = 0;
      if (examVal !== null) { parts.push(examVal * 0.70); weights += 0.70; }
      if (dsVal !== null) { parts.push(dsVal * 0.20); weights += 0.20; }
      if (tpVal !== null) { parts.push(tpVal * 0.10); weights += 0.10; }
      if (weights > 0) {
        moyenne = parts.reduce((a, b) => a + b, 0) / weights;
      }
    }
  } else {
    if (examVal !== null && dsVal !== null) {
      // Formule 10b: (Examen x 80%) + (DS x 20%)
      moyenne = (examVal * 0.80) + (dsVal * 0.20);
      complet = true;
    } else {
      const parts = [];
      let weights = 0;
      if (examVal !== null) { parts.push(examVal * 0.80); weights += 0.80; }
      if (dsVal !== null) { parts.push(dsVal * 0.20); weights += 0.20; }
      if (weights > 0) {
        moyenne = parts.reduce((a, b) => a + b, 0) / weights;
      }
    }
  }

  const moyenneArrondie = round2(moyenne);
  const estValidee = moyenneArrondie !== null ? moyenneArrondie >= 10.0 : false;
  const creditsObtenus = estValidee ? Number(matiere.credits) : 0;

  return {
    matiereId: matiere.id,
    code: matiere.code,
    intitule: matiere.intitule,
    uniteEnseignement: matiere.uniteEnseignement || 'UE Générale',
    coefficient: Number(matiere.coefficient),
    credits: Number(matiere.credits),
    hasTP: Boolean(matiere.hasTP),
    notes: {
      ds: dsVal,
      examen: examVal,
      tp: tpVal
    },
    moyenne: moyenneArrondie,
    estValidee,
    creditsObtenus,
    estComplet: complet
  };
}

/**
 * Calculer la délibération complète d'un étudiant selon les règles LMD
 */
function calculerDeliberationEtudiant(etudiantId) {
  const etudiant = db.collection('etudiants').findById(etudiantId);
  if (!etudiant) return null;

  const matieres = db.collection('matieres').find({ isActive: true });
  const allNotes = db.collection('notes').find({ etudiantId });

  const detailsMatieres = matieres.map(m => {
    const notesMatiere = allNotes.filter(n => n.matiereId === m.id);
    return calculerMoyenneMatiere(m, notesMatiere);
  });

  let sommeProduits = 0;
  let totalCoefficients = 0;
  let creditsValides = 0;
  let creditsTotaux = 0;
  const matieresCapitalisees = [];

  for (const detail of detailsMatieres) {
    creditsTotaux += detail.credits;
    if (detail.moyenne !== null) {
      sommeProduits += detail.moyenne * detail.coefficient;
      totalCoefficients += detail.coefficient;
    }
    if (detail.estValidee) {
      creditsValides += detail.creditsObtenus;
      matieresCapitalisees.push({
        code: detail.code,
        intitule: detail.intitule,
        moyenne: detail.moyenne,
        credits: detail.creditsObtenus
      });
    }
  }

  const moyenneGenerale = totalCoefficients > 0 ? round2(sommeProduits / totalCoefficients) : 0;

  // Détermination de la mention et du statut LMD
  let mention = 'Ajourné';
  let statut = 'Ajourné';
  let observation = '';

  // Règle 45/60 crédits LMD (ou prorata si moins de 60 crédits dans le jeu de test)
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
    observation = `Semestre / Année validé(e) avec succès (${creditsValides}/${creditsTotaux} crédits ECTS).`;
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
 * Calculer le classement officiel pour une classe
 */
function calculerClassementClasse(classe) {
  const etudiants = db.collection('etudiants').find({ classe, isActive: true });
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
