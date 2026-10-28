// Modèle Mongoose - Étudiant (Conforme Cahier des Charges & Diagramme de classe)
const mongoose = require('mongoose');

const etudiantSchema = new mongoose.Schema({
  id: {
    type: String,
    trim: true
  },
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom est obligatoire'],
    trim: true
  },
  classe: {
    type: String,
    required: [true, 'La classe est obligatoire'],
    trim: true
  },
  email: {
    type: String,
    required: [true, "L'email est obligatoire"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Format d'email invalide"]
  },
  numeroEtudiant: {
    type: String,
    required: true,
    unique: true
  },
  dateNaissance: {
    type: String,
    default: '2004-01-01'
  },
  isActive: {
    type: Boolean,
    default: true // Soft delete: passer à false sans supprimer physiquement
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Etudiant || mongoose.model('Etudiant', etudiantSchema);
