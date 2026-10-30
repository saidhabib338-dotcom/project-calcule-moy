# CAHIER DES CHARGES ACTUALISÉ (VERSION 2.0)
## Sujet 2 : Plateforme Scolarité LMD, Saisie des Notes & Délibérations Académiques
### Établissement : MY UNIVERSITY
**Date de révision :** Octobre 2026 • **Statut :** Validé & Conforme à l'implémentation logicielle

---

## 1. Introduction & Contexte Général

Les établissements d’enseignement supérieur gèrent un volume important et croissant de données académiques (dossiers étudiants, plans d'études, épreuves et notes). Une gestion manuelle expose les services de scolarité à des erreurs de calcul, des contestations de copies et des risques de non-conformité avec les règlements des jurys de délibération.

Le projet **« Gestion d’étudiants et des notes (Sujet 2) »** pour **MY UNIVERSITY** consiste à concevoir et réaliser une plateforme web complète basée sur une **Architecture Orientée Services (SOA)** combinant des **API REST modernes (JSON)** et un **Service Web SOAP formel (XML / WSDL)**.

Cette version 2.0 actualisée intègre l'ensemble des règles académiques enrichies au cours du développement :
- La gestion multi-cursus (**Mastères Professionnels et Recherche**, **Cycles d'Ingénieurs**, et **Licences LMD** avec isolation de la **Licence 1**).
- La délibération et le calcul des moyennes scindés en **Semestre 1 (S1)**, **Semestre 2 (S2)** et **Bilan Annuel**.
- La règle stricte de sanction académique (**Toute absence non justifiée ou fraude / 8ach est comptabilisée à 0/20**).
- Le cloisonnement sécurisé de l'espace enseignant (saisie ciblée par étudiant limitée aux matières enseignées).
- La génération officielle du **Procès-Verbal (PV)** et du **Bulletin de notes officiel imprimable (PDF)** sous la bannière **MY UNIVERSITY** avec emails institutionnels `@myuniversity.tn`.

---

## 2. Objectifs du Projet

### Objectif général :
Concevoir, implémenter et déployer un service web académique (REST & SOAP) hautement fiable, documenté, testable et ergonomique pour centraliser les dossiers scolaires, automatiser le calcul des délibérations LMD et offrir un espace de réclamation transparent.

### Objectifs spécifiques :
1. **Contrat d'interopérabilité formel** : Exposer une API REST documentée interactivement via **Swagger UI / OpenAPI 3.0** et un contrat de service formel **SOAP 1.1 WSDL**.
2. **Gestion du dossier étudiant** : Permettre la consultation, l'ajout, la modification et l'archivage logique (**Soft Delete** : `isActive = false`) des étudiants.
3. **Gestion des plans d'études et matières** : Structurer les matières par cursus, code, intitulé, coefficient ($\ge 1$), crédits ECTS et semestre (S1 / S2).
4. **Saisie contrôlée et sécurisée des notes** :
   - Permettre la saisie des notes (DS, Examen, TP) sous contrôle strict ($0 \le \text{note} \le 20$).
   - Cloisonner les droits de l'enseignant aux étudiants de ses promotions et à ses matières propres.
   - Appliquer la règle de **zéro (0/20)** en cas d'absence ou de tricherie sans interrompre le calcul de la cohorte.
5. **Moteur de délibération LMD & Procès-Verbal multi-niveaux** :
   - Calcul des moyennes par matière :
     - Avec TP : $\text{Moyenne} = (\text{Examen} \times 70\%) + (\text{DS} \times 20\%) + (\text{TP} \times 10\%)$
     - Sans TP : $\text{Moyenne} = (\text{Examen} \times 80\%) + (\text{DS} \times 20\%)$
   - Calcul des moyennes semestrielles ($GPA_{S1}$, $GPA_{S2}$) et validation des crédits ECTS semestriels (30 ECTS / semestre).
   - Calcul de la moyenne générale annuelle, attribution des mentions (*Passable, Assez Bien, Bien, Très Bien*) et statuts LMD (*Admis, Admis par Rachat si $9 \le GPA < 10$ et crédits $\ge 45/60$, sinon Ajourné*).
   - Classement officiel par cohorte, cycle (Mastère, Ingénieur, Licence) et niveau (L1 distincte).
6. **Gestion des réclamations de notes** : Offrir aux étudiants la possibilité de contester une note erronée avec justification, et permettre son instruction avec rectification automatique de la note en base.
7. **Production documentaire & Exportation** : Exporter le PV officiel au format CSV et générer le bulletin de notes officiel au format PDF imprimable.

---

## 3. Périmètre du Projet

### Fonctionnalités incluses :

| Service | Fonctionnalités détaillées |
| :--- | :--- |
| **Service Authentification & Sécurité** | Connexion sécurisée par rôles (ADMIN, ENSEIGNANT, ETUDIANT) avec jeton JWT et hachage cryptographique des mots de passe. |
| **Service Étudiants** | Consultation paginée, recherche multi-critères, ajout avec validation d'email (`@myuniversity.tn`), modification, archivage logique (soft delete) et réactivation. |
| **Service Matières** | Consultation exhaustive, configuration des coefficients, crédits ECTS, présence de TP, attribution aux enseignants et répartition semestrielle (S1 / S2). |
| **Service Notes & Évaluations** | Saisie contrôlée (DS, Examen, TP), rejet des doublons d'épreuves (409 Conflict), gestion des statuts de présence (Présent, Absent, Fraude comptée à 0/20), restriction de saisie pour l'enseignant. |
| **Moteur LMD & Délibérations** | Calculs des moyennes de modules, moyennes S1 / S2, moyenne annuelle générale, calcul des crédits ECTS, capitalisation, mentions et statut jury. |
| **Procès-Verbal & Classement** | Filtrage dynamique par cycle (Mastère, Ingénieur, Licence), niveau (L1 isolée), section (INFO, GL, SPI) et période (S1, S2, Annuel), indicateurs statistiques et podium (🥇, 🥈, 🥉). |
| **Service Réclamations** | Dépôt en ligne par l'étudiant avec motif précis, instruction par l'enseignant/scolarité (Acceptation avec rectification automatique ou Rejet motivé). |
| **Édition & Exportation** | Téléchargement du relevé officiel PDF et export instantané du Procès-Verbal en fichier CSV normalisé. |
| **Interopérabilité SOA** | Swagger OpenAPI 3.0 interactif et Web Service SOAP 1.1 avec WSDL pour l'audit externe. |

### Fonctionnalités exclues :
- Application mobile native téléchargeable sur les stores (le projet est une Web App responsive universelle).
- Gestion des emplois du temps et pointage biométrique des absences en salle.
- Gestion financière et paiement des droits d'inscription.

---

## 4. Acteurs du Système & Matrice des Droits

### 1. Agent du service de scolarité (Administrateur - ADMIN)
Superviseur global : gestion intégrale des étudiants, des matières, des délibérations, consultation globale de toutes les notes, arbitrage final des réclamations, export CSV et impression des PV.

### 2. Enseignant (ENSEIGNANT)
Acteur pédagogique : consulte les étudiants de ses classes, saisit et rectifie les notes **uniquement pour les matières dont il a la charge**, reçoit et instruit les réclamations sur ses épreuves.

### 3. Étudiant (ETUDIANT)
Bénéficiaire : consulte son dossier, ses notes détaillées par matière et par semestre, ses moyennes S1/S2 et générale, ses crédits validés, télécharge son bulletin de notes officiel et dépose des réclamations en cas d'erreur de saisie.

### Matrice Acteurs / Fonctionnalités :

| Fonctionnalité | Agent Scolarité (Admin) | Enseignant | Étudiant |
| :--- | :---: | :---: | :---: |
| Authentification JWT & Profil | ✔ | ✔ | ✔ |
| Gestion des étudiants (CRUD & Soft Delete) | ✔ | ❌ | ❌ |
| Gestion du catalogue des matières | ✔ | ❌ | ❌ |
| Saisie / Modification de notes | ✔ (Toutes matières) | ✔ (Ses matières uniquement) | ❌ |
| Consultation dossier & notes | ✔ (Tous) | ✔ (Ses promotions) | ✔ (Ses propres notes) |
| Consultation PV & Classement officiel | ✔ | ✔ | ❌ |
| Filtrage multi-niveaux (Cycle, L1, S1, S2) | ✔ | ✔ | ❌ |
| Dépôt d'une réclamation de note | ❌ | ❌ | ✔ |
| Traitement et rectification d'une réclamation | ✔ | ✔ | ❌ |
| Téléchargement du bulletin officiel (PDF) | ✔ | ❌ | ✔ |
| Export du Procès-Verbal (CSV) | ✔ | ❌ | ❌ |
| Appel du service web SOAP (WSDL) | ✔ | ✔ | ✔ |

---

## 5. Besoins Fonctionnels Détaillés

### 1. Gestion des Étudiants (Service Étudiants)
* **Besoin 1** : Affichage de la liste paginée des étudiants actifs avec filtre par promotion/classe.
* **Besoin 2** : Consultation du dossier complet d’un étudiant (identité, classe, délibération LMD).
* **Besoin 3** : Ajout d’un étudiant avec nom, prénom, classe et adresse email universitaire unique (`@myuniversity.tn`).
* **Besoin 4** : Modification des informations d'un étudiant.
* **Besoin 5** : Suppression logique d’un dossier étudiant (**Soft Delete** : `isActive = false`) et restauration possible.

### 2. Gestion des Matières & Plans d'Études (Service Matières)
* **Besoin 6** : Consultation de la liste exhaustive des matières avec indication du semestre (S1 / S2).
* **Besoin 7** : Création/configuration d’une matière avec intitulé, code, coefficient ($\ge 1$), crédits ECTS, présence de TP et enseignant assigné.

### 3. Gestion des Notes & Contrôle de Saisie (Service Notes)
* **Besoin 8** : Saisie d'une note (valeur, type d'épreuve : DS, Examen, TP) pour un étudiant dans une matière.
* **Besoin 9** : Consultation détaillée de la grille des notes d'un étudiant scindée en Semestre 1 et Semestre 2.
* **Besoin 10** : **(Nouveau V2)** Saisie par étudiant sécurisée pour l'enseignant : recherche ciblée par nom/ID et affichage restreint aux seules matières enseignées par ce professeur dans la promotion de l'étudiant.

### 4. Moteur LMD & Délibérations Académiques
* **Besoin 10a** : Calcul de la moyenne de matière avec TP : $\text{Moyenne} = (\text{Examen} \times 70\%) + (\text{DS} \times 20\%) + (\text{TP} \times 10\%)$.
* **Besoin 10b** : Calcul de la moyenne de matière sans TP : $\text{Moyenne} = (\text{Examen} \times 80\%) + (\text{DS} \times 20\%)$.
* **Besoin 10c** : Calcul de la moyenne générale annuelle pondérée par les coefficients.
* **Besoin 10d** : **(Nouveau V2)** Calcul indépendant des moyennes semestrielles ($GPA_{S1}$ et $GPA_{S2}$) et comptabilisation des crédits semestriels correspondants (30 ECTS max par semestre).
* **Besoin 10e** : **(Nouveau V2 - Règle stricte)** Toute matière non évaluée, étudiant absent non justifié ou cas de tricherie (statut `FRAUDE` / 8ach) est obligatoirement comptabilisé à **0/20** pour le calcul des moyennes.
* **Besoin 11** : Attribution de la mention académique selon la moyenne générale :
  - *Passable* : $[10.00 - 12.00[$
  - *Assez Bien* : $[12.00 - 14.00[$
  - *Bien* : $[14.00 - 16.00[$
  - *Très Bien* : $\ge 16.00$
* **Besoin 12** : Décision de délibération LMD :
  - **Admis** : $\text{Moyenne} \ge 10.00$ et crédits validés $= 60/60$.
  - **Admis par Rachat** : $9.00 \le \text{Moyenne} < 10.00$ et crédits validés $\ge 45/60$.
  - **Ajourné** : $\text{Moyenne} < 10.00$ avec capitalisation intégrale des matières ayant une moyenne $\ge 10.00$.

### 5. Service Réclamations de Notes
* **Besoin 12a** : Soumission d'un recours par l'étudiant spécifiant la matière, l'épreuve contestée et un argumentaire précis.
* **Besoin 12b** : Instruction du recours par l'enseignant ou la scolarité avec possibilité de rectifier directement la note ou de rejeter la requête avec justification.
* **Besoin 12c** : Suivi en direct du statut du recours pour l'étudiant (*En attente*, *Acceptée*, *Rejetée*).

### 6. Validation des Données & Intégrité
* **Besoin 13** : Rejet systématique de toute note hors de l'intervalle $[0, 20]$ avec code `400 Bad Request`.
* **Besoin 14** : Contrôle strict de la syntaxe de l'adresse email universitaire.
* **Besoin 15** : Vérification de la présence obligatoire de tous les champs obligatoires.
* **Besoin 16** : Unicité composée : interdiction stricte des doublons d'évaluation (1 seul DS, 1 seul Exam, 1 seul TP par matière par étudiant) avec code `409 Conflict`.
* **Besoin 17** : Vérification programmatique préalable de l'existence et du statut actif de l'étudiant et de la matière avant tout enregistrement (`404 Not Found`).

### 7. Gestion des Erreurs & Codes HTTP
* **Besoin 18** : Formatage JSON uniforme des réponses API : `{ success: Boolean, data: ..., error: ... }` avec codes standard (200, 201, 400, 401, 403, 404, 409, 500).

### 8. Exigences d'Excellence & Reporting
* **Besoin 19** : **(Enrichi V2)** Procès-Verbal officiel et classement ordonné par moyenne décroissante, avec médailles d'excellence (🥇, 🥈, 🥉) et filtres multi-axes :
  - Par Cycle : Mastères (Pro & Recherche), Cycles d'Ingénieurs, Licences LMD.
  - Par Niveau : **Licence 1 (L1-INFO) isolée**, L2, L3, ING1, ING2, M1.
  - Par Section : INFO, GL, SPI.
  - Par Période : S1 Seul, S2 Seul, Annuel (S1 + S2).
* **Besoin 20** : Calcul des indicateurs statistiques par matière (Moyenne promotion, Note Max, Note Min, Taux de réussite).
* **Besoin 21** : Exportation intégrale du Procès-Verbal des délibérations au format CSV en un clic.
* **Besoin 22** : **(Enrichi V2)** Génération du Bulletin officiel de notes au format PDF imprimable, conforme à la charte graphique de **MY UNIVERSITY** avec mentions, crédits et pavés de signature officiels.

---

## 6. Besoins Non Fonctionnels (BNF)

- **BNF1 (Performance)** : Temps de réponse des requêtes REST simples inférieur à 500 ms.
- **BNF2 (Calcul LMD)** : Calcul complet des délibérations d'une cohorte entière en moins de 1 seconde.
- **BNF3 (Concurrence)** : Support multi-utilisateurs simultanés sans interférence de session.
- **BNF4 (Validation Serveur)** : Validation absolue de toutes les données côté backend indépendamment du frontend.
- **BNF5 (Sécurité NoSQL)** : Protection contre les injections NoSQL et assainissement des entrées.
- **BNF6 (Authentification)** : Mots de passe hashés par cryptographie forte (PBKDF2/SHA-256 / bcrypt) et jetons JWT.
- **BNF7 (Discrétion technique)** : Masquage total des stack-traces système en réponse aux clients externes.
- **BNF8 (Intégrité référentielle)** : Zéro enregistrement orphelin lors de l'archivage d'étudiants ou de matières.
- **BNF9 (Conventions REST)** : Respect rigoureux des standards RESTful sous `/api/v1/...`.
- **BNF10 (Messages explicites)** : Messages d'erreur détaillés et contextualisés.
- **BNF11 (Contrat JSON)** : Structure homogène et prévisible de tous les corps de réponse JSON.
- **BNF12 (Ergonomie & Glassmorphism)** : Interface web moderne, contrastée, réactive et optimisée pour la saisie rapide des notes.
- **BNF13 (Standard JSON)** : Échange de données REST conforme à la spécification JSON standard.
- **BNF14 (Interopérabilité SOAP)** : Web Service SOAP 1.1 conforme, validé par schéma XML et contrat WSDL opérationnel.
- **BNF15 (Compatibilité universelle)** : Fonctionnement multi-plateforme sans dépendance propriétaire (Windows, Linux, macOS).
- **BNF16 (Résilience & Continuité)** : Rejet contrôlé des requêtes erronées sans interruption du processus serveur.
- **BNF17 (Persistance hybride)** : Base de données MongoDB persistante couplée à une synchronisation mémoire haute disponibilité.
- **BNF18 (Documentation interactive)** : Documentation interactive OpenAPI 3.0 / Swagger UI accessible directement via le navigateur.
- **BNF19 (Architecture en couches)** : Découpage logiciel strict : *Routes $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Data Models*.
- **BNF20 (Couverture de tests)** : Suite de tests automatisés exhaustive validant 100% des exigences fonctionnelles (25/25 tests PASS).

---

## 7. Architecture Technique Retenue

| Composant | Technologie Validée | Rôle dans l'Architecture |
| :--- | :--- | :--- |
| **Environnement Backend** | **Node.js (v20+)** | Moteur d'exécution asynchrone non-bloquant haute performance. |
| **Architecture API REST** | **Express.js / REST Native** | Routage REST modulaire sous `/api/v1/`, middlewares de sécurité et validation. |
| **Service Web SOAP** | **SOAP 1.1 / WSDL XML** | Service Web formel XML avec endpoint `/soap?wsdl` pour l'interopérabilité académique. |
| **Base de Données** | **MongoDB Local** | Persistance NoSQL sous `mongodb://127.0.0.1:27017/scolarite_lmd`. |
| **Persistance & Synchronisation** | **Mongoose + Memory Cache** | Validation schématique stricte, index d'unicité et cache haute vitesse. |
| **Documentation API** | **Swagger UI / OpenAPI 3.0** | Spécification formelle interactive disponible sous `/api-docs`. |
| **Interface Frontend** | **HTML5 / CSS3 / Vanilla JS SPA** | Interface web monopage moderne, responsive, avec thèmes et styles d'impression PDF. |
| **Banc de Tests Automatisés** | **Automated API Test Suite** | Validation de 25 scénarios nominaux et d'erreur exécutés en ligne de commande (`npm test`). |

---

## 8. Tableau Récapitulatif des Évolutions V2 (Delta par rapport à la V1)

| Axe d'Évolution | Version Initiale (V1) | Version Actualisée (V2.0) |
| :--- | :--- | :--- |
| **Identité Établissement** | Sujet 2 générique | **MY UNIVERSITY** avec adresses officielles `@myuniversity.tn`. |
| **Périmètre des Formations** | Une seule classe test (`L3-INFO`) | **Multi-Cursus complet** : Mastères (`M1-GL`, `M1-SPI`), Ingénieurs (`ING1-INFO`, `ING2-GL`), Licences (`L1-INFO`, `L2-INFO`, `L3-INFO`). |
| **Isolation Licence 1** | Mélangée dans les licences | **Filtre et tableau dédiés pour L1** pour un suivi pédagogique spécifique. |
| **Périodes de Délibération** | Calcul annuel uniquement | **Calcul et affichage scindés** : Semestre 1 (S1), Semestre 2 (S2) et Annuel. |
| **Sanction Absence / Fraude** | Non explicité | **Règle stricte : 0/20 automatique** pour toute absence ou fraude (8ach) sans blocage du calcul. |
| **Espace Enseignant** | Saisie brute par matière | **Saisie ciblée par étudiant** avec vérification stricte du périmètre pédagogique de l'enseignant. |
| **Procès-Verbal (PV)** | Tableau simple | **Tableau dynamique multi-filtres** (Cycle, Niveau, Section, Semestre) avec médailles (🥇, 🥈, 🥉) et export CSV. |
| **Relevé de Notes** | Mention textuelle | **Bulletin officiel imprimable (PDF)** conforme à la charte graphique académique. |
| **Stabilité du Système** | Dépendance MongoDB simple | **Architecture hybride résiliente** avec auto-seed et 100% de tests automatisés validés. |

---

## 9. Livrables du Projet

- **L1** : Cahier des Charges Actualisé V2.0 (`CAHIER_DE_CHARGES_SUJET_2_V2.md` & `CAHIER_DE_CHARGES_SUJET_2_V2.docx`).
- **L2** : Guide d'Architecture et Documentation des Dossiers en Arabe (`GUIDE_PROJET_AR.md`).
- **L3** : Contrat d'Interface OpenAPI 3.0 & Contrat WSDL SOAP (`/api-docs` & `/soap?wsdl`).
- **L4** : Code Source Complet Versionné sur Git (Backend, Frontend, Moteur LMD).
- **L5** : Base de Données MongoDB initialisée avec son jeu de données de test complet.
- **L6** : Suite de Tests d'Intégration validant les 25 exigences techniques (`npm test`).

