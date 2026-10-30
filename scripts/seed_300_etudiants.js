/**
 * Script de génération et peuplement de 300 étudiants réalistes dans MongoDB
 * Répartis équitablement sur l'ensemble des 35 classes officielles de l'ISSAT Gafsa.
 * Préserve les étudiants existants indispensables aux tests (etud_1 à etud_5) et leurs notes.
 */
const mongoose = require('mongoose');

const NOMS_TUNISIENS = [
  'Trabelsi', 'Ben Ali', 'Mansouri', 'Gharbi', 'Jaziri', 'Bouazizi', 'Hammami',
  'Mejri', 'Dridi', 'Sassi', 'Cherif', 'Ayari', 'Khemir', 'Ben Salem', 'Chaabane',
  'Guesmi', 'Mabrouk', 'Jlassi', 'Oueslati', 'Khlifi', 'Bouslama', 'Zouari',
  'Nasri', 'Loussaief', 'Saidi', 'Abbassi', 'Masmoudi', 'Dakhli', 'Kammoun',
  'Belhadj', 'Ferchichi', 'Gannouni', 'Hajji', 'Amri', 'Sellami', 'Baccouche',
  'Rekik', 'Mrad', 'Zitouni', 'Guizani', 'Chebbi', 'Riahi', 'Snoussi', 'Dabbabi',
  'Mahjoub', 'Jouini', 'Louati', 'Fakhfakh', 'Kacem', 'Bejaoui', 'Toumi', 'Ghrairi'
];

const PRENOMS_TUNISIENS = [
  'Ahmed', 'Mohamed', 'Sarah', 'Yassine', 'Mariem', 'Aziz', 'Chaima', 'Firas',
  'Nour', 'Eya', 'Amine', 'Syrine', 'Bilel', 'Rania', 'Skander', 'Salma',
  'Hamza', 'Ines', 'Youssef', 'Khadija', 'Malek', 'Wiem', 'Ayoub', 'Hiba',
  'Omar', 'Sirine', 'Mehdi', 'Maram', 'Karim', 'Emna', 'Oussama', 'Mayssa',
  'Wassim', 'Ghofrane', 'Ilyes', 'Dorra', 'Rayen', 'Chadha', 'Haythem', 'Asma',
  'Anis', 'Molka', 'Seif', 'Manel', 'Khalil', 'Nesrine', 'Zied', 'Rim', 'Sami'
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cleanStr(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

async function seed300Etudiants() {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scolarite_lmd';
  console.log(`🍃 Connexion à MongoDB : ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);

  const Etudiant = mongoose.model('Etudiant', new mongoose.Schema({
    id: String,
    numeroEtudiant: String,
    nom: String,
    prenom: String,
    classe: String,
    email: String,
    dateNaissance: String,
    isActive: Boolean
  }, { strict: false }));

  const Matiere = mongoose.model('Matiere', new mongoose.Schema({
    id: String,
    code: String,
    classe: String,
    semestre: mongoose.Schema.Types.Mixed,
    coefficient: Number,
    credits: Number,
    hasTP: Boolean
  }, { strict: false }));

  const Note = mongoose.model('Note', new mongoose.Schema({
    id: String,
    etudiantId: String,
    matiereId: String,
    type: String,
    valeur: Number,
    dateCreation: String
  }, { strict: false }));

  const Utilisateur = mongoose.model('Utilisateur', new mongoose.Schema({
    id: String,
    nom: String,
    email: String,
    motDePasse: String,
    role: String,
    etudiantId: String
  }, { strict: false }));

  // 1. Récupérer toutes les classes officielles
  const classesDisponibles = await Matiere.distinct('classe');
  console.log(`🏫 Classes officielles disponibles : ${classesDisponibles.length}`);

  // 2. Compter les étudiants existants
  const currentCount = await Etudiant.countDocuments();
  console.log(`👥 Étudiants actuels en base : ${currentCount}`);

  const TARGET_TOTAL = 300;
  const needToAdd = Math.max(0, TARGET_TOTAL - currentCount);
  console.log(`🎯 Objectif : ${TARGET_TOTAL} étudiants (Ajout requis : ${needToAdd})`);

  if (needToAdd === 0) {
    console.log(`✅ L'objectif de ${TARGET_TOTAL} étudiants est déjà atteint.`);
    await mongoose.disconnect();
    return;
  }

  // Trouver le max numeroEtudiant pour continuer la séquence
  const allEtuds = await Etudiant.find({}, 'numeroEtudiant email id').lean();
  const existingEmails = new Set(allEtuds.map(e => (e.email || '').toLowerCase()));
  const existingNumbers = new Set(allEtuds.map(e => e.numeroEtudiant));

  let maxNum = 100;
  for (const e of allEtuds) {
    const match = (e.numeroEtudiant || '').match(/ETU-2026-(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }

  console.log(`🔢 Dernier numéro de matricule détecté : ETU-2026-${maxNum}`);

  const matieresParClasse = {};
  for (const cls of classesDisponibles) {
    matieresParClasse[cls] = await Matiere.find({ classe: cls }).lean();
  }

  const newStudents = [];
  const newNotes = [];
  const newUsers = [];

  let added = 0;
  let counter = maxNum + 1;

  // Répartir l'ajout de manière équitable sur toutes les classes
  while (added < needToAdd) {
    for (const cls of classesDisponibles) {
      if (added >= needToAdd) break;

      const nom = randomChoice(NOMS_TUNISIENS);
      const prenom = randomChoice(PRENOMS_TUNISIENS);
      const numStr = String(counter).padStart(3, '0');
      const matricule = `ETU-2026-${numStr}`;
      counter++;

      let baseEmail = `${cleanStr(prenom)}.${cleanStr(nom)}${numStr}@myuniversity.tn`;
      while (existingEmails.has(baseEmail.toLowerCase())) {
        baseEmail = `${cleanStr(prenom)}.${cleanStr(nom)}${Math.floor(Math.random() * 9999)}@myuniversity.tn`;
      }
      existingEmails.add(baseEmail.toLowerCase());

      const anneeBirth = 2002 + Math.floor(Math.random() * 4); // 2002 à 2005
      const moisBirth = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
      const jourBirth = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
      const dateNaissance = `${anneeBirth}-${moisBirth}-${jourBirth}`;

      const etudiantId = `etud_${counter}_${Math.random().toString(36).substring(2, 7)}`;

      const etudDoc = {
        id: etudiantId,
        numeroEtudiant: matricule,
        nom,
        prenom,
        classe: cls,
        email: baseEmail,
        dateNaissance,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      newStudents.push(etudDoc);

      // Compte utilisateur étudiant
      newUsers.push({
        id: `user_${etudiantId}`,
        nom: `${prenom} ${nom}`,
        email: baseEmail,
        motDePasse: 'e0c8b6b1965bb7f6d21d5a7d6d376d2146e25531d041300959ce50e41f71df42', // Etudiant2026!
        role: 'ETUDIANT',
        etudiantId: etudiantId,
        createdAt: new Date().toISOString()
      });

      // Génération de notes pour les matières de sa classe
      const classMatieres = matieresParClasse[cls] || [];
      for (const mat of classMatieres) {
        // Base de note selon profil (certains excellents, d'autres moyens ou en difficulté)
        const profilRand = Math.random();
        let baseNote = 11.5;
        if (profilRand < 0.20) baseNote = 15.5 + Math.random() * 3.5;      // 15.5 - 19.0 (Très bien)
        else if (profilRand < 0.65) baseNote = 10.5 + Math.random() * 4.0; // 10.5 - 14.5 (Moyen/Bien)
        else if (profilRand < 0.90) baseNote = 8.0 + Math.random() * 3.0;  // 8.0 - 11.0 (Passable/Rachat)
        else baseNote = 5.0 + Math.random() * 4.0;                         // 5.0 - 9.0 (Ajourné)

        const varDS = (Math.random() * 3.0 - 1.5);
        const valDS = Math.min(20, Math.max(0, Math.round((baseNote + varDS) * 2) / 2));

        const varEX = (Math.random() * 3.0 - 1.5);
        const valEX = Math.min(20, Math.max(0, Math.round((baseNote + varEX) * 2) / 2));

        newNotes.push({
          id: `note_${etudiantId}_${mat.id}_DS`,
          etudiantId: etudiantId,
          matiereId: mat.id,
          type: 'DS',
          valeur: valDS,
          dateCreation: '2026-10-15'
        });

        newNotes.push({
          id: `note_${etudiantId}_${mat.id}_EX`,
          etudiantId: etudiantId,
          matiereId: mat.id,
          type: 'EXAMEN',
          valeur: valEX,
          dateCreation: '2026-10-25'
        });

        if (mat.hasTP) {
          const varTP = (Math.random() * 2.0 - 1.0);
          const valTP = Math.min(20, Math.max(0, Math.round((baseNote + varTP + 1.0) * 2) / 2));
          newNotes.push({
            id: `note_${etudiantId}_${mat.id}_TP`,
            etudiantId: etudiantId,
            matiereId: mat.id,
            type: 'TP',
            valeur: valTP,
            dateCreation: '2026-10-20'
          });
        }
      }

      added++;
    }
  }

  console.log(`📦 Insertion de ${newStudents.length} nouveaux étudiants...`);
  await Etudiant.insertMany(newStudents);

  console.log(`🔑 Insertion de ${newUsers.length} nouveaux comptes utilisateurs...`);
  await Utilisateur.insertMany(newUsers);

  console.log(`📝 Insertion de ${newNotes.length} notes réalistes...`);
  // Insérer les notes par blocs de 1000 pour optimiser la mémoire
  for (let i = 0; i < newNotes.length; i += 1000) {
    const chunk = newNotes.slice(i, i + 1000);
    await Note.insertMany(chunk);
  }

  const finalEtudCount = await Etudiant.countDocuments();
  const finalNoteCount = await Note.countDocuments();
  const finalUserCount = await Utilisateur.countDocuments();

  console.log(`\n🎉 SUCCÈS TOTAL !`);
  console.log(`📊 Étudiants totaux en MongoDB    : ${finalEtudCount}`);
  console.log(`📊 Notes totales en MongoDB        : ${finalNoteCount}`);
  console.log(`📊 Utilisateurs totaux en MongoDB : ${finalUserCount}`);

  await mongoose.disconnect();
}

seed300Etudiants().catch(err => {
  console.error("❌ Erreur lors du peuplement des 300 étudiants :", err);
  process.exit(1);
});
