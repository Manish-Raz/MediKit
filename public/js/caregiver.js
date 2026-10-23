/**
 * MediSync Caregiver Dashboard Logic
 */

const SAMPLE_CAREGIVER_PATIENTS = [
  {
    patient: {
      _id: '671900000000000000000001',
      name: 'Johnathan Doe (Father)',
    },
    permissions: {
      relationshipLabel: 'Primary Family Caregiver (Daughter)',
      canRecordDoses: true,
      canViewMedications: true,
    },
    adherence: {
      adherenceRate: 83,
      missed: 1,
    },
    todayDoses: [
      {
        _id: '671900000000000000000051',
        doseTimeSlot: '08:00',
        medicationName: 'Lisinopril',
        strength: '10mg',
        dosageInstructions: 'Take 1 tablet by mouth daily in the morning.',
        status: 'taken',
      },
      {
        _id: '671900000000000000000052',
        doseTimeSlot: '08:00',
        medicationName: 'Metformin',
        strength: '500mg',
        dosageInstructions: 'Take 1 tablet with breakfast.',
        status: 'taken',
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
    ],
  },
];

let currentCaregiver = null;
let assignedPatients = SAMPLE_CAREGIVER_PATIENTS;
let activePatientId = null;

async function initCaregiverDashboard() {
  currentCaregiver = await Auth.checkAuth(['caregiver']);
  UI.initSidebar(currentCaregiver, 'dashboard');
  UI.initTopbar(currentCaregiver, 'Caregiver Family Adherence Hub');

  await loadCaregiverData();
  UI.playPageAnimations();
}

async function loadCaregiverData() {
  try {
    const summaryRes = await API.get('/dashboard/summary');
    if (summaryRes.success && summaryRes.summary && summaryRes.summary.patients && summaryRes.summary.patients.length > 0) {
      assignedPatients = summaryRes.summary.patients;
    } else {
      assignedPatients = SAMPLE_CAREGIVER_PATIENTS;
    }
  } catch (err) {
    assignedPatients = SAMPLE_CAREGIVER_PATIENTS;
  }

  const patientSelect = document.getElementById('caregiver-patient-select');
  if (patientSelect && assignedPatients.length > 0) {
    patientSelect.innerHTML = assignedPatients
      .map(
        (p, idx) =>
          `<option value="${p.patient._id}" ${idx === 0 ? 'selected' : ''}>${p.patient.name}</option>`
      )
      .join('');

    activePatientId = assignedPatients[0].patient._id;
    renderActivePatientView(assignedPatients[0]);

    patientSelect.addEventListener('change', (e) => {
      activePatientId = e.target.value;
      const found = assignedPatients.find((p) => p.patient._id === activePatientId);
      if (found) renderActivePatientView(found);
    });
  } else {
    renderActivePatientView(SAMPLE_CAREGIVER_PATIENTS[0]);
  }
}

function renderActivePatientView(patientData) {
  const nameElem = document.getElementById('active-patient-name');
  const adherenceElem = document.getElementById('caregiver-adherence-rate');
  const missedCountElem = document.getElementById('caregiver-missed-count');
  const permissionNotice = document.getElementById('caregiver-permission-notice');

  if (nameElem) nameElem.innerText = patientData.patient.name;
  if (adherenceElem) adherenceElem.innerText = `${patientData.adherence.adherenceRate}%`;
  if (missedCountElem) missedCountElem.innerText = patientData.adherence.missed;

  if (permissionNotice) {
    if (patientData.permissions && patientData.permissions.canRecordDoses) {
      permissionNotice.innerHTML = `
        <span class="badge badge-taken">
          <i data-lucide="check" style="width: 14px; height: 14px;"></i> Dose Logging Permitted by Patient
        </span>
      `;
    } else {
      permissionNotice.innerHTML = `
        <span class="badge badge-skipped">
          <i data-lucide="eye" style="width: 14px; height: 14px;"></i> View Only
        </span>
      `;
    }
  }

  const dosesContainer = document.getElementById('caregiver-doses-list');
  if (!dosesContainer) return;

  const doses = patientData.todayDoses || [];
  if (doses.length === 0) {
    dosesContainer.innerHTML = '<p style="color: var(--text-muted); padding: 16px;">No doses scheduled for today.</p>';
    return;
  }

  dosesContainer.innerHTML = doses
    .map((dose) => {
      let actionBtn = '';
      if (dose.status === 'upcoming' && patientData.permissions && patientData.permissions.canRecordDoses) {
        actionBtn = `
          <button class="btn btn-sm btn-primary" onclick="caregiverMarkTaken('${dose._id}')">
            <i data-lucide="check" style="width: 14px; height: 14px;"></i> Log as Taken
          </button>
        `;
      } else {
        const badgeClass =
          dose.status === 'taken'
            ? 'badge-taken'
            : dose.status === 'skipped'
            ? 'badge-skipped'
            : dose.status === 'missed'
            ? 'badge-missed'
            : 'badge-upcoming';
        actionBtn = `<span class="badge ${badgeClass}">${dose.status}</span>`;
      }

      return `
        <div class="dose-item">
          <div class="dose-left">
            <div class="dose-time-badge">${dose.doseTimeSlot}</div>
            <div class="dose-details">
              <h4>${dose.medicationName} (${dose.strength})</h4>
              <p>${dose.dosageInstructions || ''}</p>
            </div>
          </div>
          <div class="dose-actions">${actionBtn}</div>
        </div>
      `;
    })
    .join('');

  if (window.lucide) window.lucide.createIcons();
}

async function caregiverMarkTaken(doseId) {
  try {
    await API.patch(`/doses/${doseId}/status`, {
      status: 'taken',
      notes: `Logged by caregiver`,
    });
  } catch (err) {
    // Local demo update
  }

  // Update local view
  const currentP = assignedPatients.find((p) => p.patient._id === activePatientId) || assignedPatients[0];
  const d = currentP.todayDoses.find((x) => x._id === doseId);
  if (d) d.status = 'taken';

  UI.showToast('Dose logged as taken on behalf of family member.', 'success');
  renderActivePatientView(currentP);
}

window.initCaregiverDashboard = initCaregiverDashboard;
window.caregiverMarkTaken = caregiverMarkTaken;
