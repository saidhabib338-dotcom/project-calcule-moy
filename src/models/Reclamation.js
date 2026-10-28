// Modèle Mongoose - Réclamation (Conforme Cahier des Charges & Diagramme de séquence 07/10)
const mongoose = require('mongoose');

const reclamationSchema = new mongoose.Schema({
  id: {
    type: String,
    trim: true
  },
  etudiantId: {
    type: String,
    ref: 'Etudiant',
    required: true
  },
  matiereId: {
    type: String,
    ref: 'Matiere',
    required: true
  },
  typeNote: {
    type: String,
    enum: ['DS', 'EXAMEN', 'TP'],
    required: true
  },
  noteActuelle: {
    type: Number,
    default: null
  },
  motif: {
    type: String,
    required: [true, 'Le motif détaillé est obligatoire'],
    trim: true
  },
  statut: {
    type: String,
    enum: ['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE'],
    default: 'EN_ATTENTE'
  },
  reponse: {
    type: String,
    default: null
  },
  traitePar: {
    type: String,
    default: null
  },
  nouvelleNoteValeur: {
    type: Number,
    default: null
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateTraitement: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Reclamation || mongoose.model('Reclamation', reclamationSchema);
