/**
 * MediSync Patient Dashboard Logic
 */

const SAMPLE_TODAY_DOSES = [
  {
    _id: '671900000000000000000051',
    doseTimeSlot: '08:00',
    medicationName: 'Lisinopril',
    strength: '10mg',
    dosageInstructions: 'Take 1 tablet by mouth daily in the morning with water.',
    status: 'taken',
    actualActionTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: '671900000000000000000052',
    doseTimeSlot: '08:00',
    medicationName: 'Metformin',
    strength: '500mg',
    dosageInstructions: 'Take 1 tablet with breakfast.',
    status: 'taken',
    actualActionTime: new Date(Date.now() - 3.8 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: '671900000000000000000053',
    doseTimeSlot: '13:00',
    medicationName: 'Omega-3 Fish Oil',
    strength: '1000mg',
    dosageInstructions: 'Take 1 capsule with lunch (Reported OTC).',
    status: 'taken',
    actualActionTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: '671900000000000000000054',
    doseTimeSlot: '20:00',
    medicationName: 'Metformin',
    strength: '500mg',
    dosageInstructions: 'Take 1 tablet with dinner.',
    status: 'upcoming',
  },
  {
    _id: '671900000000000000000055',
    doseTimeSlot: '20:00',
    medicationName: 'Atorvastatin',
    strength: '20mg',
    dosageInstructions: 'Take 1 tablet at bedtime.',
    status: 'upcoming',
  },
];

const SAMPLE_ACTIVE_PRESC = [
  {
    _id: '671900000000000000000021',
    medicationName: 'Lisinopril',
    activeIngredient: 'lisinopril',
    strength: '10mg',
    frequency: 'once_daily',
    doctor: { name: 'Dr. Sarah Jenkins, MD' },
  },
  {
    _id: '671900000000000000000022',
    medicationName: 'Metformin',
    activeIngredient: 'metformin',
    strength: '500mg',
    frequency: 'twice_daily',
    doctor: { name: 'Dr. Sarah Jenkins, MD' },
  },
  {
    _id: '671900000000000000000023',
    medicationName: 'Atorvastatin',
    activeIngredient: 'atorvastatin',
    strength: '20mg',
    frequency: 'once_daily',
    doctor: { name: 'Dr. Marcus Chen, MD' },
  },
  {
    _id: '671900000000000000000024',
    medicationName: 'Omega-3 Fish Oil',
    activeIngredient: 'omega-3 fatty acids',
    strength: '1000mg',
    frequency: 'once_daily',
    doctor: { name: 'Self-Reported OTC' },
  },
  {
    _id: '671900000000000000000025',
    medicationName: 'Vitamin D3',
    activeIngredient: 'cholecalciferol',
    strength: '2000 IU',
    frequency: 'once_daily',
    doctor: { name: 'Self-Reported OTC' },
  },
];

const SAMPLE_WARNINGS = [
  {
    type: 'POTENTIAL_DRUG_INTERACTION',
    severity: 'moderate',
    warningTitle: 'Lisinopril + NSAID / OTC Interaction Advisory',
    explanation:
      'Co-administration of Lisinopril with NSAIDs (e.g. Ibuprofen/Advil) can attenuate antihypertensive efficacy and increase renal strain.',
    recommendation: 'Use acetaminophen (Tylenol) for routine mild pain relief unless approved by Dr. Jenkins.',
  },
  {
    type: 'MISSING_CLINICAL_REVIEW',
    severity: 'mild',
    warningTitle: 'Pending Clinician Reconciliation Review',
    explanation:
      'Patient added Omega-3 Fish Oil during intake. Awaiting formal physician review at next consultation.',
    recommendation: 'Dr. Sarah Jenkins will review at upcoming appointment on Nov 2.',
  },
];

let currentPatient = null;
let todayDosesList = SAMPLE_TODAY_DOSES;
let activeDoseToSkip = null;

async function initPatientDashboard() {
  currentPatient = await Auth.checkAuth(['patient']);
  UI.initSidebar(currentPatient, 'dashboard');
  UI.initTopbar(currentPatient, 'Patient Health Dashboard');

  await loadDashboardData();
  UI.playPageAnimations();
}

async function loadDashboardData() {
  let summary = {
    adherenceRate: 83,
    activePrescriptionsCount: 5,
    itemsToReviewCount: 2,
    todayDosesRatio: '3/5',
    recordFreshness: 'Needs update',
    activePrescriptions: SAMPLE_ACTIVE_PRESC,
  };

  let profile = Auth.DEFAULT_DEMO_PATIENT_PROFILE;

  try {
    const [summaryRes, todayDosesRes, profileRes] = await Promise.all([
      API.get('/dashboard/summary'),
      API.get('/doses/today'),
      API.get('/patients/me'),
    ]);

    if (summaryRes.success && summaryRes.summary) {
      summary = { ...summary, ...summaryRes.summary };
    }
    if (todayDosesRes.success && todayDosesRes.doses && todayDosesRes.doses.length > 0) {
      todayDosesList = todayDosesRes.doses;
    }
    if (profileRes.success && profileRes.profile) {
      profile = profileRes.profile;
    }
  } catch (err) {
    console.log('Operating in instant interactive patient demo.');
  }

  renderSafetyScorecard(summary);
  renderTodayDoses(todayDosesList);
  renderInteractionWarnings();
  renderPatientProfileBadges(profile);
  renderActiveMedications(summary.activePrescriptions || SAMPLE_ACTIVE_PRESC);
}

// ===============================================
// Signature Feature 10: Medication Safety Scorecard
// ===============================================
function renderSafetyScorecard(summary) {
  const activeMedElem = document.getElementById('scorecard-active-meds');
  const itemsReviewElem = document.getElementById('scorecard-items-review');
  const doseLogsElem = document.getElementById('scorecard-dose-logs');
  const freshnessElem = document.getElementById('scorecard-freshness');
  const adherenceVal = document.getElementById('adherence-rate');
  const adherenceFill = document.getElementById('adherence-progress-fill');

  if (activeMedElem) activeMedElem.innerText = summary.activePrescriptionsCount || 5;
  if (itemsReviewElem) itemsReviewElem.innerText = summary.itemsToReviewCount || 2;

  // Compute today's taken vs total
  const takenCount = todayDosesList.filter((d) => d.status === 'taken').length;
  const totalCount = todayDosesList.length;
  if (doseLogsElem) doseLogsElem.innerText = `${takenCount}/${totalCount}`;

  if (freshnessElem) freshnessElem.innerText = summary.recordFreshness || 'Needs update';

  const rate = summary.adherenceRate || 83;
  if (adherenceVal) adherenceVal.innerText = `${rate}%`;
  if (adherenceFill) adherenceFill.style.width = `${rate}%`;
}

function renderTodayDoses(doses) {
  const container = document.getElementById('today-doses-list');
  if (!container) return;

  container.innerHTML = doses
    .map((dose) => {
      const isUpcoming = dose.status === 'upcoming';
      const isTaken = dose.status === 'taken';
      const isSkipped = dose.status === 'skipped';
      const isMissed = dose.status === 'missed';

      let actionButtons = '';
      if (isUpcoming) {
        actionButtons = `
          <button class="btn btn-sm btn-primary" onclick="markDoseTaken('${dose._id}')">
            <i data-lucide="check" style="width: 14px; height: 14px;"></i> Take
          </button>
          <button class="btn btn-sm btn-secondary" onclick="promptSkipDose('${dose._id}', '${dose.medicationName}')">
            <i data-lucide="x" style="width: 14px; height: 14px;"></i> Skip
          </button>
        `;
      } else if (isTaken) {
        actionButtons = `<span class="badge badge-taken"><i data-lucide="check-circle" style="width: 12px; height: 12px;"></i> Taken</span>`;
      } else if (isSkipped) {
        actionButtons = `<span class="badge badge-skipped" title="${dose.skipReason || 'Skipped'}"><i data-lucide="alert-circle" style="width: 12px; height: 12px;"></i> Skipped</span>`;
      } else if (isMissed) {
        actionButtons = `<span class="badge badge-missed"><i data-lucide="alert-triangle" style="width: 12px; height: 12px;"></i> Missed</span>`;
      }

      return `
        <div class="dose-item">
          <div class="dose-left">
            <div class="dose-time-badge">${dose.doseTimeSlot}</div>
            <div class="dose-details">
              <h4>${dose.medicationName} <span style="font-size: 0.82rem; font-weight: normal; color: var(--text-muted);">(${dose.strength})</span></h4>
              <p>${dose.dosageInstructions || 'As prescribed by physician'}</p>
              ${dose.skipReason ? `<p style="color: var(--status-skipped); font-size: 0.75rem; margin-top: 2px;">Reason: "${dose.skipReason}"</p>` : ''}
            </div>
          </div>
          <div class="dose-actions">
            ${actionButtons}
          </div>
        </div>
      `;
    })
    .join('');

  if (window.lucide) window.lucide.createIcons();
}

async function markDoseTaken(doseId) {
  try {
    await API.patch(`/doses/${doseId}/status`, { status: 'taken' });
  } catch (err) {
    // Local demo update
  }

  const d = todayDosesList.find((x) => x._id === doseId);
  if (d) {
    d.status = 'taken';
    d.actualActionTime = new Date().toISOString();
  }

  UI.showToast(`Dose marked as taken! Keep up the great adherence.`, 'success');
  renderTodayDoses(todayDosesList);
  renderSafetyScorecard({ adherenceRate: 85, activePrescriptionsCount: 5, itemsToReviewCount: 2 });
}

function promptSkipDose(doseId, medName) {
  activeDoseToSkip = doseId;
  const titleElem = document.getElementById('skip-modal-med-title');
  if (titleElem) titleElem.innerText = medName;
  const reasonInput = document.getElementById('skip-reason-input');
  if (reasonInput) reasonInput.value = '';
  UI.openModal('skip-dose-modal');
}

async function confirmSkipDose() {
  if (!activeDoseToSkip) return;
  const reasonInput = document.getElementById('skip-reason-input');
  const reason = reasonInput ? reasonInput.value.trim() : 'Patient recorded skip';

  try {
    await API.patch(`/doses/${activeDoseToSkip}/status`, {
      status: 'skipped',
      skipReason: reason,
    });
  } catch (err) {
    // Local demo update
  }

  const d = todayDosesList.find((x) => x._id === activeDoseToSkip);
  if (d) {
    d.status = 'skipped';
    d.skipReason = reason;
  }

  UI.closeModal('skip-dose-modal');
  UI.showToast('Dose recorded as skipped.', 'warning');
  activeDoseToSkip = null;
  renderTodayDoses(todayDosesList);
}

function renderInteractionWarnings() {
  const container = document.getElementById('interaction-alerts-container');
  if (!container) return;

  container.innerHTML = SAMPLE_WARNINGS.map(
    (w) => `
    <div class="interaction-alert-box ${w.severity === 'moderate' ? 'moderate' : ''}" style="margin-bottom: 12px;">
      <div class="interaction-header">
        <div class="interaction-title">
          <i data-lucide="alert-triangle" style="width: 18px; height: 18px;"></i>
          ${w.warningTitle}
        </div>
        <span class="badge ${w.severity === 'moderate' ? 'badge-warning' : 'badge-upcoming'}">${w.severity}</span>
      </div>
      <div class="interaction-body">${w.explanation}</div>
      <div class="interaction-footer">
        <strong>Review Status:</strong> ${w.recommendation}
      </div>
    </div>
  `
  ).join('');

  if (window.lucide) window.lucide.createIcons();
}

function renderPatientProfileBadges(profile) {
  const allergiesElem = document.getElementById('patient-allergies-list');
  if (allergiesElem) {
    const list = (profile && profile.allergies) || ['Penicillin', 'Sulfa Drugs'];
    allergiesElem.innerHTML = list
      .map(
        (a) =>
          `<span class="badge badge-missed" style="font-size: 0.8rem;"><i data-lucide="alert-circle" style="width: 12px; height: 12px;"></i> ${a}</span>`
      )
      .join(' ');
  }

  const emergencyElem = document.getElementById('emergency-contact-display');
  if (emergencyElem) {
    const c = (profile && profile.emergencyContact) || {
      name: 'Emily Doe',
      relationship: 'Daughter',
      phone: '(555) 300-5050',
    };
    emergencyElem.innerText = `${c.name} (${c.relationship}): ${c.phone}`;
  }
}

function renderActiveMedications(prescriptions) {
  const container = document.getElementById('active-prescriptions-list');
  if (!container) return;

  container.innerHTML = prescriptions
    .map(
      (p) => `
    <div style="padding: 12px 14px; border: 1px solid var(--border-light); border-radius: var(--radius-md); margin-bottom: 8px; background: white; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong style="color: var(--primary-navy);">${p.medicationName}</strong> (${p.strength})
        <div style="font-size: 0.78rem; color: var(--text-muted);">${p.doctor ? p.doctor.name : 'Attending Physician'} &bull; ${(p.frequency || 'daily').replace('_', ' ')}</div>
      </div>
      <a href="/prescriptions.html?id=${p._id}" class="btn btn-sm btn-secondary" style="font-size: 0.78rem;">Details</a>
    </div>
  `
    )
    .join('');
}

window.initPatientDashboard = initPatientDashboard;
window.markDoseTaken = markDoseTaken;
window.promptSkipDose = promptSkipDose;
window.confirmSkipDose = confirmSkipDose;
