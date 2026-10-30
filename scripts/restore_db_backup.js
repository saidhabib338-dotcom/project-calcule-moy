/**
 * Script de restauration de la base de données MongoDB (scolarite_lmd)
 * depuis le fichier backup/database_backup_complet.json
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Utilisateur = require('../src/models/Utilisateur');
const Etudiant = require('../src/models/Etudiant');
const Matiere = require('../src/models/Matiere');
const Note = require('../src/models/Note');
const Reclamation = require('../src/models/Reclamation');
const PlanEtude = require('../src/models/PlanEtude');

async function restoreDatabase() {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scolarite_lmd';
  console.log(`🍃 Connexion à MongoDB pour la restauration : ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);

  const backupPath = path.join(__dirname, '../backup/database_backup_complet.json');
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Fichier introuvable : ${backupPath}`);
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log(`📖 Sauvegarde chargée (Date d'export : ${backupData.exportedAt || 'N/A'})`);

  const models = {
    utilisateurs: Utilisateur,
    etudiants: Etudiant,
    matieres: Matiere,
    notes: Note,
    reclamations: Reclamation,
    plans_etudes: PlanEtude
  };

  for (const [colName, model] of Object.entries(models)) {
    const docs = backupData.collections[colName] || [];
    if (docs.length > 0) {
      await model.deleteMany({});
      await model.insertMany(docs);
      console.log(`✅ Collection '${colName}' restaurée avec succès : ${docs.length} documents.`);
    }
  }

  console.log(`\n🎉 Restauration complète terminée avec succès dans scolarite_lmd !`);
  await mongoose.disconnect();
}

restoreDatabase().catch(err => {
  console.error("❌ Erreur lors de la restauration :", err);
  process.exit(1);
});
