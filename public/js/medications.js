/**
 * MediKit Medications & Unified Timeline Logic
 */

const SAMPLE_MEDICATIONS = [
  {
    _id: '671900000000000000000011',
    medicationName: 'Lisinopril',
    activeIngredient: 'lisinopril',
    strength: '10mg',
    dosageInstructions: 'Take 1 tablet by mouth daily in the morning with water.',
    route: 'Oral',
    frequency: 'once_daily',
    scheduledTimes: ['08:00'],
    status: 'active',
    version: 1,
    doctor: { name: 'Dr. Sarah Jenkins, MD (Primary Care)' },
    specialInstructions: 'Monitor blood pressure weekly. Avoid potassium supplements without physician review.',
  },
  {
    _id: '671900000000000000000012',
    medicationName: 'Metformin',
    activeIngredient: 'metformin',
    strength: '500mg',
    dosageInstructions: 'Take 1 tablet by mouth twice daily with meals.',
    route: 'Oral',
    frequency: 'twice_daily',
    scheduledTimes: ['08:00', '20:00'],
    status: 'active',
    version: 2,
    doctor: { name: 'Dr. Sarah Jenkins, MD (Primary Care)' },
    specialInstructions: 'Take with breakfast and dinner to minimize gastrointestinal upset.',
  },
  {
    _id: '671900000000000000000013',
    medicationName: 'Atorvastatin',
    activeIngredient: 'atorvastatin',
    strength: '20mg',
    dosageInstructions: 'Take 1 tablet by mouth once daily at bedtime.',
    route: 'Oral',
    frequency: 'once_daily',
    scheduledTimes: ['20:00'],
    status: 'active',
    version: 1,
    doctor: { name: 'Dr. Marcus Chen, MD (Cardiologist)' },
    specialInstructions: 'Take consistently at night. Report any unexplained muscle soreness.',
  },
  {
    _id: '671900000000000000000014',
    medicationName: 'Hydrochlorothiazide',
    activeIngredient: 'hydrochlorothiazide',
    strength: '12.5mg',
    dosageInstructions: 'Take 1 tablet daily in the morning.',
    route: 'Oral',
    frequency: 'once_daily',
    scheduledTimes: ['08:00'],
    status: 'discontinued',
    version: 1,
    doctor: { name: 'Dr. Sarah Jenkins, MD' },
    discontinuationReason: 'Replaced with ACE inhibitor (Lisinopril) therapy.',
  },
  {
    _id: '671900000000000000000015',
    medicationName: 'Omega-3 Fish Oil',
    activeIngredient: 'omega-3 fatty acids',
    strength: '1000mg',
    dosageInstructions: '1 capsule daily with meal',
    route: 'Oral',
    frequency: 'once_daily',
    scheduledTimes: ['12:00'],
    status: 'patient_reported',
    version: 1,
    doctor: { name: 'Self-Reported OTC Supplement' },
    specialInstructions: 'Patient reported during routine intake reconciliation.',
  },
];

let currentUser = null;
let currentMedications = [];

async function initMedicationsPage() {
  currentUser = await Auth.checkAuth(['patient', 'doctor', 'caregiver']);
  UI.initSidebar(currentUser, 'medications');
  UI.initTopbar(currentUser, 'Unified Medication Timeline & Reconciliation');

  await loadMedications();
  setupEventListeners();
  UI.playPageAnimations();
}

async function loadMedications() {
  try {
    const res = await API.get('/prescriptions');
    if (res.success && res.prescriptions && res.prescriptions.length > 0) {
      currentMedications = res.prescriptions;
    } else {
      currentMedications = [];
    }
  } catch (err) {
    console.error('Failed to load medications:', err);
    currentMedications = [];
  }
  renderMedicationCards(currentMedications);
}

function renderMedicationCards(prescriptions) {
  const container = document.getElementById('medications-cards-grid');
  if (!container) return;

  if (!prescriptions || prescriptions.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon"><i data-lucide="pill" style="width: 32px; height: 32px;"></i></div>
        <h3>No Medications Found</h3>
        <p>No prescriptions match your selected filter.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = prescriptions
    .map((p) => {
      const isDiscontinued = p.status === 'discontinued';
      const isOTC = p.status === 'patient_reported';
      const statusBadge = isDiscontinued
        ? '<span class="badge badge-missed">Discontinued</span>'
        : isOTC
        ? '<span class="badge badge-warning">Patient Reported OTC</span>'
        : '<span class="badge badge-taken">Active</span>';

      return `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border-left: 4px solid ${isDiscontinued ? '#ef4444' : isOTC ? '#f59e0b' : 'var(--primary-teal)'};">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <h3 style="font-size: 1.15rem; color: var(--primary-navy);">${p.medicationName}</h3>
                <span style="font-size: 0.8rem; color: var(--primary-teal); font-weight: 600;">${p.activeIngredient || ''} &bull; ${p.strength}</span>
              </div>
              ${statusBadge}
            </div>

            <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 14px;">
              <strong>Dosage:</strong> ${p.dosageInstructions}
            </p>

            <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 6px;">
              <strong>Route:</strong> ${p.route || 'Oral'} &bull; <strong>Frequency:</strong> ${(p.frequency || 'daily').replace('_', ' ')}
            </div>

            <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 6px;">
              <strong>Scheduled Times:</strong> ${(p.scheduledTimes || ['08:00']).join(', ')}
            </div>

            ${
              p.discontinuationReason
                ? `<div style="font-size: 0.8rem; color: #b91c1c; background: #fef2f2; padding: 8px 10px; border-radius: var(--radius-sm); margin-top: 10px;"><strong>Discontinued Reason:</strong> ${p.discontinuationReason}</div>`
                : ''
            }

            ${
              p.specialInstructions
                ? `<div style="font-size: 0.8rem; color: #475569; background: var(--bg-surface); padding: 8px 10px; border-radius: var(--radius-sm); margin-top: 10px;"><strong>Note:</strong> ${p.specialInstructions}</div>`
                : ''
            }
          </div>

          <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.78rem; color: var(--text-muted);">${p.doctor ? p.doctor.name : 'Attending Physician'}</span>
            <a href="/prescriptions.html?id=${p._id}" class="btn btn-sm btn-secondary">History</a>
          </div>
        </div>
      `;
    })
    .join('');

  if (window.lucide) window.lucide.createIcons();
}

function filterMedications(status) {
  if (status === 'all') {
    renderMedicationCards(currentMedications);
  } else {
    renderMedicationCards(currentMedications.filter((m) => m.status === status));
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('medications-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = currentMedications.filter(
        (m) =>
          m.medicationName.toLowerCase().includes(q) ||
          (m.activeIngredient && m.activeIngredient.toLowerCase().includes(q))
      );
      renderMedicationCards(filtered);
    });
  }
}

window.initMedicationsPage = initMedicationsPage;
window.filterMedications = filterMedications;
