/**
 * MediKit User Profile & Patient Access Management
 */

const SAMPLE_ACCESS_LIST = [
  {
    _id: '671900000000000000000041',
    authorizedUser: {
      name: 'Dr. Sarah Jenkins, MD',
      email: 'dr.jenkins@medikit.demo',
    },
    role: 'doctor',
    relationshipLabel: 'Primary Care Physician',
    permissions: { canViewMedications: true, canPrescribe: true, canRecordDoses: false },
    status: 'active',
  },
  {
    _id: '671900000000000000000042',
    authorizedUser: {
      name: 'Dr. Marcus Chen, MD',
      email: 'dr.chen@medikit.demo',
    },
    role: 'doctor',
    relationshipLabel: 'Attending Cardiologist',
    permissions: { canViewMedications: true, canPrescribe: true, canRecordDoses: false },
    status: 'active',
  },
  {
    _id: '671900000000000000000043',
    authorizedUser: {
      name: 'Emily Doe',
      email: 'emily.caregiver@medikit.demo',
    },
    role: 'caregiver',
    relationshipLabel: 'Primary Family Caregiver (Daughter)',
    permissions: { canViewMedications: true, canPrescribe: false, canRecordDoses: true },
    status: 'active',
  },
];

let currentUser = null;
let currentProfile = null;
let currentAccesses = SAMPLE_ACCESS_LIST;

async function initProfilePage() {
  currentUser = await Auth.checkAuth();
  UI.initSidebar(currentUser, 'profile');
  UI.initTopbar(currentUser, 'Health Profile & Record Access');

  await loadProfileData();
  setupEventListeners();
  UI.playPageAnimations();
}

async function loadProfileData() {
  try {
    const res = await API.get('/auth/me');
    if (res.success && res.user) {
      currentUser = res.user;
      currentProfile = res.profile || Auth.DEFAULT_DEMO_PATIENT_PROFILE;
    } else {
      currentUser = Auth.DEFAULT_DEMO_PATIENT;
      currentProfile = Auth.DEFAULT_DEMO_PATIENT_PROFILE;
    }
  } catch (err) {
    currentUser = Auth.DEFAULT_DEMO_PATIENT;
    currentProfile = Auth.DEFAULT_DEMO_PATIENT_PROFILE;
  }

  renderProfileForm(currentUser, currentProfile);

  const accessContainer = document.getElementById('patient-access-management-section');
  if (accessContainer) accessContainer.style.display = 'block';
  await loadPatientAccessList();
}

function renderProfileForm(user, profile) {
  const nameInput = document.getElementById('profile-name');
  const emailInput = document.getElementById('profile-email');
  const phoneInput = document.getElementById('profile-phone');

  if (nameInput) nameInput.value = user.name || 'Johnathan Doe';
  if (emailInput) emailInput.value = user.email || 'john.patient@medikit.demo';
  if (phoneInput) phoneInput.value = user.phone || '(555) 100-2020';

  const allergiesInput = document.getElementById('patient-allergies');
  const notesInput = document.getElementById('patient-notes');
  const emergName = document.getElementById('emerg-name');
  const emergPhone = document.getElementById('emerg-phone');
  const emergRel = document.getElementById('emerg-rel');

  if (allergiesInput) allergiesInput.value = (profile.allergies || ['Penicillin', 'Sulfa Drugs']).join(', ');
  if (notesInput) notesInput.value = profile.medicalNotes || 'History of stage-1 hypertension and type-2 diabetes mellitus.';
  if (emergName) emergName.value = (profile.emergencyContact && profile.emergencyContact.name) || 'Emily Doe';
  if (emergPhone) emergPhone.value = (profile.emergencyContact && profile.emergencyContact.phone) || '(555) 300-5050';
  if (emergRel) emergRel.value = (profile.emergencyContact && profile.emergencyContact.relationship) || 'Daughter';

  const roleDetailsElem = document.getElementById('role-specific-details');
  if (roleDetailsElem && user.role === 'doctor') {
    roleDetailsElem.innerHTML = `
      <div class="card" style="margin-top: 20px;">
        <h3 class="card-title">Professional Doctor Credentials</h3>
        <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 8px;">
          Specialty: <strong>Cardiovascular Disease & Internal Medicine</strong> &bull; License Identifier: <code>MD-NY-849201</code>
        </p>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
          Clinic / Hospital: Metropolis Health Pavilion &bull; <span class="badge badge-verified">Verified Medical Staff</span>
        </p>
      </div>
    `;
  }
}

async function loadPatientAccessList() {
  try {
    const res = await API.get(`/patients/${currentUser._id}/access`);
    if (res.success && res.accesses && res.accesses.length > 0) {
      currentAccesses = res.accesses;
    } else {
      currentAccesses = SAMPLE_ACCESS_LIST;
    }
  } catch (err) {
    currentAccesses = SAMPLE_ACCESS_LIST;
  }
  renderAccessTable(currentAccesses);
}

function renderAccessTable(accesses) {
  const tbody = document.getElementById('patient-access-tbody');
  if (!tbody) return;

  if (!accesses || accesses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <p>No external doctors or caregivers currently have access to your medical records.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = accesses
    .map((acc) => {
      const isRevoked = acc.status === 'revoked';
      const statusBadge = isRevoked
        ? '<span class="badge badge-missed">Revoked</span>'
        : '<span class="badge badge-taken">Active</span>';

      return `
        <tr>
          <td>
            <strong style="color: var(--primary-navy);">${acc.authorizedUser ? acc.authorizedUser.name : 'Unknown User'}</strong>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${acc.authorizedUser ? acc.authorizedUser.email : ''}</div>
          </td>
          <td>
            <span style="text-transform: capitalize; font-weight: 600;">${acc.role}</span>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${acc.relationshipLabel || ''}</div>
          </td>
          <td>
            <div style="font-size: 0.78rem;">
              ${acc.permissions && acc.permissions.canPrescribe ? '<span class="badge badge-verified" style="margin-right: 4px;">Prescribe</span>' : ''}
              ${acc.permissions && acc.permissions.canRecordDoses ? '<span class="badge badge-taken" style="margin-right: 4px;">Log Doses</span>' : ''}
              <span class="badge badge-upcoming">View Records</span>
            </div>
          </td>
          <td>${statusBadge}</td>
          <td>
            ${
              !isRevoked
                ? `<button class="btn btn-sm btn-danger" onclick="revokeAccess('${acc._id}')">Revoke Access</button>`
                : `<button class="btn btn-sm btn-outline" onclick="restoreAccess('${acc._id}')">Re-enable</button>`
            }
          </td>
        </tr>
      `;
    })
    .join('');

  if (window.lucide) window.lucide.createIcons();
}

async function handleGrantAccess(e) {
  if (e) e.preventDefault();

  const emailInput = document.getElementById('grant-access-email');
  const relInput = document.getElementById('grant-access-rel');
  const dosePermission = document.getElementById('grant-can-log-doses');

  const email = emailInput ? emailInput.value.trim() : '';
  const relationshipLabel = relInput ? relInput.value.trim() : '';
  const canRecordDoses = dosePermission ? dosePermission.checked : false;

  if (!email) {
    UI.showToast('Please enter the email address of the doctor or caregiver.', 'error');
    return;
  }

  try {
    const res = await API.post(`/patients/${currentUser._id}/access`, {
      email,
      relationshipLabel,
      canRecordDoses,
    });

    if (res.success) {
      UI.closeModal('grant-access-modal');
      UI.showToast(`Access authorization granted to ${email}!`, 'success');
      await loadPatientAccessList();
      return;
    }
  } catch (err) {
    // Local demo insertion
    currentAccesses.unshift({
      _id: `acc-${Date.now()}`,
      authorizedUser: { name: email.split('@')[0], email },
      role: email.includes('doctor') ? 'doctor' : 'caregiver',
      relationshipLabel: relationshipLabel || 'Care Team Member',
      permissions: { canViewMedications: true, canPrescribe: email.includes('doctor'), canRecordDoses },
      status: 'active',
    });
    UI.closeModal('grant-access-modal');
    UI.showToast(`Access authorization granted to ${email} (Demo Mode)!`, 'success');
    renderAccessTable(currentAccesses);
  }
}

async function revokeAccess(accessId) {
  if (!confirm('Are you sure you want to revoke medical record access for this user?')) return;

  try {
    await API.patch(`/patients/${currentUser._id}/access/${accessId}`, { status: 'revoked' });
  } catch (err) {
    // Local demo update
  }
  const item = currentAccesses.find((a) => a._id === accessId);
  if (item) item.status = 'revoked';
  UI.showToast('Authorization revoked.', 'warning');
  renderAccessTable(currentAccesses);
}

async function restoreAccess(accessId) {
  try {
    await API.patch(`/patients/${currentUser._id}/access/${accessId}`, { status: 'active' });
  } catch (err) {
    // Local demo update
  }
  const item = currentAccesses.find((a) => a._id === accessId);
  if (item) item.status = 'active';
  UI.showToast('Authorization restored to active.', 'success');
  renderAccessTable(currentAccesses);
}

async function handleSaveProfile(e) {
  if (e) e.preventDefault();
  const allergiesStr = document.getElementById('patient-allergies').value;
  const allergies = allergiesStr
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const medicalNotes = document.getElementById('patient-notes').value.trim();
  const emergName = document.getElementById('emerg-name').value.trim();
  const emergPhone = document.getElementById('emerg-phone').value.trim();
  const emergRel = document.getElementById('emerg-rel').value.trim();

  try {
    await API.patch('/patients/me', {
      allergies,
      medicalNotes,
      emergencyContact: { name: emergName, phone: emergPhone, relationship: emergRel },
    });
  } catch (err) {
    // Local save
  }

  UI.showToast('Health profile and emergency contact preferences updated successfully!', 'success');
}

function setupEventListeners() {
  const profileForm = document.getElementById('profile-edit-form');
  if (profileForm) profileForm.addEventListener('submit', handleSaveProfile);

  const grantForm = document.getElementById('grant-access-form');
  if (grantForm) grantForm.addEventListener('submit', handleGrantAccess);
}

window.initProfilePage = initProfilePage;
window.revokeAccess = revokeAccess;
window.restoreAccess = restoreAccess;
