/**
 * Suite de Tests Automatisés de l'API REST & SOAP (Conforme Cahier des Charges BNF20 / Livrable L4)
 * Exécution : node tests/run_api_tests.js
 */

const path = require('path');
const { spawn } = require('child_process');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let testServerProcess = null;

async function ensureServer() {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/matieres`, { signal: AbortSignal.timeout(1000) });
    if (res.status) return;
  } catch (e) {
    console.log(`⏳ Serveur non actif sur ${BASE_URL}. Démarrage automatique du serveur pour les tests...`);
    testServerProcess = spawn('node', [path.join(__dirname, '..', 'server.js')], {
      stdio: 'ignore',
      detached: false
    });
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 300));
      try {
        const res = await fetch(`${BASE_URL}/api/v1/matieres`, { signal: AbortSignal.timeout(500) });
        if (res.status) {
          console.log(`✅ Serveur prêt sur ${BASE_URL}.\n`);
          return;
        }
      } catch (err) {}
    }
  }
}

function assert(description, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${description} ${details ? '-> ' + details : ''}`);
  }
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {}
  return { status: res.status, headers: res.headers, text, json };
}

async function runTests() {
  await ensureServer();

  console.log(`\n============================================================`);
  console.log(`🧪 SUITE DE TESTS AUTOMATISÉS - API REST & SOAP (Sujet 2)`);
  console.log(`🌐 Serveur cible : ${BASE_URL}`);
  console.log(`============================================================\n`);

  let adminToken = '';

  // 1. AUTHENTIFICATION
  console.log(`📌 1. TESTS AUTHENTIFICATION & SÉCURITÉ (BNF6)`);
  {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@scolarite.univ.tn', motDePasse: 'admin123' })
    });
    assert('Connexion Administrateur (200 OK + JWT Token)', res.status === 200 && res.json?.token && res.json?.user?.role === 'ADMIN');
    adminToken = res.json?.token || '';

    const resProf = await request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'prof.martin@univ.tn', motDePasse: 'prof123' })
    });
    assert('Connexion Enseignant (200 OK + Rôle ENSEIGNANT)', resProf.status === 200 && resProf.json?.user?.role === 'ENSEIGNANT');

    const resBad = await request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@scolarite.univ.tn', motDePasse: 'mauvais_mdp' })
    });
    assert('Rejet mot de passe incorrect (401 Unauthorized)', resBad.status === 401 && resBad.json?.success === false);
  }

  // 2. GESTION DES ÉTUDIANTS
  console.log(`\n📌 2. TESTS SERVICE ÉTUDIANTS (Besoins 1-5, 14, 16)`);
  {
    const res = await request('/api/v1/etudiants?page=1&limit=3');
    assert('Lister les étudiants avec pagination (200 OK + metadata)', res.status === 200 && res.json?.data?.length > 0 && res.json?.page === 1);

    const resSingle = await request('/api/v1/etudiants/etud_1');
    assert('Consulter dossier complet étudiant (200 OK + délibération)', resSingle.status === 200 && resSingle.json?.data?.id === 'etud_1' && resSingle.json?.deliberation);

    // Validation email invalide -> 400
    const resBadEmail = await request('/api/v1/etudiants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ nom: 'Test', prenom: 'Syntaxe', classe: 'L3-INFO', email: 'email_sans_arobase' })
    });
    assert('Validation syntaxe email (400 Bad Request)', resBadEmail.status === 400);

    // Conflit email dupliqué -> 409
    const resDup = await request('/api/v1/etudiants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ nom: 'Mansouri', prenom: 'Sarah', classe: 'L3-INFO', email: 'sarah.mansouri@etud.univ.tn' })
    });
    assert('Détection doublon email (409 Conflict)', resDup.status === 409);

    // Soft delete -> isActive = false
    const resDelete = await request('/api/v1/etudiants/etud_3', { method: 'DELETE' });
    assert('Archivage logique / Soft Delete (200 OK + isActive: false)', resDelete.status === 200 && resDelete.json?.data?.isActive === false);

    // Restore
    const resRestore = await request('/api/v1/etudiants/etud_3/restore', { method: 'PATCH' });
    assert('Réactivation dossier étudiant (200 OK + isActive: true)', resRestore.status === 200 && resRestore.json?.data?.isActive === true);
  }

  // 3. GESTION DES MATIÈRES
  console.log(`\n📌 3. TESTS SERVICE MATIÈRES & INDICATEURS STATISTIQUES (Besoins 6-7, 20)`);
  {
    const res = await request('/api/v1/matieres');
    assert('Lister exhaustivement les matières (200 OK)', res.status === 200 && Array.isArray(res.json?.data));

    const resStats = await request('/api/v1/matieres/mat_1/stats');
    assert('Indicateurs statistiques par matière : Min, Max, Moyenne, Taux Réussite (200 OK)',
      resStats.status === 200 &&
      resStats.json?.data?.stats?.moyenneGlobale !== undefined &&
      resStats.json?.data?.stats?.tauxReussite !== undefined
    );
  }

  // 4. NOTES ET CONTROLES DE SAISIE
  console.log(`\n📌 4. TESTS SERVICE NOTES & VALIDATION STRICTE (Besoins 8-10, 13, 16, 17)`);
  {
    // Note hors intervalle [0..20] -> 400
    const resHorsLimite = await request('/api/v1/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etudiantId: 'etud_1', matiereId: 'mat_1', type: 'DS', valeur: 25.5 })
    });
    assert('Rejet note hors intervalle 0-20 : 25.5/20 (400 Bad Request)', resHorsLimite.status === 400);

    const resNeg = await request('/api/v1/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etudiantId: 'etud_1', matiereId: 'mat_1', type: 'DS', valeur: -2 })
    });
    assert('Rejet note négative : -2/20 (400 Bad Request)', resNeg.status === 400);

    // Étudiant inexistant -> 404
    const resInex = await request('/api/v1/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etudiantId: 'etud_inconnu_999', matiereId: 'mat_1', type: 'DS', valeur: 12 })
    });
    assert('Vérification existence programmatique étudiant (404 Not Found)', resInex.status === 404);

    // Doublon d'épreuve (1 seul DS, 1 seul Exam, 1 seul TP) -> 409 Conflict
    const resDupNote = await request('/api/v1/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etudiantId: 'etud_1', matiereId: 'mat_1', type: 'EXAMEN', valeur: 14 })
    });
    assert('Unicité composée : refus doublon de note pour même épreuve (409 Conflict)', resDupNote.status === 409);

    // Saisie en bloc grille plan d'études
    const resGrille = await request('/api/v1/notes/grille', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        etudiantId: 'etud_2',
        notes: [
          { matiereId: 'mat_1', type: 'DS', valeur: 14 },
          { matiereId: 'mat_1', type: 'EXAMEN', valeur: 15 },
          { matiereId: 'mat_1', type: 'TP', valeur: 16 }
        ]
      })
    });
    assert('Saisie en bloc selon Plan d\'études (200 OK + délibération actualisée)', resGrille.status === 200 && resGrille.json?.data?.savedCount > 0);
  }

  // 5. CALCULS ACADÉMIQUES LMD & CLASSEMENT
  console.log(`\n📌 5. TESTS MOTEUR LMD & DÉLIBÉRATIONS (Besoins 10a, 10b, 10c, 11, 12, 19)`);
  {
    const resDelib = await request('/api/v1/deliberations/etudiant/etud_1');
    assert('Calcul moyenne générale pondérée & statut LMD (200 OK)',
      resDelib.status === 200 &&
      resDelib.json?.data?.moyenneGenerale > 0 &&
      ['Admis', 'Admis par Rachat', 'Ajourné'].includes(resDelib.json?.data?.statut)
    );

    const resClassement = await request('/api/v1/deliberations/classe/L3-INFO');
    assert('Classement officiel ordonné par moyenne générale décroissante (200 OK)',
      resClassement.status === 200 &&
      resClassement.json?.data?.length > 1 &&
      resClassement.json?.data[0].moyenneGenerale >= resClassement.json?.data[1].moyenneGenerale
    );
  }

  // 6. GESTION DES RÉCLAMATIONS
  console.log(`\n📌 6. TESTS SERVICE RÉCLAMATIONS (Besoins 12a, 12b, 12c)`);
  {
    const resRec = await request('/api/v1/reclamations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        etudiantId: 'etud_1',
        matiereId: 'mat_1',
        typeNote: 'EXAMEN',
        motif: 'Erreur de transcription sur la copie d\'examen'
      })
    });
    assert('Dépôt d\'un recours par l\'étudiant (201 Created)', resRec.status === 201 && resRec.json?.data?.id);
    const recId = resRec.json?.data?.id;

    if (recId) {
      const resTraiter = await request(`/api/v1/reclamations/${recId}/traiter`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut: 'ACCEPTEE',
          reponse: 'Vérification effectuée : +2 points accordés.',
          nouvelleNoteValeur: 18.0
        })
      });
      assert('Instruction du recours & rectification automatique de note (200 OK)', resTraiter.status === 200 && resTraiter.json?.noteRectifiee === true);
    }
  }

  // 7. EXPORTS & INTEROPÉRABILITÉ SOAP / OPENAPI
  console.log(`\n📌 7. TESTS EXPORTS & INTEROPÉRABILITÉ SOA (BNF13, BNF14, BNF18, Livrable L3)`);
  {
    const resCsv = await request('/api/v1/export/csv');
    assert('Export officiel du PV au format CSV (200 OK + text/csv)', resCsv.status === 200 && resCsv.headers.get('content-type')?.includes('text/csv'));

    const resSwagger = await request('/api-docs/openapi.json');
    assert('Contrat de service OpenAPI 3.0 interactif (200 OK + JSON)', resSwagger.status === 200 && resSwagger.json?.openapi === '3.0.3');

    const resPostman = await request('/api/v1/export/postman');
    assert('Export collection Postman v2.1.0 téléchargeable (200 OK)', resPostman.status === 200 && resPostman.json?.info?.name);

    // Contrat WSDL SOAP
    const resWsdl = await request('/soap?wsdl');
    assert('Contrat formel SOAP 1.1 WSDL exposé (?wsdl en XML)', resWsdl.status === 200 && resWsdl.text.includes('definitions') && resWsdl.text.includes('soap:address'));

    // Requête SOAP POST
    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soap="http://univ.tn/scolarite/soap">
  <soapenv:Body>
    <soap:CalculerMoyenneEtudiantRequest>
      <etudiantId>etud_1</etudiantId>
    </soap:CalculerMoyenneEtudiantRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

    const resSoap = await request('/soap', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://univ.tn/scolarite/soap/CalculerMoyenneEtudiant'
      },
      body: envelope
    });
    assert('Exécution opération Web Service SOAP CalculerMoyenneEtudiant (200 OK XML)', resSoap.status === 200 && resSoap.text.includes('CalculerMoyenneEtudiantResponse'));
  }

  // BILAN DES TESTS
  console.log(`\n============================================================`);
  console.log(`📊 BILAN DES TESTS AUTOMATISÉS`);
  console.log(`   Total exécutés : ${totalTests}`);
  console.log(`   Succès (Pass)  : ${passedTests}`);
  console.log(`   Échecs (Fail)  : ${failedTests}`);
  console.log(`   Taux de succès : ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log(`============================================================\n`);

  if (testServerProcess) {
    try { testServerProcess.kill(); } catch (e) {}
  }

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  if (testServerProcess) {
    try { testServerProcess.kill(); } catch (e) {}
  }
  console.error('Erreur critique pendant les tests :', err);
  process.exit(1);
});

