// Modèle Mongoose - Utilisateur (Conforme Cahier des Charges & Diagramme de classe)
const mongoose = require('mongoose');

const utilisateurSchema = new mongoose.Schema({
  id: {
    type: String,
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
  motDePasse: {
    type: String,
    required: [true, "Le mot de passe haché est obligatoire"]
  },
  nom: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['ADMIN', 'ENSEIGNANT', 'ETUDIANT'],
    default: 'ETUDIANT'
  },
  etudiantId: {
    type: String,
    ref: 'Etudiant',
    default: null
  },
  matieresAssociees: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Utilisateur || mongoose.model('Utilisateur', utilisateurSchema);
