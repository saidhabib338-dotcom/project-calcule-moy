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
  workflowClasse: 'L3-INFO',
  workflowMatiereId: null,
  reclamationClassFilter: '',
  notesFilters: {
    classe: '',
    matiere: '',
    type: '',
    search: ''
  },
  matieresFilters: {
    niveau: '',
    section: '',
    search: ''
  },
  selectedGrilleStudentId: null
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

  // Étape 1 : Classes disponibles (L3-INFO, M1-GL, L2-TIC, etc.)
  const classSet = new Set(['L3-INFO', 'M1-GL', 'L2-TIC']);
  state.matieres.forEach(m => { if (m.classe) classSet.add(m.classe); });
  state.etudiants.forEach(e => { if (e.classe) classSet.add(e.classe); });
  const classes = Array.from(classSet);

  if (!state.workflowClasse || !classes.includes(state.workflowClasse)) {
    state.workflowClasse = classes[0];
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
    const teacherName = (user.nom || '').toLowerCase();
    const assignedCodes = user.matieresAssociees || [];
    classMatieres = classMatieres.filter(m => {
      const matchName = m.enseignant && m.enseignant.toLowerCase() === teacherName;
      const matchCode = assignedCodes.includes(m.code);
      return matchName || matchCode;
    });

    if (teacherNote) {
      teacherNote.innerHTML = `👨‍🏫 Enseignant : <strong style="color:white;">${user.nom}</strong> • <span style="color:#38bdf8;">Uniquement vos matières assignées (${classMatieres.length})</span>`;
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

function rechercherEtudiantParId(query) {
  if (!query || !query.trim()) return;
  const q = query.trim().toLowerCase();
  const eligible = state.etudiants.filter(e => e.isActive !== false);

  const found = eligible.find(e =>
    (e.numeroEtudiant && e.numeroEtudiant.toLowerCase().includes(q)) ||
    e.id.toLowerCase() === q ||
    e.nom.toLowerCase().includes(q) ||
    e.prenom.toLowerCase().includes(q) ||
    `${e.prenom} ${e.nom}`.toLowerCase().includes(q) ||
    `${e.nom} ${e.prenom}`.toLowerCase().includes(q)
  );

  if (found) {
    state.selectedGrilleStudentId = found.id;
    const select = document.getElementById('notes-grille-student-select');
    if (select) select.value = found.id;
    chargerGrilleNotesEtudiant(found.id);
  }
}

function ouvrirGrilleNotesDirect(etudiantId) {
  state.selectedGrilleStudentId = etudiantId;
  state.notesMode = 'grille';
  switchTab('notes');
}

function appliquerFiltresNotes() {
  state.notesFilters.classe = document.getElementById('notes-filter-classe')?.value || '';
  state.notesFilters.matiere = document.getElementById('notes-filter-matiere')?.value || '';
  state.notesFilters.type = document.getElementById('notes-filter-type')?.value || '';
  state.notesFilters.search = document.getElementById('notes-filter-search')?.value.trim().toLowerCase() || '';

  renderNotesTab();
}

function reinitialiserFiltresNotes() {
  const c = document.getElementById('notes-filter-classe');
  const m = document.getElementById('notes-filter-matiere');
  const t = document.getElementById('notes-filter-type');
  const s = document.getElementById('notes-filter-search');

  if (c) c.value = '';
  if (m) m.value = '';
  if (t) t.value = '';
  if (s) s.value = '';

  state.notesFilters = { classe: '', matiere: '', type: '', search: '' };
  renderNotesTab();
}


function getEtudiantsFiltresPourGrille() {
  let list = state.etudiants.filter(e => e.isActive !== false);

  if (state.notesFilters.classe) {
    list = list.filter(e => e.classe === state.notesFilters.classe);
  }
  if (state.notesFilters.search) {
    const q = state.notesFilters.search.toLowerCase();
    list = list.filter(e =>
      e.nom.toLowerCase().includes(q) ||
      e.prenom.toLowerCase().includes(q) ||
      (e.numeroEtudiant && e.numeroEtudiant.toLowerCase().includes(q))
    );
  }
  return list;
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

    // Regrouper les matières selon l'Unité d'Enseignement (UE) du plan d'études universitaire
    const ueGroups = {};
    delib.detailsMatieres.forEach(m => {
      const ueName = m.uniteEnseignement || "Unités d'Enseignement Fondamentales";
      if (!ueGroups[ueName]) ueGroups[ueName] = [];
      ueGroups[ueName].push(m);
    });

    const isAdmis = delib.statut === 'Admis' || delib.statut === 'Admis par Rachat';
    let statutBadgeClass = 'badge-admis';
    if (delib.statut === 'Admis par Rachat') statutBadgeClass = 'badge-rachat';
    if (delib.statut === 'Ajourné') statutBadgeClass = 'badge-ajourne';

    let html = `
      <div class="student-grid-sheet">
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
                N° Inscription : <strong style="color:white;">${etud.numeroEtudiant || 'ETU-N/A'}</strong> • Classe : <strong style="color:white;">${etud.classe}</strong> • Email : ${etud.email}
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

        <!-- Table du Plan d'Études LMD -->
        <div class="table-responsive">
          <table class="table-custom" id="table-grille-notes">
            <thead>
              <tr>
                <th style="min-width:220px;">Matière du Semestre</th>
                <th style="width:70px; text-align:center;">Coef.</th>
                <th style="width:80px; text-align:center;">Crédits</th>
                <th style="width:130px; text-align:center;">DS (20%)</th>
                <th style="width:130px; text-align:center;">Examen (70/80%)</th>
                <th style="width:130px; text-align:center;">TP (10%)</th>
                <th style="width:110px; text-align:center;">Moyenne</th>
                <th style="width:110px; text-align:center;">Statut LMD</th>
              </tr>
            </thead>
            <tbody>
    `;

    for (const [ueName, matieresList] of Object.entries(ueGroups)) {
      const ueCredits = matieresList.reduce((sum, m) => sum + (m.credits || 0), 0);
      const ueCoefs = matieresList.reduce((sum, m) => sum + (m.coefficient || 0), 0);

      html += `
        <tr class="ue-section-row">
          <td colspan="8" style="background:rgba(2, 132, 199, 0.12); color:#38bdf8; font-weight:700; font-size:0.85rem; padding:0.6rem 1rem; border-top:1px solid rgba(2, 132, 199, 0.25); border-bottom:1px solid rgba(2, 132, 199, 0.25);">
            🏛️ ${ueName} <span style="font-weight:400; opacity:0.85; margin-left:0.5rem; font-size:0.75rem;">(Total : ${ueCredits} ECTS • Coef. cumulé: ${ueCoefs})</span>
          </td>
        </tr>
      `;

      matieresList.forEach(m => {
        const hasTp = Boolean(m.hasTP);
        const dsVal = m.notes.ds !== null && m.notes.ds !== undefined ? m.notes.ds : '';
        const examVal = m.notes.examen !== null && m.notes.examen !== undefined ? m.notes.examen : '';
        const tpVal = m.notes.tp !== null && m.notes.tp !== undefined ? m.notes.tp : '';

        const moyText = m.moyenne !== null ? m.moyenne.toFixed(2) : '--';
        const isValide = m.estValidee;

        html += `
          <tr class="grille-row" 
              data-matiere-id="${m.id}" 
              data-coef="${m.coefficient}" 
              data-credits="${m.credits}" 
              data-hastp="${hasTp}">
            <td>
              <div style="font-weight:600; color:white;">${m.intitule}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); display:flex; gap:0.5rem; align-items:center; margin-top:0.15rem;">
                <span class="badge badge-code" style="font-size:0.7rem;">${m.code}</span>
                <span>Resp : ${m.enseignant || 'Équipe pédagogique'}</span>
              </div>
            </td>
            <td style="text-align:center;"><strong style="color:var(--primary);">${m.coefficient}</strong></td>
            <td style="text-align:center;">${m.credits} ECTS</td>
            
            <!-- Note DS (20%) -->
            <td style="text-align:center;">
              <input type="number" 
                     class="grille-input" 
                     data-matiere="${m.id}" 
                     data-type="DS" 
                     value="${dsVal}" 
                     step="0.25" 
                     min="0" 
                     max="20" 
                     placeholder="-- / 20" 
                     oninput="calculerLigneGrille(this)">
            </td>

            <!-- Note Examen (70% ou 80%) -->
            <td style="text-align:center;">
              <input type="number" 
                     class="grille-input" 
                     data-matiere="${m.id}" 
                     data-type="EXAMEN" 
                     value="${examVal}" 
                     step="0.25" 
                     min="0" 
                     max="20" 
                     placeholder="-- / 20" 
                     oninput="calculerLigneGrille(this)">
            </td>

            <!-- Note TP (10% si applicable) -->
            <td style="text-align:center;">
              ${hasTp ? `
                <input type="number" 
                       class="grille-input" 
                       data-matiere="${m.id}" 
                       data-type="TP" 
                       value="${tpVal}" 
                       step="0.25" 
                       min="0" 
                       max="20" 
                       placeholder="-- / 20" 
                       oninput="calculerLigneGrille(this)">
              ` : `
                <span class="badge badge-gray" style="font-size:0.72rem; padding:0.35rem 0.6rem;">Sans TP</span>
              `}
            </td>

            <!-- Moyenne Calculée Directe -->
            <td style="text-align:center;">
              <strong class="live-moy-val" data-row-mat="${m.id}" style="font-size:0.95rem; color:${isValide ? '#38bdf8' : '#f87171'};">
                ${moyText !== '--' ? moyText + ' / 20' : '--'}
              </strong>
            </td>

            <!-- Statut de Validation LMD -->
            <td style="text-align:center;">
              <span class="badge ${isValide ? 'badge-admis' : 'badge-ajourne'} live-status-val" data-row-mat="${m.id}">
                ${isValide ? 'Validée' : (moyText !== '--' ? 'Non acquise' : 'En attente')}
              </span>
            </td>
          </tr>
        `;
      });
    }

    html += `
            </tbody>
          </table>
        </div>

        <!-- Pied de page avec Synthèse Live et Calculs LMD en Temps Réel -->
        <div class="grid-live-footer" style="margin-top:1.5rem; background:rgba(255,255,255,0.03); border:1px solid var(--border-card); border-radius:var(--radius-md); padding:1.25rem 1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.25rem;">
          <div style="display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap;">
            <div>
              <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:0.05em;">Moyenne Générale Live</div>
              <div id="grid-live-gpa" class="grade-pill ${delib.moyenneGenerale >= 10.0 ? 'valide' : 'non-valide'}" style="font-size:1.35rem; padding:0.25rem 0.85rem; font-weight:800; margin-top:0.25rem;">
                ${delib.moyenneGenerale.toFixed(2)} / 20
              </div>
            </div>

            <div>
              <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:0.05em;">Crédits ECTS Validés</div>
              <div id="grid-live-credits" style="font-size:1.15rem; font-weight:800; color:white; margin-top:0.35rem;">
                ${delib.creditsValides} / ${delib.creditsTotaux} ECTS
              </div>
            </div>

            <div>
              <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:0.05em;">Mention & Jury</div>
              <div style="margin-top:0.35rem; display:flex; gap:0.4rem; align-items:center;">
                <span id="grid-live-mention" class="badge badge-gray">${delib.mention}</span>
                <span id="grid-live-statut" class="badge ${statutBadgeClass}">${delib.statut}</span>
              </div>
            </div>
          </div>

          <div style="display:flex; gap:0.5rem; align-items:center;">
            <button class="btn btn-secondary" onclick="chargerGrilleNotesEtudiant('${etud.id}')" title="Annuler les modifications non enregistrées">
              🔄 Réinitialiser
            </button>
            <button id="btn-save-grille" class="btn btn-primary" onclick="sauvegarderGrilleNotes()">
              💾 Enregistrer la Grille des Notes
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger); padding:2rem; text-align:center;">Erreur lors du chargement de la grille : ${err.message}</div>`;
  }
}

// ------------------------------------------------------------
// CALCUL INSTANTANÉ SUR LA LIGNE & SYNTHÈSE LIVE
// ------------------------------------------------------------
function calculerLigneGrille(inputElement) {
  const row = inputElement.closest('tr.grille-row');
  if (!row) return;

  const matId = row.dataset.matiereId;
  const coef = Number(row.dataset.coef) || 1;
  const credits = Number(row.dataset.credits) || 0;
  const hasTp = row.dataset.hastp === 'true';

  const dsInput = row.querySelector('input[data-type="DS"]');
  const examInput = row.querySelector('input[data-type="EXAMEN"]');
  const tpInput = row.querySelector('input[data-type="TP"]');

  const dsVal = dsInput && dsInput.value !== '' ? Number(dsInput.value) : null;
  const examVal = examInput && examInput.value !== '' ? Number(examInput.value) : null;
  const tpVal = tpInput && tpInput.value !== '' ? Number(tpInput.value) : null;

  const moyElem = row.querySelector(`.live-moy-val[data-row-mat="${matId}"]`);
  const statusElem = row.querySelector(`.live-status-val[data-row-mat="${matId}"]`);

  // Règle de calcul officielle LMD Sujet 2
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
      statusElem.className = `badge ${isValide ? 'badge-admis' : 'badge-ajourne'} live-status-val`;
      statusElem.textContent = isValide ? 'Validée' : 'Non acquise';
    }
    row.dataset.currentMoyenne = moy;
  } else {
    if (moyElem) {
      moyElem.textContent = '--';
      moyElem.style.color = 'var(--text-muted)';
    }
    if (statusElem) {
      statusElem.className = 'badge badge-gray live-status-val';
      statusElem.textContent = 'En attente';
    }
    delete row.dataset.currentMoyenne;
  }

  // Recalculer la synthèse globale du pied de page
  recalculerSyntheseLiveGrille();
}

function recalculerSyntheseLiveGrille() {
  const rows = document.querySelectorAll('#table-grille-notes tr.grille-row');
  if (rows.length === 0) return;

  let sommeNotesPonderees = 0;
  let sommeCoefficients = 0;
  let totalCreditsValides = 0;
  let totalCredits = 0;

  rows.forEach(r => {
    const coef = Number(r.dataset.coef) || 1;
    const cred = Number(r.dataset.credits) || 0;
    totalCredits += cred;

    const moyVal = r.dataset.currentMoyenne !== undefined ? Number(r.dataset.currentMoyenne) : null;
    if (moyVal !== null) {
      sommeNotesPonderees += (moyVal * coef);
      sommeCoefficients += coef;
      if (moyVal >= 10.0) {
        totalCreditsValides += cred;
      }
    }
  });

  const gpa = sommeCoefficients > 0 ? (sommeNotesPonderees / sommeCoefficients) : 0;

  // Calcul Mention
  let mention = 'Ajourné';
  if (gpa >= 16.0) mention = 'Très Bien';
  else if (gpa >= 14.0) mention = 'Bien';
  else if (gpa >= 12.0) mention = 'Assez Bien';
  else if (gpa >= 10.0) mention = 'Passable';

  // Calcul Statut LMD
  let statut = 'Ajourné';
  let badgeClass = 'badge-ajourne';
  if (gpa >= 10.0) {
    statut = 'Admis';
    badgeClass = 'badge-admis';
  } else if (gpa >= 9.0 && totalCreditsValides >= 20) { // Condition rachat
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

    if (valStr === '') {
      notesPayload.push({ matiereId, type, valeur: null });
    } else {
      const num = Number(valStr);
      if (isNaN(num) || num < 0 || num > 20) {
        showToast(`La note de ${type} (${valStr}) n'est pas valide. Elle doit être comprise entre 0 et 20.`, "error");
        input.focus();
        input.style.borderColor = 'var(--danger)';
        return;
      }
      input.style.borderColor = '';
      notesPayload.push({ matiereId, type, valeur: num });
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
// VUE JOURNAL DÉTAILLÉ (AVEC FILTRES CROISÉS)
// ------------------------------------------------------------
function renderJournalNotes() {
  const tbody = document.getElementById('notes-table-body');
  if (!tbody) return;

  let filtered = [...state.notes].reverse();

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

  // 3. Filtre par Type d'Épreuve
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
        <td><span class="badge badge-code">${mat ? mat.code : '-'}</span> <small>${mat ? mat.intitule : ''}</small></td>
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
// F. PROCÈS-VERBAL & DÉLIBÉRATIONS LMD
// ------------------------------------------------------------
async function renderDeliberationsTab() {
  const container = document.getElementById('deliberations-container');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--primary);">Calcul du procès-verbal en cours...</div>`;

  try {
    const classe = state.activeClassFilter || 'L3-INFO';
    const res = await apiFetch(`/deliberations/classe/${encodeURIComponent(classe)}`);

    if (!res.success || res.data.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted);">Aucune donnée pour la classe ${classe}.</div>`;
      return;
    }

    const deliberations = res.data;

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:1rem;">
        <div>
          <h2 style="font-size:1.15rem; color:white;">Procès-Verbal des Résultats - ${classe}</h2>
          <p style="font-size:0.78rem; color:var(--text-muted);">Classement officiel par moyenne générale décroissante selon les normes académiques.</p>
        </div>
        <div>
          <button class="btn btn-primary btn-sm" onclick="telechargerExportCSV()">
            📥 Télécharger le PV (Excel/CSV)
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table-custom">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Étudiant</th>
              <th>Moyenne Générale</th>
              <th>Crédits Validés</th>
              <th>Mention</th>
              <th>Résultat du Jury</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
    `;

    deliberations.forEach(d => {
      let badgeClass = 'badge-admis';
      if (d.statut === 'Admis par Rachat') badgeClass = 'badge-rachat';
      if (d.statut === 'Ajourné') badgeClass = 'badge-ajourne';

      let medal = '';
      if (d.rang === 1) medal = '🥇 ';
      if (d.rang === 2) medal = '🥈 ';
      if (d.rang === 3) medal = '🥉 ';

      html += `
        <tr>
          <td><strong style="color:var(--primary);">${medal}#${d.rang}</strong></td>
          <td>
            <strong>${d.etudiant.prenom} ${d.etudiant.nom}</strong>
            <small style="display:block; color:var(--text-dim);">${d.etudiant.numeroEtudiant || ''}</small>
          </td>
          <td>
            <span class="grade-pill ${d.moyenneGenerale >= 10.0 ? 'valide' : 'non-valide'}">
              ${d.moyenneGenerale.toFixed(2)} / 20
            </span>
          </td>
          <td><strong>${d.creditsValides}</strong> / ${d.creditsTotaux} ECTS</td>
          <td><span class="badge badge-gray">${d.mention}</span></td>
          <td><span class="badge ${badgeClass}">${d.statut}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="ouvrirBulletinModal('${d.etudiant.id}')">
              Consulter Relevé
            </button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger); padding:1rem;">Erreur de chargement.</div>`;
  }
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

function generateBulletinHtml(d, isDirectPage = false) {
  const etud = d.etudiant;
  const isAdmis = d.statut === 'Admis' || d.statut === 'Admis par Rachat';
  const isEtudiant = state.currentUser?.role === 'ETUDIANT';

  return `
    <div class="bulletin-paper">
      <div class="bulletin-header-univ">
        <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:#64748b; letter-spacing:0.1em; margin-bottom:0.25rem;">
          MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE SCIENTIFIQUE
        </div>
        <h3>RELEVÉ DE NOTES & RÉSULTATS DE DÉLIBÉRATION</h3>
        <div style="font-size:0.85rem; font-weight:600; color:#0284c7;">Année Académique 2026 / 2027 • Régime LMD</div>
      </div>

      <div class="bulletin-student-info">
        <div>
          <div><strong>Étudiant(e) :</strong> ${etud.nom.toUpperCase()} ${etud.prenom}</div>
          <div><strong>N° Inscription :</strong> ${etud.numeroEtudiant || 'ETU-2026-001'}</div>
          <div><strong>Filière :</strong> ${etud.classe}</div>
        </div>
        <div>
          <div><strong>Session :</strong> Principale (Semestres S1 & S2)</div>
          <div><strong>Date d'émission :</strong> ${new Date().toLocaleDateString('fr-FR')}</div>
          <div><strong>Statut dossier :</strong> Dossier actif</div>
        </div>
      </div>

      <table class="bulletin-tbl">
        <thead>
          <tr>
            ${!isEtudiant ? '<th>Code</th>' : ''}
            <th>Matière</th>
            <th>Coef.</th>
            <th>Contrôle Continu (DS)</th>
            <th>Examen Final</th>
            <th>TP</th>
            <th>Moyenne</th>
            <th>Crédits ECTS</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          ${d.detailsMatieres.map(m => `
            <tr>
              ${!isEtudiant ? `<td><strong>${m.code}</strong></td>` : ''}
              <td>${m.intitule}</td>
              <td>${m.coefficient}</td>
              <td>${m.notes.ds !== null ? m.notes.ds.toFixed(2) : '-'}</td>
              <td>${m.notes.examen !== null ? m.notes.examen.toFixed(2) : '-'}</td>
              <td>${m.notes.tp !== null ? m.notes.tp.toFixed(2) : '-'}</td>
              <td><strong>${m.moyenne !== null ? m.moyenne.toFixed(2) : '-'} / 20</strong></td>
              <td>${m.creditsObtenus} / ${m.credits}</td>
              <td>
                ${m.estValidee 
                  ? '<span style="color:#10b981; font-weight:700;">Validée</span>' 
                  : '<span style="color:#ef4444; font-weight:700;">Non acquise</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="bulletin-verdict-box">
        <div>
          <div style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase;">Moyenne Générale Pondérée</div>
          <div style="font-size:1.6rem; font-weight:800; color:${isAdmis ? '#0284c7' : '#ef4444'};">
            ${d.moyenneGenerale.toFixed(2)} / 20
          </div>
          <div style="font-size:0.8rem; color:#475569; margin-top:0.2rem;">
            Mention : <strong style="color:#0f172a;">${d.mention}</strong> • Crédits cumulés : <strong style="color:#0f172a;">${d.creditsValides} / ${d.creditsTotaux} ECTS</strong>
          </div>
        </div>

        <div style="text-align:right;">
          <div style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase;">Décision du Jury</div>
          <div style="display:inline-block; padding:0.4rem 1rem; border-radius:6px; font-weight:800; font-size:1.05rem; margin-top:0.3rem; background:${isAdmis ? '#d1fae5' : '#fee2e2'}; color:${isAdmis ? '#065f46' : '#991b1b'}; border:1px solid ${isAdmis ? '#6ee7b7' : '#fca5a5'};">
            ${d.statut.toUpperCase()}
          </div>
        </div>
      </div>

      <div style="margin-top:1.15rem; font-size:0.78rem; color:#64748b;">
        <strong>Décision officielle :</strong> ${d.observation}
      </div>

      <div style="display:flex; justify-content:space-between; margin-top:2.25rem; padding-top:1.25rem; border-top:1px dashed #cbd5e1; font-size:0.82rem;">
        <div>
          <div>Le Président du Jury</div>
          <div style="margin-top:1.5rem; font-size:0.72rem; color:#64748b;">[Signature Certifiée]</div>
        </div>
        <div style="text-align:right;">
          <div>Le Service de Scolarité</div>
          <div style="margin-top:1.5rem; font-size:0.72rem; color:#64748b;">[Cachet de l'Établissement]</div>
        </div>
      </div>

      <div style="margin-top:1.5rem; text-align:center;">
        <button class="btn btn-primary" onclick="window.print()">
          🖨️ Imprimer / Télécharger en PDF
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

  try {
    let res;
    if (id) {
      res = await apiFetch(`/matieres/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ code, intitule, coefficient, credits, hasTP, enseignant, classe })
      });
    } else {
      res = await apiFetch('/matieres', {
        method: 'POST',
        body: JSON.stringify({ code, intitule, coefficient, credits, hasTP, enseignant, classe })
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

  if (etudSelect) {
    etudSelect.innerHTML = state.etudiants
      .filter(e => e.isActive !== false)
      .map(e => `<option value="${e.id}">${e.prenom} ${e.nom} (${e.classe})</option>`)
      .join('');
  }

  if (matSelect) {
    matSelect.innerHTML = state.matieres
      .map(m => `<option value="${m.id}">${m.code} - ${m.intitule}</option>`)
      .join('');
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
    showToast('Erreur téléchargement', 'error');
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
