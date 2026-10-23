/**
 * MediKit Authentication & Demo State Helper
 */

const DEFAULT_DEMO_PATIENT = {
  _id: '671900000000000000000001',
  name: 'Johnathan Doe',
  email: 'john.patient@medikit.demo',
  role: 'patient',
  phone: '(555) 100-2020',
  timezone: 'America/New_York',
  status: 'active',
};

const DEFAULT_DEMO_PATIENT_PROFILE = {
  allergies: ['Penicillin', 'Sulfa Drugs'],
  medicalNotes: 'History of stage-1 hypertension and type-2 diabetes mellitus.',
  emergencyContact: {
    name: 'Emily Doe',
    phone: '(555) 300-5050',
    relationship: 'Daughter',
  },
  address: '742 Evergreen Terrace, Metropolis',
  notifyDoseReminders: true,
  notifyMissedDoses: true,
  notifyCaregiversOnMissed: true,
};

let currentUser = null;
let currentProfile = null;

async function checkAuth(requiredRoles = null) {
  try {
    const res = await API.get('/auth/me');
    if (res.success && res.user) {
      currentUser = res.user;
      currentProfile = res.profile;

      if (requiredRoles && !requiredRoles.includes(currentUser.role)) {
        redirectRoleDashboard(currentUser.role);
        return currentUser;
      }
      return currentUser;
    }
  } catch (err) {
    // Backend session not active; gracefully fall back to demo session so no page ever gets stuck loading
    console.log('[Auth] Operating in live interactive Demo Mode.');
  }

  // Graceful fallback user so every page works immediately without requiring prior login
  if (!currentUser) {
    const storedRole = localStorage.getItem('medikit_demo_role') || 'patient';
    currentUser = getMockUserForRole(storedRole);
    currentProfile = storedRole === 'patient' ? DEFAULT_DEMO_PATIENT_PROFILE : {};
  }

  return currentUser;
}

function getMockUserForRole(role) {
  switch (role) {
    case 'doctor':
      return {
        _id: '671900000000000000000002',
        name: 'Dr. Sarah Jenkins, MD',
        email: 'dr.jenkins@medikit.demo',
        role: 'doctor',
        phone: '(555) 200-3030',
      };
    case 'caregiver':
      return {
        _id: '671900000000000000000004',
        name: 'Emily Doe',
        email: 'emily.caregiver@medikit.demo',
        role: 'caregiver',
        phone: '(555) 300-5050',
      };
    case 'pharmacy':
      return {
        _id: '671900000000000000000005',
        name: 'Metro Center Pharmacy Admin',
        email: 'metro.pharmacy@medikit.demo',
        role: 'pharmacy',
        phone: '(555) 400-6060',
      };
    default:
      return DEFAULT_DEMO_PATIENT;
  }
}

function switchDemoRole(role) {
  localStorage.setItem('medikit_demo_role', role);
  redirectRoleDashboard(role);
}

function redirectRoleDashboard(role) {
  switch (role) {
    case 'patient':
      window.location.href = '/patient-dashboard.html';
      break;
    case 'doctor':
      window.location.href = '/doctor-dashboard.html';
      break;
    case 'caregiver':
      window.location.href = '/caregiver-dashboard.html';
      break;
    case 'pharmacy':
      window.location.href = '/pharmacy-dashboard.html';
      break;
    default:
      window.location.href = '/patient-dashboard.html';
  }
}

async function handleLogout() {
  try {
    await API.post('/auth/logout');
  } catch (err) {
    // Ignore error
  }
  localStorage.removeItem('medikit_demo_role');
  window.location.href = '/login.html';
}

window.Auth = {
  checkAuth,
  redirectRoleDashboard,
  switchDemoRole,
  handleLogout,
  getUser: () => currentUser,
  getProfile: () => currentProfile,
  DEFAULT_DEMO_PATIENT,
  DEFAULT_DEMO_PATIENT_PROFILE,
};
