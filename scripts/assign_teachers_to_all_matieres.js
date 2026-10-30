const { MongoClient } = require('mongodb');

async function assignTeachers() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db = client.db('scolarite_lmd');

  console.log('=== Attribution réaliste des 552 matières aux 8 Enseignants ===');

  const matieres = await db.collection('matieres').find({}).toArray();

  let count = 0;
  for (const m of matieres) {
    let teacher = 'Dr. Philippe Martin';
    const intitule = (m.intitule || '').toLowerCase();
    const ue = (m.uniteEnseignement || '').toLowerCase();
    const classe = (m.classe || '').toUpperCase();

    // 1. Langues, Droit, Éthique, Entrepreneuriat -> Dr. Amira Gharbi
    if (
      intitule.includes('anglais') ||
      intitule.includes('français') ||
      intitule.includes('communication') ||
      intitule.includes('droit') ||
      intitule.includes('éthique') ||
      intitule.includes('ethique') ||
      intitule.includes('entrepreneuriat') ||
      intitule.includes('création') ||
      intitule.includes('environnement professionnel') ||
      intitule.includes('culture') ||
      intitule.includes('c2i') ||
      ue.includes('langue')
    ) {
      teacher = 'Dr. Amira Gharbi';
    }
    // 2. IA, Machine Learning, Deep Learning, Vision -> Pr. Leila Ben Salem
    else if (
      intitule.includes('intelligence artificielle') ||
      intitule.includes('machine learning') ||
      intitule.includes('deep learning') ||
      intitule.includes('vision') ||
      intitule.includes('nlp') ||
      intitule.includes('data mining') ||
      intitule.includes('fouille')
    ) {
      teacher = 'Pr. Leila Ben Salem';
    }
    // 3. EEA, Automatique, Électronique, Capteurs, Instrumentation -> Dr. Sonia Khemir
    else if (
      classe.includes('EEA') ||
      intitule.includes('automatique') ||
      intitule.includes('automate') ||
      intitule.includes('électronique') ||
      intitule.includes('electronique') ||
      intitule.includes('capteur') ||
      intitule.includes('instrumentation') ||
      intitule.includes('vhdl') ||
      intitule.includes('fpga') ||
      intitule.includes('régulation')
    ) {
      teacher = 'Dr. Sonia Khemir';
    }
    // 4. Génie Civil -> Dr. Hichem Ayari
    else if (
      classe.includes('GC') ||
      classe.includes('GLB') ||
      intitule.includes('béton') ||
      intitule.includes('bâtiment') ||
      intitule.includes('route') ||
      intitule.includes('pont') ||
      intitule.includes('matériaux') ||
      intitule.includes('géotechnique') ||
      intitule.includes('sécurité') ||
      intitule.includes('crypto')
    ) {
      teacher = 'Dr. Hichem Ayari';
    }
    // 5. Génie Mécanique, Électromécanique, Énergétique -> Pr. Ridha Chaabane
    else if (
      classe.includes('GM') ||
      classe.includes('EMT') ||
      classe.includes('EMM') ||
      classe.includes('GEFC') ||
      intitule.includes('mécanique') ||
      intitule.includes('productique') ||
      intitule.includes('froid') ||
      intitule.includes('thermodynamique') ||
      intitule.includes('mécatronique') ||
      intitule.includes('moteur')
    ) {
      teacher = 'Pr. Ridha Chaabane';
    }
    // 6. Systèmes, Réseaux, Systèmes Embarqués, IoT, OS -> Dr. Mohamed Trabelsi
    else if (
      classe.includes('SISE') ||
      classe.includes('SPI') ||
      intitule.includes('réseau') ||
      intitule.includes('système d\'exploitation') ||
      intitule.includes('systèmes logiques') ||
      intitule.includes('embarqué') ||
      intitule.includes('iot') ||
      intitule.includes('transmission') ||
      intitule.includes('architecture des ordinateurs')
    ) {
      teacher = 'Dr. Mohamed Trabelsi';
    }
    // 7. Web, Mobile, Java, JEE, Génie Logiciel, PFE, Agile -> Pr. Sylvie Durand
    else if (
      intitule.includes('web') ||
      intitule.includes('mobile') ||
      intitule.includes('android') ||
      intitule.includes('flutter') ||
      intitule.includes('java') ||
      intitule.includes('jee') ||
      intitule.includes('génie logiciel') ||
      intitule.includes('pfe') ||
      intitule.includes('agile') ||
      intitule.includes('design pattern')
    ) {
      teacher = 'Pr. Sylvie Durand';
    }
    // 8. Tout le reste (Big Data, Cloud, BD, Algorithmique, Compilation, Maths) -> Dr. Philippe Martin
    else {
      teacher = 'Dr. Philippe Martin';
    }

    await db.collection('matieres').updateOne(
      { id: m.id },
      { $set: { enseignant: teacher } }
    );
    count++;
  }

  console.log(`✅ ${count} matières attribuées.`);

  // Actualiser les codes associés dans chaque compte enseignant
  const teachers = await db.collection('matieres').distinct('enseignant');
  for (const t of teachers) {
    const tMats = await db.collection('matieres').find({ enseignant: t }).toArray();
    const tCodes = tMats.map(m => m.code);
    await db.collection('utilisateurs').updateMany(
      { nom: t },
      { $set: { matieresAssociees: tCodes } }
    );
    console.log(`- ${t.padEnd(25)} : ${tMats.length} matières attribuées`);
  }

  // S'assurer que le compte de test prof.martin@univ.tn a aussi tous ses codes
  const pmMats = await db.collection('matieres').find({ enseignant: 'Dr. Philippe Martin' }).toArray();
  await db.collection('utilisateurs').updateOne(
    { email: 'prof.martin@univ.tn' },
    { $set: { matieresAssociees: pmMats.map(m => m.code) } }
  );

  await client.close();
  console.log('Attribution terminée avec succès !');
}

assignTeachers().catch(console.error);

