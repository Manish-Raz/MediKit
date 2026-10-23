/**
 * MediKit Prescriptions Management & Audit History
 */

const SAMPLE_PRESCRIPTIONS = [
  {
    _id: '671900000000000000000021',
    medicationName: 'Lisinopril',
    activeIngredient: 'lisinopril',
    strength: '10mg',
    dosageInstructions: 'Take 1 tablet by mouth daily in the morning with water.',
    doctor: { name: 'Dr. Sarah Jenkins, MD' },
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString(),
    frequency: 'once_daily',
    status: 'active',
    version: 1,
  },
  {
    _id: '671900000000000000000022',
    medicationName: 'Metformin',
    activeIngredient: 'metformin',
    strength: '500mg',
    dosageInstructions: 'Take 1 tablet by mouth twice daily with meals.',
    doctor: { name: 'Dr. Sarah Jenkins, MD' },
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString(),
    frequency: 'twice_daily',
    status: 'active',
    version: 2,
    modificationReason: 'Increased from initial 250mg titration to achieve target glycemic control.',
  },
  {
    _id: '671900000000000000000023',
    medicationName: 'Atorvastatin',
    activeIngredient: 'atorvastatin',
    strength: '20mg',
    dosageInstructions: 'Take 1 tablet by mouth once daily at bedtime.',
    doctor: { name: 'Dr. Marcus Chen, MD (Cardiologist)' },
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000).toISOString(),
    frequency: 'once_daily',
    status: 'active',
    version: 1,
  },
  {
    _id: '671900000000000000000024',
    medicationName: 'Hydrochlorothiazide',
    activeIngredient: 'hydrochlorothiazide',
    strength: '12.5mg',
    dosageInstructions: 'Take 1 tablet daily in the morning.',
    doctor: { name: 'Dr. Sarah Jenkins, MD' },
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    frequency: 'once_daily',
    status: 'discontinued',
    version: 1,
    discontinuationReason: 'Replaced with ACE inhibitor (Lisinopril) therapy to protect renal function.',
  },
];

const SAMPLE_VERSIONS = [
  {
    version: 1,
    strength: '250mg',
    status: 'modified',
    dosageInstructions: 'Take 1 tablet daily with breakfast',
    frequency: 'once_daily',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    modificationReason: 'Titration dose increased due to elevated fasting blood sugar.',
  },
  {
    version: 2,
    strength: '500mg',
    status: 'active',
    dosageInstructions: 'Take 1 tablet twice daily with meals',
    frequency: 'twice_daily',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const SAMPLE_AUDIT_LOGS = [
  {
    actor: { name: 'Dr. Sarah Jenkins, MD' },
    actorRole: 'doctor',
    description: 'Dr. Sarah Jenkins modified prescription for Metformin to version 2 (500mg twice daily).',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    actor: { name: 'Dr. Sarah Jenkins, MD' },
    actorRole: 'doctor',
    description: 'Dr. Sarah Jenkins created initial prescription for Metformin 250mg.',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let currentUser = null;
let activePrescriptionsList = [];
let activePrescToModify = null;
let activePrescToDiscontinue = null;

async function initPrescriptionsPage() {
  currentUser = await Auth.checkAuth(['patient', 'doctor', 'caregiver']);
  UI.initSidebar(currentUser, 'prescriptions');
  UI.initTopbar(currentUser, 'Prescription Registry & Revisions');

  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get('id');
  const patientId = urlParams.get('patientId');

  await loadPrescriptions(patientId);

  if (targetId) {
    viewPrescriptionHistory(targetId);
  }

  setupEventListeners();
  UI.playPageAnimations();
}

async function loadPrescriptions(patientId = null) {
  try {
    let endpoint = '/prescriptions';
    if (patientId) {
      endpoint += `?patientId=${patientId}`;
    }

    const res = await API.get(endpoint);
    if (res.success && res.prescriptions && res.prescriptions.length > 0) {
      activePrescriptionsList = res.prescriptions;
    } else {
      activePrescriptionsList = SAMPLE_PRESCRIPTIONS;
    }
  } catch (err) {
    console.log('Using sample prescriptions list.');
    activePrescriptionsList = SAMPLE_PRESCRIPTIONS;
  }
  renderPrescriptionsTable(activePrescriptionsList);
}

function renderPrescriptionsTable(prescriptions) {
  const tbody = document.getElementById('prescriptions-tbody');
  if (!tbody) return;

  if (!prescriptions || prescriptions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <p>No prescriptions found.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = prescriptions
    .map((p) => {
      const statusBadge =
        p.status === 'active'
          ? '<span class="badge badge-taken">Active</span>'
          : p.status === 'modified'
          ? '<span class="badge badge-warning">Modified</span>'
          : p.status === 'discontinued'
          ? '<span class="badge badge-missed">Discontinued</span>'
          : '<span class="badge badge-upcoming">Completed</span>';

      return `
        <tr>
          <td>
            <strong style="color: var(--primary-navy);">${p.medicationName}</strong>
            <span class="badge badge-verified" style="font-size: 0.72rem; margin-left: 6px;">v${p.version}</span>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Ingredient: ${p.activeIngredient || ''}</div>
          </td>
          <td>${p.strength}</td>
          <td>${p.dosageInstructions}</td>
          <td>${p.doctor ? p.doctor.name : 'Attending Physician'}</td>
          <td>${new Date(p.startDate).toLocaleDateString()} - ${new Date(p.endDate).toLocaleDateString()}</td>
          <td>${statusBadge}</td>
          <td>
            <div style="display: flex; gap: 6px; align-items: center;">
              <button class="btn btn-sm btn-outline" onclick="viewPrescriptionHistory('${p._id}')">
                <i data-lucide="history" style="width: 14px; height: 14px;"></i> History
              </button>
              ${
                p.status === 'active'
                  ? `
                <button class="btn btn-sm btn-secondary" onclick="openModifyPrescriptionModal('${p._id}')" title="Modify dose">
                  Modify
                </button>
                <button class="btn btn-sm btn-danger" onclick="openDiscontinueModal('${p._id}', '${p.medicationName}')" title="Discontinue prescription">
                  Discontinue
                </button>
              `
                  : ''
              }
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  if (window.lucide) window.lucide.createIcons();
}

async function viewPrescriptionHistory(prescId) {
  let versions = SAMPLE_VERSIONS;
  let auditLogs = SAMPLE_AUDIT_LOGS;

  try {
    const res = await API.get(`/prescriptions/${prescId}/history`);
    if (res.success && res.versions && res.versions.length > 0) {
      versions = res.versions;
      auditLogs = res.auditLogs || [];
    }
  } catch (err) {
    console.log('Using sample history entries.');
  }

  const titleElem = document.getElementById('history-modal-title');
  const targetPresc = activePrescriptionsList.find((p) => p._id === prescId);
  if (titleElem && targetPresc) {
    titleElem.innerText = `Prescription History: ${targetPresc.medicationName}`;
  }

  const versionsContainer = document.getElementById('history-versions-timeline');
  if (versionsContainer) {
    versionsContainer.innerHTML = versions
      .map(
        (v) => `
      <div style="border-left: 3px solid var(--primary-teal); padding-left: 14px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: var(--primary-navy);">Version ${v.version} &bull; ${v.strength} (${v.status ? v.status.toUpperCase() : 'RECORDED'})</strong>
          <span style="font-size: 0.78rem; color: var(--text-muted);">${new Date(v.createdAt).toLocaleString()}</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
          Instructions: ${v.dosageInstructions} &bull; Frequency: ${v.frequency}
        </div>
        ${v.modificationReason ? `<div style="font-size: 0.8rem; color: #b45309; margin-top: 4px;"><strong>Modification Reason:</strong> ${v.modificationReason}</div>` : ''}
        ${v.discontinuationReason ? `<div style="font-size: 0.8rem; color: #b91c1c; margin-top: 4px;"><strong>Discontinuation Reason:</strong> ${v.discontinuationReason}</div>` : ''}
      </div>
    `
      )
      .join('');
  }

  const auditContainer = document.getElementById('history-audit-logs');
  if (auditContainer) {
    auditContainer.innerHTML = auditLogs
      .map(
        (log) => `
      <div style="padding: 10px; background: var(--bg-surface); border-radius: var(--radius-sm); margin-bottom: 8px; font-size: 0.82rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <strong>${log.actor ? log.actor.name : 'System'} (${log.actorRole})</strong>
          <span style="color: var(--text-muted); font-size: 0.75rem;">${new Date(log.createdAt).toLocaleString()}</span>
        </div>
        <div>${log.description}</div>
      </div>
    `
      )
      .join('');
  }

  UI.openModal('prescription-history-modal');
}

function openModifyPrescriptionModal(prescId) {
  const presc = activePrescriptionsList.find((p) => p._id === prescId);
  if (!presc) return;

  activePrescToModify = presc;
  document.getElementById('modify-presc-title').innerText = `Modify ${presc.medicationName} (Current: v${presc.version})`;
  document.getElementById('modify-strength').value = presc.strength;
  document.getElementById('modify-instructions').value = presc.dosageInstructions;
  document.getElementById('modify-frequency').value = presc.frequency || 'once_daily';
  document.getElementById('modify-reason').value = '';

  UI.openModal('modify-prescription-modal');
}

async function submitModifyPrescription(e) {
  if (e) e.preventDefault();
  if (!activePrescToModify) return;

  const strength = document.getElementById('modify-strength').value.trim();
  const dosageInstructions = document.getElementById('modify-instructions').value.trim();
  const frequency = document.getElementById('modify-frequency').value;
  const modificationReason = document.getElementById('modify-reason').value.trim();

  if (!strength || !dosageInstructions || !modificationReason) {
    UI.showToast('All fields and clinical modification reason are required.', 'error');
    return;
  }

  try {
    const res = await API.patch(`/prescriptions/${activePrescToModify._id}`, {
      strength,
      dosageInstructions,
      frequency,
      modificationReason,
    });

    if (res.success) {
      UI.closeModal('modify-prescription-modal');
      UI.showToast(`Prescription updated to version ${res.prescription.version}!`, 'success');
      activePrescToModify = null;
      await loadPrescriptions();
      return;
    }
  } catch (err) {
    // If running in local demo without doctor session, update locally
    activePrescToModify.strength = strength;
    activePrescToModify.dosageInstructions = dosageInstructions;
    activePrescToModify.frequency = frequency;
    activePrescToModify.version += 1;
    UI.closeModal('modify-prescription-modal');
    UI.showToast(`Prescription updated to version ${activePrescToModify.version} (Demo mode)!`, 'success');
    renderPrescriptionsTable(activePrescriptionsList);
  }
}

function openDiscontinueModal(prescId, medName) {
  activePrescToDiscontinue = prescId;
  document.getElementById('discontinue-med-name').innerText = medName;
  document.getElementById('discontinue-reason-input').value = '';
  UI.openModal('discontinue-modal');
}

async function confirmDiscontinuePrescription() {
  if (!activePrescToDiscontinue) return;
  const reason = document.getElementById('discontinue-reason-input').value.trim();
  if (!reason) {
    UI.showToast('Please provide a clinical reason for discontinuation.', 'error');
    return;
  }

  try {
    const res = await API.post(`/prescriptions/${activePrescToDiscontinue}/discontinue`, {
      discontinuationReason: reason,
    });

    if (res.success) {
      UI.closeModal('discontinue-modal');
      UI.showToast('Prescription discontinued and future doses removed.', 'warning');
      activePrescToDiscontinue = null;
      await loadPrescriptions();
      return;
    }
  } catch (err) {
    // Local demo update
    const target = activePrescriptionsList.find((p) => p._id === activePrescToDiscontinue);
    if (target) {
      target.status = 'discontinued';
      target.discontinuationReason = reason;
    }
    UI.closeModal('discontinue-modal');
    UI.showToast('Prescription marked as discontinued.', 'warning');
    renderPrescriptionsTable(activePrescriptionsList);
  }
}

function setupEventListeners() {
  const modifyForm = document.getElementById('modify-prescription-form');
  if (modifyForm) modifyForm.addEventListener('submit', submitModifyPrescription);

  const searchInput = document.getElementById('prescriptions-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = activePrescriptionsList.filter(
        (p) =>
          p.medicationName.toLowerCase().includes(q) ||
          (p.activeIngredient && p.activeIngredient.toLowerCase().includes(q)) ||
          (p.doctor && p.doctor.name.toLowerCase().includes(q))
      );
      renderPrescriptionsTable(filtered);
    });
  }
}

window.initPrescriptionsPage = initPrescriptionsPage;
window.viewPrescriptionHistory = viewPrescriptionHistory;
window.openModifyPrescriptionModal = openModifyPrescriptionModal;
window.openDiscontinueModal = openDiscontinueModal;
window.confirmDiscontinuePrescription = confirmDiscontinuePrescription;
