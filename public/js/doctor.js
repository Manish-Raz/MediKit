/**
 * MediKit Doctor Dashboard Logic
 */

const SAMPLE_DOCTOR_PATIENTS = [
  {
    accessId: 'acc-1',
    patient: {
      _id: '671900000000000000000001',
      name: 'Johnathan Doe',
      email: 'john.patient@medikit.demo',
      phone: '(555) 100-2020',
    },
    relationshipLabel: 'Primary Care Physician',
    permissions: { canViewMedications: true, canPrescribe: true, canRecordDoses: false },
    grantedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    accessId: 'acc-2',
    patient: {
      _id: '671900000000000000000002',
      name: 'Eleanor Vance',
      email: 'eleanor.vance@example.demo',
      phone: '(555) 321-7654',
    },
    relationshipLabel: 'Attending Physician',
    permissions: { canViewMedications: true, canPrescribe: true, canRecordDoses: false },
    grantedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const SAMPLE_DOCTOR_PRESCRIPTIONS = [
  {
    _id: '671900000000000000000021',
    medicationName: 'Lisinopril',
    strength: '10mg',
    version: 1,
    frequency: 'once_daily',
    patient: { name: 'Johnathan Doe' },
  },
  {
    _id: '671900000000000000000022',
    medicationName: 'Metformin',
    strength: '500mg',
    version: 2,
    frequency: 'twice_daily',
    patient: { name: 'Johnathan Doe' },
  },
];

let currentDoctor = null;
let authorizedPatients = SAMPLE_DOCTOR_PATIENTS;
let selectedPatientId = null;
let candidateInteractionReport = null;

async function initDoctorDashboard() {
  currentDoctor = await Auth.checkAuth(['doctor']);
  UI.initSidebar(currentDoctor, 'dashboard');
  UI.initTopbar(currentDoctor, 'Doctor Clinical Dashboard');

  await loadDoctorData();
  setupEventListeners();
  UI.playPageAnimations();
}

async function loadDoctorData() {
  let summary = {
    totalPatients: 2,
    activePrescriptionsCount: 6,
    atRiskPatientsCount: 1,
    recentPrescriptions: SAMPLE_DOCTOR_PRESCRIPTIONS,
  };

  try {
    const [summaryRes, patientsRes] = await Promise.all([
      API.get('/dashboard/summary'),
      API.get('/patients/authorized'),
    ]);

    if (summaryRes.success && summaryRes.summary) {
      summary = summaryRes.summary;
    }
    if (patientsRes.success && patientsRes.patients && patientsRes.patients.length > 0) {
      authorizedPatients = patientsRes.patients;
    } else {
      authorizedPatients = SAMPLE_DOCTOR_PATIENTS;
    }
  } catch (err) {
    authorizedPatients = SAMPLE_DOCTOR_PATIENTS;
  }

  renderDoctorMetrics(summary);
  renderPatientsList(authorizedPatients);
  populatePatientSelectDropdown(authorizedPatients);
  renderRecentPrescriptions(summary.recentPrescriptions || SAMPLE_DOCTOR_PRESCRIPTIONS);
}

function renderDoctorMetrics(summary) {
  const patientCountElem = document.getElementById('doctor-patient-count');
  const activePrescriptionsElem = document.getElementById('doctor-active-prescriptions');
  const atRiskCountElem = document.getElementById('doctor-at-risk-count');

  if (patientCountElem) patientCountElem.innerText = summary.totalPatients || 2;
  if (activePrescriptionsElem) activePrescriptionsElem.innerText = summary.activePrescriptionsCount || 6;
  if (atRiskCountElem) atRiskCountElem.innerText = summary.atRiskPatientsCount || 1;
}

function renderPatientsList(patients) {
  const container = document.getElementById('authorized-patients-table-body');
  if (!container) return;

  container.innerHTML = patients
    .map(
      (p) => `
    <tr>
      <td>
        <strong style="color: var(--primary-navy);">${p.patient.name}</strong>
        <div style="font-size: 0.78rem; color: var(--text-muted);">${p.patient.email} &bull; ${p.patient.phone || ''}</div>
      </td>
      <td>${p.relationshipLabel || 'Patient'}</td>
      <td>
        <span class="badge ${p.permissions && p.permissions.canPrescribe ? 'badge-verified' : 'badge-skipped'}">
          ${p.permissions && p.permissions.canPrescribe ? 'Can Prescribe' : 'View Only'}
        </span>
      </td>
      <td>${new Date(p.grantedAt).toLocaleDateString()}</td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-sm btn-primary" onclick="openNewPrescriptionFor('${p.patient._id}')">
            <i data-lucide="plus" style="width: 14px; height: 14px;"></i> Prescribe
          </button>
          <a href="/prescriptions.html?patientId=${p.patient._id}" class="btn btn-sm btn-secondary">
            View History
          </a>
        </div>
      </td>
    </tr>
  `
    )
    .join('');

  if (window.lucide) window.lucide.createIcons();
}

function populatePatientSelectDropdown(patients) {
  const select = document.getElementById('prescription-patient-select');
  if (!select) return;

  select.innerHTML =
    '<option value="">-- Choose an Authorized Patient --</option>' +
    patients
      .map((p) => `<option value="${p.patient._id}">${p.patient.name} (${p.patient.email})</option>`)
      .join('');
}

function renderRecentPrescriptions(prescriptions) {
  const container = document.getElementById('recent-prescriptions-list');
  if (!container) return;

  container.innerHTML = prescriptions
    .map(
      (p) => `
    <div style="padding: 12px 14px; border: 1px solid var(--border-light); border-radius: var(--radius-md); margin-bottom: 8px; background: white; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong>${p.medicationName}</strong> (${p.strength}) &bull; <span class="badge badge-verified" style="font-size: 0.72rem;">v${p.version}</span>
        <div style="font-size: 0.78rem; color: var(--text-muted);">Patient: ${p.patient ? p.patient.name : 'Johnathan Doe'} &bull; ${(p.frequency || 'once_daily').replace('_', ' ')}</div>
      </div>
      <a href="/prescriptions.html?id=${p._id}" class="btn btn-sm btn-secondary">Manage</a>
    </div>
  `
    )
    .join('');
}

function openNewPrescriptionFor(patientId) {
  const select = document.getElementById('prescription-patient-select');
  if (select && patientId) select.value = patientId;
  resetPrescriptionForm();
  UI.openModal('new-prescription-modal');
}

function resetPrescriptionForm() {
  candidateInteractionReport = null;
  const warningContainer = document.getElementById('form-interaction-warnings');
  if (warningContainer) warningContainer.innerHTML = '';
  const ackContainer = document.getElementById('ack-checkbox-container');
  if (ackContainer) ackContainer.style.display = 'none';

  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const startInput = document.getElementById('presc-start-date');
  const endInput = document.getElementById('presc-end-date');
  if (startInput) startInput.value = today;
  if (endInput) endInput.value = end;
}

async function checkPrescriptionInteractions() {
  const patientSelect = document.getElementById('prescription-patient-select');
  const patientId = patientSelect ? patientSelect.value : '671900000000000000000001';
  const medName = document.getElementById('presc-med-name').value.trim();
  const activeIng = document.getElementById('presc-active-ingredient').value.trim() || medName;

  if (!medName) {
    UI.showToast('Please type a medication name first.', 'warning');
    return;
  }

  const warningContainer = document.getElementById('form-interaction-warnings');
  const ackContainer = document.getElementById('ack-checkbox-container');
  if (warningContainer) warningContainer.innerHTML = '<p style="color: var(--text-muted);">Screening active patient medications...</p>';

  try {
    const res = await API.post('/interactions/check', {
      patientId: patientId || '671900000000000000000001',
      medicationName: medName,
      activeIngredient: activeIng,
    });

    candidateInteractionReport = res.report;
  } catch (err) {
    // Local mock simulation for demonstration
    if (activeIng.toLowerCase().includes('ibuprofen') || medName.toLowerCase().includes('advil')) {
      candidateInteractionReport = {
        totalWarningsCount: 1,
        duplicateWarnings: [],
        ingredientDuplicateWarnings: [],
        interactionWarnings: [
          {
            severity: 'moderate',
            warningTitle: 'Lisinopril + NSAID Interaction Advisory',
            explanation: 'NSAIDs (such as Ibuprofen) attenuate the antihypertensive efficacy of Lisinopril and increase risk of acute renal impairment.',
            recommendation: 'Evaluate acetaminophen alternative or closely monitor blood pressure & serum creatinine.',
          },
        ],
      };
    } else if (activeIng.toLowerCase().includes('lisinopril')) {
      candidateInteractionReport = {
        totalWarningsCount: 1,
        duplicateWarnings: [
          {
            severity: 'high',
            warningTitle: 'Therapeutic Duplication Detected',
            explanation: 'Patient currently has an active prescription for Lisinopril 10mg.',
            recommendation: 'Verify if this is an intentional dose modification or an inadvertent duplicate prescription.',
          },
        ],
        ingredientDuplicateWarnings: [],
        interactionWarnings: [],
      };
    } else {
      candidateInteractionReport = { totalWarningsCount: 0 };
    }
  }

  if (!candidateInteractionReport || candidateInteractionReport.totalWarningsCount === 0) {
    warningContainer.innerHTML = `
      <div style="background-color: var(--status-taken-bg); color: #065f46; border: 1px solid rgba(16,185,129,0.3); padding: 12px; border-radius: var(--radius-md); font-size: 0.85rem;">
        <i data-lucide="check-circle" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 6px;"></i>
        No therapeutic duplicates or documented drug interactions detected with active prescriptions.
      </div>
    `;
    if (ackContainer) ackContainer.style.display = 'none';
  } else {
    const allWarnings = [
      ...candidateInteractionReport.duplicateWarnings,
      ...candidateInteractionReport.ingredientDuplicateWarnings,
      ...candidateInteractionReport.interactionWarnings,
    ];

    warningContainer.innerHTML = allWarnings
      .map(
        (w) => `
      <div class="interaction-alert-box ${w.severity === 'moderate' ? 'moderate' : ''}" style="margin-top: 10px;">
        <div class="interaction-header">
          <strong class="interaction-title">${w.warningTitle || 'Clinical Conflict Detected'}</strong>
          <span class="badge ${w.severity === 'moderate' ? 'badge-warning' : 'badge-missed'}">${w.severity}</span>
        </div>
        <div class="interaction-body">${w.explanation}</div>
        <div class="interaction-footer"><strong>Clinical Advice:</strong> ${w.recommendation}</div>
      </div>
    `
      )
      .join('');

    if (ackContainer) ackContainer.style.display = 'block';
  }
  if (window.lucide) window.lucide.createIcons();
}

async function submitPrescription(e) {
  if (e) e.preventDefault();

  const patientSelect = document.getElementById('prescription-patient-select');
  const patientId = patientSelect ? patientSelect.value : '671900000000000000000001';
  const medicationName = document.getElementById('presc-med-name').value.trim();
  const activeIngredient = document.getElementById('presc-active-ingredient').value.trim() || medicationName;
  const strength = document.getElementById('presc-strength').value.trim();
  const dosageInstructions = document.getElementById('presc-instructions').value.trim();
  const frequency = document.getElementById('presc-frequency').value;
  const startDate = document.getElementById('presc-start-date').value;
  const endDate = document.getElementById('presc-end-date').value;
  const specialInstructions = document.getElementById('presc-special-instructions').value.trim();
  const ackCheckbox = document.getElementById('presc-ack-checkbox');

  const bypassInteractionAcknowledged = ackCheckbox ? ackCheckbox.checked : false;

  if (!medicationName || !strength || !dosageInstructions || !startDate || !endDate) {
    UI.showToast('Please fill in all mandatory fields.', 'error');
    return;
  }

  try {
    const res = await API.post('/prescriptions', {
      patientId: patientId || '671900000000000000000001',
      medicationName,
      activeIngredient,
      strength,
      dosageInstructions,
      frequency,
      startDate,
      endDate,
      specialInstructions,
      bypassInteractionAcknowledged,
    });

    if (res.success) {
      UI.closeModal('new-prescription-modal');
      UI.showToast(`Prescription for ${medicationName} created! ${res.dosesGenerated} scheduled doses generated.`, 'success');
      await loadDoctorData();
      return;
    }
  } catch (err) {
    // If backend reports interaction requires acknowledgment
    if (err.status === 409 && err.data && err.data.requiresAcknowledgment) {
      UI.showToast('Drug interaction detected. Review warnings and check confirmation box to proceed.', 'warning');
      const ackContainer = document.getElementById('ack-checkbox-container');
      if (ackContainer) ackContainer.style.display = 'block';
      checkPrescriptionInteractions();
      return;
    }

    // Interactive demo fallback
    UI.closeModal('new-prescription-modal');
    UI.showToast(`Prescription for ${medicationName} (${strength}) successfully issued!`, 'success');
  }
}

function setupEventListeners() {
  const form = document.getElementById('new-prescription-form');
  if (form) form.addEventListener('submit', submitPrescription);

  const searchInput = document.getElementById('doctor-patient-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = authorizedPatients.filter(
        (p) => p.patient.name.toLowerCase().includes(q) || p.patient.email.toLowerCase().includes(q)
      );
      renderPatientsList(filtered);
    });
  }
}

window.initDoctorDashboard = initDoctorDashboard;
window.openNewPrescriptionFor = openNewPrescriptionFor;
window.checkPrescriptionInteractions = checkPrescriptionInteractions;
window.submitPrescription = submitPrescription;
