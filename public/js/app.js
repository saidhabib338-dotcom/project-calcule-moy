/**
 * Portail Universitaire Numérique - Espace Étudiant, Enseignant & Scolarité
 */

const API_BASE = '/api/v1';

const state = {
  currentUser: null,
  currentTab: 'bulletin-etudiant',
  etudiants: [],
  matieres: [],
  notes: [],
  reclamations: [],
  stats: null,
  activeClassFilter: '',
  searchQuery: '',
  notesMode: 'classe-matiere', // 'classe-matiere' (par classe & matière), 'grille' (par étudiant) ou 'journal'
  workflowClasse: '',
  workflowMatiereId: null,
  reclamationClassFilter: '',
  notesFilters: {
    classe: '',
    matiere: '',
    type: '',
    semestre: '',
    search: ''
  },
  matieresFilters: {
    niveau: '',
    section: '',
    search: ''
  },
  delibFilters: {
    cycle: 'ALL',      // ALL, LICENCE, INGENIEUR, MASTER
    niveau: 'ALL',     // ALL, L1, L2, L3, ING1, ING2, M1
    section: 'ALL',    // ALL, INFO, GL, SPI
    classe: 'ALL',     // ALL, ou classe spécifique
    semestre: 'ANNUEL',// ANNUEL, S1, S2
    search: ''
  },
  selectedGrilleStudentId: null,
  grilleSemestreVue: 'ANNUEL' // ANNUEL, S1, S2
};

// ============================================================
// 1. CYCLE DE VIE & CONNEXION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();

  const savedToken = localStorage.getItem('auth_token');
  if (savedToken) {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        state.currentUser = data.user;
        state.currentUser.token = savedToken;
        basculerVersEspaceConnecte();
        return;
      }
    } catch (e) {
      console.warn('Session expirée');
    }
  }

  afficherConnexion();
});

function afficherConnexion() {
  document.getElementById('auth-view').style.display = 'flex';
  document.getElementById('app-view').style.display = 'none';
  document.getElementById('auth-error-box').style.display = 'none';
}

function basculerVersEspaceConnecte() {
  document.getElementById('auth-view').style.display = 'none';
  document.getElementById('app-view').style.display = 'flex';

  const user = state.currentUser;
  const roleBadge = document.getElementById('user-role-badge');
  const nameLabel = document.getElementById('user-display-name');
  const avatar = document.getElementById('user-avatar');
  const subTitle = document.getElementById('portal-sub-title');

  if (roleBadge) {
    roleBadge.className = `role-pill ${user.role.toLowerCase()}`;
    let label = 'Administration';
    if (user.role === 'ETUDIANT') label = 'Étudiant';
    if (user.role === 'ENSEIGNANT') label = 'Enseignant';
    roleBadge.textContent = label;
  }
  if (nameLabel) {
    nameLabel.textContent = user.nom;
  }
  if (avatar) {
    avatar.textContent = (user.nom || 'U').charAt(0).toUpperCase();
  }
  if (subTitle) {
    if (user.role === 'ETUDIANT') subTitle.textContent = 'Espace Numérique Étudiant';
    else if (user.role === 'ENSEIGNANT') subTitle.textContent = 'Espace Pédagogique Enseignant';
    else subTitle.textContent = 'Service Central de Scolarité';
  }

  adapterInterfaceSelonProfil(user.role);
  refreshDonnees();
}

function adapterInterfaceSelonProfil(role) {
  const kpiSection = document.getElementById('kpi-section');
  const adminTabs = document.querySelectorAll('.role-tab-admin');
  const enseignantTabs = document.querySelectorAll('.role-tab-enseignant');
  const etudiantTabs = document.querySelectorAll('.role-tab-etudiant');

  if (role === 'ETUDIANT') {
    if (kpiSection) kpiSection.style.display = 'none';
    adminTabs.forEach(el => el.style.display = 'none');
    enseignantTabs.forEach(el => el.style.display = 'none');
    etudiantTabs.forEach(el => el.style.display = 'inline-flex');
    switchTab('bulletin-etudiant');
  } else if (role === 'ENSEIGNANT') {
    if (kpiSection) kpiSection.style.display = 'grid';
    adminTabs.forEach(el => el.style.display = 'none');
    enseignantTabs.forEach(el => el.style.display = 'inline-flex');
    etudiantTabs.forEach(el => el.style.display = 'none');
    switchTab('notes');
  } else {
    // Scolarité (ADMIN)
    if (kpiSection) kpiSection.style.display = 'grid';
    adminTabs.forEach(el => el.style.display = 'inline-flex');
    enseignantTabs.forEach(el => el.style.display = 'inline-flex');
    etudiantTabs.forEach(el => el.style.display = 'none');
    switchTab('etudiants');
  }
}

async function traiterConnexion(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const motDePasse = document.getElementById('login-password').value;
  const errorBox = document.getElementById('auth-error-box');
  const errorText = document.getElementById('auth-error-text');
  const submitBtn = document.getElementById('btn-login-submit');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Connexion en cours...';
  errorBox.style.display = 'none';

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, motDePasse })
    });

    const data = await res.json();

    if (res.status === 200 && data.success) {
      state.currentUser = data.user;
      state.currentUser.token = data.token;
      localStorage.setItem('auth_token', data.token);

      showToast(`Bienvenue, ${data.user.nom}`, 'success');
      basculerVersEspaceConnecte();
    } else {
      errorBox.style.display = 'flex';
      errorText.textContent = 'Adresse email ou mot de passe incorrect. Veuillez vérifier vos accès.';
    }
  } catch (err) {
    errorBox.style.display = 'flex';
    errorText.textContent = 'Impossible de contacter le serveur universitaire.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Se Connecter';
  }
}

function fillLoginForm(email, password) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = password;
  document.getElementById('auth-error-box').style.display = 'none';
  document.getElementById('btn-login-submit').focus();
}

function deconnecterUtilisateur() {
  localStorage.removeItem('auth_token');
  state.currentUser = null;
  afficherConnexion();
  document.getElementById('login-password').value = '';
  showToast('Vous avez été déconnecté.', 'info');
}

// ============================================================
// 2. FETCH DONNÉES
// ============================================================
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(state.currentUser?.token && { 'Authorization': `Bearer ${state.currentUser.token}` }),
    ...options.headers
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
    return res.blob();
  }

  return res.json();
}

async function refreshDonnees() {
  await Promise.all([
    fetchEtudiants(),
    fetchMatieres(),
    fetchNotes(),
    fetchReclamations(),
    fetchStats()
  ]);
  renderView();
}

async function fetchEtudiants() {
  const query = new URLSearchParams();
  if (state.activeClassFilter) query.append('classe', state.activeClassFilter);
  if (state.searchQuery) query.append('search', state.searchQuery);
  query.append('includeInactive', 'true');

  const res = await apiFetch(`/etudiants?${query.toString()}`);
  if (res.success) state.etudiants = res.data;
}

async function fetchMatieres() {
  const res = await apiFetch('/matieres');
  if (res.success) state.matieres = res.data;
}

async function fetchNotes() {
  const res = await apiFetch('/notes');
  if (res.success) state.notes = res.data;
}

async function fetchReclamations() {
  const res = await apiFetch('/reclamations');
  if (res.success) state.reclamations = res.data;
}

async function fetchStats() {
  const res = await apiFetch('/deliberations/stats');
  if (res.success) {
    state.stats = res.data;
    renderKpis();
  }
}

// ============================================================
// 3. RENDU DES VUES
// ============================================================
function renderKpis() {
  if (!state.stats) return;

  const totalEl = document.getElementById('stat-total-etudiants');
  const tauxEl = document.getElementById('stat-taux-reussite');
  const moyEl = document.getElementById('stat-moyenne-promo');
  const recEl = document.getElementById('stat-reclamations-attente');

  if (totalEl) totalEl.textContent = state.stats.totalEtudiants || 0;
  if (tauxEl) tauxEl.textContent = `${state.stats.tauxReussiteGlobal || 0}%`;
  if (moyEl) moyEl.textContent = `${(state.stats.moyennePromotion || 0).toFixed(2)}/20`;

  const pendingRecs = state.reclamations.filter(r => r.statut === 'EN_ATTENTE').length;
  if (recEl) recEl.textContent = pendingRecs;

  const badgeRec = document.getElementById('tab-badge-recs');
  if (badgeRec) badgeRec.textContent = pendingRecs;
}

function renderView() {
  renderKpis();

  if (state.currentTab === 'bulletin-etudiant') renderBulletinEtudiantTab();
  if (state.currentTab === 'reclamations') renderReclamationsTab();
  if (state.currentTab === 'etudiants') renderEtudiantsTab();
  if (state.currentTab === 'matieres') renderMatieresTab();
  if (state.currentTab === 'notes') renderNotesTab();
  if (state.currentTab === 'deliberations') renderDeliberationsTab();
  if (state.currentTab === 'services-tech') renderServicesTechTab();
}

// ------------------------------------------------------------
// A. MON RELEVÉ DE NOTES (VUE ÉTUDIANT BEL7A9)
// ------------------------------------------------------------
async function renderBulletinEtudiantTab() {
  const container = document.getElementById('bulletin-etudiant-container');
  if (!container) return;

  const etudiantId = state.currentUser?.etudiantId || 'etud_1';
  container.innerHTML = `<div style="text-align:center; padding:2.5rem; color:var(--primary);">Chargement de vos résultats...</div>`;

  try {
    const res = await apiFetch(`/deliberations/etudiant/${etudiantId}`);
    if (!res.success || !res.data) {
      container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted);">Aucun dossier de notes disponible.</div>`;
      return;
    }

    container.innerHTML = generateBulletinHtml(res.data, true);
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger); padding:1rem;">Erreur de chargement des résultats.</div>`;
  }
}

// ------------------------------------------------------------
// B. MES RÉCLAMATIONS (ÉTUDIANT, ENSEIGNANT & SCOLARITÉ)
// ------------------------------------------------------------
function renderReclamationsTab() {
  const container = document.getElementById('reclamations-container');
  if (!container) return;

  const user = state.currentUser;
  const isEtudiant = user?.role === 'ETUDIANT';
  const isEnseignant = user?.role === 'ENSEIGNANT';

  let filtered = [...state.reclamations];

  if (isEtudiant) {
    // Étudiant : uniquement ses propres réclamations
    filtered = filtered.filter(r => r.etudiantId === user.etudiantId);
  } else if (isEnseignant) {
    // Enseignant : uniquement les réclamations de ses matières dans la classe concernée
    const teacherName = (user.nom || '').toLowerCase();
    const assignedCodes = user.matieresAssociees || [];
    filtered = filtered.filter(r => {
      const matchName = r.matiereEnseignant && r.matiereEnseignant.toLowerCase() === teacherName;
      const matchCode = assignedCodes.includes(r.matiereCode);
      return matchName || matchCode;
    });

    if (state.reclamationClassFilter) {
      filtered = filtered.filter(r => r.etudiantClasse === state.reclamationClassFilter);
    }
  } else {
    // Admin (Scolarité)
    if (state.reclamationClassFilter) {
      filtered = filtered.filter(r => r.etudiantClasse === state.reclamationClassFilter);
    }
  }

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:1rem;">
      <div>
        <h2 style="font-size:1.15rem; color:white;">
          ${isEtudiant ? 'Mes Demandes de Vérification de Copie' : (isEnseignant ? 'Réclamations de mes Matières' : 'Recours & Réclamations des Étudiants')}
        </h2>
        <p style="font-size:0.78rem; color:var(--text-muted);">
          ${isEtudiant 
            ? 'Consultez le statut de vos réclamations ou signalez une nouvelle erreur constatée.' 
            : (isEnseignant ? 'Examinez les contestations relatives à vos matières et procédez si nécessaire à la rectification de note.' : 'Supervision et traitement centralisé des réclamations d\'étudiants.')}
        </p>
      </div>
      <div>
        ${isEtudiant ? `
          <button class="btn btn-primary btn-sm" onclick="ouvrirDepotReclamationModal()">
            + Signaler une Erreur de Note
          </button>
        ` : `
          <button class="btn btn-secondary btn-sm" onclick="refreshDonnees()">
            🔄 Rafraîchir
          </button>
        `}
      </div>
    </div>
  `;

  // Sélecteur de classe pour Enseignant et Admin
  if (!isEtudiant) {
    html += `
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1.25rem; flex-wrap:wrap; background:rgba(255,255,255,0.02); padding:0.6rem 0.85rem; border-radius:6px; border:1px solid var(--border-card);">
        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Filtrer par promotion :</span>
        <button class="btn btn-sm ${!state.reclamationClassFilter ? 'btn-primary' : 'btn-secondary'}" onclick="filtrerReclamationsParClasse('')">
          Toutes
        </button>
        <button class="btn btn-sm ${state.reclamationClassFilter === 'L3-INFO' ? 'btn-primary' : 'btn-secondary'}" onclick="filtrerReclamationsParClasse('L3-INFO')">
          L3-INFO
        </button>
        <button class="btn btn-sm ${state.reclamationClassFilter === 'M1-GL' ? 'btn-primary' : 'btn-secondary'}" onclick="filtrerReclamationsParClasse('M1-GL')">
          M1-GL
        </button>
      </div>
    `;
  }

  if (filtered.length === 0) {
    html += `<div style="text-align:center; padding:2.5rem; background:rgba(255,255,255,0.02); border-radius:8px;">
      <p style="color:var(--text-muted); font-size:0.88rem;">
        ${isEnseignant ? `Aucune réclamation enregistrée pour vos matières ${state.reclamationClassFilter ? `dans la classe ${state.reclamationClassFilter}` : ''}.` : 'Aucune réclamation trouvée.'}
      </p>
    </div>`;
    container.innerHTML = html;
    return;
  }

  html += `<div class="table-responsive">
    <table class="table-custom">
      <thead>
        <tr>
          ${!isEtudiant ? '<th>Étudiant</th>' : ''}
          <th>Matière</th>
          <th>Épreuve</th>
          <th>Note Initiale</th>
          <th>Motif du Recours</th>
          <th>Statut</th>
          <th>Réponse Pédagogique</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  filtered.forEach(r => {
    let statutLabel = 'En attente';
    let statutClass = 'badge-rachat';
    if (r.statut === 'ACCEPTEE') {
      statutLabel = 'Acceptée (Note rectifiée)';
      statutClass = 'badge-admis';
    } else if (r.statut === 'REFUSEE') {
      statutLabel = 'Refusée (Maintenue)';
      statutClass = 'badge-ajourne';
    }

    html += `
      <tr>
        ${!isEtudiant ? `<td><strong>${r.etudiantNom}</strong> <small style="color:var(--text-dim);">(${r.etudiantClasse || ''})</small></td>` : ''}
        <td>
          ${isEtudiant 
            ? `<strong>${r.matiereIntitule}</strong>` 
            : `<span class="badge badge-code">${r.matiereCode}</span> ${r.matiereIntitule}`}
        </td>
        <td><span class="badge badge-gray">${r.typeNote}</span></td>
        <td><strong>${r.noteActuelle !== null ? r.noteActuelle.toFixed(2) : '-'} / 20</strong></td>
        <td style="max-width:240px; font-size:0.8rem; color:var(--text-muted);">${r.motif}</td>
        <td><span class="badge ${statutClass}">${statutLabel}</span></td>
        <td style="max-width:240px; font-size:0.8rem;">
          ${r.reponse ? `<div style="color:var(--primary);">${r.reponse}</div><small style="color:var(--text-dim);">Par : ${r.traitePar || '-'}</small>` : '<span style="color:var(--text-dim);">En attente d\'examen</span>'}
        </td>
        <td>
          ${(!isEtudiant && r.statut === 'EN_ATTENTE') ? `
            <button class="btn btn-primary btn-sm" onclick="ouvrirTraiterReclamationModal('${r.id}')">
              Traiter
            </button>
          ` : `
            <span style="font-size:0.75rem; color:var(--text-dim);">${r.dateTraitement ? 'Clôturée' : 'En cours'}</span>
          `}
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function filtrerReclamationsParClasse(classe) {
  state.reclamationClassFilter = classe;
  renderReclamationsTab();
}

// ------------------------------------------------------------
// C. GESTION DES ÉTUDIANTS (SCOLARITÉ)
// ------------------------------------------------------------
function renderEtudiantsTab() {
  const tbody = document.getElementById('etudiants-table-body');
  if (!tbody) return;

  let filtered = state.etudiants;
  if (state.activeClassFilter) {
    filtered = filtered.filter(e => e.classe === state.activeClassFilter);
  }
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(e =>
      e.nom.toLowerCase().includes(q) ||
      e.prenom.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-dim);">Aucun dossier trouvé.</td></tr>`;
    return;
  }

  const isAdmin = state.currentUser?.role === 'ADMIN';

  tbody.innerHTML = filtered.map(e => {
    const isActif = e.isActive !== false;
    return `
      <tr class="${isActif ? '' : 'row-archived'}">
        <td><span class="badge badge-code">${e.numeroEtudiant || 'ETU-N/A'}</span></td>
        <td><strong>${e.nom}</strong> ${e.prenom}</td>
        <td><span class="badge badge-gray">${e.classe}</span></td>
        <td><span style="color:var(--text-muted); font-size:0.8rem;">${e.email}</span></td>
        <td>
          ${isActif 
            ? '<span class="badge badge-admis">Inscrit</span>' 
            : '<span class="badge badge-gray">Archivé</span>'}
        </td>
        <td>
          <div style="display:flex; gap:0.35rem; align-items:center;">
            <button class="btn btn-primary btn-sm" onclick="ouvrirGrilleNotesDirect('${e.id}')" title="Saisir ou modifier les notes selon le plan d'études">
              📝 Notes
            </button>
            <button class="btn btn-secondary btn-sm" onclick="ouvrirBulletinModal('${e.id}')" title="Consulter le relevé officiel">
              Relevé
            </button>
            ${isAdmin ? `
              <button class="btn btn-secondary btn-sm" onclick="ouvrirModifierEtudiantModal('${e.id}')">
                Modifier
              </button>
              ${isActif ? `
                <button class="btn btn-danger btn-sm" onclick="softDeleteEtudiant('${e.id}', '${e.prenom} ${e.nom}')">
                  Archiver
                </button>
              ` : `
                <button class="btn btn-success btn-sm" onclick="restoreEtudiant('${e.id}')">
                  Réactiver
                </button>
              `}
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Ouvre directement la grille de saisie pour l'étudiant sélectionné depuis l'administration
 */
function ouvrirGrilleNotesDirect(etudiantId) {
  if (!etudiantId) return;
  const etud = state.etudiants.find(e => e.id === etudiantId);
  if (!etud) {
    showToast("Étudiant non trouvé", "error");
    return;
  }

  // Vérification de sécurité pour les enseignants
  const user = state.currentUser;
  if (user && user.role === 'ENSEIGNANT') {
    const teacherMatieres = getTeacherMatieresList(user);
    const teacherClasses = new Set(teacherMatieres.map(m => m.classe).filter(Boolean));
    if (!teacherClasses.has(etud.classe)) {
      showToast(`Accès restreint : l'étudiant ${etud.nom} (${etud.classe}) n'est pas dans vos classes`, "warning");
      return;
    }
  }

  // 1. Basculer vers l'onglet Notes
  switchTab('notes');

  // 2. Activer le mode Grille (Saisie par Étudiant)
  basculerModeNotes('grille');

  // 3. Définir l'étudiant sélectionné et charger sa grille
  state.selectedGrilleStudentId = etudiantId;
  const select = document.getElementById('notes-grille-student-select');
  if (select) {
    select.value = etudiantId;
  }
  const quickInput = document.getElementById('grille-quick-student-id');
  if (quickInput) {
    quickInput.value = etud.numeroEtudiant || '';
  }

  chargerGrilleNotesEtudiant(etudiantId);

  // 4. Défilement fluide vers la feuille de saisie
  setTimeout(() => {
    const container = document.getElementById('student-grid-sheet-container');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}

// ------------------------------------------------------------
// D. MATIÈRES DU SEMESTRE (AVEC FILTRAGE PAR NIVEAU & SECTION)
// ------------------------------------------------------------
function filtrerMatieres() {
  const niveau = document.getElementById('matieres-filter-niveau')?.value || '';
  const section = document.getElementById('matieres-filter-section')?.value || '';
  const search = document.getElementById('matieres-search')?.value.toLowerCase().trim() || '';

  state.matieresFilters = { niveau, section, search };
  renderMatieresTab();
}

function reinitialiserFiltresMatieres() {
  const selNiveau = document.getElementById('matieres-filter-niveau');
  const selSection = document.getElementById('matieres-filter-section');
  const inpSearch = document.getElementById('matieres-search');

  if (selNiveau) selNiveau.value = '';
  if (selSection) selSection.value = '';
  if (inpSearch) inpSearch.value = '';

  state.matieresFilters = { niveau: '', section: '', search: '' };
  renderMatieresTab();
}

function renderMatieresTab() {
  const tbody = document.getElementById('matieres-table-body');
  if (!tbody) return;

  const { niveau, section, search } = state.matieresFilters || {};

  const filtered = (state.matieres || []).filter(m => {
    const parts = (m.classe || '').split('-');
    const mNiveau = parts[0] || '';
    const mSection = parts[1] || '';

    if (niveau && mNiveau !== niveau) return false;
    if (section && mSection !== section) return false;
    if (search) {
      const matchCode = (m.code || '').toLowerCase().includes(search);
      const matchIntitule = (m.intitule || '').toLowerCase().includes(search);
      const matchEnseignant = (m.enseignant || '').toLowerCase().includes(search);
      const matchClasse = (m.classe || '').toLowerCase().includes(search);
      if (!matchCode && !matchIntitule && !matchEnseignant && !matchClasse) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">
      <div style="font-size:1.5rem; margin-bottom:0.5rem;">🔍</div>
      Aucune matière ne correspond aux critères sélectionnés (Niveau: <strong>${niveau || 'Tous'}</strong>, Section: <strong>${section || 'Toutes'}</strong>).
    </td></tr>`;
    return;
  }

  const isAdmin = state.currentUser?.role === 'ADMIN';

  tbody.innerHTML = filtered.map(m => {
    const parts = (m.classe || '').split('-');
    const mNiveau = parts[0] || 'L3';
    const mSection = parts[1] || 'INFO';

    return `
      <tr>
        <td><span class="badge badge-code">${m.code}</span></td>
        <td>
          <strong>${m.intitule}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${m.uniteEnseignement || ''}</div>
        </td>
        <td>
          <span class="badge badge-gray" style="font-weight:700; color:#38bdf8; background:rgba(56, 189, 248, 0.1); border:1px solid rgba(56, 189, 248, 0.25);">
            🎓 ${m.classe || `${mNiveau}-${mSection}`}
          </span>
        </td>
        <td>Coef. ${m.coefficient}</td>
        <td>${m.credits} ECTS</td>
        <td>${m.hasTP ? '<span class="badge badge-admis">Oui (70/20/10)</span>' : '<span class="badge badge-gray">Non (80/20)</span>'}</td>
        <td><span style="color:var(--primary); font-size:0.8rem;">${m.enseignant || 'Non assigné'}</span></td>
        <td>
          <div style="display:flex; gap:0.35rem; align-items:center;">
            <button class="btn btn-secondary btn-sm" onclick="ouvrirStatsMatiereModal('${m.id}')" title="Indicateurs statistiques de la matière (Besoin 20)">
              📊 Stats
            </button>
            ${isAdmin ? `
              <button class="btn btn-secondary btn-sm" onclick="ouvrirModifierMatiereModal('${m.id}')">
                Modifier
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function ouvrirStatsMatiereModal(matiereId) {
  const modalBody = document.getElementById('modal-stats-matiere-body');
  const modalTitle = document.getElementById('modal-stats-matiere-title');
  if (!modalBody) return;

  modalBody.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--primary);">Calcul des indicateurs statistiques en cours...</div>`;
  ouvrirModal('modal-stats-matiere');

  try {
    const res = await apiFetch(`/matieres/${matiereId}/stats`);
    if (!res.success || !res.data) {
      modalBody.innerHTML = `<div style="color:var(--danger); padding:1rem;">Impossible de charger les statistiques de cette matière.</div>`;
      return;
    }

    const { matiere, stats } = res.data;
    if (modalTitle) {
      modalTitle.textContent = `${matiere.code} - ${matiere.intitule}`;
    }

    const moyVal = stats.moyenneGlobale !== null ? stats.moyenneGlobale.toFixed(2) : '--';
    const minVal = stats.noteMinimale !== null ? stats.noteMinimale.toFixed(2) : '--';
    const maxVal = stats.noteMaximale !== null ? stats.noteMaximale.toFixed(2) : '--';

    modalBody.innerHTML = `
      <div style="margin-bottom:1.25rem;">
        <div style="font-size:0.8rem; color:var(--text-muted);">
          Enseignant responsable : <strong style="color:white;">${matiere.enseignant || 'Non assigné'}</strong> • Coef : <strong>${matiere.coefficient}</strong> • Crédits : <strong>${matiere.credits} ECTS</strong>
        </div>
      </div>

      <!-- 4 Blocs Statistiques Clés (Besoin 20) -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:0.75rem; margin-bottom:1.5rem;">
        <div style="background:rgba(2, 132, 199, 0.1); border:1px solid rgba(2, 132, 199, 0.25); border-radius:var(--radius-sm); padding:0.75rem; text-align:center;">
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Moyenne Classe</div>
          <div style="font-size:1.35rem; font-weight:800; color:var(--primary); margin-top:0.25rem;">${moyVal}</div>
          <div style="font-size:0.65rem; color:var(--text-dim);">sur 20</div>
        </div>

        <div style="background:rgba(16, 185, 129, 0.1); border:1px solid rgba(16, 185, 129, 0.25); border-radius:var(--radius-sm); padding:0.75rem; text-align:center;">
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Note Maximale</div>
          <div style="font-size:1.35rem; font-weight:800; color:#10b981; margin-top:0.25rem;">${maxVal}</div>
          <div style="font-size:0.65rem; color:var(--text-dim);">meilleure copie</div>
        </div>

        <div style="background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.25); border-radius:var(--radius-sm); padding:0.75rem; text-align:center;">
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Note Minimale</div>
          <div style="font-size:1.35rem; font-weight:800; color:#ef4444; margin-top:0.25rem;">${minVal}</div>
          <div style="font-size:0.65rem; color:var(--text-dim);">seuil bas</div>
        </div>

        <div style="background:rgba(245, 158, 11, 0.1); border:1px solid rgba(245, 158, 11, 0.25); border-radius:var(--radius-sm); padding:0.75rem; text-align:center;">
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Taux Réussite</div>
          <div style="font-size:1.35rem; font-weight:800; color:#f59e0b; margin-top:0.25rem;">${stats.tauxReussite}%</div>
          <div style="font-size:0.65rem; color:var(--text-dim);">notes &ge; 10/20</div>
        </div>
      </div>

      <!-- Détail par type d'évaluation -->
      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-card); border-radius:var(--radius-sm); padding:1rem;">
        <div style="font-size:0.8rem; font-weight:700; color:white; margin-bottom:0.75rem;">Moyennes par Épreuve :</div>
        <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:0.5rem; padding-bottom:0.4rem; border-bottom:1px dashed var(--border-card);">
          <span style="color:var(--text-muted);">Contrôle Continu (DS - 20%) :</span>
          <strong>${stats.moyDS !== null ? stats.moyDS.toFixed(2) + ' / 20' : 'Aucune saisie'}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:0.5rem; padding-bottom:0.4rem; border-bottom:1px dashed var(--border-card);">
          <span style="color:var(--text-muted);">Examen Final (${matiere.hasTP ? '70%' : '80%'}) :</span>
          <strong>${stats.moyExam !== null ? stats.moyExam.toFixed(2) + ' / 20' : 'Aucune saisie'}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.82rem;">
          <span style="color:var(--text-muted);">Travaux Pratiques (TP - 10%) :</span>
          <strong>${matiere.hasTP ? (stats.moyTP !== null ? stats.moyTP.toFixed(2) + ' / 20' : 'Aucune saisie') : '<span class="badge badge-gray" style="font-size:0.7rem;">Sans TP</span>'}</strong>
        </div>
      </div>

      <div style="margin-top:1rem; font-size:0.75rem; color:var(--text-dim); text-align:right;">
        Total des évaluations enregistrées : <strong>${stats.nbNotesTotal}</strong>
      </div>
    `;
  } catch (err) {
    modalBody.innerHTML = `<div style="color:var(--danger); padding:1rem;">Erreur de communication : ${err.message}</div>`;
  }
}

// ------------------------------------------------------------
// E. SAISIE DES NOTES
// ------------------------------------------------------------
// ------------------------------------------------------------
// E. SAISIE & CONTRÔLE DES NOTES (GRILLE PAR ÉTUDIANT & FILTRAGE)
// ------------------------------------------------------------
function renderNotesTab() {
  // 1. Initialiser le sélecteur de matière dans la barre de filtre s'il n'est pas encore rempli
  const filterMatiereSelect = document.getElementById('notes-filter-matiere');
  if (filterMatiereSelect && (filterMatiereSelect.options.length <= 1 || filterMatiereSelect.options.length !== state.matieres.length + 1)) {
    const currentVal = state.notesFilters.matiere;
    filterMatiereSelect.innerHTML = `<option value="">Toutes les matières</option>` +
      state.matieres.map(m => `<option value="${m.id}">${m.code} - ${m.intitule}</option>`).join('');
    filterMatiereSelect.value = currentVal;
  }

  // 2. Mettre à jour l'apparence des boutons de mode et visibilité des conteneurs
  const btnClasseMatiere = document.getElementById('btn-mode-classe-matiere');
  const btnGrille = document.getElementById('btn-mode-grille');
  const btnJournal = document.getElementById('btn-mode-journal');

  const viewClasseMatiere = document.getElementById('notes-view-classe-matiere');
  const viewGrille = document.getElementById('notes-view-grille');
  const viewJournal = document.getElementById('notes-view-journal');
  const filterBar = document.getElementById('notes-filter-bar-container');

  if (btnClasseMatiere) {
    btnClasseMatiere.className = state.notesMode === 'classe-matiere' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  }
  if (btnGrille) {
    btnGrille.className = state.notesMode === 'grille' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  }
  if (btnJournal) {
    btnJournal.className = state.notesMode === 'journal' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  }

  if (viewClasseMatiere) viewClasseMatiere.style.display = state.notesMode === 'classe-matiere' ? 'block' : 'none';
  if (viewGrille) viewGrille.style.display = state.notesMode === 'grille' ? 'block' : 'none';
  if (viewJournal) viewJournal.style.display = state.notesMode === 'journal' ? 'block' : 'none';
  if (filterBar) filterBar.style.display = state.notesMode === 'journal' ? 'flex' : 'none';

  // 3. Rendre la vue active
  if (state.notesMode === 'classe-matiere') {
    renderWorkflowClasseMatiere();
  } else if (state.notesMode === 'grille') {
    renderGrilleSelectorAndActiveStudent();
  } else {
    renderJournalNotes();
  }
}

function basculerModeNotes(mode) {
  state.notesMode = mode;
  renderNotesTab();
}

// ------------------------------------------------------------
// WORKFLOW HIÉRARCHIQUE (CLASSE -> MATIÈRE ENSEIGNÉE -> ROSTER ÉTUDIANTS)
// ------------------------------------------------------------
function renderWorkflowClasseMatiere() {
  const containerPills = document.getElementById('workflow-classe-pills');
  const containerCards = document.getElementById('workflow-matieres-cards');
  const teacherNote = document.getElementById('workflow-teacher-note');
  const rosterContainer = document.getElementById('workflow-students-roster-container');

  if (!containerPills || !containerCards || !rosterContainer) return;

  const user = state.currentUser;
  const isEnseignant = user?.role === 'ENSEIGNANT';
  const isAdmin = user?.role === 'ADMIN';

  // Étape 1 : Classes disponibles (filtrées pour l'enseignant ou complètes pour l'admin)
  let classes = [];
  if (isEnseignant) {
    const teacherMatieres = getTeacherMatieresList(user);
    const teacherClasses = Array.from(new Set(teacherMatieres.map(m => m.classe).filter(Boolean)));
    classes = teacherClasses;
  } else {
    const classSet = new Set(['L1-INFO', 'L2-INFO', 'L3-INFO', 'ING1-INFO', 'ING2-GL', 'M1-GL', 'M1-SPI']);
    state.matieres.forEach(m => { if (m.classe) classSet.add(m.classe); });
    state.etudiants.forEach(e => { if (e.classe) classSet.add(e.classe); });
    classes = Array.from(classSet);
  }

  if (!state.workflowClasse || !classes.includes(state.workflowClasse)) {
    state.workflowClasse = classes[0] || '';
  }

  if (classes.length === 0) {
    containerPills.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem;">Aucune classe assignée.</div>`;
    containerCards.innerHTML = '';
    rosterContainer.innerHTML = '';
    return;
  }

  containerPills.innerHTML = classes.map(cls => `
    <button type="button" 
            class="class-pill-btn ${state.workflowClasse === cls ? 'active' : ''}" 
            onclick="choisirClasseWorkflow('${cls}')">
      🏫 Promotion ${cls}
    </button>
  `).join('');

  // Étape 2 : Matières de cette classe (Filtrées selon rôle Enseignant vs Admin)
  let classMatieres = state.matieres.filter(m => !m.classe || m.classe === state.workflowClasse);

  if (isEnseignant) {
    const teacherMatieres = getTeacherMatieresList(user);
    const teacherMatIds = new Set(teacherMatieres.map(m => m.id));
    classMatieres = classMatieres.filter(m => teacherMatIds.has(m.id));

    if (teacherNote) {
      teacherNote.innerHTML = `👨‍🏫 Enseignant : <strong style="color:white;">${user.nom}</strong> • <span style="color:#38bdf8;">Uniquement vos cours assignés (${classMatieres.length})</span>`;
    }
  } else {
    if (teacherNote) {
      teacherNote.innerHTML = `🏛️ Scolarité : <strong style="color:white;">Accès Administration Centrale</strong> • Gestion et saisie de toutes les matières (${classMatieres.length})`;
    }
  }

  if (classMatieres.length === 0) {
    containerCards.innerHTML = `
      <div style="grid-column:1/-1; padding:1.5rem; background:rgba(255,255,255,0.02); border-radius:8px; border:1px dashed var(--border-card); text-align:center;">
        <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">
          ${isEnseignant ? `Vous n'avez pas de matière sous votre responsabilité dans la promotion ${state.workflowClasse}.` : `Aucune matière enregistrée dans la promotion ${state.workflowClasse}.`}
        </p>
      </div>
    `;
    rosterContainer.innerHTML = '';
    return;
  }

  // Vérifier si la matière sélectionnée existe toujours dans la liste filtrée
  const exists = classMatieres.some(m => m.id === state.workflowMatiereId);
  if (!exists || !state.workflowMatiereId) {
    state.workflowMatiereId = classMatieres[0].id;
  }

  containerCards.innerHTML = classMatieres.map(m => {
    const isSelected = m.id === state.workflowMatiereId;
    return `
      <div class="matiere-card-btn ${isSelected ? 'active' : ''}" onclick="choisirMatiereWorkflow('${m.id}')">
        <div class="mat-title">${m.intitule}</div>
        <div class="mat-meta">
          <span class="badge badge-code">${m.code}</span>
          <span>Coef ${m.coefficient}</span>
          <span>${m.credits} ECTS</span>
          ${m.hasTP ? '<span class="badge badge-admis" style="font-size:0.65rem;">Avec TP</span>' : '<span class="badge badge-gray" style="font-size:0.65rem;">Sans TP</span>'}
        </div>
        ${isAdmin ? `<div style="font-size:0.72rem; color:var(--text-dim); margin-top:0.35rem;">Resp : ${m.enseignant || 'Non assigné'}</div>` : ''}
      </div>
    `;
  }).join('');

  // Étape 3 : Liste des Étudiants et Saisie des Notes
  const currentMatiere = state.matieres.find(m => m.id === state.workflowMatiereId);
  if (!currentMatiere) {
    rosterContainer.innerHTML = '';
    return;
  }

  const studentsInClass = state.etudiants.filter(e => e.classe === state.workflowClasse && e.isActive !== false);

  if (studentsInClass.length === 0) {
    rosterContainer.innerHTML = `
      <div style="padding:2.5rem; text-align:center; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid var(--border-card); margin-top:1rem;">
        <p style="color:var(--text-muted); margin:0;">Aucun étudiant inscrit et actif dans la promotion ${state.workflowClasse}.</p>
      </div>
    `;
    return;
  }

  const hasTp = Boolean(currentMatiere.hasTP);

  let html = `
    <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-card); border-radius:var(--radius-md); padding:1.25rem; margin-top:0.75rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid var(--border-card);">
        <div>
          <h3 style="font-size:1.1rem; color:white; margin:0; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <span>Feuille d'Évaluation :</span>
            <span style="color:#38bdf8;">${currentMatiere.intitule}</span>
            <span class="badge badge-code">${currentMatiere.code}</span>
          </h3>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.25rem;">
            Promotion : <strong style="color:white;">${state.workflowClasse}</strong> (${studentsInClass.length} étudiants) • 
            Formule LMD : <strong style="color:white;">${hasTp ? 'Examen (70%) + DS (20%) + TP (10%)' : 'Examen (80%) + DS (20%)'}</strong> • Coef : ${currentMatiere.coefficient}
          </div>
        </div>

        <div>
          <button id="btn-save-roster" class="btn btn-primary" onclick="sauvegarderNotesClasseMatiere()">
            💾 Enregistrer les Notes de la Classe
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table-custom" id="table-roster-notes">
          <thead>
            <tr>
              <th style="width:130px;">N° Inscription</th>
              <th style="min-width:180px;">Nom & Prénom</th>
              <th style="width:140px; text-align:center;">DS (20%)</th>
              <th style="width:140px; text-align:center;">Examen (${hasTp ? '70%' : '80%'})</th>
              <th style="width:140px; text-align:center;">TP (${hasTp ? '10%' : 'Sans TP'})</th>
              <th style="width:110px; text-align:center;">Moyenne</th>
              <th style="width:110px; text-align:center;">Statut</th>
            </tr>
          </thead>
          <tbody>
  `;

  studentsInClass.forEach(etud => {
    const etudNotes = state.notes.filter(n => n.etudiantId === etud.id && n.matiereId === currentMatiere.id);
    const dsNote = etudNotes.find(n => n.type === 'DS');
    const examNote = etudNotes.find(n => n.type === 'EXAMEN');
    const tpNote = etudNotes.find(n => n.type === 'TP');

    const dsVal = dsNote ? dsNote.valeur : '';
    const examVal = examNote ? examNote.valeur : '';
    const tpVal = tpNote ? tpNote.valeur : '';

    let moy = null;
    const e = examVal !== '' ? Number(examVal) : null;
    const d = dsVal !== '' ? Number(dsVal) : null;
    const t = tpVal !== '' ? Number(tpVal) : null;

    if (hasTp) {
      if (e !== null || d !== null || t !== null) {
        moy = ((e !== null ? e : 0) * 0.70) + ((d !== null ? d : 0) * 0.20) + ((t !== null ? t : 0) * 0.10);
      }
    } else {
      if (e !== null || d !== null) {
        moy = ((e !== null ? e : 0) * 0.80) + ((d !== null ? d : 0) * 0.20);
      }
    }

    const isValide = moy !== null && moy >= 10.0;
    const moyText = moy !== null ? moy.toFixed(2) : '--';

    html += `
      <tr class="roster-row" data-etudiant-id="${etud.id}" data-hastp="${hasTp}">
        <td><span class="badge badge-code">${etud.numeroEtudiant || 'ETU-N/A'}</span></td>
        <td><strong>${etud.nom.toUpperCase()}</strong> ${etud.prenom}</td>

        <!-- Note DS -->
        <td style="text-align:center;">
          <input type="number" 
                 class="grille-input roster-input" 
                 data-type="DS" 
                 value="${dsVal}" 
                 step="0.25" 
                 min="0" 
                 max="20" 
                 placeholder="-- / 20" 
                 oninput="calculerLigneRoster(this)">
        </td>

        <!-- Note Examen -->
        <td style="text-align:center;">
          <input type="number" 
                 class="grille-input roster-input" 
                 data-type="EXAMEN" 
                 value="${examVal}" 
                 step="0.25" 
                 min="0" 
                 max="20" 
                 placeholder="-- / 20" 
                 oninput="calculerLigneRoster(this)">
        </td>

        <!-- Note TP -->
        <td style="text-align:center;">
          ${hasTp ? `
            <input type="number" 
                   class="grille-input roster-input" 
                   data-type="TP" 
                   value="${tpVal}" 
                   step="0.25" 
                   min="0" 
                   max="20" 
                   placeholder="-- / 20" 
                   oninput="calculerLigneRoster(this)">
          ` : `
            <span class="badge badge-gray" style="font-size:0.72rem; padding:0.35rem 0.6rem;">Sans TP</span>
          `}
        </td>

        <!-- Moyenne Live -->
        <td style="text-align:center;">
          <strong class="live-roster-moy" style="font-size:0.95rem; color:${moy !== null ? (isValide ? '#38bdf8' : '#f87171') : 'var(--text-muted)'};">
            ${moy !== null ? moyText + ' / 20' : '--'}
          </strong>
        </td>

        <!-- Statut Live -->
        <td style="text-align:center;">
          <span class="badge ${moy !== null ? (isValide ? 'badge-admis' : 'badge-ajourne') : 'badge-gray'} live-roster-status">
            ${moy !== null ? (isValide ? 'Validée' : 'Non acquise') : 'En attente'}
          </span>
        </td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.25rem; padding-top:1rem; border-top:1px solid var(--border-card); flex-wrap:wrap; gap:1rem;">
        <div style="font-size:0.8rem; color:var(--text-muted);">
          Total étudiants : <strong style="color:white;">${studentsInClass.length}</strong> • Échelle de notation légale : 0.00 à 20.00 / 20
        </div>
        <div>
          <button class="btn btn-primary" onclick="sauvegarderNotesClasseMatiere()">
            💾 Enregistrer les Notes de la Classe
          </button>
        </div>
      </div>
    </div>
  `;

  rosterContainer.innerHTML = html;
}

function choisirClasseWorkflow(classe) {
  state.workflowClasse = classe;
  state.workflowMatiereId = null;
  renderWorkflowClasseMatiere();
}

function choisirMatiereWorkflow(matiereId) {
  state.workflowMatiereId = matiereId;
  renderWorkflowClasseMatiere();
}

function calculerLigneRoster(inputElement) {
  const row = inputElement.closest('tr.roster-row');
  if (!row) return;

  const hasTp = row.dataset.hastp === 'true';
  const dsInput = row.querySelector('input[data-type="DS"]');
  const examInput = row.querySelector('input[data-type="EXAMEN"]');
  const tpInput = row.querySelector('input[data-type="TP"]');

  const dsVal = dsInput && dsInput.value !== '' ? Number(dsInput.value) : null;
  const examVal = examInput && examInput.value !== '' ? Number(examInput.value) : null;
  const tpVal = tpInput && tpInput.value !== '' ? Number(tpInput.value) : null;

  const moyElem = row.querySelector('.live-roster-moy');
  const statusElem = row.querySelector('.live-roster-status');

  let moy = null;
  if (hasTp) {
    if (examVal !== null || dsVal !== null || tpVal !== null) {
      const e = examVal !== null ? examVal : 0;
      const d = dsVal !== null ? dsVal : 0;
      const t = tpVal !== null ? tpVal : 0;
      moy = (e * 0.70) + (d * 0.20) + (t * 0.10);
    }
  } else {
    if (examVal !== null || dsVal !== null) {
      const e = examVal !== null ? examVal : 0;
      const d = dsVal !== null ? dsVal : 0;
      moy = (e * 0.80) + (d * 0.20);
    }
  }

  if (moy !== null) {
    const isValide = moy >= 10.0;
    if (moyElem) {
      moyElem.textContent = `${moy.toFixed(2)} / 20`;
      moyElem.style.color = isValide ? '#38bdf8' : '#f87171';
    }
    if (statusElem) {
      statusElem.className = `badge ${isValide ? 'badge-admis' : 'badge-ajourne'} live-roster-status`;
      statusElem.textContent = isValide ? 'Validée' : 'Non acquise';
    }
  } else {
    if (moyElem) {
      moyElem.textContent = '--';
      moyElem.style.color = 'var(--text-muted)';
    }
    if (statusElem) {
      statusElem.className = 'badge badge-gray live-roster-status';
      statusElem.textContent = 'En attente';
    }
  }
}

async function sauvegarderNotesClasseMatiere() {
  const matiereId = state.workflowMatiereId;
  const classe = state.workflowClasse;

  if (!matiereId || !classe) {
    showToast("Veuillez sélectionner une classe et une matière", "error");
    return;
  }

  const rows = document.querySelectorAll('#table-roster-notes tr.roster-row');
  const evaluations = [];

  for (const row of rows) {
    const etudiantId = row.dataset.etudiantId;
    const dsInput = row.querySelector('input[data-type="DS"]');
    const examInput = row.querySelector('input[data-type="EXAMEN"]');
    const tpInput = row.querySelector('input[data-type="TP"]');

    const dsStr = dsInput ? dsInput.value.trim() : '';
    const examStr = examInput ? examInput.value.trim() : '';
    const tpStr = tpInput ? tpInput.value.trim() : '';

    const parseVal = (str, label) => {
      if (str === '') return null;
      const num = Number(str);
      if (isNaN(num) || num < 0 || num > 20) {
        throw new Error(`Note de ${label} invalide (${str}) : doit être comprise entre 0 et 20`);
      }
      return num;
    };

    try {
      evaluations.push({
        etudiantId,
        ds: parseVal(dsStr, 'DS'),
        examen: parseVal(examStr, 'Examen'),
        tp: parseVal(tpStr, 'TP')
      });
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }
  }

  const btn = document.getElementById('btn-save-roster');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Enregistrement en cours...';
  }

  try {
    const res = await apiFetch('/notes/classe-matiere', {
      method: 'POST',
      body: JSON.stringify({ classe, matiereId, evaluations })
    });

    if (res.success) {
      showToast(res.message || 'Notes de la classe enregistrées avec succès', 'success');
      await refreshDonnees();
      renderWorkflowClasseMatiere();
    } else {
      showToast(res.error || 'Erreur lors de l\'enregistrement', 'error');
    }
  } catch (err) {
    showToast('Erreur serveur : ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💾 Enregistrer les Notes de la Classe';
    }
  }
}

function getTeacherMatieresList(user) {
  if (!user || user.role !== 'ENSEIGNANT') return state.matieres;
  const clean = str => (str || '').toLowerCase().replace(/^(dr|pr|prof|mr|mme)\.?\s+/i, '').trim();
  const teacherClean = clean(user.nom);
  const assignedCodes = (user.matieresAssociees || []).map(c => c.toLowerCase());
  return state.matieres.filter(m => {
    const matTeacherClean = clean(m.enseignant);
    const matchName = matTeacherClean && (
      matTeacherClean === teacherClean ||
      matTeacherClean.includes(teacherClean) ||
      teacherClean.includes(matTeacherClean) ||
      teacherClean.split(/\s+/).some(part => part.length >= 3 && matTeacherClean.includes(part))
    );
    const matchCode = m.code && assignedCodes.includes(m.code.toLowerCase());
    return Boolean(matchName || matchCode);
  });
}

function getEtudiantsFiltresPourGrille() {
  let list = state.etudiants.filter(e => e.isActive !== false);
  const user = state.currentUser;

  // Si Enseignant : SEULEMENT les étudiants qui étudient dans les classes de l'enseignant
  if (user && user.role === 'ENSEIGNANT') {
    const teacherMatieres = getTeacherMatieresList(user);
    const teacherClasses = new Set(teacherMatieres.map(m => m.classe).filter(Boolean));
    list = list.filter(e => teacherClasses.has(e.classe));
  }

  if (state.notesFilters.classe) {
    list = list.filter(e => e.classe === state.notesFilters.classe);
  }
  if (state.notesFilters.search) {
    const q = state.notesFilters.search.toLowerCase();
    list = list.filter(e =>
      (e.nom && e.nom.toLowerCase().includes(q)) ||
      (e.prenom && e.prenom.toLowerCase().includes(q)) ||
      (e.numeroEtudiant && e.numeroEtudiant.toLowerCase().includes(q)) ||
      (e.id && e.id.toLowerCase().includes(q))
    );
  }
  return list;
}

function rechercherEtudiantParId(query) {
  if (!query || !query.trim()) return;
  const q = query.trim().toLowerCase();
  const eligible = getEtudiantsFiltresPourGrille();

  const found = eligible.find(e =>
    (e.numeroEtudiant && e.numeroEtudiant.toLowerCase().includes(q)) ||
    (e.id && e.id.toLowerCase() === q) ||
    (e.nom && e.nom.toLowerCase().includes(q)) ||
    (e.prenom && e.prenom.toLowerCase().includes(q)) ||
    `${e.prenom || ''} ${e.nom || ''}`.toLowerCase().includes(q) ||
    `${e.nom || ''} ${e.prenom || ''}`.toLowerCase().includes(q)
  );

  if (found) {
    state.selectedGrilleStudentId = found.id;
    const select = document.getElementById('notes-grille-student-select');
    if (select) select.value = found.id;
    chargerGrilleNotesEtudiant(found.id);
  } else {
    // Si l'étudiant recherché existe dans l'établissement mais n'est pas dans les classes de l'enseignant
    const user = state.currentUser;
    if (user && user.role === 'ENSEIGNANT' && q.length >= 2) {
      const existsElsewhere = state.etudiants.find(e =>
        (e.numeroEtudiant && e.numeroEtudiant.toLowerCase().includes(q)) ||
        (e.id && e.id.toLowerCase() === q) ||
        (e.nom && e.nom.toLowerCase().includes(q)) ||
        (e.prenom && e.prenom.toLowerCase().includes(q))
      );
      if (existsElsewhere) {
        const container = document.getElementById('student-grid-sheet-container');
        if (container) {
          container.innerHTML = `
            <div style="text-align:center; padding:2.5rem 1.5rem; background:rgba(239, 68, 68, 0.08); border-radius:var(--radius-md); border:1px solid rgba(239, 68, 68, 0.25);">
              <div style="font-size:2.2rem; margin-bottom:0.75rem;">⛔</div>
              <h3 style="color:#f87171; font-size:1.1rem; margin-bottom:0.5rem;">Étudiant non assigné à vos cours</h3>
              <p style="color:var(--text-muted); font-size:0.88rem; max-width:480px; margin:0 auto 1rem;">
                L'étudiant <strong>${existsElsewhere.nom.toUpperCase()} ${existsElsewhere.prenom}</strong> (Classe: <span class="badge badge-code">${existsElsewhere.classe}</span> - N° ${existsElsewhere.numeroEtudiant}) n'est pas inscrit dans une promotion où vous enseignez.
              </p>
              <div style="font-size:0.8rem; color:var(--text-dim);">
                Conformément au règlement universitaire, vous ne pouvez consulter et saisir que les notes de vos propres étudiants.
              </div>
            </div>
          `;
        }
      }
    }
  }
}

function renderGrilleSelectorAndActiveStudent() {
  const select = document.getElementById('notes-grille-student-select');
  const eligible = getEtudiantsFiltresPourGrille();

  if (eligible.length === 0) {
    if (select) {
      select.innerHTML = `<option value="">Aucun étudiant ne correspond aux critères</option>`;
    }
    const container = document.getElementById('student-grid-sheet-container');
    if (container) {
      container.innerHTML = `
        <div style="text-align:center; padding:3rem 1.5rem; background:rgba(255,255,255,0.02); border-radius:var(--radius-md); border:1px solid var(--border-card);">
          <div style="font-size:2rem; margin-bottom:0.75rem;">🔍</div>
          <h3 style="color:white; font-size:1.05rem; margin-bottom:0.5rem;">Aucun étudiant trouvé</h3>
          <p style="color:var(--text-muted); font-size:0.85rem; max-width:420px; margin:0 auto 1.25rem;">
            Aucun dossier étudiant actif ne correspond aux filtres appliqués (Classe: ${state.notesFilters.classe || 'Toutes'}, Recherche: "${state.notesFilters.search || '-'}").
          </p>
          <button class="btn btn-secondary btn-sm" onclick="reinitialiserFiltresNotes()">
            Réinitialiser les Filtres
          </button>
        </div>
      `;
    }
    return;
  }

  // Vérifier si l'étudiant sélectionné existe toujours dans la liste filtrée
  const exists = eligible.some(e => e.id === state.selectedGrilleStudentId);
  if (!exists || !state.selectedGrilleStudentId) {
    state.selectedGrilleStudentId = eligible[0].id;
  }

  if (select) {
    select.innerHTML = eligible.map(e => `
      <option value="${e.id}" ${e.id === state.selectedGrilleStudentId ? 'selected' : ''}>
        ${e.nom.toUpperCase()} ${e.prenom} (${e.classe}) - ${e.numeroEtudiant || ''}
      </option>
    `).join('');
    select.value = state.selectedGrilleStudentId;
  }

  chargerGrilleNotesEtudiant(state.selectedGrilleStudentId);
}

function naviguerEtudiantGrille(direction) {
  const eligible = getEtudiantsFiltresPourGrille();
  if (eligible.length === 0) return;

  const currentIndex = eligible.findIndex(e => e.id === state.selectedGrilleStudentId);
  let nextIndex = currentIndex + direction;

  if (nextIndex < 0) nextIndex = eligible.length - 1;
  if (nextIndex >= eligible.length) nextIndex = 0;

  state.selectedGrilleStudentId = eligible[nextIndex].id;
  const select = document.getElementById('notes-grille-student-select');
  if (select) select.value = state.selectedGrilleStudentId;

  chargerGrilleNotesEtudiant(state.selectedGrilleStudentId);
}

function marquerNoteSpecial(btn, type, statut) {
  const row = btn.closest('tr.grille-row');
  if (!row) return;
  const input = row.querySelector(`input[data-type="${type}"]`);
  if (!input) return;

  if (statut === 'ABS') {
    input.value = '0';
    input.dataset.statut = 'ABSENT';
    input.style.borderColor = '#f59e0b';
    input.title = 'Étudiant Absent (Note = 0)';
    showToast(`Épreuve ${type} : Étudiant marqué Absent (Note = 0/20)`, 'warning');
  } else if (statut === 'FRAUDE') {
    input.value = '0';
    input.dataset.statut = 'FRAUDE';
    input.style.borderColor = '#ef4444';
    input.title = 'Fraude / 8ach constatée (Note = 0)';
    showToast(`Épreuve ${type} : Fraude / 8ach constatée (Note = 0/20)`, 'error');
  }
  calculerLigneGrille(input);
}

function genererLignesTableauGrille(matieresList, isEnseignant = false) {
  return matieresList.map(m => {
    const hasTp = Boolean(m.hasTP);
    const dsVal = m.notes.ds !== null && m.notes.ds !== undefined ? m.notes.ds : '';
    const examVal = m.notes.examen !== null && m.notes.examen !== undefined ? m.notes.examen : '';
    const tpVal = m.notes.tp !== null && m.notes.tp !== undefined ? m.notes.tp : '';

    const moyVal = m.moyenne !== null && m.moyenne !== undefined ? m.moyenne : 0;
    const isValide = moyVal >= 10.0;

    return `
      <tr class="grille-row" 
          data-matiere-id="${m.matiereId || m.id}" 
          data-coef="${m.coefficient}" 
          data-credits="${m.credits}" 
          data-hastp="${hasTp}"
          data-semestre="${m.semestre || 1}"
          data-current-moyenne="${moyVal}">
        <td>
          <div style="font-weight:600; color:white;">${m.intitule}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); display:flex; gap:0.5rem; align-items:center; margin-top:0.15rem; flex-wrap:wrap;">
            <span class="badge badge-code" style="font-size:0.7rem;">${m.code}</span>
            <span>Semestre ${m.semestre || 1}</span>
            ${!isEnseignant ? `<span>• Resp : ${m.enseignant || 'Non assigné'}</span>` : ''}
          </div>
        </td>
        <td style="text-align:center;"><strong style="color:var(--primary); font-size:0.95rem;">${m.coefficient}</strong></td>
        <td style="text-align:center;">${m.credits} ECTS</td>
        
        <!-- Note DS (20%) -->
        <td style="text-align:center;">
          <div class="cell-input-box">
            <input type="number" 
                   class="grille-input" 
                   data-matiere="${m.matiereId || m.id}" 
                   data-type="DS" 
                   data-statut="${m.notes.dsStatut || 'PRESENT'}"
                   value="${dsVal}" 
                   step="0.25" 
                   min="0" 
                   max="20" 
                   placeholder="0" 
                   oninput="calculerLigneGrille(this)">
            <div style="display:flex; gap:2px; justify-content:center;">
              <button type="button" class="btn-quick-tag abs" onclick="marquerNoteSpecial(this, 'DS', 'ABS')" title="Marquer Absent (0/20)">ABS</button>
              <button type="button" class="btn-quick-tag fraude" onclick="marquerNoteSpecial(this, 'DS', 'FRAUDE')" title="Marquer Fraude (0/20)">8ACH</button>
            </div>
          </div>
        </td>

        <!-- Note Examen (70% ou 80%) -->
        <td style="text-align:center;">
          <div class="cell-input-box">
            <input type="number" 
                   class="grille-input" 
                   data-matiere="${m.matiereId || m.id}" 
                   data-type="EXAMEN" 
                   data-statut="${m.notes.examStatut || 'PRESENT'}"
                   value="${examVal}" 
                   step="0.25" 
                   min="0" 
                   max="20" 
                   placeholder="0" 
                   oninput="calculerLigneGrille(this)">
            <div style="display:flex; gap:2px; justify-content:center;">
              <button type="button" class="btn-quick-tag abs" onclick="marquerNoteSpecial(this, 'EXAMEN', 'ABS')" title="Marquer Absent (0/20)">ABS</button>
              <button type="button" class="btn-quick-tag fraude" onclick="marquerNoteSpecial(this, 'EXAMEN', 'FRAUDE')" title="Marquer Fraude (0/20)">8ACH</button>
            </div>
          </div>
        </td>

        <!-- Note TP (10% si applicable) -->
        <td style="text-align:center;">
          ${hasTp ? `
            <div class="cell-input-box">
              <input type="number" 
                     class="grille-input" 
                     data-matiere="${m.matiereId || m.id}" 
                     data-type="TP" 
                     data-statut="${m.notes.tpStatut || 'PRESENT'}"
                     value="${tpVal}" 
                     step="0.25" 
                     min="0" 
                     max="20" 
                     placeholder="0" 
                     oninput="calculerLigneGrille(this)">
              <div style="display:flex; gap:2px; justify-content:center;">
                <button type="button" class="btn-quick-tag abs" onclick="marquerNoteSpecial(this, 'TP', 'ABS')" title="Marquer Absent (0/20)">ABS</button>
                <button type="button" class="btn-quick-tag fraude" onclick="marquerNoteSpecial(this, 'TP', 'FRAUDE')" title="Marquer Fraude (0/20)">8ACH</button>
              </div>
            </div>
          ` : `
            <span class="badge badge-gray" style="font-size:0.72rem; padding:0.35rem 0.6rem;">Sans TP</span>
          `}
        </td>

        <!-- Moyenne Calculée Directe (avec règle : manquant/absent/fraude = 0) -->
        <td style="text-align:center;">
          <strong class="live-moy-val" data-row-mat="${m.matiereId || m.id}" style="font-size:0.95rem; color:${isValide ? '#38bdf8' : '#f87171'};">
            ${moyVal.toFixed(2)} / 20
          </strong>
        </td>

        <!-- Statut de Validation LMD -->
        <td style="text-align:center;">
          <span class="badge ${isValide ? 'badge-admis' : 'badge-ajourne'} live-status-val" data-row-mat="${m.matiereId || m.id}">
            ${isValide ? 'Validée' : 'Non acquise (0)'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function filtrerGrilleSemestre(vue) {
  state.grilleSemestreVue = vue;
  const s1Block = document.getElementById('grille-semester-1-block');
  const s2Block = document.getElementById('grille-semester-2-block');
  const annBlock = document.getElementById('grille-annuel-block');
  const btnAnn = document.getElementById('btn-grille-view-annuel');
  const btnS1 = document.getElementById('btn-grille-view-s1');
  const btnS2 = document.getElementById('btn-grille-view-s2');

  if (s1Block) s1Block.style.display = (vue === 'ANNUEL' || vue === 'S1') ? 'block' : 'none';
  if (s2Block) s2Block.style.display = (vue === 'ANNUEL' || vue === 'S2') ? 'block' : 'none';
  if (annBlock) annBlock.style.display = (vue === 'ANNUEL') ? 'block' : 'none';

  if (btnAnn) btnAnn.className = vue === 'ANNUEL' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  if (btnS1) btnS1.className = vue === 'S1' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  if (btnS2) btnS2.className = vue === 'S2' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
}

async function chargerGrilleNotesEtudiant(etudiantId) {
  if (!etudiantId) return;
  state.selectedGrilleStudentId = etudiantId;

  const container = document.getElementById('student-grid-sheet-container');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center; padding:3rem; color:var(--primary);">
      <div style="font-size:1.5rem; margin-bottom:0.5rem;">⏳</div>
      <div>Chargement du plan d'études et des notes de l'étudiant...</div>
    </div>
  `;

  try {
    const res = await apiFetch(`/deliberations/etudiant/${etudiantId}`);
    if (!res.success || !res.data) {
      container.innerHTML = `<div style="color:var(--danger); padding:2rem; text-align:center;">Dossier de notes non trouvé pour cet étudiant.</div>`;
      return;
    }

    const delib = res.data;
    const etud = delib.etudiant;
    const user = state.currentUser;
    const isEnseignant = user && user.role === 'ENSEIGNANT';
    const isAdmin = user && user.role === 'ADMIN';

    // Sécurité Enseignant : Vérifier que l'étudiant est bien inscrit dans les classes de l'enseignant
    if (isEnseignant) {
      const teacherMatieres = getTeacherMatieresList(user);
      const teacherClasses = new Set(teacherMatieres.map(m => m.classe).filter(Boolean));
      if (!teacherClasses.has(etud.classe)) {
        container.innerHTML = `
          <div style="text-align:center; padding:2.5rem 1.5rem; background:rgba(239, 68, 68, 0.08); border-radius:var(--radius-md); border:1px solid rgba(239, 68, 68, 0.25);">
            <div style="font-size:2.2rem; margin-bottom:0.75rem;">⛔</div>
            <h3 style="color:#f87171; font-size:1.1rem; margin-bottom:0.5rem;">Étudiant non assigné à vos cours</h3>
            <p style="color:var(--text-muted); font-size:0.88rem; max-width:480px; margin:0 auto 1rem;">
              L'étudiant <strong>${etud.nom.toUpperCase()} ${etud.prenom}</strong> (Classe: <span class="badge badge-code">${etud.classe}</span>) n'appartient pas à l'une de vos classes. Vous ne pouvez évaluer que vos propres étudiants.
            </p>
          </div>
        `;
        return;
      }
    }

    let statutBadgeClass = 'badge-admis';
    if (delib.statut === 'Admis par Rachat') statutBadgeClass = 'badge-rachat';
    if (delib.statut === 'Ajourné') statutBadgeClass = 'badge-ajourne';

    // En-tête Commun
    let html = `
      <div class="student-grid-sheet" id="table-grille-notes">
        <!-- En-tête Dossier Étudiant -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.25rem; padding-bottom:1rem; border-bottom:1px solid var(--border-card);">
          <div style="display:flex; align-items:center; gap:0.85rem;">
            <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--primary-dark)); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.2rem; color:white; box-shadow:0 4px 12px rgba(2,132,199,0.3);">
              ${(etud.prenom || 'E').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 style="color:white; font-size:1.15rem; margin:0; display:flex; align-items:center; gap:0.5rem;">
                ${etud.nom.toUpperCase()} ${etud.prenom}
                <span class="badge ${statutBadgeClass}">${delib.statut}</span>
              </h3>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;">
                N° Inscription : <strong style="color:white;">${etud.numeroEtudiant || 'ETU-N/A'}</strong> • Promotion : <strong style="color:white;">${etud.classe}</strong> • Email : ${etud.email}
              </div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="ouvrirBulletinModal('${etud.id}')">
              🖨️ Relevé Officiel
            </button>
            <button class="btn btn-primary btn-sm" onclick="sauvegarderGrilleNotes()">
              💾 Enregistrer les Notes
            </button>
          </div>
        </div>

        <!-- Barre de Bascule Période / Semestre pour la feuille de notes -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.75rem; background:rgba(255,255,255,0.02); padding:0.6rem 1rem; border-radius:var(--radius-sm); border:1px solid var(--border-card);">
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Vue Période :</span>
            <button id="btn-grille-view-annuel" class="btn ${state.grilleSemestreVue === 'ANNUEL' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filtrerGrilleSemestre('ANNUEL')">
              ⭐ Année Complète (S1 + S2)
            </button>
            <button id="btn-grille-view-s1" class="btn ${state.grilleSemestreVue === 'S1' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filtrerGrilleSemestre('S1')">
              📅 Semestre 1 Seul
            </button>
            <button id="btn-grille-view-s2" class="btn ${state.grilleSemestreVue === 'S2' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filtrerGrilleSemestre('S2')">
              📅 Semestre 2 Seul
            </button>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted);">
            ⚠️ Règle stricte : Toute absence, fraude (8ach) ou matière non saisie compte pour 0/20.
          </div>
        </div>
    `;

    // -------------------------------------------------------------
    // CAS 1 : ENSEIGNANT (Seulement ses matières pour saisir ou modifier)
    // -------------------------------------------------------------
    if (isEnseignant) {
      const teacherMatieres = getTeacherMatieresList(user);
      const teacherMatIds = new Set(teacherMatieres.map(m => m.id));
      const myMatieres = delib.detailsMatieres.filter(m => teacherMatIds.has(m.matiereId || m.id));

      if (myMatieres.length === 0) {
        html += `
          <div style="background:rgba(245, 158, 11, 0.08); border:1px solid rgba(245, 158, 11, 0.25); border-radius:var(--radius-md); padding:1.5rem; text-align:center; color:#fbbf24;">
            <div style="font-size:1.8rem; margin-bottom:0.5rem;">ℹ️</div>
            <h4 style="color:white; margin-bottom:0.25rem;">Aucune matière assignée</h4>
            <p style="font-size:0.85rem; margin:0;">
              Vous n'avez pas de matière sous votre responsabilité dans la promotion <strong>${etud.classe}</strong> pour cet étudiant.
            </p>
          </div>
        </div>`;
        container.innerHTML = html;
        return;
      }

      const myS1 = myMatieres.filter(m => Number(m.semestre) === 1);
      const myS2 = myMatieres.filter(m => Number(m.semestre) === 2);

      html += `
        <div style="margin-bottom:1rem; padding:0.65rem 1rem; background:rgba(2, 132, 199, 0.1); border-left:4px solid var(--primary); border-radius:var(--radius-sm); font-size:0.82rem; color:var(--text-main); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div>
            👨‍🏫 <strong>Espace Enseignant (${user.nom})</strong> : Vous visualisez et saisissez <strong>uniquement vos cours assignés</strong> (${myMatieres.length} matière(s) au total).
          </div>
          <div style="color:var(--text-muted); font-size:0.75rem;">
            Règle : Absence ou fraude = 0/20
          </div>
        </div>
      `;

      if (myS1.length > 0) {
        html += `
          <div id="grille-semester-1-block" class="semester-block" style="display:${state.grilleSemestreVue === 'S2' ? 'none' : 'block'}; margin-bottom:1rem;">
            <div class="semester-header">
              <div class="semester-title">
                <span>📅</span>
                <span>SEMESTRE 1 - VOS COURS</span>
                <span class="badge badge-code" style="font-size:0.7rem;">${myS1.length} Matière(s)</span>
              </div>
            </div>
            <div class="table-responsive">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th style="min-width:230px;">Matière Enseignée</th>
                    <th style="width:70px; text-align:center;">Coef.</th>
                    <th style="width:80px; text-align:center;">Crédits</th>
                    <th style="width:145px; text-align:center;">DS (20%)</th>
                    <th style="width:145px; text-align:center;">Examen (70/80%)</th>
                    <th style="width:145px; text-align:center;">TP (10%)</th>
                    <th style="width:110px; text-align:center;">Moyenne</th>
                    <th style="width:120px; text-align:center;">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  ${genererLignesTableauGrille(myS1, true)}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      if (myS2.length > 0) {
        html += `
          <div id="grille-semester-2-block" class="semester-block" style="display:${state.grilleSemestreVue === 'S1' ? 'none' : 'block'}; margin-bottom:1rem;">
            <div class="semester-header">
              <div class="semester-title">
                <span>📅</span>
                <span>SEMESTRE 2 - VOS COURS</span>
                <span class="badge badge-code" style="font-size:0.7rem;">${myS2.length} Matière(s)</span>
              </div>
            </div>
            <div class="table-responsive">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th style="min-width:230px;">Matière Enseignée</th>
                    <th style="width:70px; text-align:center;">Coef.</th>
                    <th style="width:80px; text-align:center;">Crédits</th>
                    <th style="width:145px; text-align:center;">DS (20%)</th>
                    <th style="width:145px; text-align:center;">Examen (70/80%)</th>
                    <th style="width:145px; text-align:center;">TP (10%)</th>
                    <th style="width:110px; text-align:center;">Moyenne</th>
                    <th style="width:120px; text-align:center;">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  ${genererLignesTableauGrille(myS2, true)}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      html += `
        <div id="grille-annuel-block" class="grid-live-footer" style="margin-top:1.5rem; display:${state.grilleSemestreVue === 'ANNUEL' ? 'flex' : 'none'};">
          <div style="font-size:0.82rem; color:var(--text-muted);">
            💡 Cliquez sur <strong style="color:#fbbf24;">ABS</strong> (Absent) ou <strong style="color:#f87171;">8ACH</strong> (Fraude) pour attribuer automatiquement 0/20.
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <button class="btn btn-secondary" onclick="chargerGrilleNotesEtudiant('${etud.id}')">
              🔄 Réinitialiser
            </button>
            <button class="btn btn-primary" onclick="sauvegarderGrilleNotes()">
              💾 Enregistrer les Notes
            </button>
          </div>
        </div>
      </div>
      `;
    }

    // -------------------------------------------------------------
    // CAS 2 : ADMIN (Toutes les matières scindées en Semestre 1 et Semestre 2)
    // -------------------------------------------------------------
    else {
      // Séparer les matières selon le Semestre 1 et le Semestre 2
      let matieresS1 = delib.detailsMatieres.filter(m => Number(m.semestre) === 1);
      let matieresS2 = delib.detailsMatieres.filter(m => Number(m.semestre) === 2);

      // Si aucune distinction préalable, scinder équitablement
      if (matieresS2.length === 0 && delib.detailsMatieres.length > 1) {
        const half = Math.ceil(delib.detailsMatieres.length / 2);
        matieresS1 = delib.detailsMatieres.slice(0, half);
        matieresS2 = delib.detailsMatieres.slice(half);
      }

      const s1Moy = delib.semestre1?.moyenne ?? (matieresS1.length ? (matieresS1.reduce((acc, m) => acc + (m.moyenne * m.coefficient), 0) / matieresS1.reduce((acc, m) => acc + m.coefficient, 0)) : 0);
      const s1Creds = delib.semestre1?.creditsValides ?? matieresS1.filter(m => m.estValidee).reduce((acc, m) => acc + m.credits, 0);
      const s1CredsTot = delib.semestre1?.creditsTotaux ?? matieresS1.reduce((acc, m) => acc + m.credits, 0);

      const s2Moy = delib.semestre2?.moyenne ?? (matieresS2.length ? (matieresS2.reduce((acc, m) => acc + (m.moyenne * m.coefficient), 0) / matieresS2.reduce((acc, m) => acc + m.coefficient, 0)) : 0);
      const s2Creds = delib.semestre2?.creditsValides ?? matieresS2.filter(m => m.estValidee).reduce((acc, m) => acc + m.credits, 0);
      const s2CredsTot = delib.semestre2?.creditsTotaux ?? matieresS2.reduce((acc, m) => acc + m.credits, 0);

      html += `
        <div style="margin-bottom:1.25rem; padding:0.65rem 1rem; background:rgba(255, 255, 255, 0.02); border:1px solid var(--border-card); border-radius:var(--radius-sm); font-size:0.82rem; color:var(--text-main); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div>
            🏛️ <strong>Administration Scolarité</strong> : Vue complète du dossier académique scindé en <strong>Semestre 1 & Semestre 2</strong>.
          </div>
          <div style="color:var(--text-muted); font-size:0.75rem;">
            ⚠️ Règle stricte : Toute matière non saisie, étudiant absent ou tricherie (8ach) est comptée à 0/20.
          </div>
        </div>

        <!-- ==================== BLOC SEMESTRE 1 ==================== -->
        <div id="grille-semester-1-block" class="semester-block" style="display:${state.grilleSemestreVue === 'S2' ? 'none' : 'block'};">
          <div class="semester-header">
            <div class="semester-title">
              <span>📅</span>
              <span>SEMESTRE 1</span>
              <span class="badge badge-code" style="font-size:0.7rem;">${matieresS1.length} Matière(s)</span>
            </div>
            <div style="display:flex; gap:1rem; align-items:center; font-size:0.83rem;">
              <div>Moyenne S1 : <strong id="live-s1-gpa" style="color:#38bdf8; font-family:var(--font-mono); font-size:0.95rem;">${s1Moy.toFixed(2)} / 20</strong></div>
              <div>Crédits S1 : <strong id="live-s1-creds" style="color:white; font-family:var(--font-mono);">${s1Creds} / ${s1CredsTot} ECTS</strong></div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table-custom">
              <thead>
                <tr>
                  <th style="min-width:230px;">Matières Semestre 1</th>
                  <th style="width:70px; text-align:center;">Coef.</th>
                  <th style="width:80px; text-align:center;">Crédits</th>
                  <th style="width:145px; text-align:center;">DS (20%)</th>
                  <th style="width:145px; text-align:center;">Examen (70/80%)</th>
                  <th style="width:145px; text-align:center;">TP (10%)</th>
                  <th style="width:110px; text-align:center;">Moyenne</th>
                  <th style="width:120px; text-align:center;">Statut</th>
                </tr>
              </thead>
              <tbody>
                ${matieresS1.length ? genererLignesTableauGrille(matieresS1, false) : `<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Aucune matière configurée pour le Semestre 1</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <!-- ==================== BLOC SEMESTRE 2 ==================== -->
        <div id="grille-semester-2-block" class="semester-block" style="display:${state.grilleSemestreVue === 'S1' ? 'none' : 'block'};">
          <div class="semester-header">
            <div class="semester-title">
              <span>📅</span>
              <span>SEMESTRE 2</span>
              <span class="badge badge-code" style="font-size:0.7rem;">${matieresS2.length} Matière(s)</span>
            </div>
            <div style="display:flex; gap:1rem; align-items:center; font-size:0.83rem;">
              <div>Moyenne S2 : <strong id="live-s2-gpa" style="color:#38bdf8; font-family:var(--font-mono); font-size:0.95rem;">${s2Moy.toFixed(2)} / 20</strong></div>
              <div>Crédits S2 : <strong id="live-s2-creds" style="color:white; font-family:var(--font-mono);">${s2Creds} / ${s2CredsTot} ECTS</strong></div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table-custom">
              <thead>
                <tr>
                  <th style="min-width:230px;">Matières Semestre 2</th>
                  <th style="width:70px; text-align:center;">Coef.</th>
                  <th style="width:80px; text-align:center;">Crédits</th>
                  <th style="width:145px; text-align:center;">DS (20%)</th>
                  <th style="width:145px; text-align:center;">Examen (70/80%)</th>
                  <th style="width:145px; text-align:center;">TP (10%)</th>
                  <th style="width:110px; text-align:center;">Moyenne</th>
                  <th style="width:120px; text-align:center;">Statut</th>
                </tr>
              </thead>
              <tbody>
                ${matieresS2.length ? genererLignesTableauGrille(matieresS2, false) : `<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Aucune matière configurée pour le Semestre 2</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Synthèse Annuelle Globale -->
        <div id="grille-annuel-block" class="grid-live-footer" style="margin-top:1.5rem; background:rgba(255,255,255,0.03); border:1px solid var(--border-card); border-radius:var(--radius-md); padding:1.25rem 1.5rem; display:${state.grilleSemestreVue === 'ANNUEL' ? 'flex' : 'none'};">
          <div style="display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap;">
            <div>
              <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:0.05em;">Moyenne Générale Annuelle</div>
              <div id="grid-live-gpa" class="grade-pill ${delib.moyenneGenerale >= 10.0 ? 'valide' : 'non-valide'}" style="font-size:1.35rem; padding:0.25rem 0.85rem; font-weight:800; margin-top:0.25rem;">
                ${delib.moyenneGenerale.toFixed(2)} / 20
              </div>
            </div>

            <div>
              <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:0.05em;">Crédits ECTS Validés (S1 + S2)</div>
              <div id="grid-live-credits" style="font-size:1.15rem; font-weight:800; color:white; margin-top:0.35rem;">
                ${delib.creditsValides} / ${delib.creditsTotaux} ECTS
              </div>
            </div>

            <div>
              <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:0.05em;">Mention & Statut Jury</div>
              <div style="margin-top:0.35rem; display:flex; gap:0.4rem; align-items:center;">
                <span id="grid-live-mention" class="badge badge-gray">${delib.mention}</span>
                <span id="grid-live-statut" class="badge ${statutBadgeClass}">${delib.statut}</span>
              </div>
            </div>
          </div>

          <div style="display:flex; gap:0.5rem; align-items:center;">
            <button class="btn btn-secondary" onclick="chargerGrilleNotesEtudiant('${etud.id}')">
              🔄 Réinitialiser
            </button>
            <button id="btn-save-grille" class="btn btn-primary" onclick="sauvegarderGrilleNotes()">
              💾 Enregistrer la Grille des Notes
            </button>
          </div>
        </div>
      </div>
      `;
    }

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger); padding:2rem; text-align:center;">Erreur lors du chargement de la grille : ${err.message}</div>`;
  }
}

// ------------------------------------------------------------
// CALCUL INSTANTANÉ SUR LA LIGNE & SYNTHÈSE LIVE
// Toute absence, fraude ou note manquante compte pour 0
// ------------------------------------------------------------
function calculerLigneGrille(inputElement) {
  const row = inputElement.closest('tr.grille-row');
  if (!row) return;

  const matId = row.dataset.matiereId;
  const hasTp = row.dataset.hastp === 'true';

  const dsInput = row.querySelector('input[data-type="DS"]');
  const examInput = row.querySelector('input[data-type="EXAMEN"]');
  const tpInput = row.querySelector('input[data-type="TP"]');

  // Si statut ABSENT ou FRAUDE ou vide => évalué à 0
  const getEffVal = (inp) => {
    if (!inp) return 0;
    if (inp.dataset.statut === 'ABSENT' || inp.dataset.statut === 'FRAUDE') return 0;
    const v = Number(inp.value);
    return isNaN(v) || inp.value === '' ? 0 : Math.max(0, Math.min(20, v));
  };

  const dsVal = getEffVal(dsInput);
  const examVal = getEffVal(examInput);
  const tpVal = getEffVal(tpInput);

  let moy = 0;
  if (hasTp) {
    // 70% Exam + 20% DS + 10% TP
    moy = (examVal * 0.70) + (dsVal * 0.20) + (tpVal * 0.10);
  } else {
    // 80% Exam + 20% DS
    moy = (examVal * 0.80) + (dsVal * 0.20);
  }

  const moyElem = row.querySelector(`.live-moy-val[data-row-mat="${matId}"]`);
  const statusElem = row.querySelector(`.live-status-val[data-row-mat="${matId}"]`);

  const isValide = moy >= 10.0;
  if (moyElem) {
    moyElem.textContent = `${moy.toFixed(2)} / 20`;
    moyElem.style.color = isValide ? '#38bdf8' : '#f87171';
  }
  if (statusElem) {
    statusElem.className = `badge ${isValide ? 'badge-admis' : 'badge-ajourne'} live-status-val`;
    statusElem.textContent = isValide ? 'Validée' : 'Non acquise';
  }
  row.dataset.currentMoyenne = moy;

  // Recalculer les synthèses S1, S2 et annuelle globale
  recalculerSyntheseLiveGrille();
}

function recalculerSyntheseLiveGrille() {
  const rows = document.querySelectorAll('#table-grille-notes tr.grille-row');
  if (rows.length === 0) return;

  let sommeNotesPonderees = 0;
  let sommeCoefficients = 0;
  let totalCreditsValides = 0;
  let totalCredits = 0;

  // Synthèses Semestre 1 et 2
  let s1Sum = 0, s1Coef = 0, s1CredsVal = 0, s1CredsTot = 0;
  let s2Sum = 0, s2Coef = 0, s2CredsVal = 0, s2CredsTot = 0;

  rows.forEach(r => {
    const coef = Number(r.dataset.coef) || 1;
    const cred = Number(r.dataset.credits) || 0;
    const sem = Number(r.dataset.semestre) || 1;
    totalCredits += cred;

    const moyVal = Number(r.dataset.currentMoyenne || 0);
    const prod = moyVal * coef;
    sommeNotesPonderees += prod;
    sommeCoefficients += coef;
    if (moyVal >= 10.0) {
      totalCreditsValides += cred;
    }

    if (sem === 1) {
      s1Sum += prod;
      s1Coef += coef;
      s1CredsTot += cred;
      if (moyVal >= 10.0) s1CredsVal += cred;
    } else {
      s2Sum += prod;
      s2Coef += coef;
      s2CredsTot += cred;
      if (moyVal >= 10.0) s2CredsVal += cred;
    }
  });

  const gpa = sommeCoefficients > 0 ? (sommeNotesPonderees / sommeCoefficients) : 0;
  const s1Gpa = s1Coef > 0 ? (s1Sum / s1Coef) : 0;
  const s2Gpa = s2Coef > 0 ? (s2Sum / s2Coef) : 0;

  // Mise à jour S1 & S2 dans l'interface Admin
  const liveS1Gpa = document.getElementById('live-s1-gpa');
  const liveS1Creds = document.getElementById('live-s1-creds');
  if (liveS1Gpa) liveS1Gpa.textContent = `${s1Gpa.toFixed(2)} / 20`;
  if (liveS1Creds) liveS1Creds.textContent = `${s1CredsVal} / ${s1CredsTot} ECTS`;

  const liveS2Gpa = document.getElementById('live-s2-gpa');
  const liveS2Creds = document.getElementById('live-s2-creds');
  if (liveS2Gpa) liveS2Gpa.textContent = `${s2Gpa.toFixed(2)} / 20`;
  if (liveS2Creds) liveS2Creds.textContent = `${s2CredsVal} / ${s2CredsTot} ECTS`;

  // Calcul Mention
  let mention = 'Ajourné';
  if (gpa >= 16.0) mention = 'Très Bien';
  else if (gpa >= 14.0) mention = 'Bien';
  else if (gpa >= 12.0) mention = 'Assez Bien';
  else if (gpa >= 10.0) mention = 'Passable';

  // Calcul Statut LMD
  let statut = 'Ajourné';
  let badgeClass = 'badge-ajourne';
  const seuilCreditsRachat = totalCredits >= 60 ? 45 : Math.round(totalCredits * 0.75);

  if (gpa >= 10.0) {
    statut = 'Admis';
    badgeClass = 'badge-admis';
  } else if (gpa >= 9.0 && totalCreditsValides >= seuilCreditsRachat) {
    statut = 'Admis par Rachat';
    badgeClass = 'badge-rachat';
  }

  const liveGpa = document.getElementById('grid-live-gpa');
  const liveCredits = document.getElementById('grid-live-credits');
  const liveMention = document.getElementById('grid-live-mention');
  const liveStatut = document.getElementById('grid-live-statut');

  if (liveGpa) {
    liveGpa.textContent = `${gpa.toFixed(2)} / 20`;
    liveGpa.className = `grade-pill ${gpa >= 10.0 ? 'valide' : 'non-valide'}`;
  }
  if (liveCredits) {
    liveCredits.textContent = `${totalCreditsValides} / ${totalCredits} ECTS`;
  }
  if (liveMention) {
    liveMention.textContent = mention;
  }
  if (liveStatut) {
    liveStatut.textContent = statut;
    liveStatut.className = `badge ${badgeClass}`;
  }
}

// ------------------------------------------------------------
// ENREGISTREMENT EN BLOC DE LA GRILLE (POST /api/v1/notes/grille)
// ------------------------------------------------------------
async function sauvegarderGrilleNotes() {
  const studentId = state.selectedGrilleStudentId;
  if (!studentId) {
    showToast("Aucun étudiant sélectionné", "error");
    return;
  }

  const inputs = document.querySelectorAll('#table-grille-notes .grille-input');
  const notesPayload = [];

  for (const input of inputs) {
    const valStr = input.value.trim();
    const matiereId = input.dataset.matiere;
    const type = input.dataset.type;
    const statut = input.dataset.statut || 'PRESENT';

    if (valStr === '' && statut !== 'ABSENT' && statut !== 'FRAUDE') {
      notesPayload.push({ matiereId, type, valeur: null });
    } else {
      let num = Number(valStr);
      if (statut === 'ABSENT' || statut === 'FRAUDE') {
        num = 0;
      } else if (isNaN(num) || num < 0 || num > 20) {
        showToast(`La note de ${type} (${valStr}) n'est pas valide. Elle doit être comprise entre 0 et 20.`, "error");
        input.focus();
        input.style.borderColor = 'var(--danger)';
        return;
      }
      input.style.borderColor = '';
      notesPayload.push({ matiereId, type, valeur: num, statut });
    }
  }

  const saveBtn = document.getElementById('btn-save-grille');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Enregistrement en cours...';
  }

  try {
    const res = await apiFetch('/notes/grille', {
      method: 'POST',
      body: JSON.stringify({ etudiantId: studentId, notes: notesPayload })
    });

    if (res.success) {
      showToast('Grille des notes enregistrée et moyenne mise à jour avec succès !', 'success');
      await refreshDonnees();
      chargerGrilleNotesEtudiant(studentId);
    } else {
      showToast(res.error || 'Erreur lors de l\'enregistrement', 'error');
    }
  } catch (err) {
    showToast('Erreur serveur lors de la sauvegarde : ' + err.message, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Enregistrer la Grille des Notes';
    }
  }
}

// ------------------------------------------------------------
// VUE JOURNAL DÉTAILLÉ (AVEC FILTRES CROISÉS & SEMESTRE)
// ------------------------------------------------------------
function appliquerFiltresNotes() {
  const classeSelect = document.getElementById('notes-filter-classe');
  const matiereSelect = document.getElementById('notes-filter-matiere');
  const typeSelect = document.getElementById('notes-filter-type');
  const semestreSelect = document.getElementById('notes-filter-semestre');
  const searchInput = document.getElementById('notes-filter-search');

  state.notesFilters.classe = classeSelect ? classeSelect.value : '';
  state.notesFilters.matiere = matiereSelect ? matiereSelect.value : '';
  state.notesFilters.type = typeSelect ? typeSelect.value : '';
  state.notesFilters.semestre = semestreSelect ? semestreSelect.value : '';
  state.notesFilters.search = searchInput ? searchInput.value.trim() : '';

  majSelecteursFiltresNotes(false);

  if (state.notesMode === 'journal') {
    renderJournalNotes();
  } else if (state.notesMode === 'grille') {
    renderGrilleSelectorAndActiveStudent();
  }
}

function reinitialiserFiltresNotes() {
  state.notesFilters = { classe: '', matiere: '', type: '', semestre: '', search: '' };
  const classeSelect = document.getElementById('notes-filter-classe');
  const matiereSelect = document.getElementById('notes-filter-matiere');
  const typeSelect = document.getElementById('notes-filter-type');
  const semestreSelect = document.getElementById('notes-filter-semestre');
  const searchInput = document.getElementById('notes-filter-search');

  if (classeSelect) classeSelect.value = '';
  if (matiereSelect) matiereSelect.value = '';
  if (typeSelect) typeSelect.value = '';
  if (semestreSelect) semestreSelect.value = '';
  if (searchInput) searchInput.value = '';

  majSelecteursFiltresNotes(true);

  if (state.notesMode === 'journal') {
    renderJournalNotes();
  } else if (state.notesMode === 'grille') {
    renderGrilleSelectorAndActiveStudent();
  }
}

function majSelecteursFiltresNotes(resetValues = false) {
  const user = state.currentUser;
  const isEnseignant = user && user.role === 'ENSEIGNANT';
  const classeSelect = document.getElementById('notes-filter-classe');
  const matiereSelect = document.getElementById('notes-filter-matiere');

  let matieresList = isEnseignant ? getTeacherMatieresList(user) : state.matieres;

  if (state.notesFilters.classe) {
    matieresList = matieresList.filter(m => m.classe === state.notesFilters.classe);
  }
  if (state.notesFilters.semestre) {
    matieresList = matieresList.filter(m => String(m.semestre) === String(state.notesFilters.semestre));
  }

  if (matiereSelect) {
    const currentMatVal = resetValues ? '' : matiereSelect.value;
    matiereSelect.innerHTML = `<option value="">Toutes les matières (${matieresList.length})</option>` +
      matieresList.map(m => `<option value="${m.id}" ${m.id === currentMatVal ? 'selected' : ''}>${m.code} - ${m.intitule} (${m.classe || 'N/A'} - S${m.semestre || 1})</option>`).join('');
  }

  if (classeSelect && isEnseignant) {
    const teacherClasses = Array.from(new Set(getTeacherMatieresList(user).map(m => m.classe).filter(Boolean)));
    const currentClassVal = resetValues ? '' : classeSelect.value;
    classeSelect.innerHTML = `<option value="">Toutes vos classes (${teacherClasses.length})</option>` +
      teacherClasses.map(c => `<option value="${c}" ${c === currentClassVal ? 'selected' : ''}>${c}</option>`).join('');
  }
}

function renderJournalNotes() {
  const tbody = document.getElementById('notes-table-body');
  if (!tbody) return;

  const user = state.currentUser;
  const isEnseignant = user && user.role === 'ENSEIGNANT';
  let filtered = [...state.notes].reverse();

  // Si Enseignant : Uniquement les notes de ses cours assignés
  if (isEnseignant) {
    const teacherMatieres = getTeacherMatieresList(user);
    const teacherMatIds = new Set(teacherMatieres.map(m => m.id));
    filtered = filtered.filter(n => teacherMatIds.has(n.matiereId));
  }

  // 1. Filtre par Classe
  if (state.notesFilters.classe) {
    filtered = filtered.filter(n => {
      const etud = state.etudiants.find(e => e.id === n.etudiantId);
      return etud && etud.classe === state.notesFilters.classe;
    });
  }

  // 2. Filtre par Matière
  if (state.notesFilters.matiere) {
    filtered = filtered.filter(n => n.matiereId === state.notesFilters.matiere);
  }

  // 3. Filtre par Semestre (S1 / S2)
  if (state.notesFilters.semestre) {
    filtered = filtered.filter(n => {
      const mat = state.matieres.find(m => m.id === n.matiereId);
      return mat && String(mat.semestre) === String(state.notesFilters.semestre);
    });
  }

  // 4. Filtre par Type d'Épreuve
  if (state.notesFilters.type) {
    filtered = filtered.filter(n => n.type === state.notesFilters.type);
  }

  // 4. Filtre par Recherche Étudiant
  if (state.notesFilters.search) {
    const q = state.notesFilters.search.toLowerCase();
    filtered = filtered.filter(n => {
      const etud = state.etudiants.find(e => e.id === n.etudiantId);
      if (!etud) return false;
      return (
        etud.nom.toLowerCase().includes(q) ||
        etud.prenom.toLowerCase().includes(q) ||
        (etud.numeroEtudiant && etud.numeroEtudiant.toLowerCase().includes(q))
      );
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2.5rem; color: var(--text-dim);">Aucune note ne correspond aux critères de filtre sélectionnés.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(n => {
    const etud = state.etudiants.find(e => e.id === n.etudiantId);
    const mat = state.matieres.find(m => m.id === n.matiereId);
    const noteVal = Number(n.valeur);
    const isValide = noteVal >= 10.0;

    return `
      <tr>
        <td>
          <strong>${etud ? `${etud.nom.toUpperCase()} ${etud.prenom}` : 'Inconnu'}</strong>
          <small style="display:block; color:var(--text-dim);">${etud ? etud.numeroEtudiant || '' : ''}</small>
        </td>
        <td><span class="badge badge-gray">${etud ? etud.classe : '-'}</span></td>
        <td>
          <span class="badge badge-code">${mat ? mat.code : '-'}</span> 
          <small>${mat ? mat.intitule : ''}</small>
          <span class="badge badge-gray" style="font-size:0.68rem; margin-left:0.3rem;">S${mat ? mat.semestre || 1 : 1}</span>
        </td>
        <td><span class="badge badge-gray">${n.type}</span></td>
        <td>
          <span class="grade-pill ${isValide ? 'valide' : 'non-valide'}">${noteVal.toFixed(2)}/20</span>
        </td>
        <td><span style="font-size:0.75rem; color:var(--text-dim);">${n.dateCreation || '-'}</span></td>
        <td>
          <div style="display:flex; gap:0.35rem;">
            <button class="btn btn-secondary btn-sm" onclick="ouvrirModifierNoteModal('${n.id}', ${noteVal})">
              Rectifier
            </button>
            <button class="btn btn-danger btn-sm" onclick="supprimerNote('${n.id}')">
              ✕
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ------------------------------------------------------------
// F. PROCÈS-VERBAL & DÉLIBÉRATIONS LMD (MULTI-CYCLES, NIVEAUX & PERIODES)
// ------------------------------------------------------------
let globalDeliberationsCache = [];

async function renderDeliberationsTab() {
  const container = document.getElementById('deliberations-container');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center; padding:3rem; color:var(--primary);">
      <div style="font-size:1.8rem; margin-bottom:0.6rem;">⏳</div>
      <div>Calcul et délibération du procès-verbal officiel en cours...</div>
    </div>
  `;

  try {
    let deliberations = [];

    // 1. Essai de l'endpoint global
    try {
      const res = await apiFetch('/deliberations?classe=ALL');
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        deliberations = res.data;
      }
    } catch (e) { /* ignore fallback */ }

    // 2. Si non disponible (ex: serveur en attente de redémarrage), essayer /deliberations/classe/ALL
    if (deliberations.length === 0) {
      try {
        const res2 = await apiFetch('/deliberations/classe/ALL');
        if (res2 && res2.success && Array.isArray(res2.data) && res2.data.length > 0) {
          deliberations = res2.data;
        }
      } catch (e) { /* ignore fallback */ }
    }

    // 3. Fallback par classes officielles
    if (deliberations.length === 0) {
      const allClasses = ['L1-INFO', 'L2-INFO', 'L3-INFO', 'ING1-INFO', 'ING2-GL', 'M1-GL', 'M1-SPI'];
      const responses = await Promise.all(
        allClasses.map(cls => apiFetch(`/deliberations/classe/${encodeURIComponent(cls)}`).catch(() => null))
      );
      for (const r of responses) {
        if (r && r.success && Array.isArray(r.data)) {
          deliberations.push(...r.data);
        }
      }
    }

    // 4. Si encore vide, fallback par étudiant individuel
    if (deliberations.length === 0 && state.etudiants && state.etudiants.length > 0) {
      const activeStudents = state.etudiants.filter(e => e.isActive !== false);
      const studentDelibs = await Promise.all(
        activeStudents.map(e => apiFetch(`/deliberations/etudiant/${e.id}`).catch(() => null))
      );
      for (const sr of studentDelibs) {
        if (sr && sr.success && sr.data) {
          deliberations.push(sr.data);
        }
      }
    }

    if (deliberations.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted);">Aucune donnée de délibération trouvée pour l'établissement.</div>`;
      return;
    }

    globalDeliberationsCache = deliberations;
    renderDeliberationsContent();
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger); padding:2rem; text-align:center;">Erreur serveur : ${err.message}</div>`;
  }
}

function renderDeliberationsContent() {
  const container = document.getElementById('deliberations-container');
  if (!container) return;

  const filters = state.delibFilters;

  // Filtrage selon Cycle, Niveau, Section, Classe et Recherche
  let list = [...globalDeliberationsCache];

  // 1. Filtre par Cycle
  if (filters.cycle === 'LICENCE') {
    list = list.filter(d => (d.etudiant.classe || '').startsWith('L'));
  } else if (filters.cycle === 'INGENIEUR') {
    list = list.filter(d => (d.etudiant.classe || '').startsWith('ING'));
  } else if (filters.cycle === 'MASTER') {
    list = list.filter(d => (d.etudiant.classe || '').startsWith('M'));
  }

  // 2. Filtre par Niveau
  if (filters.niveau && filters.niveau !== 'ALL') {
    list = list.filter(d => (d.etudiant.classe || '').startsWith(filters.niveau));
  }

  // 3. Filtre par Section / Filière
  if (filters.section && filters.section !== 'ALL') {
    list = list.filter(d => (d.etudiant.classe || '').includes(filters.section));
  }

  // 4. Filtre par Classe Spécifique
  if (filters.classe && filters.classe !== 'ALL') {
    list = list.filter(d => d.etudiant.classe === filters.classe);
  }

  // 5. Filtre Recherche Textuelle
  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(d =>
      (d.etudiant.nom && d.etudiant.nom.toLowerCase().includes(q)) ||
      (d.etudiant.prenom && d.etudiant.prenom.toLowerCase().includes(q)) ||
      (d.etudiant.numeroEtudiant && d.etudiant.numeroEtudiant.toLowerCase().includes(q)) ||
      (d.etudiant.classe && d.etudiant.classe.toLowerCase().includes(q))
    );
  }

  // Tri selon la période sélectionnée
  if (filters.semestre === 'S1') {
    list.sort((a, b) => (b.semestre1?.moyenne || 0) - (a.semestre1?.moyenne || 0));
  } else if (filters.semestre === 'S2') {
    list.sort((a, b) => (b.semestre2?.moyenne || 0) - (a.semestre2?.moyenne || 0));
  } else {
    list.sort((a, b) => b.moyenneGenerale - a.moyenneGenerale);
  }

  // Attribuer les rangs dans la liste filtrée
  list.forEach((d, i) => { d.displayRank = i + 1; });
  state.currentDeliberationsList = list;

  // Calculer indicateurs globaux sur cette sélection
  const totalEtud = list.length;
  const totalAdmis = list.filter(d => d.statut === 'Admis' || d.statut === 'Admis par Rachat').length;
  const tauxReussite = totalEtud > 0 ? Math.round((totalAdmis / totalEtud) * 100) : 0;
  const gpaMoy = totalEtud > 0 
    ? (list.reduce((acc, d) => acc + (filters.semestre === 'S1' ? (d.semestre1?.moyenne || 0) : (filters.semestre === 'S2' ? (d.semestre2?.moyenne || 0) : d.moyenneGenerale)), 0) / totalEtud).toFixed(2)
    : '0.00';

  // Construction de l'interface
  let html = `
    <!-- EN-TÊTE PRINCIPAL DU PROCÈS-VERBAL -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:1rem; padding-bottom:1rem; border-bottom:1px solid var(--border-card);">
      <div>
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <h2 style="font-size:1.25rem; color:white; margin:0;">🏆 Procès-Verbal Officiel des Délibérations</h2>
          <span class="badge badge-admis">${totalEtud} Étudiant(s)</span>
        </div>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">
          My University • Délibérations LMD par Cycle, Niveau, Section et Semestre (S1 / S2 / Annuel)
        </p>
      </div>

      <div style="display:flex; gap:0.5rem; align-items:center;">
        <button class="btn btn-secondary btn-sm" onclick="window.print()" title="Imprimer le PV officiel">
          🖨️ Imprimer
        </button>
        <button class="btn btn-primary btn-sm" onclick="telechargerExportCSV()" title="Télécharger le fichier CSV">
          📥 Exporter le PV (CSV)
        </button>
      </div>
    </div>

    <!-- BANDEAU DES MINI-STATISTIQUES DU PV SÉLECTIONNÉ -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.75rem; margin-bottom:1.25rem;">
      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-card); border-radius:var(--radius-sm); padding:0.75rem 1rem;">
        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Effectif Délibéré</div>
        <div style="font-size:1.25rem; font-weight:800; color:white; margin-top:0.2rem;">${totalEtud} <span style="font-size:0.8rem; font-weight:400; color:var(--text-dim);">étudiants</span></div>
      </div>
      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-card); border-radius:var(--radius-sm); padding:0.75rem 1rem;">
        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Taux de Réussite</div>
        <div style="font-size:1.25rem; font-weight:800; color:#34d399; margin-top:0.2rem;">${tauxReussite}% <span style="font-size:0.8rem; font-weight:400; color:var(--text-dim);">(${totalAdmis} admis)</span></div>
      </div>
      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-card); border-radius:var(--radius-sm); padding:0.75rem 1rem;">
        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Moyenne Sélection (${filters.semestre})</div>
        <div style="font-size:1.25rem; font-weight:800; color:#38bdf8; margin-top:0.2rem;">${gpaMoy} <span style="font-size:0.8rem; font-weight:400; color:var(--text-dim);">/ 20</span></div>
      </div>
      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-card); border-radius:var(--radius-sm); padding:0.75rem 1rem;">
        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Période Délibérée</div>
        <div style="font-size:1.05rem; font-weight:700; color:#fbbf24; margin-top:0.3rem;">
          ${filters.semestre === 'S1' ? '📅 Semestre 1' : (filters.semestre === 'S2' ? '📅 Semestre 2' : '🏆 Année Complète')}
        </div>
      </div>
    </div>

    <!-- BLOC DES FILTRES MULTI-NIVEAUX DEMANDÉS PAR L'UTILISATEUR -->
    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-card); border-radius:var(--radius-md); padding:1rem 1.25rem; margin-bottom:1.5rem;">
      
      <!-- 1. FILTRE CYCLE DE FORMATION (MASTER, INGENIEUR, LICENCE) -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
        <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; min-width:85px;">1. Cycle :</span>
          <button class="btn ${filters.cycle === 'ALL' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setDelibCycle('ALL')">
            🏛️ Tous les Cycles
          </button>
          <button class="btn ${filters.cycle === 'MASTER' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setDelibCycle('MASTER')">
            🔬 Mastères (Pro & Recherche)
          </button>
          <button class="btn ${filters.cycle === 'INGENIEUR' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setDelibCycle('INGENIEUR')">
            ⚙️ Cycles d'Ingénieurs
          </button>
          <button class="btn ${filters.cycle === 'LICENCE' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setDelibCycle('LICENCE')">
            🎓 Licences LMD
          </button>
        </div>

        <!-- 3. BASCULE PÉRIODE (ANNUEL, S1, S2) -->
        <div style="display:flex; align-items:center; gap:0.4rem; background:rgba(0,0,0,0.3); padding:0.25rem 0.5rem; border-radius:var(--radius-sm); border:1px solid var(--border);">
          <span style="font-size:0.72rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; margin-right:0.3rem;">Période :</span>
          <button class="btn ${filters.semestre === 'ANNUEL' ? 'btn-primary' : 'btn-secondary'} btn-sm" style="padding:0.25rem 0.65rem; font-size:0.78rem;" onclick="setDelibSemestre('ANNUEL')">
            ⭐ Annuel (S1 + S2)
          </button>
          <button class="btn ${filters.semestre === 'S1' ? 'btn-primary' : 'btn-secondary'} btn-sm" style="padding:0.25rem 0.65rem; font-size:0.78rem;" onclick="setDelibSemestre('S1')">
            📅 S1 Seul
          </button>
          <button class="btn ${filters.semestre === 'S2' ? 'btn-primary' : 'btn-secondary'} btn-sm" style="padding:0.25rem 0.65rem; font-size:0.78rem;" onclick="setDelibSemestre('S2')">
            📅 S2 Seul
          </button>
        </div>
      </div>

      <!-- 2. FILTRE NIVEAU D'ÉTUDES (L1 SEPARÉ, L2, L3, ING1, ING2, M1) -->
      <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.85rem; padding-top:0.6rem; border-top:1px dashed var(--border);">
        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; min-width:85px;">2. Niveau :</span>
        <button class="btn ${filters.niveau === 'ALL' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setDelibNiveau('ALL')">Tous Niveaux</button>
        <button class="btn ${filters.niveau === 'L1' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setDelibNiveau('L1')" title="Licence 1">🎓 L1 (Licence 1)</button>
        <button class="btn ${filters.niveau === 'L2' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setDelibNiveau('L2')" title="Licence 2">L2</button>
        <button class="btn ${filters.niveau === 'L3' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setDelibNiveau('L3')" title="Licence 3">L3</button>
        <button class="btn ${filters.niveau === 'ING1' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setDelibNiveau('ING1')" title="Cycle Ingénieur 1">ING1</button>
        <button class="btn ${filters.niveau === 'ING2' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setDelibNiveau('ING2')" title="Cycle Ingénieur 2">ING2</button>
        <button class="btn ${filters.niveau === 'M1' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setDelibNiveau('M1')" title="Mastère 1">M1 (Mastère 1)</button>
      </div>

      <!-- 3. FILTRES DÉROULANTS : SECTION & PROMOTION SPÉCIFIQUE + RECHERCHE ÉTUDIANT -->
      <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; padding-top:0.6rem; border-top:1px dashed var(--border);">
        <div style="display:flex; align-items:center; gap:0.4rem;">
          <label style="font-size:0.78rem; color:var(--text-muted); font-weight:600;">Section / Filière :</label>
          <select id="delib-filter-section" class="filter-select" onchange="changerFiltreDelibSection(this.value)">
            <option value="ALL" ${filters.section === 'ALL' ? 'selected' : ''}>Toutes les sections</option>
            <option value="INFO" ${filters.section === 'INFO' ? 'selected' : ''}>INFO - Informatique</option>
            <option value="GL" ${filters.section === 'GL' ? 'selected' : ''}>GL - Génie Logiciel</option>
            <option value="SPI" ${filters.section === 'SPI' ? 'selected' : ''}>SPI - Systèmes Pervasifs & IoT</option>
          </select>
        </div>

        <div style="display:flex; align-items:center; gap:0.4rem;">
          <label style="font-size:0.78rem; color:var(--text-muted); font-weight:600;">Promotion :</label>
          <select id="delib-filter-classe" class="filter-select" onchange="changerFiltreDelibClasse(this.value)">
            <option value="ALL" ${filters.classe === 'ALL' ? 'selected' : ''}>Toutes les promotions</option>
            <option value="L1-INFO" ${filters.classe === 'L1-INFO' ? 'selected' : ''}>L1-INFO (Licence 1)</option>
            <option value="L2-INFO" ${filters.classe === 'L2-INFO' ? 'selected' : ''}>L2-INFO (Licence 2)</option>
            <option value="L3-INFO" ${filters.classe === 'L3-INFO' ? 'selected' : ''}>L3-INFO (Licence 3)</option>
            <option value="ING1-INFO" ${filters.classe === 'ING1-INFO' ? 'selected' : ''}>ING1-INFO (Ingénieur 1)</option>
            <option value="ING2-GL" ${filters.classe === 'ING2-GL' ? 'selected' : ''}>ING2-GL (Ingénieur 2)</option>
            <option value="M1-GL" ${filters.classe === 'M1-GL' ? 'selected' : ''}>M1-GL (Mastère Pro)</option>
            <option value="M1-SPI" ${filters.classe === 'M1-SPI' ? 'selected' : ''}>M1-SPI (Mastère Recherche)</option>
          </select>
        </div>

        <div style="flex:1; min-width:220px;">
          <input type="text" 
                 id="delib-filter-search" 
                 class="search-box" 
                 style="width:100%;" 
                 placeholder="🔍 Filtrer par nom, prénom ou N° d'inscription..." 
                 value="${filters.search}" 
                 oninput="rechercherDelibEtudiant(this.value)">
        </div>

        <button class="btn btn-secondary btn-sm" onclick="reinitialiserFiltresDelib()" title="Réinitialiser tous les filtres du PV">
          ↺ Réinitialiser
        </button>
      </div>

    </div>

    <!-- CONTENEUR DES RÉSULTATS PAR SECTION / FORMATION -->
    <div id="deliberations-tables-container">
      ${genererSectionsDeliberationHtml(list, filters)}
    </div>
  `;

  container.innerHTML = html;
}

function setDelibCycle(cycle) {
  state.delibFilters.cycle = cycle;
  state.delibFilters.niveau = 'ALL';
  renderDeliberationsContent();
}

function setDelibNiveau(niveau) {
  state.delibFilters.niveau = niveau;
  if (['L1', 'L2', 'L3'].includes(niveau)) state.delibFilters.cycle = 'LICENCE';
  else if (['ING1', 'ING2'].includes(niveau)) state.delibFilters.cycle = 'INGENIEUR';
  else if (['M1'].includes(niveau)) state.delibFilters.cycle = 'MASTER';
  renderDeliberationsContent();
}

function setDelibSemestre(semestre) {
  state.delibFilters.semestre = semestre;
  renderDeliberationsContent();
}

function changerFiltreDelibSection(section) {
  state.delibFilters.section = section;
  renderDeliberationsContent();
}

function changerFiltreDelibClasse(classe) {
  state.delibFilters.classe = classe;
  renderDeliberationsContent();
}

function rechercherDelibEtudiant(query) {
  state.delibFilters.search = query || '';
  renderDeliberationsContent();
}

function reinitialiserFiltresDelib() {
  state.delibFilters = {
    cycle: 'ALL',
    niveau: 'ALL',
    section: 'ALL',
    classe: 'ALL',
    semestre: 'ANNUEL',
    search: ''
  };
  renderDeliberationsContent();
}

/**
 * Génère les blocs de tableaux distincts :
 * - Mastères séparés
 * - L1 séparé
 * - Cycles d'Ingénieurs séparés
 * - Licences L2/L3 séparées
 */
function genererSectionsDeliberationHtml(deliberationsList, filters) {
  if (deliberationsList.length === 0) {
    return `
      <div style="text-align:center; padding:3rem; background:rgba(255,255,255,0.02); border-radius:var(--radius-md); border:1px solid var(--border-card);">
        <div style="font-size:2rem; margin-bottom:0.75rem;">🔍</div>
        <h3 style="color:white; font-size:1.1rem; margin-bottom:0.4rem;">Aucun étudiant trouvé</h3>
        <p style="color:var(--text-muted); font-size:0.85rem; max-width:450px; margin:0 auto 1.25rem;">
          Aucun dossier d'étudiant ne correspond à la combinaison de filtres sélectionnée (Cycle: ${filters.cycle}, Niveau: ${filters.niveau}, Période: ${filters.semestre}).
        </p>
        <button class="btn btn-secondary btn-sm" onclick="reinitialiserFiltresDelib()">
          Réinitialiser tous les filtres
        </button>
      </div>
    `;
  }

  // Découpage en catégories demandées
  const groupes = [];

  // 1. Catégorie Mastères
  const masters = deliberationsList.filter(d => (d.etudiant.classe || '').startsWith('M'));
  if (masters.length > 0 && (filters.cycle === 'ALL' || filters.cycle === 'MASTER')) {
    groupes.push({
      titre: '🔬 Mastères Professionnels & Recherche (My University)',
      description: 'Mastère Professionnel Génie Logiciel (M1-GL) & Mastère Recherche Systèmes Pervasifs & IoT (M1-SPI)',
      badgeClass: 'badge-code',
      items: masters
    });
  }

  // 2. Catégorie Ingénieurs
  const ingenieurs = deliberationsList.filter(d => (d.etudiant.classe || '').startsWith('ING'));
  if (ingenieurs.length > 0 && (filters.cycle === 'ALL' || filters.cycle === 'INGENIEUR')) {
    groupes.push({
      titre: '⚙️ Cycles d\'Ingénieurs (Diplôme National d\'Ingénieur)',
      description: 'Génie Logiciel & Informatique Industrielle (ING1-INFO, ING2-GL)',
      badgeClass: 'badge-admis',
      items: ingenieurs
    });
  }

  // 3. Catégorie Licence 1 (Explicitement isolée selon la demande du user)
  const l1List = deliberationsList.filter(d => (d.etudiant.classe || '').startsWith('L1'));
  if (l1List.length > 0 && (filters.cycle === 'ALL' || filters.cycle === 'LICENCE') && (filters.niveau === 'ALL' || filters.niveau === 'L1')) {
    groupes.push({
      titre: '🎓 Licence 1 Informatique (L1-INFO) - 1ère Année LMD',
      description: 'Formation fondamentale LMD - Semestre 1 & Semestre 2',
      badgeClass: 'badge-gray',
      items: l1List
    });
  }

  // 4. Catégorie Licences Supérieures (L2, L3)
  const licencesRest = deliberationsList.filter(d => (d.etudiant.classe || '').startsWith('L2') || (d.etudiant.classe || '').startsWith('L3'));
  if (licencesRest.length > 0 && (filters.cycle === 'ALL' || filters.cycle === 'LICENCE') && filters.niveau !== 'L1') {
    groupes.push({
      titre: '🎓 Licences LMD Supérieures (L2-INFO & L3-INFO)',
      description: 'Parcours Licence Informatique (Spécialités Génie Logiciel et Systèmes)',
      badgeClass: 'badge-gray',
      items: licencesRest
    });
  }

  // Si aucun groupe n'a matché (ex: filtre spécifique de classe unique)
  if (groupes.length === 0) {
    groupes.push({
      titre: `📋 Délibérations - Sélection Actuelle (${deliberationsList.length} étudiants)`,
      description: 'Résultats selon les critères de recherche appliqués',
      badgeClass: 'badge-admis',
      items: deliberationsList
    });
  }

  return groupes.map(grp => genererTableauGroupeHtml(grp, filters.semestre)).join('');
}

function genererTableauGroupeHtml(groupe, semestre) {
  let thColumns = '';
  if (semestre === 'S1') {
    thColumns = `
      <th style="width:75px; text-align:center;">Rang S1</th>
      <th style="width:130px;">N° Inscription</th>
      <th style="min-width:180px;">Nom & Prénom</th>
      <th style="width:100px; text-align:center;">Classe</th>
      <th style="width:140px; text-align:center;">Moyenne S1</th>
      <th style="width:140px; text-align:center;">Crédits S1</th>
      <th style="width:120px; text-align:center;">Statut S1</th>
      <th style="width:160px; text-align:center;">Actions</th>
    `;
  } else if (semestre === 'S2') {
    thColumns = `
      <th style="width:75px; text-align:center;">Rang S2</th>
      <th style="width:130px;">N° Inscription</th>
      <th style="min-width:180px;">Nom & Prénom</th>
      <th style="width:100px; text-align:center;">Classe</th>
      <th style="width:140px; text-align:center;">Moyenne S2</th>
      <th style="width:140px; text-align:center;">Crédits S2</th>
      <th style="width:120px; text-align:center;">Statut S2</th>
      <th style="width:160px; text-align:center;">Actions</th>
    `;
  } else {
    // Annuel
    thColumns = `
      <th style="width:75px; text-align:center;">Rang</th>
      <th style="width:125px;">N° Inscription</th>
      <th style="min-width:170px;">Nom & Prénom</th>
      <th style="width:95px; text-align:center;">Classe</th>
      <th style="width:115px; text-align:center;">Moyenne S1</th>
      <th style="width:115px; text-align:center;">Moyenne S2</th>
      <th style="width:130px; text-align:center;">Moy. Annuelle</th>
      <th style="width:130px; text-align:center;">Crédits ECTS</th>
      <th style="width:100px; text-align:center;">Mention</th>
      <th style="width:120px; text-align:center;">Décision Jury</th>
      <th style="width:160px; text-align:center;">Actions</th>
    `;
  }

  return `
    <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-card); border-radius:var(--radius-md); padding:1.25rem; margin-bottom:1.5rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid var(--border-card); flex-wrap:wrap; gap:0.5rem;">
        <div>
          <h3 style="color:white; font-size:1.05rem; margin:0; display:flex; align-items:center; gap:0.6rem;">
            <span>${groupe.titre}</span>
            <span class="badge ${groupe.badgeClass}">${groupe.items.length} Étudiants</span>
          </h3>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.25rem;">
            ${groupe.description}
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table-custom">
          <thead>
            <tr>${thColumns}</tr>
          </thead>
          <tbody>
            ${groupe.items.map((d, index) => genererLigneEtudiantDelibHtml(d, index + 1, semestre)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function genererLigneEtudiantDelibHtml(d, index, semestre) {
  const etud = d.etudiant;
  const s1Moy = (d.semestre1?.moyenne !== undefined && d.semestre1?.moyenne !== null) ? Number(d.semestre1.moyenne) : 0;
  const s1Creds = d.semestre1?.creditsValides || 0;
  const s1Tot = d.semestre1?.creditsTotaux || 30;

  const s2Moy = (d.semestre2?.moyenne !== undefined && d.semestre2?.moyenne !== null) ? Number(d.semestre2.moyenne) : 0;
  const s2Creds = d.semestre2?.creditsValides || 0;
  const s2Tot = d.semestre2?.creditsTotaux || 30;

  let medal = '';
  if (index === 1) medal = '🥇 ';
  else if (index === 2) medal = '🥈 ';
  else if (index === 3) medal = '🥉 ';

  // Actions communes
  const actionsHtml = `
    <div style="display:flex; gap:0.35rem; justify-content:center;">
      <button class="btn btn-secondary btn-sm" onclick="ouvrirBulletinModal('${etud.id}')" title="Consulter le relevé officiel">
        📄 Relevé
      </button>
      <button class="btn btn-primary btn-sm" onclick="ouvrirGrilleNotesDirect('${etud.id}')" title="Modifier ou saisir les notes de cet étudiant">
        📝 Notes
      </button>
    </div>
  `;

  // 1. Vue Semestre 1
  if (semestre === 'S1') {
    const isValideS1 = s1Moy >= 10.0;
    return `
      <tr>
        <td style="text-align:center;"><strong style="color:var(--primary);">${medal}#${index}</strong></td>
        <td><span class="badge badge-code">${etud.numeroEtudiant || 'ETU-N/A'}</span></td>
        <td><strong>${etud.nom.toUpperCase()}</strong> ${etud.prenom}</td>
        <td style="text-align:center;"><span class="badge badge-gray">${etud.classe}</span></td>
        <td style="text-align:center;">
          <span class="grade-pill ${isValideS1 ? 'valide' : 'non-valide'}">${s1Moy.toFixed(2)} / 20</span>
        </td>
        <td style="text-align:center;"><strong>${s1Creds}</strong> / ${s1Tot} ECTS</td>
        <td style="text-align:center;">
          <span class="badge ${isValideS1 ? 'badge-admis' : 'badge-ajourne'}">
            ${isValideS1 ? 'S1 Validé' : 'S1 Non Validé'}
          </span>
        </td>
        <td style="text-align:center;">${actionsHtml}</td>
      </tr>
    `;
  }

  // 2. Vue Semestre 2
  if (semestre === 'S2') {
    const isValideS2 = s2Moy >= 10.0;
    return `
      <tr>
        <td style="text-align:center;"><strong style="color:var(--primary);">${medal}#${index}</strong></td>
        <td><span class="badge badge-code">${etud.numeroEtudiant || 'ETU-N/A'}</span></td>
        <td><strong>${etud.nom.toUpperCase()}</strong> ${etud.prenom}</td>
        <td style="text-align:center;"><span class="badge badge-gray">${etud.classe}</span></td>
        <td style="text-align:center;">
          <span class="grade-pill ${isValideS2 ? 'valide' : 'non-valide'}">${s2Moy.toFixed(2)} / 20</span>
        </td>
        <td style="text-align:center;"><strong>${s2Creds}</strong> / ${s2Tot} ECTS</td>
        <td style="text-align:center;">
          <span class="badge ${isValideS2 ? 'badge-admis' : 'badge-ajourne'}">
            ${isValideS2 ? 'S2 Validé' : 'S2 Non Validé'}
          </span>
        </td>
        <td style="text-align:center;">${actionsHtml}</td>
      </tr>
    `;
  }

  // 3. Vue Annuelle (S1 + S2 + Annuel)
  let badgeClass = 'badge-admis';
  if (d.statut === 'Admis par Rachat') badgeClass = 'badge-rachat';
  if (d.statut === 'Ajourné') badgeClass = 'badge-ajourne';

  return `
    <tr>
      <td style="text-align:center;"><strong style="color:var(--primary);">${medal}#${index}</strong></td>
      <td><span class="badge badge-code">${etud.numeroEtudiant || 'ETU-N/A'}</span></td>
      <td><strong>${etud.nom.toUpperCase()}</strong> ${etud.prenom}</td>
      <td style="text-align:center;"><span class="badge badge-gray">${etud.classe}</span></td>
      <td style="text-align:center; font-family:var(--font-mono); color:${s1Moy >= 10 ? '#38bdf8' : '#f87171'};">
        ${s1Moy.toFixed(2)}
      </td>
      <td style="text-align:center; font-family:var(--font-mono); color:${s2Moy >= 10 ? '#38bdf8' : '#f87171'};">
        ${s2Moy.toFixed(2)}
      </td>
      <td style="text-align:center;">
        <span class="grade-pill ${d.moyenneGenerale >= 10.0 ? 'valide' : 'non-valide'}">
          ${d.moyenneGenerale.toFixed(2)} / 20
        </span>
      </td>
      <td style="text-align:center;"><strong>${d.creditsValides}</strong> / ${d.creditsTotaux}</td>
      <td style="text-align:center;"><span class="badge badge-gray">${d.mention}</span></td>
      <td style="text-align:center;"><span class="badge ${badgeClass}">${d.statut}</span></td>
      <td style="text-align:center;">${actionsHtml}</td>
    </tr>
  `;
}

// ------------------------------------------------------------
// G. OUTILS TECHNIQUES & AUDIT (SOAP & OPENAPI)
// ------------------------------------------------------------
function renderServicesTechTab() {
  const studentSelect = document.getElementById('soap-student-select');
  if (studentSelect && state.etudiants.length > 0) {
    studentSelect.innerHTML = state.etudiants
      .filter(e => e.isActive !== false)
      .map(e => `<option value="${e.id}">${e.prenom} ${e.nom} (${e.classe})</option>`)
      .join('');
  }
  updateSoapPreviewXml();
  verifierStatutMongo();
}

function updateSoapPreviewXml() {
  const op = document.getElementById('soap-operation-select')?.value || 'CalculerMoyenneEtudiant';
  const etudiantId = document.getElementById('soap-student-select')?.value || 'etud_1';
  const previewBox = document.getElementById('soap-request-xml');
  if (!previewBox) return;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soap="http://univ.tn/scolarite/soap">
  <soapenv:Body>
    <soap:${op}Request>
      <etudiantId>${etudiantId}</etudiantId>
    </soap:${op}Request>
  </soapenv:Body>
</soapenv:Envelope>`;

  previewBox.textContent = xml;
}

async function executerRequeteSoap() {
  const op = document.getElementById('soap-operation-select')?.value || 'CalculerMoyenneEtudiant';
  const etudiantId = document.getElementById('soap-student-select')?.value || 'etud_1';
  const responseBox = document.getElementById('soap-response-xml');

  if (responseBox) responseBox.textContent = 'Envoi de la requête SOAP en cours...';

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soap="http://univ.tn/scolarite/soap">
  <soapenv:Body>
    <soap:${op}Request>
      <etudiantId>${etudiantId}</etudiantId>
    </soap:${op}Request>
  </soapenv:Body>
</soapenv:Envelope>`;

  try {
    const res = await fetch('/soap', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `http://univ.tn/scolarite/soap/${op}`
      },
      body: envelope
    });

    const xmlText = await res.text();
    if (responseBox) responseBox.textContent = xmlText;
    showToast('Réponse SOAP 1.1 reçue avec succès', 'success');
  } catch (err) {
    if (responseBox) responseBox.textContent = 'Erreur SOAP : ' + err.message;
    showToast('Erreur communication SOAP', 'error');
  }
}

// ============================================================
// 4. BULLETIN OFFICIEL (STYLE RELEVÉ DE NOTES PAPETERIE)
// ============================================================
async function ouvrirBulletinModal(etudiantId) {
  try {
    const res = await apiFetch(`/deliberations/etudiant/${etudiantId}`);
    if (!res.success || !res.data) {
      showToast('Impossible de générer le relevé', 'error');
      return;
    }

    const modalBody = document.getElementById('bulletin-modal-body');
    if (modalBody) {
      modalBody.innerHTML = generateBulletinHtml(res.data, false);
    }
    ouvrirModal('modal-bulletin');
  } catch (err) {
    showToast('Erreur de génération', 'error');
  }
}

function filtrerBulletinSemestre(btn, mode) {
  const modal = btn.closest('.modal-body') || document;
  const s1 = modal.querySelector('.bulletin-s1-section');
  const s2 = modal.querySelector('.bulletin-s2-section');
  const ann = modal.querySelector('.bulletin-annuel-section');

  const btns = btn.parentElement.querySelectorAll('button');
  btns.forEach(b => { b.className = 'btn btn-secondary btn-sm'; });
  btn.className = 'btn btn-primary btn-sm';

  if (s1) s1.style.display = (mode === 'ALL' || mode === 'S1') ? 'block' : 'none';
  if (s2) s2.style.display = (mode === 'ALL' || mode === 'S2') ? 'block' : 'none';
  if (ann) ann.style.display = (mode === 'ALL') ? 'flex' : 'none';
}

function generateBulletinHtml(d, isDirectPage = false) {
  const etud = d.etudiant;
  const isAdmis = d.statut === 'Admis' || d.statut === 'Admis par Rachat';
  const isEtudiant = state.currentUser?.role === 'ETUDIANT';

  // Séparer les matières selon le Semestre 1 et le Semestre 2
  let matieresS1 = d.detailsMatieres.filter(m => Number(m.semestre) === 1);
  let matieresS2 = d.detailsMatieres.filter(m => Number(m.semestre) === 2);

  if (matieresS2.length === 0 && d.detailsMatieres.length > 1) {
    const half = Math.ceil(d.detailsMatieres.length / 2);
    matieresS1 = d.detailsMatieres.slice(0, half);
    matieresS2 = d.detailsMatieres.slice(half);
  }

  const s1Moy = d.semestre1?.moyenne ?? (matieresS1.length ? (matieresS1.reduce((acc, m) => acc + (m.moyenne * m.coefficient), 0) / matieresS1.reduce((acc, m) => acc + m.coefficient, 0)) : 0);
  const s1Creds = d.semestre1?.creditsValides ?? matieresS1.filter(m => m.estValidee).reduce((acc, m) => acc + m.credits, 0);
  const s1CredsTot = d.semestre1?.creditsTotaux ?? matieresS1.reduce((acc, m) => acc + m.credits, 0);

  const s2Moy = d.semestre2?.moyenne ?? (matieresS2.length ? (matieresS2.reduce((acc, m) => acc + (m.moyenne * m.coefficient), 0) / matieresS2.reduce((acc, m) => acc + m.coefficient, 0)) : 0);
  const s2Creds = d.semestre2?.creditsValides ?? matieresS2.filter(m => m.estValidee).reduce((acc, m) => acc + m.credits, 0);
  const s2CredsTot = d.semestre2?.creditsTotaux ?? matieresS2.reduce((acc, m) => acc + m.credits, 0);

  const renderTableRows = (matList) => {
    return matList.map(m => `
      <tr>
        ${!isEtudiant ? `<td style="font-family:var(--font-mono); font-size:0.75rem;"><strong>${m.code}</strong></td>` : ''}
        <td><strong>${m.intitule}</strong></td>
        <td style="text-align:center;">${m.coefficient}</td>
        <td style="text-align:center;">${m.notes.ds !== null ? m.notes.ds.toFixed(2) : '<span style="color:#ef4444;">0.00</span>'}</td>
        <td style="text-align:center;">${m.notes.examen !== null ? m.notes.examen.toFixed(2) : '<span style="color:#ef4444;">0.00</span>'}</td>
        <td style="text-align:center;">${m.hasTP ? (m.notes.tp !== null ? m.notes.tp.toFixed(2) : '<span style="color:#ef4444;">0.00</span>') : '<span style="color:#94a3b8; font-size:0.75rem;">-</span>'}</td>
        <td style="text-align:center;"><strong>${m.moyenne !== null ? m.moyenne.toFixed(2) : '0.00'} / 20</strong></td>
        <td style="text-align:center;">${m.creditsObtenus} / ${m.credits}</td>
        <td style="text-align:center;">
          ${m.estValidee 
            ? '<span style="color:#10b981; font-weight:700;">Validée</span>' 
            : '<span style="color:#ef4444; font-weight:700;">Non acquise</span>'}
        </td>
      </tr>
    `).join('');
  };

  return `
    <div class="bulletin-paper">
      <!-- En-tête Officiel My University -->
      <div class="bulletin-header-univ">
        <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; color:#64748b; letter-spacing:0.08em; margin-bottom:0.2rem;">
          MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE SCIENTIFIQUE
        </div>
        <div style="font-size:1.05rem; font-weight:800; color:#1e3a8a; margin-bottom:0.25rem; letter-spacing:0.04em;">
          MY UNIVERSITY
        </div>
        <h3 style="margin:0.35rem 0 0.15rem 0; font-size:1.2rem; color:#0f172a; text-transform:uppercase; letter-spacing:0.04em;">
          RELEVÉ DE NOTES ET RÉSULTATS DE DÉLIBÉRATION
        </h3>
        <div style="font-size:0.83rem; font-weight:600; color:#0284c7;">
          Année Universitaire 2026 / 2027 • Régime LMD & Formation d'Ingénieurs
        </div>
      </div>

      <!-- Informations Étudiant -->
      <div class="bulletin-student-info">
        <div>
          <div><strong>Nom & Prénom :</strong> ${etud.nom.toUpperCase()} ${etud.prenom}</div>
          <div><strong>Identifiant / N° Inscription :</strong> <span style="font-family:var(--font-mono);">${etud.numeroEtudiant || 'ETU-2026-001'}</span></div>
          <div><strong>Filière / Promotion :</strong> <strong style="color:#0284c7;">${etud.classe}</strong></div>
        </div>
        <div>
          <div><strong>Session :</strong> Principale (Semestres 1 & 2)</div>
          <div><strong>Date d'Émission :</strong> ${new Date().toLocaleDateString('fr-FR')}</div>
          <div><strong>Statut Administratif :</strong> Dossier Régulier Validé</div>
        </div>
      </div>

      <!-- Sélecteur Période Relevé -->
      <div class="no-print" style="display:flex; justify-content:center; gap:0.5rem; margin-bottom:1.25rem;">
        <button class="btn btn-primary btn-sm" onclick="filtrerBulletinSemestre(this, 'ALL')">⭐ Relevé Annuel Complet (S1 + S2)</button>
        <button class="btn btn-secondary btn-sm" onclick="filtrerBulletinSemestre(this, 'S1')">📅 Semestre 1 Seul</button>
        <button class="btn btn-secondary btn-sm" onclick="filtrerBulletinSemestre(this, 'S2')">📅 Semestre 2 Seul</button>
      </div>

      <!-- SEMESTRE 1 -->
      <div class="bulletin-s1-section">
        <div style="margin-top:1rem; margin-bottom:0.35rem; font-weight:700; font-size:0.85rem; color:#1e3a8a; display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0284c7; padding-bottom:0.25rem;">
          <span>📅 RÉSULTATS DU SEMESTRE 1</span>
          <span style="font-size:0.8rem; font-weight:600; color:#475569;">Moyenne S1 : <strong>${s1Moy.toFixed(2)}/20</strong> • Crédits : <strong>${s1Creds}/${s1CredsTot} ECTS</strong></span>
        </div>
        <table class="bulletin-tbl" style="margin-bottom:1.25rem;">
          <thead>
            <tr>
              ${!isEtudiant ? '<th style="width:75px;">Code</th>' : ''}
              <th>Matière du Semestre 1</th>
              <th style="width:50px; text-align:center;">Coef</th>
              <th style="width:70px; text-align:center;">DS</th>
              <th style="width:75px; text-align:center;">Examen</th>
              <th style="width:65px; text-align:center;">TP</th>
              <th style="width:90px; text-align:center;">Moyenne</th>
              <th style="width:75px; text-align:center;">Crédits</th>
              <th style="width:95px; text-align:center;">Statut</th>
            </tr>
          </thead>
          <tbody>
            ${renderTableRows(matieresS1)}
          </tbody>
        </table>
      </div>

      <!-- SEMESTRE 2 -->
      <div class="bulletin-s2-section">
        <div style="margin-top:1.25rem; margin-bottom:0.35rem; font-weight:700; font-size:0.85rem; color:#1e3a8a; display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0284c7; padding-bottom:0.25rem;">
          <span>📅 RÉSULTATS DU SEMESTRE 2</span>
          <span style="font-size:0.8rem; font-weight:600; color:#475569;">Moyenne S2 : <strong>${s2Moy.toFixed(2)}/20</strong> • Crédits : <strong>${s2Creds}/${s2CredsTot} ECTS</strong></span>
        </div>
        <table class="bulletin-tbl" style="margin-bottom:1.25rem;">
          <thead>
            <tr>
              ${!isEtudiant ? '<th style="width:75px;">Code</th>' : ''}
              <th>Matière du Semestre 2</th>
              <th style="width:50px; text-align:center;">Coef</th>
              <th style="width:70px; text-align:center;">DS</th>
              <th style="width:75px; text-align:center;">Examen</th>
              <th style="width:65px; text-align:center;">TP</th>
              <th style="width:90px; text-align:center;">Moyenne</th>
              <th style="width:75px; text-align:center;">Crédits</th>
              <th style="width:95px; text-align:center;">Statut</th>
            </tr>
          </thead>
          <tbody>
            ${renderTableRows(matieresS2)}
          </tbody>
        </table>
      </div>

      <!-- Bilan Annuel Global -->
      <div class="bulletin-annuel-section bulletin-verdict-box" style="margin-top:1.25rem;">
        <div>
          <div style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">Bilan Annuel Global Pondéré</div>
          <div style="font-size:1.75rem; font-weight:800; color:${isAdmis ? '#0284c7' : '#ef4444'}; font-family:var(--font-mono);">
            ${d.moyenneGenerale.toFixed(2)} / 20
          </div>
          <div style="font-size:0.82rem; color:#475569; margin-top:0.2rem;">
            Mention : <strong style="color:#0f172a;">${d.mention}</strong> • Crédits Validés : <strong style="color:#0f172a;">${d.creditsValides} / ${d.creditsTotaux} ECTS</strong>
          </div>
        </div>

        <div style="text-align:right;">
          <div style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">Décision Officielle du Jury</div>
          <div style="display:inline-block; padding:0.45rem 1.25rem; border-radius:6px; font-weight:800; font-size:1.1rem; margin-top:0.35rem; background:${isAdmis ? '#d1fae5' : '#fee2e2'}; color:${isAdmis ? '#065f46' : '#991b1b'}; border:1px solid ${isAdmis ? '#6ee7b7' : '#fca5a5'};">
            ${d.statut.toUpperCase()}
          </div>
        </div>
      </div>

      <div style="margin-top:1rem; font-size:0.8rem; color:#475569;">
        <strong>Observation du jury académique :</strong> ${d.observation}
      </div>

      <!-- Signatures Officielles -->
      <div style="display:flex; justify-content:space-between; margin-top:2rem; padding-top:1rem; border-top:1px dashed #cbd5e1; font-size:0.82rem;">
        <div>
          <div style="font-weight:700; color:#1e293b;">Le Président du Jury d'Examens</div>
          <div style="margin-top:1.5rem; font-size:0.72rem; color:#64748b;">[Signature Certifiée Numérique]</div>
        </div>
        <div style="text-align:center;">
          <div style="font-weight:700; color:#1e293b;">Le Président de l'Université</div>
          <div style="margin-top:1.5rem; font-size:0.72rem; color:#64748b;">Direction My University</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700; color:#1e293b;">Direction des Études & Scolarité</div>
          <div style="margin-top:1.5rem; font-size:0.72rem; color:#64748b;">[Cachet Officiel Établissement]</div>
        </div>
      </div>

      <div style="margin-top:1.5rem; text-align:center;">
        <button class="btn btn-primary" onclick="window.print()">
          🖨️ Imprimer / Exporter le Bulletin en PDF
        </button>
      </div>
    </div>
  `;
}

// ============================================================
// 5. ACTIONS ÉTUDIANTS
// ============================================================
function ouvrirAjouterEtudiantModal() {
  document.getElementById('form-etudiant-id').value = '';
  document.getElementById('form-etudiant-nom').value = '';
  document.getElementById('form-etudiant-prenom').value = '';
  document.getElementById('form-etudiant-classe').value = 'L3-INFO';
  document.getElementById('form-etudiant-email').value = '';
  document.getElementById('modal-etudiant-title').textContent = 'Inscrire un Étudiant';
  ouvrirModal('modal-etudiant');
}

function ouvrirModifierEtudiantModal(id) {
  const etud = state.etudiants.find(e => e.id === id);
  if (!etud) return;

  document.getElementById('form-etudiant-id').value = etud.id;
  document.getElementById('form-etudiant-nom').value = etud.nom;
  document.getElementById('form-etudiant-prenom').value = etud.prenom;
  document.getElementById('form-etudiant-classe').value = etud.classe;
  document.getElementById('form-etudiant-email').value = etud.email;
  document.getElementById('modal-etudiant-title').textContent = 'Modifier le Dossier Étudiant';
  ouvrirModal('modal-etudiant');
}

async function sauvegarderEtudiant(e) {
  e.preventDefault();
  const id = document.getElementById('form-etudiant-id').value;
  const nom = document.getElementById('form-etudiant-nom').value;
  const prenom = document.getElementById('form-etudiant-prenom').value;
  const classe = document.getElementById('form-etudiant-classe').value;
  const email = document.getElementById('form-etudiant-email').value;

  try {
    let res;
    if (id) {
      res = await apiFetch(`/etudiants/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ nom, prenom, classe, email })
      });
    } else {
      res = await apiFetch('/etudiants', {
        method: 'POST',
        body: JSON.stringify({ nom, prenom, classe, email })
      });
    }

    if (res.success) {
      fermerModal('modal-etudiant');
      showToast('Dossier étudiant enregistré avec succès', 'success');
      await refreshDonnees();
    } else {
      showToast(res.error || 'Erreur lors de l\'enregistrement', 'error');
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

async function softDeleteEtudiant(id, nom) {
  if (!confirm(`Confirmez-vous l'archivage du dossier de ${nom} ?\nLes notes et délibérations seront préservées.`)) {
    return;
  }

  try {
    const res = await apiFetch(`/etudiants/${id}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Dossier archivé', 'success');
      await refreshDonnees();
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

async function restoreEtudiant(id) {
  try {
    const res = await apiFetch(`/etudiants/${id}/restore`, { method: 'PATCH' });
    if (res.success) {
      showToast('Dossier réactivé', 'success');
      await refreshDonnees();
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

// ============================================================
// 6. ACTIONS MATIÈRES
// ============================================================
function ouvrirAjouterMatiereModal() {
  document.getElementById('form-mat-id').value = '';
  document.getElementById('form-mat-code').value = '';
  document.getElementById('form-mat-code').removeAttribute('disabled');
  document.getElementById('form-mat-intitule').value = '';
  document.getElementById('form-mat-coef').value = '3';
  document.getElementById('form-mat-credits').value = '6';
  document.getElementById('form-mat-hastp').checked = true;
  document.getElementById('form-mat-enseignant').value = '';
  const semSelect = document.getElementById('form-mat-semestre');
  if (semSelect) semSelect.value = '1';
  const clSelect = document.getElementById('form-mat-classe');
  if (clSelect) clSelect.value = 'L3-INFO';
  ouvrirModal('modal-matiere');
}

function ouvrirModifierMatiereModal(id) {
  const m = state.matieres.find(x => x.id === id);
  if (!m) return;

  document.getElementById('form-mat-id').value = m.id;
  document.getElementById('form-mat-code').value = m.code;
  document.getElementById('form-mat-code').setAttribute('disabled', 'true');
  document.getElementById('form-mat-intitule').value = m.intitule;
  document.getElementById('form-mat-coef').value = m.coefficient;
  document.getElementById('form-mat-credits').value = m.credits;
  document.getElementById('form-mat-hastp').checked = Boolean(m.hasTP);
  document.getElementById('form-mat-enseignant').value = m.enseignant || '';
  const semSelect = document.getElementById('form-mat-semestre');
  if (semSelect) semSelect.value = String(m.semestre || 1);
  const clSelect = document.getElementById('form-mat-classe');
  if (clSelect) clSelect.value = m.classe || 'L3-INFO';
  ouvrirModal('modal-matiere');
}

async function sauvegarderMatiere(e) {
  e.preventDefault();
  const id = document.getElementById('form-mat-id').value;
  const code = document.getElementById('form-mat-code').value;
  const intitule = document.getElementById('form-mat-intitule').value;
  const coefficient = document.getElementById('form-mat-coef').value;
  const credits = document.getElementById('form-mat-credits').value;
  const hasTP = document.getElementById('form-mat-hastp').checked;
  const enseignant = document.getElementById('form-mat-enseignant').value;
  const classe = document.getElementById('form-mat-classe')?.value || 'L3-INFO';
  const semestre = Number(document.getElementById('form-mat-semestre')?.value || 1);

  try {
    let res;
    if (id) {
      res = await apiFetch(`/matieres/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ code, intitule, coefficient, credits, hasTP, enseignant, classe, semestre })
      });
    } else {
      res = await apiFetch('/matieres', {
        method: 'POST',
        body: JSON.stringify({ code, intitule, coefficient, credits, hasTP, enseignant, classe, semestre })
      });
    }

    if (res.success) {
      fermerModal('modal-matiere');
      showToast('Matière enregistrée', 'success');
      await refreshDonnees();
    } else {
      showToast(res.error || 'Erreur matière', 'error');
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

// ============================================================
// 7. ACTIONS NOTES
// ============================================================
function ouvrirSaisieNoteModal() {
  const etudSelect = document.getElementById('form-note-etudiant');
  const matSelect = document.getElementById('form-note-matiere');
  const user = state.currentUser;
  const isEnseignant = user && user.role === 'ENSEIGNANT';

  let eligibleMatieres = state.matieres;
  let eligibleEtudiants = state.etudiants.filter(e => e.isActive !== false);

  if (isEnseignant) {
    eligibleMatieres = getTeacherMatieresList(user);
    const teacherClasses = new Set(eligibleMatieres.map(m => m.classe).filter(Boolean));
    eligibleEtudiants = eligibleEtudiants.filter(e => teacherClasses.has(e.classe));
  }

  if (etudSelect) {
    if (eligibleEtudiants.length === 0) {
      etudSelect.innerHTML = `<option value="">Aucun étudiant dans vos classes</option>`;
    } else {
      etudSelect.innerHTML = eligibleEtudiants
        .map(e => `<option value="${e.id}">${e.nom.toUpperCase()} ${e.prenom} (${e.classe})</option>`)
        .join('');
    }
  }

  if (matSelect) {
    if (eligibleMatieres.length === 0) {
      matSelect.innerHTML = `<option value="">Aucune matière assignée</option>`;
    } else {
      matSelect.innerHTML = eligibleMatieres
        .map(m => `<option value="${m.id}">${m.code} - ${m.intitule} (${m.classe})</option>`)
        .join('');
    }
  }

  document.getElementById('form-note-valeur').value = '';
  document.getElementById('form-note-type').value = 'EXAMEN';
  ouvrirModal('modal-note');
}

async function enregistrerNote(e) {
  e.preventDefault();
  const etudiantId = document.getElementById('form-note-etudiant').value;
  const matiereId = document.getElementById('form-note-matiere').value;
  const type = document.getElementById('form-note-type').value;
  const valeur = document.getElementById('form-note-valeur').value;

  try {
    const res = await apiFetch('/notes', {
      method: 'POST',
      body: JSON.stringify({ etudiantId, matiereId, type, valeur: Number(valeur) })
    });

    if (res.success) {
      fermerModal('modal-note');
      showToast('Note enregistrée', 'success');
      await refreshDonnees();
    } else {
      showToast(res.error || 'Erreur lors de la saisie', 'error');
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

function ouvrirModifierNoteModal(noteId, valeurActuelle) {
  const nv = prompt(`Saisissez la nouvelle note rectifiée (sur 20) :`, valeurActuelle);
  if (nv === null) return;

  const valNum = Number(nv);
  if (isNaN(valNum) || valNum < 0 || valNum > 20) {
    alert('Veuillez saisir une note valide comprise entre 0 et 20.');
    return;
  }

  rectifierNote(noteId, valNum);
}

async function rectifierNote(noteId, valeur) {
  try {
    const res = await apiFetch(`/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({ valeur })
    });
    if (res.success) {
      showToast('Note rectifiée', 'success');
      await refreshDonnees();
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

async function supprimerNote(id) {
  if (!confirm('Supprimer cette note ?')) return;
  try {
    const res = await apiFetch(`/notes/${id}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Note supprimée', 'success');
      await refreshDonnees();
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

// ============================================================
// 8. ACTIONS RÉCLAMATIONS
// ============================================================
function ouvrirDepotReclamationModal() {
  const matSelect = document.getElementById('form-rec-matiere');
  const isEtudiant = state.currentUser?.role === 'ETUDIANT';
  if (matSelect) {
    matSelect.innerHTML = state.matieres
      .map(m => `<option value="${m.id}">${isEtudiant ? m.intitule : `${m.code} - ${m.intitule}`}</option>`)
      .join('');
  }
  document.getElementById('form-rec-motif').value = '';
  document.getElementById('form-rec-type').value = 'EXAMEN';
  ouvrirModal('modal-depot-reclamation');
}

async function soumettreReclamation(e) {
  e.preventDefault();
  const matiereId = document.getElementById('form-rec-matiere').value;
  const typeNote = document.getElementById('form-rec-type').value;
  const motif = document.getElementById('form-rec-motif').value;
  const etudiantId = state.currentUser?.etudiantId || 'etud_1';

  try {
    const res = await apiFetch('/reclamations', {
      method: 'POST',
      body: JSON.stringify({ etudiantId, matiereId, typeNote, motif })
    });

    if (res.success) {
      fermerModal('modal-depot-reclamation');
      showToast('Votre réclamation a été transmise à l\'équipe pédagogique.', 'success');
      await refreshDonnees();
    } else {
      showToast(res.error || 'Erreur lors de l\'envoi', 'error');
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

function ouvrirTraiterReclamationModal(id) {
  const rec = state.reclamations.find(r => r.id === id);
  if (!rec) return;

  document.getElementById('form-traiter-rec-id').value = rec.id;
  document.getElementById('traiter-rec-etudiant').textContent = `${rec.etudiantNom} (${rec.etudiantClasse || ''})`;
  document.getElementById('traiter-rec-matiere').textContent = `${rec.matiereCode} - ${rec.matiereIntitule} (${rec.typeNote})`;
  document.getElementById('traiter-rec-note-actuelle').textContent = `${rec.noteActuelle !== null ? rec.noteActuelle.toFixed(2) : '-'} / 20`;
  document.getElementById('traiter-rec-motif').textContent = rec.motif;

  document.getElementById('form-traiter-rec-statut').value = 'ACCEPTEE';
  document.getElementById('form-traiter-rec-reponse').value = 'Vérification de copie effectuée : note rectifiée.';
  document.getElementById('form-traiter-rec-rectification').value = rec.noteActuelle !== null ? rec.noteActuelle + 2 : 12;

  ouvrirModal('modal-traiter-reclamation');
}

async function enregistrerTraitementReclamation(e) {
  e.preventDefault();
  const id = document.getElementById('form-traiter-rec-id').value;
  const statut = document.getElementById('form-traiter-rec-statut').value;
  const reponse = document.getElementById('form-traiter-rec-reponse').value;
  const nv = document.getElementById('form-traiter-rec-rectification').value;

  const payload = {
    statut,
    reponse,
    ...(statut === 'ACCEPTEE' && nv ? { nouvelleNoteValeur: Number(nv) } : {})
  };

  try {
    const res = await apiFetch(`/reclamations/${id}/traiter`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      fermerModal('modal-traiter-reclamation');
      showToast('Décision enregistrée avec succès', 'success');
      await refreshDonnees();
    } else {
      showToast(res.error || 'Erreur', 'error');
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

// ============================================================
// 9. EXPORTS
// ============================================================
async function telechargerExportCSV() {
  try {
    if (state.currentDeliberationsList && state.currentDeliberationsList.length > 0) {
      const period = state.delibFilters?.semestre || 'ANNUEL';
      let csvContent = "\uFEFF"; // UTF-8 BOM pour Excel
      
      if (period === 'S1') {
        csvContent += "Rang,Numero_Inscription,Nom,Prenom,Classe,Moyenne_S1,Credits_S1,Decision_S1\n";
        state.currentDeliberationsList.forEach((d, i) => {
          const e = d.etudiant;
          const s1Moy = (d.semestre1?.moyenne || 0).toFixed(2);
          const s1Creds = d.semestre1?.creditsValides || 0;
          const decision = Number(s1Moy) >= 10 ? 'Valide' : 'Non Valide';
          csvContent += `${i + 1},"${e.numeroEtudiant || ''}","${e.nom}","${e.prenom}","${e.classe}",${s1Moy},${s1Creds},"${decision}"\n`;
        });
      } else if (period === 'S2') {
        csvContent += "Rang,Numero_Inscription,Nom,Prenom,Classe,Moyenne_S2,Credits_S2,Decision_S2\n";
        state.currentDeliberationsList.forEach((d, i) => {
          const e = d.etudiant;
          const s2Moy = (d.semestre2?.moyenne || 0).toFixed(2);
          const s2Creds = d.semestre2?.creditsValides || 0;
          const decision = Number(s2Moy) >= 10 ? 'Valide' : 'Non Valide';
          csvContent += `${i + 1},"${e.numeroEtudiant || ''}","${e.nom}","${e.prenom}","${e.classe}",${s2Moy},${s2Creds},"${decision}"\n`;
        });
      } else {
        csvContent += "Rang,Numero_Inscription,Nom,Prenom,Classe,Moyenne_S1,Moyenne_S2,Moyenne_Annuelle,Credits_ECTS,Mention,Decision_Jury\n";
        state.currentDeliberationsList.forEach((d, i) => {
          const e = d.etudiant;
          const s1Moy = (d.semestre1?.moyenne || 0).toFixed(2);
          const s2Moy = (d.semestre2?.moyenne || 0).toFixed(2);
          const annMoy = (d.moyenneGenerale || 0).toFixed(2);
          csvContent += `${i + 1},"${e.numeroEtudiant || ''}","${e.nom}","${e.prenom}","${e.classe}",${s1Moy},${s2Moy},${annMoy},${d.creditsValides || 0},"${d.mention}","${d.statut}"\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pv_deliberations_${state.delibFilters?.cycle || 'ALL'}_${period}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('Procès-verbal exporté avec succès !', 'success');
      return;
    }

    const blob = await apiFetch('/export/csv');
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pv_deliberation_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    showToast('Fichier téléchargé avec succès', 'success');
  } catch (err) {
    showToast('Erreur téléchargement : ' + err.message, 'error');
  }
}

// ============================================================
// 10. LISTENERS
// ============================================================
function setupEventListeners() {
  document.getElementById('form-login')?.addEventListener('submit', traiterConnexion);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  document.querySelectorAll('.filter-class-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-class-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeClassFilter = btn.getAttribute('data-class') || '';
      renderView();
    });
  });

  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderView();
    });
  }

  document.getElementById('form-etudiant')?.addEventListener('submit', sauvegarderEtudiant);
  document.getElementById('form-matiere')?.addEventListener('submit', sauvegarderMatiere);
  document.getElementById('form-note')?.addEventListener('submit', enregistrerNote);
  document.getElementById('form-depot-rec')?.addEventListener('submit', soumettreReclamation);
  document.getElementById('form-traiter-rec')?.addEventListener('submit', enregistrerTraitementReclamation);

  document.getElementById('soap-operation-select')?.addEventListener('change', updateSoapPreviewXml);
  document.getElementById('soap-student-select')?.addEventListener('change', updateSoapPreviewXml);
}

function switchTab(tabId) {
  state.currentTab = tabId;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  document.querySelectorAll('.tab-content-panel').forEach(panel => {
    panel.style.display = panel.id === `tab-panel-${tabId}` ? 'block' : 'none';
  });

  renderView();
}

function ouvrirModal(id) {
  document.getElementById(id)?.classList.add('active');
}

function fermerModal(id) {
  document.getElementById(id)?.classList.remove('active');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================================
// 11. GESTION & SEED MONGODB (SUJET 2 - LIVRABLE L5)
// ============================================================
async function reinitialiserBaseMongo() {
  if (!confirm("Voulez-vous réinitialiser et peupler MongoDB avec le jeu d'essai complet (Enseignants, Étudiants, Matières, Sections et Notes) ?")) {
    return;
  }

  showToast("Peuplement de MongoDB en cours...", "info");

  try {
    const res = await apiFetch('/system/reset', { method: 'POST' });
    if (res.success) {
      showToast(res.message || "MongoDB peuplé avec succès !", "success");
      await refreshDonnees();
      verifierStatutMongo();
    } else {
      showToast(res.error || "Erreur lors du peuplement MongoDB", "error");
    }
  } catch (err) {
    showToast("Erreur serveur : " + err.message, "error");
  }
}

async function verifierStatutMongo() {
  try {
    const res = await apiFetch('/system/mongo-status');
    if (res.success && res.data) {
      const st = res.data;
      const statusText = document.getElementById('mongo-status-text');
      const countsBadges = document.getElementById('mongo-counts-badges');

      if (statusText) {
        statusText.innerHTML = `Base : <strong style="color:white;">scolarite_lmd</strong> sur <strong style="color:white;">${st.uri}</strong> • Statut : <strong style="color:${st.connected ? '#34d399' : '#f59e0b'};">${st.connected ? 'Connecté (Live Sync)' : 'Mode Persistant'}</strong>`;
      }

      if (countsBadges && st.counts) {
        countsBadges.innerHTML = `
          <span class="badge badge-admis">${st.counts.utilisateurs} Comptes</span>
          <span class="badge badge-gray">${st.counts.etudiants} Étudiants</span>
          <span class="badge badge-gray">${st.counts.matieres} Matières</span>
          <span class="badge badge-gray">${st.counts.notes} Notes</span>
          <span class="badge badge-gray">${st.counts.reclamations} Réclamations</span>
        `;
      }
    }
  } catch (err) {
    console.warn("Vérification statut MongoDB :", err.message);
  }
}
