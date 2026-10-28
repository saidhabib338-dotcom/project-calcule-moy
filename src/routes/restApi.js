const path = require('path');
const fs = require('fs');
const { db, hashPassword, generateId } = require('../db/database');
const { generateToken, verifyToken } = require('../middleware/auth');
const {
  calculerDeliberationEtudiant,
  calculerClassementClasse,
  calculerStatistiquesGlobales
} = require('../services/lmdService');

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

async function handleRestRoutes(req, res, pathname, query, body) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Helper response functions
  const sendJson = (status, payload) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  };

  // Extract user from token
  const authHeader = req.headers['authorization'] || '';
  let currentUser = null;
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded && decoded.id) {
      currentUser = db.collection('utilisateurs').findById(decoded.id);
    }
  }

  // ----------------------------------------------------
  // 1. AUTHENTICATION
  // ----------------------------------------------------
  if (pathname === '/api/v1/auth/login' && req.method === 'POST') {
    const { email, motDePasse } = body || {};
    if (!email || !motDePasse) {
      return sendJson(400, { success: false, error: 'Email et mot de passe obligatoires' });
    }

    const hashed = hashPassword(motDePasse);
    const user = db.collection('utilisateurs').findOne({ email: email.trim().toLowerCase() });

    if (!user || user.motDePasse !== hashed) {
      return sendJson(401, { success: false, error: 'Identifiants invalides (email ou mot de passe incorrect)' });
    }

    if (!user.isActive) {
      return sendJson(403, { success: false, error: 'Ce compte utilisateur a été désactivé' });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    const userSafe = { ...user };
    delete userSafe.motDePasse;

    return sendJson(200, {
      success: true,
      message: 'Connexion réussie',
      token,
      user: userSafe
    });
  }

  if (pathname === '/api/v1/auth/me' && req.method === 'GET') {
    if (!currentUser) {
      return sendJson(401, { success: false, error: 'Non authentifié' });
    }
    const userSafe = { ...currentUser };
    delete userSafe.motDePasse;
    return sendJson(200, { success: true, user: userSafe });
  }

  // Quick switch role endpoint for easy live demoing and grading
  if (pathname === '/api/v1/auth/quick-login' && req.method === 'POST') {
    const { role, identifier } = body || {};
    let user = null;
    if (identifier) {
      user = db.collection('utilisateurs').findOne({ email: identifier });
    } else if (role) {
      user = db.collection('utilisateurs').findOne({ role });
    }
    if (!user) {
      return sendJson(404, { success: false, error: 'Utilisateur introuvable pour ce rôle' });
    }
    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    const userSafe = { ...user };
    delete userSafe.motDePasse;
    return sendJson(200, { success: true, token, user: userSafe });
  }

  // ----------------------------------------------------
  // 2. ÉTUDIANTS (CRUD & Soft Delete)
  // ----------------------------------------------------
  if (pathname === '/api/v1/etudiants' && req.method === 'GET') {
    const { classe, search, includeInactive, page, limit } = query;
    let etudiants = db.collection('etudiants').getAll();

    if (includeInactive !== 'true') {
      etudiants = etudiants.filter(e => e.isActive !== false);
    }
    if (classe) {
      etudiants = etudiants.filter(e => e.classe && e.classe.toLowerCase() === classe.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      etudiants = etudiants.filter(e =>
        (e.nom && e.nom.toLowerCase().includes(q)) ||
        (e.prenom && e.prenom.toLowerCase().includes(q)) ||
        (e.email && e.email.toLowerCase().includes(q)) ||
        (e.numeroEtudiant && e.numeroEtudiant.toLowerCase().includes(q))
      );
    }

    const total = etudiants.length;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Support de la pagination (Besoin 1 du Cahier des Charges)
    if (!isNaN(pageNum) && pageNum > 0 && !isNaN(limitNum) && limitNum > 0) {
      const totalPages = Math.ceil(total / limitNum);
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedData = etudiants.slice(startIndex, startIndex + limitNum);
      return sendJson(200, {
        success: true,
        count: paginatedData.length,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        data: paginatedData
      });
    }

    return sendJson(200, {
      success: true,
      count: etudiants.length,
      total,
      data: etudiants
    });
  }

  if (pathname.match(/^\/api\/v1\/etudiants\/([a-zA-Z0-9_-]+)$/) && req.method === 'GET') {
    const id = pathname.split('/').pop();
    const etudiant = db.collection('etudiants').findById(id);
    if (!etudiant) {
      return sendJson(404, { success: false, error: `Étudiant introuvable avec l'ID ${id} (404 Not Found)` });
    }
    const deliberation = calculerDeliberationEtudiant(id);
    return sendJson(200, { success: true, data: etudiant, deliberation });
  }

  if (pathname === '/api/v1/etudiants' && req.method === 'POST') {
    const { nom, prenom, classe, email, numeroEtudiant, dateNaissance } = body || {};

    if (!nom || !prenom || !classe || !email) {
      return sendJson(400, {
        success: false,
        error: 'Champs obligatoires manquants : nom, prenom, classe et email sont requis (400 Bad Request)'
      });
    }

    if (!validateEmail(email)) {
      return sendJson(400, {
        success: false,
        error: "Format de l'email invalide. Veuillez saisir une adresse email correcte (400 Bad Request)"
      });
    }

    // Unicité de l'email
    const existing = db.collection('etudiants').findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return sendJson(409, {
        success: false,
        error: `Conflit (409 Conflict) : Un étudiant avec l'email '${email}' existe déjà`
      });
    }

    const count = db.collection('etudiants').getAll().length + 1;
    const num = numeroEtudiant || `ETU-2026-${String(count).padStart(3, '0')}`;

    const newEtudiant = db.collection('etudiants').insertOne({
      nom: nom.trim(),
      prenom: prenom.trim(),
      classe: classe.trim(),
      email: email.trim().toLowerCase(),
      numeroEtudiant: num,
      dateNaissance: dateNaissance || '2004-01-01',
      isActive: true
    });

    // Créer aussi un compte utilisateur pour cet étudiant
    db.collection('utilisateurs').insertOne({
      email: newEtudiant.email,
      motDePasse: hashPassword('etudiant123'),
      nom: `${newEtudiant.prenom} ${newEtudiant.nom}`,
      role: 'ETUDIANT',
      etudiantId: newEtudiant.id,
      isActive: true
    });

    return sendJson(201, {
      success: true,
      message: 'Étudiant créé avec succès',
      data: newEtudiant
    });
  }

  if (pathname.match(/^\/api\/v1\/etudiants\/([a-zA-Z0-9_-]+)$/) && req.method === 'PUT') {
    const id = pathname.split('/').pop();
    const existing = db.collection('etudiants').findById(id);
    if (!existing) {
      return sendJson(404, { success: false, error: 'Étudiant non trouvé' });
    }

    const { nom, prenom, classe, email, dateNaissance } = body || {};
    if (email && email !== existing.email) {
      if (!validateEmail(email)) {
        return sendJson(400, { success: false, error: 'Format email invalide' });
      }
      const duplicate = db.collection('etudiants').findOne({ email: email.trim().toLowerCase() });
      if (duplicate && duplicate.id !== id) {
        return sendJson(409, { success: false, error: 'Cet email est déjà utilisé par un autre étudiant' });
      }
    }

    const updated = db.collection('etudiants').findByIdAndUpdate(id, {
      ...(nom && { nom: nom.trim() }),
      ...(prenom && { prenom: prenom.trim() }),
      ...(classe && { classe: classe.trim() }),
      ...(email && { email: email.trim().toLowerCase() }),
      ...(dateNaissance && { dateNaissance })
    });

    return sendJson(200, { success: true, message: 'Étudiant mis à jour', data: updated });
  }

  // Soft delete
  if (pathname.match(/^\/api\/v1\/etudiants\/([a-zA-Z0-9_-]+)$/) && req.method === 'DELETE') {
    const id = pathname.split('/').pop();
    const existing = db.collection('etudiants').findById(id);
    if (!existing) {
      return sendJson(404, { success: false, error: 'Étudiant non trouvé' });
    }

    // Soft delete: isActive = false (Conforme Cahier des Charges)
    const updated = db.collection('etudiants').findByIdAndUpdate(id, { isActive: false });

    // Désactiver également son compte utilisateur
    const user = db.collection('utilisateurs').findOne({ email: existing.email });
    if (user) {
      db.collection('utilisateurs').findByIdAndUpdate(user.id, { isActive: false });
    }

    return sendJson(200, {
      success: true,
      message: `Étudiant ${existing.prenom} ${existing.nom} archivé avec succès (Soft Delete: isActive = false)`,
      data: updated
    });
  }

  // Restore soft-deleted student
  if (pathname.match(/^\/api\/v1\/etudiants\/([a-zA-Z0-9_-]+)\/restore$/) && req.method === 'PATCH') {
    const id = pathname.split('/')[4];
    const existing = db.collection('etudiants').findById(id);
    if (!existing) {
      return sendJson(404, { success: false, error: 'Étudiant non trouvé' });
    }
    const updated = db.collection('etudiants').findByIdAndUpdate(id, { isActive: true });
    return sendJson(200, { success: true, message: 'Étudiant réactivé avec succès', data: updated });
  }

  // ----------------------------------------------------
  // 3. MATIÈRES
  // ----------------------------------------------------
  if (pathname === '/api/v1/matieres' && req.method === 'GET') {
    const { classe, enseignant } = query;
    let matieres = db.collection('matieres').getAll();
    if (classe) {
      matieres = matieres.filter(m => !m.classe || m.classe.toLowerCase() === classe.toLowerCase());
    }
    if (enseignant) {
      matieres = matieres.filter(m => m.enseignant && m.enseignant.toLowerCase() === enseignant.toLowerCase());
    }
    return sendJson(200, { success: true, count: matieres.length, data: matieres });
  }

  if (pathname.match(/^\/api\/v1\/matieres\/([a-zA-Z0-9_-]+)$/) && req.method === 'GET') {
    const id = pathname.split('/').pop();
    const matiere = db.collection('matieres').findById(id);
    if (!matiere) {
      return sendJson(404, { success: false, error: 'Matière non trouvée' });
    }
    return sendJson(200, { success: true, data: matiere });
  }

  if (pathname === '/api/v1/matieres' && req.method === 'POST') {
    const { code, intitule, coefficient, credits, hasTP, enseignant } = body || {};

    if (!code || !intitule || coefficient === undefined || credits === undefined) {
      return sendJson(400, {
        success: false,
        error: 'Champs obligatoires : code, intitule, coefficient (>=1) et credits ECTS requis'
      });
    }

    if (Number(coefficient) < 1) {
      return sendJson(400, { success: false, error: 'Le coefficient doit être supérieur ou égal à 1' });
    }

    if (Number(credits) < 1) {
      return sendJson(400, { success: false, error: 'Les crédits ECTS doivent être supérieurs ou égaux à 1' });
    }

    // Code unique
    const existing = db.collection('matieres').findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return sendJson(409, {
        success: false,
        error: `Une matière avec le code '${code}' existe déjà (409 Conflict)`
      });
    }

    const newMatiere = db.collection('matieres').insertOne({
      code: code.trim().toUpperCase(),
      intitule: intitule.trim(),
      coefficient: Number(coefficient),
      credits: Number(credits),
      hasTP: Boolean(hasTP),
      enseignant: enseignant ? enseignant.trim() : 'Non assigné',
      isActive: true
    });

    return sendJson(201, {
      success: true,
      message: 'Matière créée avec succès',
      data: newMatiere
    });
  }

  if (pathname.match(/^\/api\/v1\/matieres\/([a-zA-Z0-9_-]+)\/stats$/) && req.method === 'GET') {
    const id = pathname.split('/')[4];
    const matiere = db.collection('matieres').findById(id);
    if (!matiere) {
      return sendJson(404, { success: false, error: 'Matière introuvable (404 Not Found)' });
    }

    const allNotes = db.collection('notes').find({ matiereId: id });
    const notesValues = allNotes.map(n => Number(n.valeur));
    const examNotes = allNotes.filter(n => n.type === 'EXAMEN').map(n => Number(n.valeur));
    const dsNotes = allNotes.filter(n => n.type === 'DS').map(n => Number(n.valeur));
    const tpNotes = allNotes.filter(n => n.type === 'TP').map(n => Number(n.valeur));

    const moy = notesValues.length ? Number((notesValues.reduce((a, b) => a + b, 0) / notesValues.length).toFixed(2)) : null;
    const min = notesValues.length ? Math.min(...notesValues) : null;
    const max = notesValues.length ? Math.max(...notesValues) : null;
    const reussiteCount = notesValues.filter(v => v >= 10.0).length;
    const tauxReussite = notesValues.length ? Number(((reussiteCount / notesValues.length) * 100).toFixed(2)) : 0;

    return sendJson(200, {
      success: true,
      data: {
        matiere,
        stats: {
          nbNotesTotal: notesValues.length,
          moyenneGlobale: moy,
          noteMinimale: min,
          noteMaximale: max,
          tauxReussite,
          moyExam: examNotes.length ? Number((examNotes.reduce((a,b)=>a+b,0)/examNotes.length).toFixed(2)) : null,
          moyDS: dsNotes.length ? Number((dsNotes.reduce((a,b)=>a+b,0)/dsNotes.length).toFixed(2)) : null,
          moyTP: tpNotes.length ? Number((tpNotes.reduce((a,b)=>a+b,0)/tpNotes.length).toFixed(2)) : null
        }
      }
    });
  }

  if (pathname.match(/^\/api\/v1\/matieres\/([a-zA-Z0-9_-]+)$/) && req.method === 'PUT') {
    const id = pathname.split('/').pop();
    const existing = db.collection('matieres').findById(id);
    if (!existing) {
      return sendJson(404, { success: false, error: 'Matière introuvable' });
    }

    const { intitule, coefficient, credits, hasTP, enseignant, isActive } = body || {};
    const updated = db.collection('matieres').findByIdAndUpdate(id, {
      ...(intitule && { intitule: intitule.trim() }),
      ...(coefficient !== undefined && { coefficient: Number(coefficient) }),
      ...(credits !== undefined && { credits: Number(credits) }),
      ...(hasTP !== undefined && { hasTP: Boolean(hasTP) }),
      ...(enseignant !== undefined && { enseignant: enseignant.trim() }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) })
    });

    return sendJson(200, { success: true, message: 'Matière mise à jour', data: updated });
  }

  // ----------------------------------------------------
  // 4. NOTES & SAISIE CONTRÔLÉE
  // ----------------------------------------------------
  if (pathname === '/api/v1/notes' && req.method === 'GET') {
    const { etudiantId, matiereId } = query;
    let notes = db.collection('notes').getAll();
    if (etudiantId) notes = notes.filter(n => n.etudiantId === etudiantId);
    if (matiereId) notes = notes.filter(n => n.matiereId === matiereId);
    return sendJson(200, { success: true, count: notes.length, data: notes });
  }

  if (pathname.match(/^\/api\/v1\/notes\/etudiant\/([a-zA-Z0-9_-]+)$/) && req.method === 'GET') {
    const etudiantId = pathname.split('/').pop();
    const notes = db.collection('notes').find({ etudiantId });
    return sendJson(200, { success: true, count: notes.length, data: notes });
  }

  if (pathname === '/api/v1/notes' && req.method === 'POST') {
    const { etudiantId, matiereId, type, valeur } = body || {};

    // 1. Validation de la présence des champs essentiels
    if (!etudiantId || !matiereId || !type || valeur === undefined || valeur === null) {
      return sendJson(400, {
        success: false,
        error: 'Champs obligatoires manquants : etudiantId, matiereId, type (DS, EXAMEN, TP) et valeur sont requis (400 Bad Request)'
      });
    }

    const upperType = type.trim().toUpperCase();
    if (!['DS', 'EXAMEN', 'TP'].includes(upperType)) {
      return sendJson(400, {
        success: false,
        error: "Type de note invalide. Les types autorisés sont : 'DS', 'EXAMEN' ou 'TP' (400 Bad Request)"
      });
    }

    // 2. Validation de l'intervalle [0..20] (Contrainte CT5 / Besoin 13)
    const numValeur = Number(valeur);
    if (isNaN(numValeur) || numValeur < 0 || numValeur > 20) {
      return sendJson(400, {
        success: false,
        error: `Note invalide (${valeur}). La note doit obligatoirement être comprise entre 0 et 20 (400 Bad Request)`
      });
    }

    // 3. Vérification de l'existence et du statut actif de l'étudiant (Besoin 17 -> 404)
    const etudiant = db.collection('etudiants').findById(etudiantId);
    if (!etudiant || !etudiant.isActive) {
      return sendJson(404, {
        success: false,
        error: `L'étudiant spécifié (${etudiantId}) n'existe pas ou est inactif (404 Not Found)`
      });
    }

    // 4. Vérification de l'existence et du statut actif de la matière (Besoin 17 -> 404)
    const matiere = db.collection('matieres').findById(matiereId);
    if (!matiere || !matiere.isActive) {
      return sendJson(404, {
        success: false,
        error: `La matière spécifiée (${matiereId}) n'existe pas ou est inactive (404 Not Found)`
      });
    }

    // Si la matière n'a pas de TP et qu'on essaie d'ajouter un TP
    if (upperType === 'TP' && !matiere.hasTP) {
      return sendJson(400, {
        success: false,
        error: `Cette matière (${matiere.code}) n'inclut pas de travaux pratiques (hasTP = false) (400 Bad Request)`
      });
    }

    // 5. Unicité composée : 1 seul DS, 1 seul EXAMEN, 1 seul TP par matière par étudiant (Besoin 16 -> 409 Conflict)
    const duplicate = db.collection('notes').findOne({
      etudiantId,
      matiereId,
      type: upperType
    });

    if (duplicate) {
      return sendJson(409, {
        success: false,
        error: `Conflit (409 Conflict) : Une note de type '${upperType}' existe déjà pour cet étudiant dans la matière ${matiere.code} (valeur actuelle: ${duplicate.valeur}/20). Utilisez la modification pour changer la note.`
      });
    }

    const newNote = db.collection('notes').insertOne({
      etudiantId,
      matiereId,
      type: upperType,
      valeur: numValeur,
      dateCreation: new Date().toISOString().split('T')[0]
    });

    return sendJson(201, {
      success: true,
      message: `Note de ${upperType} (${numValeur}/20) enregistrée avec succès`,
      data: newNote
    });
  }

  // Saisie / Mise à jour en bloc de la grille des notes d'un étudiant (Plan d'étude complet)
  if (pathname === '/api/v1/notes/grille' && req.method === 'POST') {
    const { etudiantId, notes } = body || {};
    if (!etudiantId || !Array.isArray(notes)) {
      return sendJson(400, { success: false, error: 'Identifiant étudiant et tableau de notes requis' });
    }
    const etudiant = db.collection('etudiants').findById(etudiantId);
    if (!etudiant || !etudiant.isActive) {
      return sendJson(404, { success: false, error: 'Étudiant introuvable ou inactif' });
    }

    const saved = [];
    for (const item of notes) {
      const { matiereId, type, valeur } = item;
      if (!matiereId || !type) continue;
      const upperType = type.trim().toUpperCase();

      if (valeur === null || valeur === '' || valeur === undefined) {
        // Supprimer la note existante si la case est effacée
        const exist = db.collection('notes').findOne({ etudiantId, matiereId, type: upperType });
        if (exist) db.collection('notes').findByIdAndDelete(exist.id);
        continue;
      }

      const numVal = Number(valeur);
      if (isNaN(numVal) || numVal < 0 || numVal > 20) {
        return sendJson(400, {
          success: false,
          error: `Note invalide (${valeur}). Chaque note doit obligatoirement être comprise entre 0 et 20.`
        });
      }

      const exist = db.collection('notes').findOne({ etudiantId, matiereId, type: upperType });
      if (exist) {
        const up = db.collection('notes').findByIdAndUpdate(exist.id, { valeur: numVal });
        saved.push(up);
      } else {
        const ins = db.collection('notes').insertOne({
          etudiantId,
          matiereId,
          type: upperType,
          valeur: numVal,
          dateCreation: new Date().toISOString().split('T')[0]
        });
        saved.push(ins);
      }
    }

    const deliberation = calculerDeliberationEtudiant(etudiantId);
    return sendJson(200, {
      success: true,
      message: `Grille des notes de ${etudiant.prenom} ${etudiant.nom} enregistrée et moyenne recalculée.`,
      data: { savedCount: saved.length, deliberation }
    });
  }

  // Saisie / Mise à jour en bloc des notes par Classe et Matière (Workflow Hiérarchique Enseignant/Admin)
  if (pathname === '/api/v1/notes/classe-matiere' && req.method === 'POST') {
    const { classe, matiereId, evaluations } = body || {};
    if (!classe || !matiereId || !Array.isArray(evaluations)) {
      return sendJson(400, { success: false, error: 'Classe, matiereId et tableau d\'évaluations requis' });
    }

    const matiere = db.collection('matieres').findById(matiereId);
    if (!matiere || !matiere.isActive) {
      return sendJson(404, { success: false, error: 'Matière introuvable ou inactive' });
    }

    // Vérification des droits enseignant : un enseignant ne peut saisir que ses matières
    if (currentUser && currentUser.role === 'ENSEIGNANT') {
      const isTeacherOfMat = (matiere.enseignant && matiere.enseignant.toLowerCase() === currentUser.nom.toLowerCase()) ||
        (currentUser.matieresAssociees && currentUser.matieresAssociees.includes(matiere.code));
      if (!isTeacherOfMat) {
        return sendJson(403, {
          success: false,
          error: `Accès non autorisé : Vous ne pouvez évaluer que les matières qui vous sont assignées (${currentUser.matieresAssociees ? currentUser.matieresAssociees.join(', ') : 'Aucune'}).`
        });
      }
    }

    const saved = [];
    for (const evalItem of evaluations) {
      const { etudiantId, ds, examen, tp } = evalItem;
      if (!etudiantId) continue;

      const etudiant = db.collection('etudiants').findById(etudiantId);
      if (!etudiant || !etudiant.isActive) continue;

      const typesToProcess = [
        { type: 'DS', val: ds },
        { type: 'EXAMEN', val: examen },
        ...(matiere.hasTP ? [{ type: 'TP', val: tp }] : [])
      ];

      for (const item of typesToProcess) {
        const upperType = item.type;
        const val = item.val;

        if (val === null || val === '' || val === undefined) {
          // Supprimer la note existante si effacée
          const exist = db.collection('notes').findOne({ etudiantId, matiereId, type: upperType });
          if (exist) db.collection('notes').findByIdAndDelete(exist.id);
          continue;
        }

        const numVal = Number(val);
        if (isNaN(numVal) || numVal < 0 || numVal > 20) {
          return sendJson(400, {
            success: false,
            error: `Note invalide (${val}) pour l'étudiant ${etudiant.nom}. Chaque note doit obligatoirement être comprise entre 0 et 20.`
          });
        }

        const exist = db.collection('notes').findOne({ etudiantId, matiereId, type: upperType });
        if (exist) {
          const up = db.collection('notes').findByIdAndUpdate(exist.id, { valeur: numVal });
          saved.push(up);
        } else {
          const ins = db.collection('notes').insertOne({
            etudiantId,
            matiereId,
            type: upperType,
            valeur: numVal,
            dateCreation: new Date().toISOString().split('T')[0]
          });
          saved.push(ins);
        }
      }
    }

    return sendJson(200, {
      success: true,
      message: `Notes enregistrées avec succès pour la promotion ${classe} en ${matiere.intitule}.`,
      data: { savedCount: saved.length }
    });
  }

  if (pathname.match(/^\/api\/v1\/notes\/([a-zA-Z0-9_-]+)$/) && req.method === 'PUT') {
    const id = pathname.split('/').pop();
    const existing = db.collection('notes').findById(id);
    if (!existing) {
      return sendJson(404, { success: false, error: 'Note non trouvée (404 Not Found)' });
    }

    const { valeur } = body || {};
    if (valeur === undefined || valeur === null) {
      return sendJson(400, { success: false, error: 'Nouvelle valeur de note requise' });
    }

    const numValeur = Number(valeur);
    if (isNaN(numValeur) || numValeur < 0 || numValeur > 20) {
      return sendJson(400, { success: false, error: 'La note doit être comprise entre 0 et 20' });
    }

    const updated = db.collection('notes').findByIdAndUpdate(id, { valeur: numValeur });
    return sendJson(200, { success: true, message: 'Note rectifiée avec succès', data: updated });
  }

  if (pathname.match(/^\/api\/v1\/notes\/([a-zA-Z0-9_-]+)$/) && req.method === 'DELETE') {
    const id = pathname.split('/').pop();
    const existing = db.collection('notes').findById(id);
    if (!existing) {
      return sendJson(404, { success: false, error: 'Note non trouvée' });
    }
    db.collection('notes').findByIdAndDelete(id);
    return sendJson(200, { success: true, message: 'Note supprimée avec succès' });
  }

  // ----------------------------------------------------
  // 5. DÉLIBÉRATIONS & STATISTIQUES LMD
  // ----------------------------------------------------
  if (pathname.match(/^\/api\/v1\/deliberations\/etudiant\/([a-zA-Z0-9_-]+)$/) && req.method === 'GET') {
    const etudiantId = pathname.split('/').pop();
    const deliberation = calculerDeliberationEtudiant(etudiantId);
    if (!deliberation) {
      return sendJson(404, { success: false, error: 'Étudiant introuvable' });
    }
    return sendJson(200, { success: true, data: deliberation });
  }

  if (pathname.match(/^\/api\/v1\/deliberations\/classe\/([a-zA-Z0-9_%-]+)$/) && req.method === 'GET') {
    const classeRaw = pathname.split('/').pop();
    const classe = decodeURIComponent(classeRaw);
    const classement = calculerClassementClasse(classe);
    return sendJson(200, { success: true, count: classement.length, data: classement });
  }

  if (pathname === '/api/v1/deliberations/stats' && req.method === 'GET') {
    const stats = calculerStatistiquesGlobales();
    return sendJson(200, { success: true, data: stats });
  }

  // ----------------------------------------------------
  // 6. RÉCLAMATIONS DE NOTES
  // ----------------------------------------------------
  if (pathname === '/api/v1/reclamations' && req.method === 'GET') {
    const { statut, etudiantId, enseignant, classe } = query;
    let recs = db.collection('reclamations').getAll();
    if (statut) recs = recs.filter(r => r.statut === statut);
    if (etudiantId) recs = recs.filter(r => r.etudiantId === etudiantId);

    // Enrichir avec infos étudiant et matière pour l'affichage
    let enriched = recs.map(r => {
      const etud = db.collection('etudiants').findById(r.etudiantId);
      const mat = db.collection('matieres').findById(r.matiereId);
      return {
        ...r,
        etudiantNom: etud ? `${etud.prenom} ${etud.nom}` : 'Inconnu',
        etudiantClasse: etud ? etud.classe : '',
        matiereIntitule: mat ? mat.intitule : 'Inconnue',
        matiereCode: mat ? mat.code : '',
        matiereEnseignant: mat ? mat.enseignant : ''
      };
    });

    if (enseignant) {
      enriched = enriched.filter(r => r.matiereEnseignant && r.matiereEnseignant.toLowerCase() === enseignant.toLowerCase());
    }
    if (classe) {
      enriched = enriched.filter(r => r.etudiantClasse && r.etudiantClasse.toLowerCase() === classe.toLowerCase());
    }

    return sendJson(200, { success: true, count: enriched.length, data: enriched });
  }

  if (pathname === '/api/v1/reclamations' && req.method === 'POST') {
    const { etudiantId, matiereId, typeNote, motif } = body || {};

    if (!etudiantId || !matiereId || !typeNote || !motif) {
      return sendJson(400, {
        success: false,
        error: 'Champs obligatoires : etudiantId, matiereId, typeNote et motif sont requis'
      });
    }

    const noteExistante = db.collection('notes').findOne({
      etudiantId,
      matiereId,
      type: typeNote.trim().toUpperCase()
    });

    const newRec = db.collection('reclamations').insertOne({
      etudiantId,
      matiereId,
      typeNote: typeNote.trim().toUpperCase(),
      noteActuelle: noteExistante ? noteExistante.valeur : null,
      motif: motif.trim(),
      statut: 'EN_ATTENTE', // EN_ATTENTE | ACCEPTEE | REFUSEE
      reponse: null,
      traitePar: null,
      dateCreation: new Date().toISOString(),
      dateTraitement: null
    });

    return sendJson(201, {
      success: true,
      message: 'Réclamation enregistrée avec succès. Elle sera instruite par le service pédagogique.',
      data: newRec
    });
  }

  if (pathname.match(/^\/api\/v1\/reclamations\/([a-zA-Z0-9_-]+)\/traiter$/) && req.method === 'PUT') {
    const id = pathname.split('/')[4];
    const rec = db.collection('reclamations').findById(id);
    if (!rec) {
      return sendJson(404, { success: false, error: 'Réclamation introuvable' });
    }

    const { statut, reponse, nouvelleNoteValeur, traitePar } = body || {};
    if (!['ACCEPTEE', 'REFUSEE'].includes(statut)) {
      return sendJson(400, { success: false, error: "Le statut doit être 'ACCEPTEE' ou 'REFUSEE'" });
    }

    let noteRectifiee = null;
    if (statut === 'ACCEPTEE' && nouvelleNoteValeur !== undefined && nouvelleNoteValeur !== null) {
      const val = Number(nouvelleNoteValeur);
      if (isNaN(val) || val < 0 || val > 20) {
        return sendJson(400, { success: false, error: 'La nouvelle note rectifiée doit être comprise entre 0 et 20' });
      }

      // Rectifier automatiquement la note correspondante
      const targetNote = db.collection('notes').findOne({
        etudiantId: rec.etudiantId,
        matiereId: rec.matiereId,
        type: rec.typeNote
      });

      if (targetNote) {
        noteRectifiee = db.collection('notes').findByIdAndUpdate(targetNote.id, { valeur: val });
      } else {
        noteRectifiee = db.collection('notes').insertOne({
          etudiantId: rec.etudiantId,
          matiereId: rec.matiereId,
          type: rec.typeNote,
          valeur: val,
          dateCreation: new Date().toISOString().split('T')[0]
        });
      }
    }

    const updated = db.collection('reclamations').findByIdAndUpdate(id, {
      statut,
      reponse: reponse || (statut === 'ACCEPTEE' ? 'Note rectifiée après vérification de la copie.' : 'Réclamation rejetée après réexamen.'),
      traitePar: traitePar || 'Enseignant / Scolarité',
      nouvelleNoteValeur: statut === 'ACCEPTEE' ? nouvelleNoteValeur : null,
      dateTraitement: new Date().toISOString()
    });

    return sendJson(200, {
      success: true,
      message: `Réclamation marquée comme ${statut}${noteRectifiee ? ' et note automatiquement mise à jour.' : '.'}`,
      data: updated,
      noteRectifiee: Boolean(noteRectifiee),
      noteDetails: noteRectifiee
    });
  }

  // ----------------------------------------------------
  // 7. EXPORTS & UTILITAIRES
  // ----------------------------------------------------
  if (pathname === '/api/v1/export/csv' && req.method === 'GET') {
    const etudiants = db.collection('etudiants').find({ isActive: true });
    const deliberations = etudiants.map(e => calculerDeliberationEtudiant(e.id)).filter(Boolean);
    deliberations.sort((a, b) => b.moyenneGenerale - a.moyenneGenerale);

    let csv = 'Rang;Numero;Nom;Prenom;Classe;MoyenneGenerale;CreditsValides;CreditsTotaux;Mention;Statut;Observation\r\n';
    deliberations.forEach((d, idx) => {
      const row = [
        idx + 1,
        `"${d.etudiant.numeroEtudiant || ''}"`,
        `"${d.etudiant.nom}"`,
        `"${d.etudiant.prenom}"`,
        `"${d.etudiant.classe}"`,
        d.moyenneGenerale.toFixed(2),
        d.creditsValides,
        d.creditsTotaux,
        `"${d.mention}"`,
        `"${d.statut}"`,
        `"${d.observation.replace(/"/g, '""')}"`
      ];
      csv += row.join(';') + '\r\n';
    });

    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="deliberations_lmd_scolarite.csv"'
    });
    res.end('\uFEFF' + csv); // BOM UTF-8 for Excel
    return;
  }

  // Export Postman Collection v2.1.0 (Livrable L3 / BNF20)
  if (pathname === '/api/v1/export/postman' && req.method === 'GET') {
    const postmanPath = path.join(__dirname, '..', '..', 'postman_collection.json');
    if (fs.existsSync(postmanPath)) {
      const content = fs.readFileSync(postmanPath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Scolarite_LMD_Postman_Collection.json"'
      });
      res.end(content);
      return;
    }
  }

  if (pathname === '/api/v1/system/reset' && req.method === 'POST') {
    await db.reset();
    return sendJson(200, {
      success: true,
      message: 'Base de données MongoDB (scolarite_lmd) et jeu d\'essai réinitialisés avec succès.',
      status: db.getMongoStatus()
    });
  }

  if (pathname === '/api/v1/system/mongo-status' && req.method === 'GET') {
    return sendJson(200, {
      success: true,
      data: db.getMongoStatus()
    });
  }

  // 404 Route non trouvée
  return sendJson(404, {
    success: false,
    error: `Endpoint '${req.method} ${pathname}' introuvable (404 Not Found)`
  });
}

module.exports = {
  handleRestRoutes
};
