/**
 * Script de migration et d'insertion des Plans d'Études Officiels ISSAT dans MongoDB
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const PlanEtude = require('../src/models/PlanEtude');

async function seedPlansEtudes() {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scolarite_lmd';
  console.log(`🍃 Connexion à MongoDB : ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);

  const jsonPath = path.join(__dirname, '../src/data/plans_etude_issat_complets.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Fichier introuvable : ${jsonPath}`);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const entries = Object.entries(rawData);
  console.log(`📖 ${entries.length} plans d'études chargés depuis le fichier JSON.`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const [key, plan] of entries) {
    const planId = 'plan_' + key.replace(/[^a-zA-Z0-9]/g, '_');
    const docData = {
      id: planId,
      key: key,
      file: plan.file,
      annee: plan.annee,
      departement: plan.departement,
      specialite: plan.specialite,
      filiere: plan.filiere,
      count: plan.count || plan.matieres.length,
      matieres: plan.matieres
    };

    const res = await PlanEtude.findOneAndUpdate(
      { key: key },
      docData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (res) insertedCount++;
  }

  const totalInDb = await PlanEtude.countDocuments();
  console.log(`✅ Succès ! ${insertedCount} plans d'études traités.`);
  console.log(`📊 Total actuel dans la collection 'plans_etudes' : ${totalInDb} documents.`);

  await mongoose.disconnect();
  console.log('🍃 Déconnexion réussie.');
}

seedPlansEtudes().catch(err => {
  console.error('❌ Erreur lors du seed des plans :', err);
  process.exit(1);
});
