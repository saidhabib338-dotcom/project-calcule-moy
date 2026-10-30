/**
 * Script d'exportation complète de la base de données MongoDB (scolarite_lmd)
 * Produit un fichier unique JSON contenant l'intégralité des 6 collections.
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

async function exportFullBackup() {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scolarite_lmd';
  console.log(`🍃 Connexion à MongoDB pour l'export : ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);

  const backupData = {
    exportedAt: new Date().toISOString(),
    databaseName: 'scolarite_lmd',
    stats: {},
    collections: {}
  };

  const models = {
    utilisateurs: Utilisateur,
    etudiants: Etudiant,
    matieres: Matiere,
    notes: Note,
    reclamations: Reclamation,
    plans_etudes: PlanEtude
  };

  for (const [colName, model] of Object.entries(models)) {
    const docs = await model.find({}).lean();
    backupData.collections[colName] = docs;
    backupData.stats[colName] = docs.length;
    console.log(`📦 Collection '${colName}' : ${docs.length} documents exportés`);
  }

  const exportDir = path.join(__dirname, '../backup');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const exportFile = path.join(exportDir, 'database_backup_complet.json');
  fs.writeFileSync(exportFile, JSON.stringify(backupData, null, 2), 'utf8');

  console.log(`\n🎉 Exportation réussie !`);
  console.log(`📁 Fichier de sauvegarde créé avec succès :`);
  console.log(`   👉 ${exportFile}`);
  console.log(`📊 Résumé :`, backupData.stats);

  await mongoose.disconnect();
}

exportFullBackup().catch(err => {
  console.error("❌ Erreur lors de l'export :", err);
  process.exit(1);
});
