const OPENAPI_SPEC = {
  openapi: "3.0.3",
  info: {
    title: "API REST Scolarité & Délibérations LMD (Sujet 2)",
    version: "1.0.0",
    description: "Documentation interactive de l'API REST de gestion des étudiants, des matières, des notes, des délibérations académiques LMD et des réclamations.\n\nNormes académiques LMD : Formule 70/20/10 avec TP, 80/20 sans TP, Règle des 45/60 crédits ECTS, mentions et capitalisation.",
    contact: {
      name: "Service Informatique & Scolarité Universitaire",
      email: "contact@scolarite.univ.tn"
    }
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Serveur de développement local"
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  },
  paths: {
    "/api/v1/auth/login": {
      post: {
        summary: "Authentification utilisateur",
        description: "Permet à l'agent scolarité, à l'enseignant ou à l'étudiant de se connecter et de recevoir un token JWT.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "motDePasse"],
                properties: {
                  email: { type: "string", example: "admin@scolarite.univ.tn" },
                  motDePasse: { type: "string", example: "admin123" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Connexion réussie avec token JWT généré" },
          "401": { description: "Identifiants invalides" }
        }
      }
    },
    "/api/v1/etudiants": {
      get: {
        summary: "Consulter la liste des étudiants",
        description: "Retourne la liste des étudiants avec pagination et filtres facultatifs par classe ou recherche textuelle.",
        parameters: [
          { name: "classe", in: "query", schema: { type: "string" }, description: "Exemple: L3-INFO" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Recherche par nom ou prénom" },
          { name: "includeInactive", in: "query", schema: { type: "boolean" }, description: "Inclure les archivés (Soft Delete)" }
        ],
        responses: {
          "200": { description: "Liste des étudiants actifs" }
        }
      },
      post: {
        summary: "Ajouter un étudiant",
        description: "Enregistre un nouvel étudiant dans le système avec vérification de l'unicité de l'email.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nom", "prenom", "classe", "email"],
                properties: {
                  nom: { type: "string", example: "Mansouri" },
                  prenom: { type: "string", example: "Sarah" },
                  classe: { type: "string", example: "L3-INFO" },
                  email: { type: "string", example: "sarah.mansouri@etud.univ.tn" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Étudiant créé avec succès" },
          "400": { description: "Champs obligatoires manquants ou email syntaxiquement incorrect" },
          "409": { description: "Conflit : un étudiant possède déjà cette adresse email" }
        }
      }
    },
    "/api/v1/etudiants/{id}": {
      get: {
        summary: "Consulter un dossier étudiant",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Dossier complet et délibération associée" },
          "404": { description: "Étudiant introuvable" }
        }
      },
      put: {
        summary: "Modifier un étudiant",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Étudiant mis à jour" }
        }
      },
      delete: {
        summary: "Suppression logique d'un étudiant (Soft Delete)",
        description: "Désactive l'étudiant en passant isActive à false sans détruire les archives.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Étudiant désactivé avec succès" }
        }
      }
    },
    "/api/v1/matieres": {
      get: {
        summary: "Lister les matières",
        responses: { "200": { description: "Liste des matières" } }
      },
      post: {
        summary: "Ajouter une matière",
        responses: {
          "201": { description: "Matière créée" },
          "409": { description: "Code matière déjà existant" }
        }
      }
    },
    "/api/v1/notes": {
      get: {
        summary: "Consulter les notes",
        parameters: [
          { name: "etudiantId", in: "query", schema: { type: "string" } },
          { name: "matiereId", in: "query", schema: { type: "string" } }
        ],
        responses: { "200": { description: "Liste des notes" } }
      },
      post: {
        summary: "Saisie contrôlée d'une note",
        description: "Enregistre une note avec contraintes : note entre 0 et 20, unicité composée (1 seul DS, 1 seul Exam, 1 seul TP par matière par étudiant).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["etudiantId", "matiereId", "type", "valeur"],
                properties: {
                  etudiantId: { type: "string" },
                  matiereId: { type: "string" },
                  type: { type: "string", enum: ["DS", "EXAMEN", "TP"] },
                  valeur: { type: "number", minimum: 0, maximum: 20, example: 14.5 }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Note enregistrée" },
          "400": { description: "Note hors intervalle [0..20] ou type invalide" },
          "404": { description: "Étudiant ou matière inactif ou introuvable" },
          "409": { description: "Conflit : évaluation de ce type déjà existante pour cet étudiant" }
        }
      }
    },
    "/api/v1/deliberations/etudiant/{id}": {
      get: {
        summary: "Calculer la délibération et moyenne LMD d'un étudiant",
        responses: { "200": { description: "Moyenne générale, statut, mention, crédits ECTS et matières capitalisées" } }
      }
    },
    "/api/v1/deliberations/classe/{classe}": {
      get: {
        summary: "Classement officiel d'une classe",
        description: "Ordonné par moyenne générale décroissante.",
        responses: { "200": { description: "Liste classée des étudiants" } }
      }
    },
    "/api/v1/reclamations": {
      get: {
        summary: "Lister les réclamations de notes",
        responses: { "200": { description: "Liste des réclamations" } }
      },
      post: {
        summary: "Soumettre une réclamation de note",
        description: "Permet à l'étudiant de contester une note avec motif argumenté.",
        responses: { "201": { description: "Réclamation créée" } }
      }
    },
    "/api/v1/reclamations/{id}/traiter": {
      put: {
        summary: "Traiter et instruire une réclamation",
        description: "Permet à l'enseignant ou agent d'accepter ou rejeter la réclamation, avec rectification automatique de la note.",
        responses: { "200": { description: "Réclamation traitée et note rectifiée" } }
      }
    },
    "/api/v1/export/csv": {
      get: {
        summary: "Exporter l'ensemble des résultats de délibération au format CSV",
        responses: { "200": { description: "Fichier CSV téléchargeable" } }
      }
    }
  }
};

function getSwaggerHtml() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Documentation Swagger UI - API Scolarité LMD</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.11.0/favicon-32x32.png" />
  <style>
    body { margin: 0; background: #fafafa; font-family: sans-serif; }
    .topbar { background: #0f172a; padding: 12px 24px; color: white; display: flex; align-items: center; justify-content: space-between; }
    .topbar a { color: #38bdf8; text-decoration: none; font-weight: 600; font-size: 14px; }
  </style>
</head>
<body>
  <div class="topbar">
    <div style="font-size: 18px; font-weight: 700;">🎓 API REST Scolarité LMD - OpenAPI 3.0</div>
    <div>
      <a href="/" style="margin-right: 18px;">← Retour à l'Application Web</a>
      <a href="/soap?wsdl" target="_blank">📜 Contrat WSDL (SOAP)</a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: '/api-docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
}

module.exports = {
  OPENAPI_SPEC,
  getSwaggerHtml
};
