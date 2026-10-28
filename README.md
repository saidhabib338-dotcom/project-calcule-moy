# 🎓 Portail Universitaire Numérique (ENT) • Gestion des Notes & Délibérations LMD
### Sujet 2 • Architecture Orientée Services (SOA) • REST API & Service SOAP (WSDL)

---

## 🌟 Présentation Générale

Cette application a été spécialement conçue comme un **véritable portail universitaire numérique (Espace Numérique de Travail - ENT)** pour les étudiants, les enseignants et le service de scolarité.

Tous les termes techniques et le jargon informatique ont été épurés de l'interface utilisateur pour offrir une **expérience académique authentique et réaliste** :
- **Pour l'Étudiant** : Un espace clair pour consulter ses notes, son relevé de délibération officiel avec crédits ECTS et mention, et déposer un recours en cas d'erreur de saisie sur une copie.
- **Pour l'Enseignant** : Un espace pédagogique pour saisir et rectifier les notes de ses matières et instruire les réclamations.
- **Pour la Scolarité** : Une gestion complète des inscriptions, du PV de délibération officiel et de l'archivage des dossiers.
- **Pour l'Évaluateur / Enseignant-Chercheur** : Un onglet discret *« ⚙️ Services Web & Audit »* permettant de tester l'interopérabilité SOAP 1.1 (WSDL) et d'explorer l'API REST via Swagger UI.

---

## 📌 Correspondance avec les 14 Diagrammes UML & Justifications

| Diagramme UML | Fonctionnalité dans le Portail | Rôle dans l'application | Justification Technique & Métier |
| :--- | :--- | :--- | :--- |
| **01_authentification.png** | **Écran de Connexion ENT** | Tous | Vérification du mot de passe haché (PBKDF2/SHA256). Si correct -> session JWT et affichage du tableau de bord selon le profil. Si incorrect -> message d'erreur d'authentification. |
| **02_agent_ajouter_etudiant.png** | **Inscrire un Étudiant** | Scolarité | Contrôle de la validité syntaxique de l'email et rejet des doublons d'adresses email. |
| **03_agent_consulter_liste.png** | **Liste des Étudiants** | Scolarité / Prof | Filtre par promotion (L3-INFO, M1-GL) et recherche instantanée par nom ou numéro d'étudiant. |
| **04_agent_modifier_supprimer.png** | **Archivage du Dossier** | Scolarité | Suppression logique (*Soft Delete*) préservant l'historique des notes et permettant la réactivation du dossier. |
| **05_agent_gerer_matieres.png** | **Matières du Semestre** | Scolarité | Définition des coefficients (>=1), des crédits ECTS et du régime de contrôle (avec ou sans TP). |
| **06_agent_saisir_note.png** | **Saisie Contrôlée des Notes** | Scolarité | Validation stricte [0..20], vérification de l'étudiant/matière actifs et interdiction des doublons d'épreuves. |
| **07_agent_traiter_reclamation.png** | **Traitement des Réclamations** | Scolarité | Réexamen de la copie : acceptation avec saisie de la note rectifiée (mise à jour automatique en base) ou refus motivé. |
| **08_agent_classement_stats.png** | **Procès-Verbal & Classement** | Scolarité | Calcul de la moyenne générale pondérée, classement décroissant, règle des 45/60 crédits (rachat) et export CSV officiel. |
| **09_enseignant_saisir_note.png** | **Saisie Enseignant** | Enseignant | Saisie ciblée des évaluations de cours par l'enseignant responsable. |
| **10_enseignant_traiter_rec.png** | **Instruction du Recours** | Enseignant | Traitement pédagogique de la contestation étudiante avec justification. |
| **11_etudiant_consulter.png** | **Résultats & Relevé LMD** | Étudiant | Consultation détaillée : notes intermédiaires, moyenne par matière, crédits ECTS acquis et capitalisés. |
| **12_etudiant_telecharger.png** | **Téléchargement Relevé PDF** | Étudiant | Impression ou sauvegarde PDF du relevé officiel avec en-tête institutionnel et cachet. |
| **13_etudiant_soumettre_rec.png** | **Signaler une Erreur** | Étudiant | Dépôt d'une demande argumentée avec sélection de la matière et de l'épreuve contestée. |
| **14_etudiant_suivre_rec.png** | **Suivi en Direct du Recours** | Étudiant | Suivi en temps réel de l'état d'instruction : en attente, acceptée avec nouvelle note, ou maintenue. |

---

## 🏛️ Règles Académiques LMD Implémentées

1. **Formules de calcul des matières** :
   - Avec Travaux Pratiques (`hasTP = true`) : `70% Examen + 20% DS + 10% TP`
   - Sans Travaux Pratiques (`hasTP = false`) : `80% Examen + 20% DS`
2. **Moyenne Générale Pondérée (GPA)** :
   - `Σ(Moyenne_Matière × Coefficient) / Σ(Coefficients)`
3. **Statut LMD & Mentions** :
   - **Admis** : Si `Moyenne Générale >= 10.0`
     - `>= 16.0` : *Très Bien*
     - `[14.0 - 16.0[` : *Bien*
     - `[12.0 - 14.0[` : *Assez Bien*
     - `[10.0 - 12.0[` : *Passable*
   - **Admis par Rachat** : Si `9.0 <= Moyenne Générale < 10.0` ET `Crédits validés >= 45 / 60`
   - **Ajourné** : Si `Moyenne Générale < 10.0` sans rachat, avec **capitalisation** définitive de toutes les matières dont la note est `>= 10.0`.

---

## 🚀 Démarrage & Accès

### Lancer le serveur :
```bash
node server.js
```

### Accès aux interfaces :
* **Portail Web (ENT)** : [http://localhost:5000](http://localhost:5000)
* **Documentation OpenAPI / Swagger** : [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
* **Contrat SOAP WSDL** : [http://localhost:5000/soap?wsdl](http://localhost:5000/soap?wsdl)

### Comptes de démonstration rapide (disponibles en 1 clic sur l'écran d'accueil) :
* 🎓 **Espace Étudiant** : `sarah.mansouri@etud.univ.tn` / `etudiant123`
* 👨‍🏫 **Espace Enseignant** : `prof.martin@univ.tn` / `prof123`
* 🏛️ **Espace Scolarité** : `admin@scolarite.univ.tn` / `admin123`

---

## 📋 Module Avancé : Saisie & Contrôle des Notes (Plan d'Études LMD)

Conformément aux exigences pédagogiques et ergonomiques universitaires :

### 1. Grille Interactive par Étudiant (Feuille de Saisie Complète)
- **Accès direct depuis la liste des étudiants** : Un bouton **« 📝 Notes »** est disponible sur chaque ligne de la table des étudiants pour ouvrir instantanément la feuille d'évaluation de l'étudiant concerné.
- **Organisation par Unités d'Enseignement (UE)** : Les matières sont structurées selon le plan d'études officiel de la faculté :
  - **UE Fondamentale 1 (Données & Algorithmique)** : Algorithmique (ALGO301) & Bases de Données (BD302).
  - **UE Fondamentale 2 (Web & Systèmes)** : Développement Web & SOA (WEB303) & Réseaux (RES304).
  - **UE Transversale (Management & Méthodologie)** : Gestion de Projet & Méthodologie Agile (MGT305).
- **Saisie & Modification en 1 Clic** : Toutes les notes (Contrôle Continu DS, Examen Final, Travaux Pratiques TP) peuvent être saisies, modifiées ou effacées simultanément dans un tableau fluide.
- **Calculs Instantanés en Direct (Temps Réel)** :
  - Chaque modification d'une case recalcule en direct la moyenne de la matière :
    - `70% Examen + 20% DS + 10% TP` (si avec TP)
    - `80% Examen + 20% DS` (si sans TP)
  - Le statut de validation de la matière passe immédiatement en *Validée (>= 10)* ou *Non acquise (< 10)*.
  - La synthèse au bas du tableau met à jour en temps réel la moyenne générale pondérée, les crédits ECTS cumulés, la mention et la décision prévisionnelle du jury.
- **Bouton d'enregistrement en bloc** : `POST /api/v1/notes/grille` sauvegarde toutes les notes en une seule transaction atomique et recalcule la délibération officielle.
- **Boutons de navigation rapide** : Des boutons `◀ Précédent` et `Suivant ▶` permettent de passer facilement d'un étudiant à l'autre sans quitter la feuille de saisie.

### 2. Filtrage Multi-Critères Croisés
La barre de filtres permet de combiner 4 critères de recherche :
- **Par Promotion / Classe** : L3 Informatique, M1 Génie Logiciel, etc.
- **Par Matière** : Sélection précise d'un enseignement.
- **Par Épreuve** : Filtrage par DS, Examen Final ou TP.
- **Recherche instantanée** : Par nom, prénom ou numéro d'étudiant.
- **Bascule instantanée** : Mode « Grille par Étudiant » (Plan d'études) ou mode « Journal des Évaluations » (historique complet avec tri).

---

## 🍃 Architecture Base de Données MongoDB & Modèles Mongoose

La conception respecte scrupuleusement la modélisation NoSQL MongoDB :

### Modèles Mongoose (`src/models/`) :
1. **`Etudiant.js`** :
   - Données : `nom`, `prenom`, `classe`, `email` (index unique), `numeroEtudiant` (index unique), `dateNaissance`, `isActive` (*soft delete*).
2. **`Matiere.js`** :
   - Données : `code` (index unique uppercase), `intitule`, `uniteEnseignement` (regroupement de plan d'études), `coefficient` (>= 1), `credits` (>= 1), `hasTP` (booléen), `enseignant`.
3. **`Note.js`** :
   - Données : `etudiantId`, `matiereId`, `type` (`DS`, `EXAMEN`, `TP`), `valeur` (validateur `min: 0, max: 20`), `dateCreation`.
   - **Index composé unique** : `{ etudiantId: 1, matiereId: 1, type: 1 }` empêchant tout doublon d'évaluation pour une même matière (garantie d'intégrité Niveau Base de Données).
4. **`Utilisateur.js`** :
   - Rôles : `ADMIN` (Scolarité), `ENSEIGNANT`, `ETUDIANT` avec mot de passe sécurisé.
5. **`Reclamation.js`** :
   - Traçabilité complète du recours : étudiant, matière, type de note, note initiale, motif, statut (`EN_ATTENTE`, `ACCEPTEE`, `REFUSEE`), réponse pédagogique et note rectifiée.

### Script de Seed Automatisé (`scripts/seed_mongo.js`) :
- Conforme au **Livrable L5** du Cahier des Charges.
- Commande d'exécution :
  ```bash
  node scripts/seed_mongo.js
  ```
- Peuple directement la base MongoDB locale ou distante (`mongodb://127.0.0.1:27017/scolarite_lmd`) avec tous les étudiants, matières, notes et utilisateurs de test.

---

## 🛠️ Choix Techniques & Frameworks Retenus (Section 7.2 du Cahier des Charges)

| Composant | Technologie Validée | Rôle & Justification dans le Projet |
| :--- | :--- | :--- |
| **Environnement Backend** | **Node.js (v24)** | Moteur d'exécution JavaScript serveur asynchrone, ultra-rapide, non-bloquant et nativement adapté au traitement temps réel. |
| **Framework Backend** | **Express.js** | Architecture modulaire en couches : Contrôleurs (`src/routes/restApi.js`), Services métier (`src/services/`), Modèles Mongoose (`src/models/`), Middlewares d'authentification JWT (`src/middleware/auth.js`). |
| **Base de Données** | **MongoDB (Local)** | Base NoSQL orientée documents JSON (`mongodb://127.0.0.1:27017/scolarite_lmd`), idéale pour stocker les profils, les grilles de notes et l'historique des réclamations sans jointures coûteuses. |
| **ODM (Data Modeling)** | **Mongoose** | Validation stricte des types, contrainte des notes $[0..20]$, index unique composé `{ etudiantId: 1, matiereId: 1, type: 1 }`, et gestion de l'archivage logique (*Soft Delete : isActive = false*). |
| **Protocole REST** | **JSON & HTTP Standard** | Réponses normalisées `{ success, data, error }` et codes HTTP conformes aux spécifications (200, 201, 204, 400, 401, 403, 404, 409, 500). |
| **Protocole SOAP** | **Node SOAP & XML WSDL** | Service web formel XML avec contrat WSDL (`/soap?wsdl`) pour l'interopérabilité institutionnelle et les calculs de moyennes externes. |
| **Documentation Interactive** | **Swagger UI / OpenAPI 3.0** | Interface visuelle intégrée sur `/api-docs` pour documenter et tester l'ensemble des endpoints en temps réel. |
| **Tests Automatisés** | **Postman Collection v2.1.0** | Suite de 25 tests automatisés (`postman_collection.json`) avec runner de test en ligne de commande (`node tests/run_api_tests.js`) assurant **100% de taux de succès**. |
| **Interface Utilisateur (UI)** | **Architecture Web Moderne (SPA)** | Application monopage réactive avec tableaux de bord adaptés à chaque acteur (Scolarité, Enseignant, Étudiant), calculs instantanés et export PDF certifié. |

---

## 🧪 Suite de Tests Automatisés (BNF20 / Livrable L4)

Une suite complète de tests vérifie l'ensemble des règles fonctionnelles et contraintes d'intégrité :
```bash
# Lancer la suite de tests automatisés :
npm test
# ou directement :
node tests/run_api_tests.js
```

### Bilan d'exécution des 25 tests :
* **Authentification & Sécurité (BNF6)** : Login Admin (JWT), Login Professeur, Rejet 401 Unauthorized sur mot de passe invalide.
* **Service Étudiants (Besoins 1-5, 14, 16)** : Pagination (`page`, `limit`), Consultation dossier, Rejet 400 sur format email erroné, Rejet 409 sur email dupliqué, Archivage Soft Delete et Réactivation.
* **Service Matières & Statistiques (Besoins 6-7, 20)** : Liste exhaustive, Indicateurs statistiques par matière (Moyenne classe, Note Min, Note Max, Taux de réussite).
* **Service Notes & Validation (Besoins 8-10, 13, 16, 17)** : Rejet note $>20$ (400), Rejet note $<0$ (400), Vérification d'existence étudiant (404), Unicité composée 1 seul DS/Exam/TP (409), Saisie en bloc grille plan d'études (200).
* **Délibérations & Moteur LMD (Besoins 10-12, 19)** : Formules 70/20/10 et 80/20, GPA pondérée, Mentions, Statut Admis / Rachat / Ajourné, Classement décroissant officiel.
* **Service Réclamations (Besoins 12a-c)** : Dépôt de contestation par l'étudiant (201), Instruction et rectification automatique de note (200).
* **Interopérabilité & SOA (BNF13, BNF14, BNF18, Livrable L3)** : Export CSV officiel (200), Swagger OpenAPI (200), Export Postman JSON (200), Contrat SOAP WSDL (200), Requête SOAP XML opération `CalculerMoyenneEtudiant` (200).


