// Modèle Mongoose - Matière (Conforme Cahier des Charges & Plan d'Études LMD)
const mongoose = require('mongoose');

const matiereSchema = new mongoose.Schema({
  id: {
    type: String,
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Le code matière est obligatoire'],
    unique: true,
    uppercase: true,
    trim: true
  },
  intitule: {
    type: String,
    required: [true, "L'intitulé est obligatoire"],
    trim: true
  },
  uniteEnseignement: {
    type: String,
    default: 'UE Fondamentale',
    trim: true
  },
  coefficient: {
    type: Number,
    required: [true, 'Le coefficient est obligatoire'],
    min: [1, 'Le coefficient doit être >= 1']
  },
  credits: {
    type: Number,
    required: [true, 'Les crédits ECTS sont obligatoires'],
    min: [1, 'Les crédits doivent être >= 1']
  },
  hasTP: {
    type: Boolean,
    default: false // Si true: 70% Exam + 20% DS + 10% TP; si false: 80% Exam + 20% DS
  },
  enseignant: {
    type: String,
    default: 'Non assigné',
    trim: true
  },
  classe: {
    type: String,
    default: 'L3-INFO',
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Matiere || mongoose.model('Matiere', matiereSchema);
