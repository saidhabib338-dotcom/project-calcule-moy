// Modèle Mongoose - Plan d'Études Officiel ISSAT Gafsa
const mongoose = require('mongoose');

const matierePlanSchema = new mongoose.Schema({
  annee: { type: String, trim: true },
  semestre: { type: Number, required: true },
  code: { type: String, required: true, trim: true },
  full_code: { type: String, trim: true },
  intitule: { type: String, required: true, trim: true },
  uniteEnseignement: { type: String, trim: true },
  hc: { type: Number, default: 0 },
  htd: { type: Number, default: 0 },
  htp: { type: Number, default: 0 },
  hasTP: { type: Boolean, default: false },
  credits: { type: Number, required: true },
  coefficient: { type: Number, required: true },
  regime: { type: String, default: 'RM' },
  formule: { type: String, default: '(3DS+7EX)/10' }
}, { _id: false });

const planEtudeSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  key: {
    type: String,
    required: true,
    trim: true
  },
  file: {
    type: String,
    required: true,
    trim: true
  },
  annee: {
    type: String,
    required: true,
    trim: true
  },
  departement: {
    type: String,
    required: true,
    trim: true
  },
  specialite: {
    type: String,
    required: true,
    trim: true
  },
  filiere: {
    type: String,
    required: true,
    trim: true
  },
  count: {
    type: Number,
    required: true
  },
  matieres: [matierePlanSchema]
}, {
  timestamps: true,
  collection: 'plans_etudes'
});

planEtudeSchema.index({ annee: 1, departement: 1 });
planEtudeSchema.index({ filiere: 'text', specialite: 'text' });

module.exports = mongoose.model('PlanEtude', planEtudeSchema);

