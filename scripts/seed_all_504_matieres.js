const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

const FILE_TO_CLASS = {
  '1ere/GLSI.pdf': 'L1-INFO',
  '2eme/GLSI.pdf': 'L2-INFO',
  '3eme/GLSI.pdf': 'L3-INFO',
  '1ere/SISE.pdf': 'L1-SISE',
  '2eme/SISE.pdf': 'L2-SISE',
  '3eme/SISE.pdf': 'L3-SISE',
  '1ere/EEA.pdf': 'L1-EEA',
  '2eme/EEA.pdf': 'L2-EEA-AII',
  '2eme/EEA2.pdf': 'L2-EEA-EI',
  '2eme/EEA3.pdf': 'L2-EEA-SE',
  '3eme/EEA.pdf': 'L3-EEA-AII',
  '3eme/EEA2.pdf': 'L3-EEA-EI',
  '3eme/EEA3.pdf': 'L3-EEA-SE',
  '1ere/EMT.pdf': 'L1-EMT',
  '2eme/EMMA.pdf': 'L2-EMMA',
  '2eme/EMMI.pdf': 'L2-EMMI',
  '3eme/EMMA.pdf': 'L3-EMMA',
  '3eme/EMMI.pdf': 'L3-EMMI',
  '1ere/GCTC.pdf': 'L1-GCTC',
  '2eme/GCB.pdf': 'L2-GCB',
  '2eme/GCP.pdf': 'L2-GCP',
  '3eme/GLB.pdf': 'L3-GLB',
  '3eme/GCP.pdf': 'L3-GCP',
  '1ere/GMTC.pdf': 'L1-GMTC',
  '2eme/GMCP.pdf': 'L2-GMCP',
  '2eme/GMP.pdf': 'L2-GMP',
  '3eme/GMCP.pdf': 'L3-GMCP',
  '3eme/GMP.pdf': 'L3-GMP',
  '1ere/GEFC.pdf': 'L1-GEFC',
  '2eme/GEFC.pdf': 'L2-GEFC',
  '3eme/GEFC.pdf': 'L3-GEFC'
};

const EXTRA_ING_MASTER_MATIERES = {
  'ING1-INFO': [
    { code: 'ING-ALGO2', intitule: 'Algorithmique Avancée & Complexité', uniteEnseignement: 'UE Informatique Fondamentale 2', coefficient: 2, credits: 5, hasTP: true, regime: 'RM', formule: '(DS+2TP+7EX)/10', semestre: 2 },
    { code: 'ING-SE2', intitule: 'Systèmes Concurrents & Multithreading', uniteEnseignement: 'UE Systèmes & Réseaux 2', coefficient: 2, credits: 5, hasTP: true, regime: 'RM', formule: '(DS+2TP+7EX)/10', semestre: 2 },
    { code: 'ING-WEB2', intitule: 'Développement Web Fullstack (Node/React)', uniteEnseignement: 'UE Génie Logiciel 2', coefficient: 2, credits: 5, hasTP: true, regime: 'RM', formule: '(DS+2TP+7EX)/10', semestre: 2 },
    { code: 'ING-MATH2', intitule: 'Statistiques Inférentielles & Data Science', uniteEnseignement: 'UE Mathématiques & Modélisation', coefficient: 1.5, credits: 5, hasTP: false, regime: 'RM', formule: '(3DS+7EX)/10', semestre: 2 },
    { code: 'ING-PROJ1', intitule: 'Projet Intégré Transversal 1', uniteEnseignement: 'UE Projet & Professionnalisation', coefficient: 2, credits: 5, hasTP: true, regime: 'CC', formule: 'Moy(TP)', semestre: 2 },
    { code: 'ING-COMM1', intitule: 'Communication Professionnelle & Leadership', uniteEnseignement: 'UE Langues & Soft Skills', coefficient: 1, credits: 5, hasTP: false, regime: 'CC', formule: '(DS1+DS2)/2', semestre: 2 }
  ],
  'ING2-GL': [
    { code: 'ING-ARCH-ENT', intitule: 'Architectures d\'Entreprise & Microservices', uniteEnseignement: 'UE Architectures Avancées', coefficient: 2, credits: 5, hasTP: true, regime: 'RM', formule: '(DS+2TP+7EX)/10', semestre: 2 },
    { code: 'ING-BIGDATA', intitule: 'Big Data Processing & Apache Spark', uniteEnseignement: 'UE Big Data & Cloud', coefficient: 2, credits: 5, hasTP: true, regime: 'RM', formule: '(DS+2TP+7EX)/10', semestre: 2 },
    { code: 'ING-SEC-APP', intitule: 'Sécurité des Systèmes d\'Information & DevSecOps', uniteEnseignement: 'UE Cybersécurité', coefficient: 2, credits: 5, hasTP: true, regime: 'RM', formule: '(DS+2TP+7EX)/10', semestre: 2 },
    { code: 'ING-BLOCKCHAIN', intitule: 'Technologies Blockchain & Smart Contracts', uniteEnseignement: 'UE Technologies Émergentes', coefficient: 1.5, credits: 5, hasTP: true, regime: 'RM', formule: '(DS+2TP+7EX)/10', semestre: 2 },
    { code: 'ING-STAGE2', intitule: 'Stage Ingénieur d\'Immersion Entreprise', uniteEnseignement: 'UE Stage Professionnel', coefficient: 2.5, credits: 5, hasTP: false, regime: 'SOUT', formule: '(3DS+7EX)/10', semestre: 2 },
    { code: 'ING-ETHIQUE', intitule: 'Droit Numérique & Management de Projet Agile', uniteEnseignement: 'UE Droit & Éthique', coefficient: 1, credits: 5, hasTP: false, regime: 'CC', formule: '(DS1+DS2)/2', semestre: 2 }
  ],
  'M1-GL': [
    { code: 'GL407', intitule: 'Ingénierie des Modèles (IDM) & DSL', uniteEnseignement: 'UE Génie Logiciel Avancé 2', coefficient: 2, credits: 5, hasTP: true, regime: 'RM', formule: '(DS+2TP+7EX)/10', semestre: 2 },
    { code: 'GL408', intitule: 'Cloud Computing & Orchestration Kubernetes', uniteEnseignement: 'UE Cloud & Virtualisation', coefficient: 2, credits: 5, hasTP: true, regime: 'RM', formule: '(DS+2TP+7EX)/10', semestre: 2 },
    { code: 'GL409', intitule: 'Deep Learning & Vision par Ordinateur', uniteEnseignement: 'UE Intelligence Artificielle 2', coefficient: 2, credits: 5, hasTP: true, regime: 'RM', formule: '(DS+2TP+7EX)/10', semestre: 2 },
    { code: 'GL410', intitule: 'Audit & Sécurité des Systèmes Distribués', uniteEnseignement: 'UE Sécurité & Gouvernance', coefficient: 1.5, credits: 5, hasTP: false, regime: 'RM', formule: '(3DS+7EX)/10', semestre: 2 },
    { code: 'GL411', intitule: 'Projet de Recherche & Développement', uniteEnseignement: 'UE Recherche & Innovation', coefficient: 2, credits: 5, hasTP: true, regime: 'CC', formule: 'Moy(TP)', semestre: 2 },
    { code: 'GL412', intitule: 'Veille Technologique & Rédaction Scientifique', uniteEnseignement: 'UE Compétences Transversales', coefficient: 1, credits: 5, hasTP: false, regime: 'CC', formule: '(DS1+DS2)/2', semestre: 2 }
  ],
  'M1-SPI': [
    { code: 'SPI-EDTECH', intitule: 'Technologies Éducatives & LMS Intelligents', uniteEnseignement: 'UE Systèmes Pédagogiques 2', coefficient: 2, credits: 5, hasTP: true, regime: 'RM', formule: '(DS+2TP+7EX)/10', semestre: 2 },
    { code: 'SPI-ANALYTICS', intitule: 'Learning Analytics & Fouille de Données', uniteEnseignement: 'UE Data Analytics', coefficient: 2, credits: 5, hasTP: true, regime: 'RM', formule: '(DS+2TP+7EX)/10', semestre: 2 },
    { code: 'SPI-IA-PEDAG', intitule: 'Tuteurs Intelligents & Systèmes Adaptatifs', uniteEnseignement: 'UE IA Appliquée', coefficient: 2, credits: 5, hasTP: true, regime: 'RM', formule: '(DS+2TP+7EX)/10', semestre: 2 },
    { code: 'SPI-ROBOTIQUE', intitule: 'Robotique Éducative & Interfaces Homme-Machine', uniteEnseignement: 'UE Interaction Avancée', coefficient: 1.5, credits: 5, hasTP: true, regime: 'RM', formule: '(DS+2TP+7EX)/10', semestre: 2 },
    { code: 'SPI-MEMOIRE', intitule: 'Mémoire de Recherche M1', uniteEnseignement: 'UE Recherche & Mémoire', coefficient: 2.5, credits: 5, hasTP: false, regime: 'SOUT', formule: '(3DS+7EX)/10', semestre: 2 },
    { code: 'SPI-ETHIQUE', intitule: 'Éthique de l\'IA & RGPD dans l\'Éducation', uniteEnseignement: 'UE Éthique & Déontologie', coefficient: 1, credits: 5, hasTP: false, regime: 'CC', formule: '(DS1+DS2)/2', semestre: 2 }
  ]
};

async function seed() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db = client.db('scolarite_lmd');

  console.log('=== Démarrage du peuplement intégral : 504 Matières et Étudiants ===');

  const plansPath = path.join(__dirname, '../src/data/plans_etude_issat_complets.json');
  const plansData = JSON.parse(fs.readFileSync(plansPath, 'utf8'));

  let matieresInserted = 0;
  let matieresUpdated = 0;

  for (const [key, plan] of Object.entries(plansData)) {
    const targetClass = FILE_TO_CLASS[key] || plan.filiere;
    console.log(`Traitement Plan: ${key} -> Classe: ${targetClass} (${plan.matieres.length} matières)`);

    for (const m of plan.matieres) {
      let uniqueCode = m.code;
      if (targetClass !== 'L1-INFO' && targetClass !== 'L2-INFO' && targetClass !== 'L3-INFO') {
        const prefix = targetClass.replace(/[^a-zA-Z0-9]/g, '');
        uniqueCode = `${prefix}-${m.code}`;
      }

      const matId = `mat_${targetClass.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${m.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      let finalId = matId;
      if (targetClass === 'L3-INFO') {
        if (m.code === '1501') finalId = 'mat_1';
        else if (m.code === '1502') finalId = 'mat_2';
        else if (m.code === '1503') finalId = 'mat_4';
        else if (m.code === '1506') finalId = 'mat_5';
        else if (m.code === '1507') finalId = 'mat_3';
        else if (m.code === '1508') finalId = 'mat_l3_6';
      }

      let sem = Number(m.semestre);
      if (sem > 2) {
        sem = (sem % 2 === 1) ? 1 : 2;
      }
      if (!sem || sem < 1 || sem > 2) sem = 1;

      const doc = {
        id: finalId,
        code: uniqueCode,
        intitule: m.intitule,
        uniteEnseignement: m.uniteEnseignement || 'UE Générale',
        coefficient: Number(m.coefficient) || 1,
        credits: Number(m.credits) || 2,
        hasTP: Boolean(m.hasTP),
        regime: m.regime || (m.hasTP ? 'RM' : 'RM'),
        formule: m.formule || (m.hasTP ? '(DS+2TP+7EX)/10' : '(3DS+7EX)/10'),
        classe: targetClass,
        semestre: sem,
        enseignant: m.enseignant || 'Dr. Enseignant Responsable',
        isActive: true,
        updatedAt: new Date()
      };

      const res = await db.collection('matieres').updateOne(
        { $or: [{ id: finalId }, { code: uniqueCode }] },
        { $set: doc },
        { upsert: true }
      );

      if (res.upsertedCount > 0) matieresInserted++;
      else matieresUpdated++;
    }
  }

  // Matières supplémentaires pour ING1, ING2, M1, M2
  for (const [classe, mats] of Object.entries(EXTRA_ING_MASTER_MATIERES)) {
    for (const m of mats) {
      const matId = `mat_${classe.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${m.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const doc = {
        id: matId,
        code: m.code,
        intitule: m.intitule,
        uniteEnseignement: m.uniteEnseignement,
        coefficient: m.coefficient,
        credits: m.credits,
        hasTP: m.hasTP,
        regime: m.regime,
        formule: m.formule,
        classe: classe,
        semestre: m.semestre,
        enseignant: 'Dr. Enseignant Responsable',
        isActive: true,
        updatedAt: new Date()
      };

      await db.collection('matieres').updateOne(
        { $or: [{ id: matId }, { code: m.code }] },
        { $set: doc },
        { upsert: true }
      );
      matieresInserted++;
    }
  }

  console.log(`\n✅ Matières traitées dans MongoDB : ${matieresInserted} nouvelles / ${matieresUpdated} mises à jour.`);

  // Création des étudiants pour toutes les nouvelles classes
  console.log('\n=== Création des Étudiants pour toutes les Licences ===');
  const SAMPLE_STUDENTS_BY_CLASS = {
    'L1-SISE': [
      { nom: 'Kallel', prenom: 'Ines', email: 'ines.kallel@myuniversity.tn' },
      { nom: 'Trabelsi', prenom: 'Walid', email: 'walid.trabelsi@myuniversity.tn' }
    ],
    'L2-SISE': [
      { nom: 'Masmoudi', prenom: 'Hedi', email: 'hedi.masmoudi@myuniversity.tn' },
      { nom: 'Ben Salem', prenom: 'Arij', email: 'arij.bensalem@myuniversity.tn' }
    ],
    'L3-SISE': [
      { nom: 'Ghorbel', prenom: 'Amine', email: 'amine.ghorbel@myuniversity.tn' },
      { nom: 'Ben Rhouma', prenom: 'Sirine', email: 'sirine.benrhouma@myuniversity.tn' }
    ],
    'L1-EEA': [
      { nom: 'Hassani', prenom: 'Bilel', email: 'bilel.hassani@myuniversity.tn' },
      { nom: 'Mejri', prenom: 'Salma', email: 'salma.mejri@myuniversity.tn' }
    ],
    'L2-EEA-AII': [
      { nom: 'Zouari', prenom: 'Karim', email: 'karim.zouari@myuniversity.tn' }
    ],
    'L3-EEA-AII': [
      { nom: 'Daoud', prenom: 'Firas', email: 'firas.daoud@myuniversity.tn' }
    ],
    'L1-GCTC': [
      { nom: 'Boukhris', prenom: 'Mariem', email: 'mariem.boukhris@myuniversity.tn' },
      { nom: 'Ferchichi', prenom: 'Oussama', email: 'oussama.ferchichi@myuniversity.tn' }
    ],
    'L2-GCB': [
      { nom: 'Cherif', prenom: 'Nidhal', email: 'nidhal.cherif@myuniversity.tn' }
    ],
    'L3-GLB': [
      { nom: 'Louati', prenom: 'Sabrine', email: 'sabrine.louati@myuniversity.tn' }
    ],
    'L1-GMTC': [
      { nom: 'Hammami', prenom: 'Tarek', email: 'tarek.hammami@myuniversity.tn' }
    ],
    'L2-GMP': [
      { nom: 'Saidi', prenom: 'Ghazi', email: 'ghazi.saidi@myuniversity.tn' }
    ],
    'L3-GMP': [
      { nom: 'Abdelkader', prenom: 'Khaled', email: 'khaled.abdelkader@myuniversity.tn' }
    ],
    'L1-EMT': [
      { nom: 'Dabbabi', prenom: 'Zied', email: 'zied.dabbabi@myuniversity.tn' }
    ],
    'L2-EMMA': [
      { nom: 'Chaouachi', prenom: 'Manel', email: 'manel.chaouachi@myuniversity.tn' }
    ],
    'L3-EMMA': [
      { nom: 'Baccouche', prenom: 'Mohamed', email: 'mohamed.baccouche@myuniversity.tn' }
    ],
    'L1-GEFC': [
      { nom: 'Bouzid', prenom: 'Aymen', email: 'aymen.bouzid@myuniversity.tn' }
    ],
    'L2-GEFC': [
      { nom: 'Khemiri', prenom: 'Nadia', email: 'nadia.khemiri@myuniversity.tn' }
    ],
    'L3-GEFC': [
      { nom: 'Mabrouk', prenom: 'Sami', email: 'sami.mabrouk@myuniversity.tn' }
    ]
  };

  let numCompteur = 700;
  for (const [classe, studs] of Object.entries(SAMPLE_STUDENTS_BY_CLASS)) {
    for (const s of studs) {
      numCompteur++;
      const id = `etud_${classe.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${s.nom.toLowerCase()}`;
      const existingEtud = await db.collection('etudiants').findOne({ email: s.email });
      const numToUse = existingEtud ? existingEtud.numeroEtudiant : `ETU-2026-${numCompteur}`;

      await db.collection('etudiants').updateOne(
        { email: s.email },
        {
          $set: {
            id,
            nom: s.nom,
            prenom: s.prenom,
            email: s.email,
            classe: classe,
            numeroEtudiant: numToUse,
            dateNaissance: '2004-05-12',
            isActive: true,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      await db.collection('utilisateurs').updateOne(
        { email: s.email },
        {
          $set: {
            id: `usr_${id}`,
            email: s.email,
            nom: `${s.prenom} ${s.nom}`,
            role: 'ETUDIANT',
            etudiantId: id,
            motDePasse: 'aad2642dc58834ac225acccf38f113737d9533935e8e41752c2e5562cc79c1b1',
            isActive: true
          }
        },
        { upsert: true }
      );
    }
  }

  // Synchronisation des notes pour TOUS les étudiants
  console.log('\n=== Synchronisation des notes pour TOUS les étudiants ===');
  const allStudents = await db.collection('etudiants').find({}).toArray();
  const allMatieres = await db.collection('matieres').find({}).toArray();

  let notesCount = 0;
  for (const st of allStudents) {
    const classMats = allMatieres.filter(m => m.classe === st.classe);
    for (const m of classMats) {
      const types = [];
      if (m.regime === 'CC') {
        types.push({ type: 'DS', val: 14 + (Math.sin(st.nom.length + m.code.length) * 3) });
        types.push({ type: 'EXAMEN', val: 15 + (Math.cos(st.nom.length + m.code.length) * 3) });
      } else if (m.regime === 'SOUT') {
        types.push({ type: 'EXAMEN', val: 16.5 + (Math.sin(st.nom.length) * 2) });
      } else {
        types.push({ type: 'DS', val: 13 + (Math.sin(st.nom.length + m.code.length) * 3.5) });
        types.push({ type: 'EXAMEN', val: 14.5 + (Math.cos(st.nom.length + m.code.length) * 3.5) });
        if (m.hasTP) {
          types.push({ type: 'TP', val: 16 + (Math.sin(m.code.length * 3) * 2.5) });
        }
      }

      for (const t of types) {
        const raw = Math.round(Math.max(10, Math.min(19.5, t.val)) * 4) / 4;
        const noteId = `note_${st.id}_${m.id}_${t.type.toLowerCase()}`;
        await db.collection('notes').updateOne(
          { etudiantId: st.id, matiereId: m.id, type: t.type },
          {
            $set: {
              id: noteId,
              etudiantId: st.id,
              matiereId: m.id,
              type: t.type,
              valeur: raw,
              statut: 'PRESENT',
              dateCreation: '2026-10-25',
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );
        notesCount++;
      }
    }
  }

  console.log(`\n🎯 Notes garanties générées : ${notesCount}`);

  const totalFinalMatieres = await db.collection('matieres').countDocuments({});
  const totalFinalEtudiants = await db.collection('etudiants').countDocuments({});
  const totalFinalNotes = await db.collection('notes').countDocuments({});

  console.log('====================================================');
  console.log(`📊 TOTAL MATIÈRES DANS MONGODB : ${totalFinalMatieres}`);
  console.log(`📊 TOTAL ÉTUDIANTS DANS MONGODB: ${totalFinalEtudiants}`);
  console.log(`📊 TOTAL NOTES DANS MONGODB    : ${totalFinalNotes}`);
  console.log('====================================================');

  await client.close();
}

seed().catch(console.error);
