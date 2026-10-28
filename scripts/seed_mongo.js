/**
 * Script de Seed MongoDB Professionnel (LMD Sujet 2)
 * Connecte à MongoDB (mongodb://127.0.0.1:27017/scolarite_lmd) et initialise
 * toutes les collections (utilisateurs, etudiants, matieres, notes, reclamations).
 */

const crypto = require('crypto');
const mongoose = require('mongoose');

function hashPassword(password) {
  const salt = 'scolarite_lmd_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex');
}

// -------------------------------------------------------------
// JEU D'ESSAI COMPLET UNIVERSITAIRE LMD
// Promotions: L2-INFO, L2-TIC, L3-INFO, L3-DSI, M1-GL, M1-IA
// -------------------------------------------------------------
function buildSeedData() {
  // 1. UTILISATEURS (Admin & 8 Enseignants de référence)
  const utilisateurs = [
    {
      id: 'usr_admin',
      email: 'admin@scolarite.univ.tn',
      motDePasse: hashPassword('admin123'),
      nom: 'Scolarité Centrale',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2026-09-01T08:00:00.000Z'
    },
    {
      id: 'usr_prof_martin',
      email: 'prof.martin@univ.tn',
      motDePasse: hashPassword('prof123'),
      nom: 'Dr. Philippe Martin',
      role: 'ENSEIGNANT',
      specialite: 'Algorithmique & Bases de Données',
      isActive: true,
      matieresAssociees: ['ALGO301', 'BD302', 'BD204', 'DSI311', 'GL401', 'DATA413'],
      createdAt: '2026-09-01T08:00:00.000Z'
    },
    {
      id: 'usr_prof_durand',
      email: 'prof.durand@univ.tn',
      motDePasse: hashPassword('prof123'),
      nom: 'Pr. Sylvie Durand',
      role: 'ENSEIGNANT',
      specialite: 'Architectures Web, SOA & Cloud',
      isActive: true,
      matieresAssociees: ['WEB303', 'DEV402', 'POO202', 'DEV213'],
      createdAt: '2026-09-01T08:00:00.000Z'
    },
    {
      id: 'usr_prof_trabelsi',
      email: 'prof.trabelsi@univ.tn',
      motDePasse: hashPassword('prof123'),
      nom: 'Dr. Mohamed Trabelsi',
      role: 'ENSEIGNANT',
      specialite: 'Systèmes d\'Exploitation & Réseaux',
      isActive: true,
      matieresAssociees: ['SYS201', 'RES211', 'ELEC212', 'RES304'],
      createdAt: '2026-09-01T08:00:00.000Z'
    },
    {
      id: 'usr_prof_bensalem',
      email: 'prof.bensalem@univ.tn',
      motDePasse: hashPassword('prof123'),
      nom: 'Pr. Leila Ben Salem',
      role: 'ENSEIGNANT',
      specialite: 'Intelligence Artificielle & Data Science',
      isActive: true,
      matieresAssociees: ['IA403', 'DL411', 'NLP412'],
      createdAt: '2026-09-01T08:00:00.000Z'
    },
    {
      id: 'usr_prof_ayari',
      email: 'prof.ayari@univ.tn',
      motDePasse: hashPassword('prof123'),
      nom: 'Dr. Hichem Ayari',
      role: 'ENSEIGNANT',
      specialite: 'Sécurité Informatique & Cryptographie',
      isActive: true,
      matieresAssociees: ['SEC313', 'SEC404'],
      createdAt: '2026-09-01T08:00:00.000Z'
    },
    {
      id: 'usr_prof_khemir',
      email: 'prof.khemir@univ.tn',
      motDePasse: hashPassword('prof123'),
      nom: 'Dr. Sonia Khemir',
      role: 'ENSEIGNANT',
      specialite: 'Développement Mobile & IoT',
      isActive: true,
      matieresAssociees: ['MOB312'],
      createdAt: '2026-09-01T08:00:00.000Z'
    },
    {
      id: 'usr_prof_chaabane',
      email: 'prof.chaabane@univ.tn',
      motDePasse: hashPassword('prof123'),
      nom: 'Pr. Ridha Chaabane',
      role: 'ENSEIGNANT',
      specialite: 'Mathématiques & Optimisation',
      isActive: true,
      matieresAssociees: ['MATH203', 'MATH214', 'MATH414'],
      createdAt: '2026-09-01T08:00:00.000Z'
    },
    {
      id: 'usr_prof_gharbi',
      email: 'prof.gharbi@univ.tn',
      motDePasse: hashPassword('prof123'),
      nom: 'Dr. Amira Gharbi',
      role: 'ENSEIGNANT',
      specialite: 'Management de Projets & Qualité Logicielle',
      isActive: true,
      matieresAssociees: ['MGT305', 'ANG205', 'TEST314', 'AUDIT405'],
      createdAt: '2026-09-01T08:00:00.000Z'
    }
  ];

  // 2. MATIÈRES DU PLAN D'ÉTUDES LMD (27 Matières sur 6 classes / 3 niveaux / 5 sections)
  const matieres = [
    // --- L2-INFO ---
    { id: 'mat_l2_1', code: 'SYS201', intitule: 'Systèmes d\'Exploitation & Linux', uniteEnseignement: 'UE Fondamentale L2', coefficient: 3, credits: 6, hasTP: true, enseignant: 'Dr. Mohamed Trabelsi', classe: 'L2-INFO', isActive: true, createdAt: '2026-09-02T08:00:00.000Z' },
    { id: 'mat_l2_2', code: 'POO202', intitule: 'Programmation Orientée Objet (Java)', uniteEnseignement: 'UE Fondamentale L2', coefficient: 4, credits: 7, hasTP: true, enseignant: 'Pr. Sylvie Durand', classe: 'L2-INFO', isActive: true, createdAt: '2026-09-02T08:30:00.000Z' },
    { id: 'mat_l2_3', code: 'MATH203', intitule: 'Algèbre Linéaire & Probabilités', uniteEnseignement: 'UE Fondamentale L2', coefficient: 3, credits: 5, hasTP: false, enseignant: 'Pr. Ridha Chaabane', classe: 'L2-INFO', isActive: true, createdAt: '2026-09-02T09:00:00.000Z' },
    { id: 'mat_l2_4', code: 'BD204', intitule: 'Conception des SI (Merise/UML)', uniteEnseignement: 'UE Méthodologie L2', coefficient: 3, credits: 6, hasTP: true, enseignant: 'Dr. Philippe Martin', classe: 'L2-INFO', isActive: true, createdAt: '2026-09-02T09:30:00.000Z' },
    { id: 'mat_l2_5', code: 'ANG205', intitule: 'Anglais Technique & Communication', uniteEnseignement: 'UE Transversale L2', coefficient: 2, credits: 4, hasTP: false, enseignant: 'Dr. Amira Gharbi', classe: 'L2-INFO', isActive: true, createdAt: '2026-09-02T10:00:00.000Z' },

    // --- L2-TIC ---
    { id: 'mat_l2t_1', code: 'RES211', intitule: 'Fondements des Réseaux & Télécoms', uniteEnseignement: 'UE Fondamentale TIC', coefficient: 3, credits: 6, hasTP: true, enseignant: 'Dr. Mohamed Trabelsi', classe: 'L2-TIC', isActive: true, createdAt: '2026-09-02T08:00:00.000Z' },
    { id: 'mat_l2t_2', code: 'ELEC212', intitule: 'Électronique Numérique & Signal', uniteEnseignement: 'UE Fondamentale TIC', coefficient: 3, credits: 6, hasTP: true, enseignant: 'Dr. Mohamed Trabelsi', classe: 'L2-TIC', isActive: true, createdAt: '2026-09-02T08:30:00.000Z' },
    { id: 'mat_l2t_3', code: 'DEV213', intitule: 'Développement Web Frontend', uniteEnseignement: 'UE Développement TIC', coefficient: 3, credits: 6, hasTP: true, enseignant: 'Pr. Sylvie Durand', classe: 'L2-TIC', isActive: true, createdAt: '2026-09-02T09:00:00.000Z' },
    { id: 'mat_l2t_4', code: 'MATH214', intitule: 'Analyse Numérique & Statistiques', uniteEnseignement: 'UE Mathématiques TIC', coefficient: 3, credits: 6, hasTP: false, enseignant: 'Pr. Ridha Chaabane', classe: 'L2-TIC', isActive: true, createdAt: '2026-09-02T09:30:00.000Z' },

    // --- L3-INFO ---
    { id: 'mat_1', code: 'ALGO301', intitule: 'Algorithmique & Structures de Données', uniteEnseignement: 'UE Fondamentale 1 (Données)', coefficient: 3, credits: 6, hasTP: true, enseignant: 'Dr. Philippe Martin', classe: 'L3-INFO', isActive: true, createdAt: '2026-09-02T08:00:00.000Z' },
    { id: 'mat_2', code: 'BD302', intitule: 'Bases de Données Relationnelles & NoSQL', uniteEnseignement: 'UE Fondamentale 1 (Données)', coefficient: 3, credits: 6, hasTP: true, enseignant: 'Dr. Philippe Martin', classe: 'L3-INFO', isActive: true, createdAt: '2026-09-02T08:30:00.000Z' },
    { id: 'mat_3', code: 'WEB303', intitule: 'Développement Web & Architecture SOA', uniteEnseignement: 'UE Fondamentale 2 (Web & Systèmes)', coefficient: 4, credits: 8, hasTP: true, enseignant: 'Pr. Sylvie Durand', classe: 'L3-INFO', isActive: true, createdAt: '2026-09-02T09:00:00.000Z' },
    { id: 'mat_4', code: 'RES304', intitule: 'Réseaux & Protocoles de Communication', uniteEnseignement: 'UE Fondamentale 2 (Web & Systèmes)', coefficient: 2, credits: 5, hasTP: false, enseignant: 'Dr. Mohamed Trabelsi', classe: 'L3-INFO', isActive: true, createdAt: '2026-09-02T09:30:00.000Z' },
    { id: 'mat_5', code: 'MGT305', intitule: 'Gestion de Projet Agile & Éthique', uniteEnseignement: 'UE Transversale (Management)', coefficient: 2, credits: 5, hasTP: false, enseignant: 'Dr. Amira Gharbi', classe: 'L3-INFO', isActive: true, createdAt: '2026-09-02T10:00:00.000Z' },

    // --- L3-DSI ---
    { id: 'mat_dsi_1', code: 'DSI311', intitule: 'Architecture des SI & ERP', uniteEnseignement: 'UE Fondamentale DSI', coefficient: 3, credits: 6, hasTP: true, enseignant: 'Dr. Philippe Martin', classe: 'L3-DSI', isActive: true, createdAt: '2026-09-02T08:00:00.000Z' },
    { id: 'mat_dsi_2', code: 'MOB312', intitule: 'Développement Mobile Flutter & Android', uniteEnseignement: 'UE Spécialité DSI', coefficient: 4, credits: 8, hasTP: true, enseignant: 'Dr. Sonia Khemir', classe: 'L3-DSI', isActive: true, createdAt: '2026-09-02T08:30:00.000Z' },
    { id: 'mat_dsi_3', code: 'SEC313', intitule: 'Sécurité des Réseaux & Authentification', uniteEnseignement: 'UE Spécialité DSI', coefficient: 3, credits: 6, hasTP: true, enseignant: 'Dr. Hichem Ayari', classe: 'L3-DSI', isActive: true, createdAt: '2026-09-02T09:00:00.000Z' },
    { id: 'mat_dsi_4', code: 'TEST314', intitule: 'Tests Logiciels & DevOps CI/CD', uniteEnseignement: 'UE Méthodologie DSI', coefficient: 2, credits: 5, hasTP: false, enseignant: 'Dr. Amira Gharbi', classe: 'L3-DSI', isActive: true, createdAt: '2026-09-02T09:30:00.000Z' },

    // --- M1-GL ---
    { id: 'mat_6', code: 'GL401', intitule: 'Génie Logiciel Avancé & DevOps', uniteEnseignement: 'UE Spécialité M1', coefficient: 3, credits: 6, hasTP: true, enseignant: 'Dr. Philippe Martin', classe: 'M1-GL', isActive: true, createdAt: '2026-09-02T10:30:00.000Z' },
    { id: 'mat_7', code: 'DEV402', intitule: 'Architectures Cloud & Microservices', uniteEnseignement: 'UE Spécialité M1', coefficient: 3, credits: 6, hasTP: true, enseignant: 'Pr. Sylvie Durand', classe: 'M1-GL', isActive: true, createdAt: '2026-09-02T11:00:00.000Z' },
    { id: 'mat_8', code: 'IA403', intitule: 'Intelligence Artificielle & Machine Learning', uniteEnseignement: 'UE Fondamentale M1', coefficient: 4, credits: 8, hasTP: true, enseignant: 'Pr. Leila Ben Salem', classe: 'M1-GL', isActive: true, createdAt: '2026-09-02T11:30:00.000Z' },
    { id: 'mat_gl_4', code: 'SEC404', intitule: 'Sécurité Applicative & Pentesting', uniteEnseignement: 'UE Sécurité M1', coefficient: 3, credits: 6, hasTP: true, enseignant: 'Dr. Hichem Ayari', classe: 'M1-GL', isActive: true, createdAt: '2026-09-02T12:00:00.000Z' },
    { id: 'mat_gl_5', code: 'AUDIT405', intitule: 'Audit & Gouvernance des SI', uniteEnseignement: 'UE Transversale M1', coefficient: 2, credits: 4, hasTP: false, enseignant: 'Dr. Amira Gharbi', classe: 'M1-GL', isActive: true, createdAt: '2026-09-02T12:30:00.000Z' },

    // --- M1-IA ---
    { id: 'mat_ia_1', code: 'DL411', intitule: 'Deep Learning & Vision Artificielle', uniteEnseignement: 'UE Fondamentale IA', coefficient: 4, credits: 8, hasTP: true, enseignant: 'Pr. Leila Ben Salem', classe: 'M1-IA', isActive: true, createdAt: '2026-09-02T10:30:00.000Z' },
    { id: 'mat_ia_2', code: 'NLP412', intitule: 'Traitement du Langage Naturel & LLM', uniteEnseignement: 'UE Fondamentale IA', coefficient: 3, credits: 6, hasTP: true, enseignant: 'Pr. Leila Ben Salem', classe: 'M1-IA', isActive: true, createdAt: '2026-09-02T11:00:00.000Z' },
    { id: 'mat_ia_3', code: 'DATA413', intitule: 'Big Data Analytics & Spark', uniteEnseignement: 'UE Spécialité IA', coefficient: 3, credits: 6, hasTP: true, enseignant: 'Dr. Philippe Martin', classe: 'M1-IA', isActive: true, createdAt: '2026-09-02T11:30:00.000Z' },
    { id: 'mat_ia_4', code: 'MATH414', intitule: 'Optimisation & Recherche Opérationnelle', uniteEnseignement: 'UE Mathématiques M1', coefficient: 3, credits: 6, hasTP: false, enseignant: 'Pr. Ridha Chaabane', classe: 'M1-IA', isActive: true, createdAt: '2026-09-02T12:00:00.000Z' }
  ];

  // 3. ÉTUDIANTS (35 Étudiants avec profils réalistes)
  const etudiantsList = [
    // --- L3-INFO (7 Étudiants) ---
    { id: 'etud_1', nom: 'Mansouri', prenom: 'Sarah', classe: 'L3-INFO', email: 'sarah.mansouri@etud.univ.tn', numeroEtudiant: 'ETU-2026-001', dateNaissance: '2004-03-15', profil: 'TRES_BIEN' },
    { id: 'etud_2', nom: 'Benali', prenom: 'Karim', classe: 'L3-INFO', email: 'karim.benali@etud.univ.tn', numeroEtudiant: 'ETU-2026-002', dateNaissance: '2003-11-20', profil: 'BIEN' },
    { id: 'etud_3', nom: 'Tounsi', prenom: 'Yasmine', classe: 'L3-INFO', email: 'yasmine.tounsi@etud.univ.tn', numeroEtudiant: 'ETU-2026-003', dateNaissance: '2004-07-02', profil: 'RACHAT' },
    { id: 'etud_5', nom: 'Trabelsi', prenom: 'Amine', classe: 'L3-INFO', email: 'amine.trabelsi@etud.univ.tn', numeroEtudiant: 'ETU-2026-005', dateNaissance: '2003-08-30', profil: 'AJOURNE' },
    { id: 'etud_8', nom: 'Sassi', prenom: 'Mariem', classe: 'L3-INFO', email: 'mariem.sassi@etud.univ.tn', numeroEtudiant: 'ETU-2026-008', dateNaissance: '2004-05-25', profil: 'BIEN' },
    { id: 'etud_14', nom: 'Bouzid', prenom: 'Omar', classe: 'L3-INFO', email: 'omar.bouzid@etud.univ.tn', numeroEtudiant: 'ETU-2026-014', dateNaissance: '2004-01-10', profil: 'PASSABLE' },
    { id: 'etud_15', nom: 'Gharbi', prenom: 'Ines', classe: 'L3-INFO', email: 'ines.gharbi@etud.univ.tn', numeroEtudiant: 'ETU-2026-015', dateNaissance: '2004-09-18', profil: 'BIEN' },

    // --- M1-GL (6 Étudiants) ---
    { id: 'etud_4', nom: 'Gharbi', prenom: 'Mehdi', classe: 'M1-GL', email: 'mehdi.gharbi@etud.univ.tn', numeroEtudiant: 'ETU-2026-004', dateNaissance: '2002-05-18', profil: 'TRES_BIEN' },
    { id: 'etud_6', nom: 'Chatti', prenom: 'Rania', classe: 'M1-GL', email: 'rania.chatti@etud.univ.tn', numeroEtudiant: 'ETU-2026-006', dateNaissance: '2002-09-24', profil: 'BIEN' },
    { id: 'etud_9', nom: 'Jaziri', prenom: 'Bilel', classe: 'M1-GL', email: 'bilel.jaziri@etud.univ.tn', numeroEtudiant: 'ETU-2026-009', dateNaissance: '2002-02-14', profil: 'PASSABLE' },
    { id: 'etud_10', nom: 'Khelifi', prenom: 'Salma', classe: 'M1-GL', email: 'salma.khelifi@etud.univ.tn', numeroEtudiant: 'ETU-2026-010', dateNaissance: '2002-12-05', profil: 'BIEN' },
    { id: 'etud_16', nom: 'Mabrouk', prenom: 'Youssef', classe: 'M1-GL', email: 'youssef.mabrouk@etud.univ.tn', numeroEtudiant: 'ETU-2026-016', dateNaissance: '2002-04-22', profil: 'RACHAT' },
    { id: 'etud_17', nom: 'Chahed', prenom: 'Nour El Houda', classe: 'M1-GL', email: 'nour.chahed@etud.univ.tn', numeroEtudiant: 'ETU-2026-017', dateNaissance: '2002-10-12', profil: 'TRES_BIEN' },

    // --- L2-TIC (5 Étudiants) ---
    { id: 'etud_11', nom: 'Bouazizi', prenom: 'Fedi', classe: 'L2-TIC', email: 'fedi.bouazizi@etud.univ.tn', numeroEtudiant: 'ETU-2026-011', dateNaissance: '2005-04-12', profil: 'BIEN' },
    { id: 'etud_12', nom: 'Chennoufi', prenom: 'Nour', classe: 'L2-TIC', email: 'nour.chennoufi@etud.univ.tn', numeroEtudiant: 'ETU-2026-012', dateNaissance: '2005-08-08', profil: 'TRES_BIEN' },
    { id: 'etud_13', nom: 'Dridi', prenom: 'Hamza', classe: 'L2-TIC', email: 'hamza.dridi@etud.univ.tn', numeroEtudiant: 'ETU-2026-013', dateNaissance: '2005-10-19', profil: 'PASSABLE' },
    { id: 'etud_18', nom: 'Mejri', prenom: 'Cyrine', classe: 'L2-TIC', email: 'cyrine.mejri@etud.univ.tn', numeroEtudiant: 'ETU-2026-018', dateNaissance: '2005-03-01', profil: 'BIEN' },
    { id: 'etud_19', nom: 'Ben Hassine', prenom: 'Wael', classe: 'L2-TIC', email: 'wael.benhassine@etud.univ.tn', numeroEtudiant: 'ETU-2026-019', dateNaissance: '2005-12-14', profil: 'AJOURNE' },

    // --- L2-INFO (5 Étudiants) ---
    { id: 'etud_20', nom: 'Zorgui', prenom: 'Rayen', classe: 'L2-INFO', email: 'rayen.zorgui@etud.univ.tn', numeroEtudiant: 'ETU-2026-020', dateNaissance: '2005-06-15', profil: 'TRES_BIEN' },
    { id: 'etud_21', nom: 'Boukhris', prenom: 'Lina', classe: 'L2-INFO', email: 'lina.boukhris@etud.univ.tn', numeroEtudiant: 'ETU-2026-021', dateNaissance: '2005-02-28', profil: 'BIEN' },
    { id: 'etud_22', nom: 'Jerbi', prenom: 'Skander', classe: 'L2-INFO', email: 'skander.jerbi@etud.univ.tn', numeroEtudiant: 'ETU-2026-022', dateNaissance: '2005-11-04', profil: 'PASSABLE' },
    { id: 'etud_23', nom: 'Kallel', prenom: 'Maya', classe: 'L2-INFO', email: 'maya.kallel@etud.univ.tn', numeroEtudiant: 'ETU-2026-023', dateNaissance: '2005-09-09', profil: 'BIEN' },
    { id: 'etud_24', nom: 'Rekik', prenom: 'Adem', classe: 'L2-INFO', email: 'adem.rekik@etud.univ.tn', numeroEtudiant: 'ETU-2026-024', dateNaissance: '2005-01-20', profil: 'RACHAT' },

    // --- L3-DSI (5 Étudiants) ---
    { id: 'etud_25', nom: 'Riahi', prenom: 'Chaima', classe: 'L3-DSI', email: 'chaima.riahi@etud.univ.tn', numeroEtudiant: 'ETU-2026-025', dateNaissance: '2004-04-14', profil: 'TRES_BIEN' },
    { id: 'etud_26', nom: 'Mahjoub', prenom: 'Eya', classe: 'L3-DSI', email: 'eya.mahjoub@etud.univ.tn', numeroEtudiant: 'ETU-2026-026', dateNaissance: '2004-08-25', profil: 'BIEN' },
    { id: 'etud_27', nom: 'Ben Amor', prenom: 'Aziz', classe: 'L3-DSI', email: 'aziz.benamor@etud.univ.tn', numeroEtudiant: 'ETU-2026-027', dateNaissance: '2003-10-10', profil: 'PASSABLE' },
    { id: 'etud_28', nom: 'Ben Youssef', prenom: 'Hela', classe: 'L3-DSI', email: 'hela.benyoussef@etud.univ.tn', numeroEtudiant: 'ETU-2026-028', dateNaissance: '2004-12-03', profil: 'BIEN' },
    { id: 'etud_29', nom: 'Sellami', prenom: 'Khaled', classe: 'L3-DSI', email: 'khaled.sellami@etud.univ.tn', numeroEtudiant: 'ETU-2026-029', dateNaissance: '2003-07-19', profil: 'AJOURNE' },

    // --- M1-IA (6 Étudiants) ---
    { id: 'etud_30', nom: 'Touati', prenom: 'Zeineb', classe: 'M1-IA', email: 'zeineb.touati@etud.univ.tn', numeroEtudiant: 'ETU-2026-030', dateNaissance: '2002-01-30', profil: 'TRES_BIEN' },
    { id: 'etud_31', nom: 'Baklouti', prenom: 'Ahmed', classe: 'M1-IA', email: 'ahmed.baklouti@etud.univ.tn', numeroEtudiant: 'ETU-2026-031', dateNaissance: '2002-06-11', profil: 'BIEN' },
    { id: 'etud_32', nom: 'Ben Romdhane', prenom: 'Molka', classe: 'M1-IA', email: 'molka.benromdhane@etud.univ.tn', numeroEtudiant: 'ETU-2026-032', dateNaissance: '2002-08-17', profil: 'TRES_BIEN' },
    { id: 'etud_33', nom: 'Triki', prenom: 'Malek', classe: 'M1-IA', email: 'malek.triki@etud.univ.tn', numeroEtudiant: 'ETU-2026-033', dateNaissance: '2002-03-05', profil: 'PASSABLE' },
    { id: 'etud_34', nom: 'Hammami', prenom: 'Oussema', classe: 'M1-IA', email: 'oussema.hammami@etud.univ.tn', numeroEtudiant: 'ETU-2026-034', dateNaissance: '2002-11-22', profil: 'BIEN' },
    { id: 'etud_35', nom: 'Cherif', prenom: 'Arij', classe: 'M1-IA', email: 'arij.cherif@etud.univ.tn', numeroEtudiant: 'ETU-2026-035', dateNaissance: '2002-07-07', profil: 'RACHAT' }
  ];

  const etudiants = [];
  etudiantsList.forEach(e => {
    etudiants.push({
      id: e.id,
      nom: e.nom,
      prenom: e.prenom,
      classe: e.classe,
      email: e.email,
      numeroEtudiant: e.numeroEtudiant,
      dateNaissance: e.dateNaissance,
      isActive: true,
      createdAt: '2026-09-05T09:00:00.000Z'
    });

    utilisateurs.push({
      id: `usr_${e.id}`,
      email: e.email,
      motDePasse: hashPassword('etudiant123'),
      nom: `${e.prenom} ${e.nom}`,
      role: 'ETUDIANT',
      etudiantId: e.id,
      isActive: true,
      createdAt: '2026-09-01T08:00:00.000Z'
    });
  });

  // 4. GÉNÉRATION DES NOTES COHÉRENTES SELON LE PROFIL ACADÉMIQUE
  const notes = [];
  let noteIdCounter = 1;

  function baseNoteByProfil(profil, seed) {
    const shift = (seed % 5) * 0.5 - 1.0;
    switch (profil) {
      case 'TRES_BIEN':
        return Math.min(19.5, Math.max(15.5, 17.0 + shift));
      case 'BIEN':
        return Math.min(16.5, Math.max(13.5, 14.5 + shift));
      case 'PASSABLE':
        return Math.min(13.0, Math.max(10.0, 11.5 + shift));
      case 'RACHAT':
        return Math.min(11.5, Math.max(8.5, 9.5 + shift));
      case 'AJOURNE':
        return Math.min(11.0, Math.max(6.0, 7.5 + shift));
      default:
        return 12.0;
    }
  }

  etudiantsList.forEach((etud, etudIdx) => {
    const matieresClasse = matieres.filter(m => m.classe === etud.classe);

    matieresClasse.forEach((m, matIdx) => {
      const seed = (etudIdx * 7) + (matIdx * 13);
      let base = baseNoteByProfil(etud.profil, seed);

      // Pour l'étudiant AJOURNE, assurer qu'au moins une matière est validée (>= 10) pour la règle de capitalisation
      if (etud.profil === 'AJOURNE' && matIdx === 0) {
        base = 12.5;
      }

      // Pour l'étudiant RACHAT, assurer 45 crédits validés et moyenne générale entre 9.0 et 9.99
      if (etud.profil === 'RACHAT') {
        if (matIdx < matieresClasse.length - 1) base = 10.5;
        else base = 7.0;
      }

      const dsVal = Math.round(Math.min(20, Math.max(0, base - 0.5 + ((seed % 3) * 0.5))) * 2) / 2;
      const examVal = Math.round(Math.min(20, Math.max(0, base + ((seed % 4) * 0.5) - 0.5)) * 2) / 2;

      notes.push({
        id: `note_${noteIdCounter++}`,
        etudiantId: etud.id,
        matiereId: m.id,
        type: 'DS',
        valeur: dsVal,
        dateCreation: '2026-10-15'
      });

      notes.push({
        id: `note_${noteIdCounter++}`,
        etudiantId: etud.id,
        matiereId: m.id,
        type: 'EXAMEN',
        valeur: examVal,
        dateCreation: '2026-12-20'
      });

      if (m.hasTP) {
        const tpVal = Math.round(Math.min(20, Math.max(0, base + 1.0)) * 2) / 2;
        notes.push({
          id: `note_${noteIdCounter++}`,
          etudiantId: etud.id,
          matiereId: m.id,
          type: 'TP',
          valeur: tpVal,
          dateCreation: '2026-11-10'
        });
      }
    });
  });

  // 5. RÉCLAMATIONS ACADÉMIQUES
  const reclamations = [
    {
      id: 'rec_1',
      etudiantId: 'etud_1',
      matiereId: 'mat_1',
      typeNote: 'EXAMEN',
      motif: 'Erreur de saisie constatée sur la note de l\'examen final d\'Algorithmique (reçu 14 alors que copie notée 16.5).',
      statut: 'ACCEPTEE',
      reponse: 'Vérification effectuée auprès du Dr. Martin. Copie re-vérifiée, note rectifiée à 16.5.',
      traitePar: 'Dr. Philippe Martin',
      nouvelleNoteValeur: 16.5,
      dateCreation: '2026-12-22T10:00:00.000Z',
      dateTraitement: '2026-12-23T14:30:00.000Z'
    },
    {
      id: 'rec_2',
      etudiantId: 'etud_4',
      matiereId: 'mat_6',
      typeNote: 'EXAMEN',
      motif: 'Non prise en compte de la question 4 sur le diagramme de composants DevOps.',
      statut: 'EN_ATTENTE',
      reponse: null,
      traitePar: null,
      nouvelleNoteValeur: null,
      dateCreation: '2026-12-23T11:15:00.000Z',
      dateTraitement: null
    },
    {
      id: 'rec_3',
      etudiantId: 'etud_11',
      matiereId: 'mat_l2t_1',
      typeNote: 'DS',
      motif: 'Demande de vérification du calcul des points de l\'exercice sur le routage IP.',
      statut: 'REFUSEE',
      reponse: 'Barème appliqué de manière uniforme à l\'ensemble de la promotion. Pas d\'erreur de calcul.',
      traitePar: 'Dr. Mohamed Trabelsi',
      nouvelleNoteValeur: null,
      dateCreation: '2026-12-21T09:20:00.000Z',
      dateTraitement: '2026-12-22T16:00:00.000Z'
    },
    {
      id: 'rec_4',
      etudiantId: 'etud_20',
      matiereId: 'mat_l2_1',
      typeNote: 'EXAMEN',
      motif: 'Erreur de transcription de la note de l\'examen de Systèmes d\'Exploitation.',
      statut: 'ACCEPTEE',
      reponse: 'Correction effectuée après consultation du bordereau officiel.',
      traitePar: 'Dr. Mohamed Trabelsi',
      nouvelleNoteValeur: 17.5,
      dateCreation: '2026-12-24T08:45:00.000Z',
      dateTraitement: '2026-12-24T12:00:00.000Z'
    },
    {
      id: 'rec_5',
      etudiantId: 'etud_25',
      matiereId: 'mat_dsi_2',
      typeNote: 'TP',
      motif: 'Note du mini-projet Flutter manquante dans le relevé provisoire.',
      statut: 'EN_ATTENTE',
      reponse: null,
      traitePar: null,
      nouvelleNoteValeur: null,
      dateCreation: '2026-12-25T14:10:00.000Z',
      dateTraitement: null
    },
    {
      id: 'rec_6',
      etudiantId: 'etud_30',
      matiereId: 'mat_ia_1',
      typeNote: 'EXAMEN',
      motif: 'Recours pour vérification de la note de l\'examen de Deep Learning.',
      statut: 'EN_ATTENTE',
      reponse: null,
      traitePar: null,
      nouvelleNoteValeur: null,
      dateCreation: '2026-12-25T16:30:00.000Z',
      dateTraitement: null
    }
  ];

  return {
    utilisateurs,
    etudiants,
    matieres,
    notes,
    reclamations
  };
}

// -------------------------------------------------------------
// EXÉCUTION DU SEED MONGODB (100% PURE MONGO)
// -------------------------------------------------------------
async function seedMongo() {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scolarite_lmd';
  console.log(`Connecting to MongoDB on: ${MONGO_URI}...`);

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
    console.log(`✅ Connecté avec succès à MongoDB sur : ${MONGO_URI}`);

    const Utilisateur = require('../src/models/Utilisateur');
    const Etudiant = require('../src/models/Etudiant');
    const Matiere = require('../src/models/Matiere');
    const Note = require('../src/models/Note');
    const Reclamation = require('../src/models/Reclamation');

    const seedData = buildSeedData();

    // 1. Purge propre des collections existantes
    await Promise.all([
      Utilisateur.deleteMany({}),
      Etudiant.deleteMany({}),
      Matiere.deleteMany({}),
      Note.deleteMany({}),
      Reclamation.deleteMany({})
    ]);

    // 2. Insertion en bloc des données
    await Utilisateur.insertMany(seedData.utilisateurs);
    await Etudiant.insertMany(seedData.etudiants);
    await Matiere.insertMany(seedData.matieres);
    await Note.insertMany(seedData.notes);
    await Reclamation.insertMany(seedData.reclamations);

    console.log('🎉 MongoDB peuplé avec succès !');
    console.log(`   - Utilisateurs (Admin + Enseignants + Étudiants) : ${seedData.utilisateurs.length}`);
    console.log(`   - Enseignants responsables                        : 8`);
    console.log(`   - Étudiants inscrits                              : ${seedData.etudiants.length} (L2-INFO, L2-TIC, L3-INFO, L3-DSI, M1-GL, M1-IA)`);
    console.log(`   - Matières du plan d'études LMD                   : ${seedData.matieres.length}`);
    console.log(`   - Évaluations / Notes saisies                     : ${seedData.notes.length}`);
    console.log(`   - Réclamations académiques                        : ${seedData.reclamations.length}`);

    return seedData;
  } catch (error) {
    console.error('❌ Erreur lors du seed MongoDB :', error.message);
    throw error;
  }
}

if (require.main === module) {
  seedMongo()
    .then(async () => {
      await mongoose.disconnect();
      console.log('🔌 Connexion MongoDB fermée proprement.');
      process.exit(0);
    })
    .catch(() => process.exit(1));
}

module.exports = {
  seedMongo,
  buildSeedData
};
