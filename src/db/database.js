const crypto = require('crypto');
const mongoose = require('mongoose');

const Utilisateur = require('../models/Utilisateur');
const Etudiant = require('../models/Etudiant');
const Matiere = require('../models/Matiere');
const Note = require('../models/Note');
const Reclamation = require('../models/Reclamation');

const models = {
  utilisateurs: Utilisateur,
  etudiants: Etudiant,
  matieres: Matiere,
  notes: Note,
  reclamations: Reclamation
};

// Crypto helpers for PBKDF2 password hashing & unique IDs
function hashPassword(password) {
  const salt = 'scolarite_lmd_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex');
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

class Database {
  constructor() {
    this.data = {
      utilisateurs: [],
      etudiants: [],
      matieres: [],
      notes: [],
      reclamations: []
    };
    this.mongoConnected = false;
    this.readyPromise = this.connectAndInitMongo();
  }

  async connectAndInitMongo() {
    const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scolarite_lmd';
    try {
      await mongoose.connect(MONGO_URI);
      this.mongoConnected = true;
      console.log(`🍃 [MongoDB] Connecté à 100% sur : ${MONGO_URI}`);
      await this.reloadFromMongo();
    } catch (err) {
      console.error(`❌ [MongoDB Error] Impossible de connecter MongoDB : ${err.message}`);
    }
  }

  async reloadFromMongo() {
    const cols = ['utilisateurs', 'etudiants', 'matieres', 'notes', 'reclamations'];
    for (const col of cols) {
      this.data[col] = await models[col].find({}).lean();
    }
  }

  collection(name) {
    if (!this.data[name]) {
      this.data[name] = [];
    }
    return {
      find: (filter = {}) => {
        return this.data[name].filter(item => {
          for (const key of Object.keys(filter)) {
            if (item[key] !== filter[key]) return false;
          }
          return true;
        });
      },
      findOne: (filter = {}) => {
        return this.data[name].find(item => {
          for (const key of Object.keys(filter)) {
            if (item[key] !== filter[key]) return false;
          }
          return true;
        }) || null;
      },
      findById: (id) => {
        return this.data[name].find(item => item.id === id) || null;
      },
      insertOne: (doc) => {
        const newDoc = {
          id: doc.id || generateId(name.slice(0, 3)),
          ...doc,
          createdAt: doc.createdAt || new Date().toISOString()
        };
        this.data[name].push(newDoc);

        if (this.mongoConnected && models[name]) {
          models[name].create(newDoc).catch(e => console.error(`[Mongo Insert Error ${name}]`, e.message));
        }

        return newDoc;
      },
      findByIdAndUpdate: (id, updates) => {
        const index = this.data[name].findIndex(item => item.id === id);
        if (index === -1) return null;
        this.data[name][index] = {
          ...this.data[name][index],
          ...updates,
          updatedAt: new Date().toISOString()
        };

        if (this.mongoConnected && models[name]) {
          models[name].findOneAndUpdate({ id }, updates, { new: true })
            .catch(e => console.error(`[Mongo Update Error ${name}]`, e.message));
        }

        return this.data[name][index];
      },
      findByIdAndDelete: (id) => {
        const index = this.data[name].findIndex(item => item.id === id);
        if (index === -1) return null;
        const [removed] = this.data[name].splice(index, 1);

        if (this.mongoConnected && models[name]) {
          models[name].findOneAndDelete({ id })
            .catch(e => console.error(`[Mongo Delete Error ${name}]`, e.message));
        }

        return removed;
      },
      getAll: () => this.data[name]
    };
  }

  async reset() {
    try {
      await this.reloadFromMongo();
      return true;
    } catch (e) {
      console.error('Erreur rechargement mongo :', e.message);
      return false;
    }
  }

  getMongoStatus() {
    return {
      connected: this.mongoConnected,
      uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scolarite_lmd',
      counts: {
        utilisateurs: this.data.utilisateurs?.length || 0,
        etudiants: this.data.etudiants?.length || 0,
        matieres: this.data.matieres?.length || 0,
        notes: this.data.notes?.length || 0,
        reclamations: this.data.reclamations?.length || 0
      }
    };
  }
}

const db = new Database();

module.exports = {
  db,
  hashPassword,
  generateId,
  models
};
