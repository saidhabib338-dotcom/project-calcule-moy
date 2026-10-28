// Modèle Mongoose - Note (Conforme Cahier des Charges: intervalle 0-20 & unicité composée)
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  id: {
    type: String,
    trim: true
  },
  etudiantId: {
    type: String,
    ref: 'Etudiant',
    required: [true, "L'étudiant est obligatoire"]
  },
  matiereId: {
    type: String,
    ref: 'Matiere',
    required: [true, 'La matière est obligatoire']
  },
  type: {
    type: String,
    enum: ['DS', 'EXAMEN', 'TP'],
    required: [true, "Le type d'évaluation est obligatoire (DS, EXAMEN, TP)"]
  },
  valeur: {
    type: Number,
    required: [true, 'La note est obligatoire'],
    min: [0, 'La note minimale est 0'],
    max: [20, 'La note maximale est 20']
  },
  dateCreation: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  }
}, {
  timestamps: true
});

// Index unique composé : 1 seul DS, 1 seul Exam, 1 seul TP par matière par étudiant (Besoin 16 -> 409 Conflict)
noteSchema.index({ etudiantId: 1, matiereId: 1, type: 1 }, { unique: true });

module.exports = mongoose.models.Note || mongoose.model('Note', noteSchema);
