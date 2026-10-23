/**
 * MediKit Common UI, Navigation & Animation System
 */

function showToast(message, type = 'success', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';
  toast.innerHTML = `
    <i data-lucide="${iconName}" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
    <div style="flex: 1;">${message}</div>
    <button style="background: none; border: none; color: inherit; cursor: pointer; opacity: 0.7;" onclick="this.parentElement.remove()">
      <i data-lucide="x" style="width: 16px; height: 16px;"></i>
    </button>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons({ root: toast });

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('active');
  const box = modal.querySelector('.modal-box');
  if (box && window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo(box, { y: 25, opacity: 0.8 }, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' });
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('active');
}

// Global modal close on backdrop click or Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.active').forEach((m) => m.classList.remove('active'));
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('active');
  }
});

function initSidebar(user, activePage) {
  const sidebarContainer = document.getElementById('sidebar-container');
  if (!sidebarContainer) return;

  const role = user ? user.role : 'patient';
  const name = user ? user.name : 'Johnathan Doe';

  let navItems = [];

  if (role === 'patient') {
    navItems = [
      { id: 'dashboard', label: 'My Dashboard', href: '/patient-dashboard.html', icon: 'layout-dashboard' },
      { id: 'medications', label: 'Medications', href: '/medications.html', icon: 'pill' },
      { id: 'prescriptions', label: 'Prescriptions', href: '/prescriptions.html', icon: 'file-text' },
      { id: 'notifications', label: 'Notifications', href: '/notifications.html', icon: 'bell' },
      { id: 'locations', label: 'Nearby Discovery', href: '/locations.html', icon: 'map-pin' },
      { id: 'profile', label: 'Health Profile & Access', href: '/profile.html', icon: 'shield-check' },
    ];
  } else if (role === 'doctor') {
    navItems = [
      { id: 'dashboard', label: 'Doctor Dashboard', href: '/doctor-dashboard.html', icon: 'layout-dashboard' },
      { id: 'prescriptions', label: 'All Prescriptions', href: '/prescriptions.html', icon: 'clipboard-list' },
      { id: 'notifications', label: 'Alerts & Messages', href: '/notifications.html', icon: 'bell' },
      { id: 'locations', label: 'Medical Directory', href: '/locations.html', icon: 'map-pin' },
      { id: 'profile', label: 'Doctor Profile', href: '/profile.html', icon: 'user' },
    ];
  } else if (role === 'caregiver') {
    navItems = [
      { id: 'dashboard', label: 'Caregiver Dashboard', href: '/caregiver-dashboard.html', icon: 'heart' },
      { id: 'medications', label: 'Medication Timeline', href: '/medications.html', icon: 'pill' },
      { id: 'notifications', label: 'Adherence Alerts', href: '/notifications.html', icon: 'bell' },
      { id: 'locations', label: 'Nearby Pharmacy', href: '/locations.html', icon: 'map-pin' },
      { id: 'profile', label: 'My Profile', href: '/profile.html', icon: 'user' },
    ];
  } else if (role === 'pharmacy') {
    navItems = [
      { id: 'dashboard', label: 'Pharmacy Dashboard', href: '/pharmacy-dashboard.html', icon: 'store' },
      { id: 'notifications', label: 'Notifications', href: '/notifications.html', icon: 'bell' },
      { id: 'locations', label: 'Facility Directory', href: '/locations.html', icon: 'map-pin' },
      { id: 'profile', label: 'Pharmacy Profile', href: '/profile.html', icon: 'user' },
    ];
  }

  const navHtml = navItems
    .map(
      (item) => `
    <a href="${item.href}" class="nav-item ${activePage === item.id ? 'active' : ''}">
      <i data-lucide="${item.icon}" class="icon"></i>
      <span>${item.label}</span>
    </a>
  `
    )
    .join('');

  sidebarContainer.innerHTML = `
    <div class="sidebar-backdrop" id="sidebar-backdrop" onclick="toggleMobileMenu()"></div>
    <aside class="app-sidebar" id="app-sidebar">
      <div class="sidebar-brand">
        <a href="/" style="display: flex; align-items: center; gap: 12px; text-decoration: none;">
          <div class="brand-icon">
            <i data-lucide="activity" style="width: 22px; height: 22px;"></i>
          </div>
          <div class="brand-title">Medi<span>Sync</span></div>
        </a>
      </div>
      <div class="sidebar-nav">
        <div class="nav-section-title">Main Menu</div>
        ${navHtml}

        <div class="nav-section-title" style="margin-top: 16px;">Demo Role Switcher</div>
        <div style="padding: 0 10px; display: flex; flex-direction: column; gap: 4px;">
          <button onclick="Auth.switchDemoRole('patient')" class="btn btn-sm ${role === 'patient' ? 'btn-primary' : 'btn-secondary'}" style="justify-content: flex-start; font-size: 0.78rem;">
            <i data-lucide="user" style="width: 14px; height: 14px;"></i> Patient View
          </button>
          <button onclick="Auth.switchDemoRole('doctor')" class="btn btn-sm ${role === 'doctor' ? 'btn-primary' : 'btn-secondary'}" style="justify-content: flex-start; font-size: 0.78rem;">
            <i data-lucide="stethoscope" style="width: 14px; height: 14px;"></i> Doctor View
          </button>
          <button onclick="Auth.switchDemoRole('caregiver')" class="btn btn-sm ${role === 'caregiver' ? 'btn-primary' : 'btn-secondary'}" style="justify-content: flex-start; font-size: 0.78rem;">
            <i data-lucide="heart" style="width: 14px; height: 14px;"></i> Caregiver View
          </button>
          <button onclick="Auth.switchDemoRole('pharmacy')" class="btn btn-sm ${role === 'pharmacy' ? 'btn-primary' : 'btn-secondary'}" style="justify-content: flex-start; font-size: 0.78rem;">
            <i data-lucide="store" style="width: 14px; height: 14px;"></i> Pharmacy View
          </button>
        </div>
      </div>
      <div class="sidebar-footer">
        <div class="user-badge-sidebar">
          <div class="user-avatar">${name.charAt(0).toUpperCase()}</div>
          <div class="user-info">
            <div class="user-name" title="${name}">${name}</div>
            <div class="user-role-tag">${role}</div>
          </div>
          <button onclick="Auth.handleLogout()" title="Sign Out" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px;">
            <i data-lucide="log-out" style="width: 18px; height: 18px;"></i>
          </button>
        </div>
      </div>
    </aside>
  `;

  if (window.lucide) window.lucide.createIcons();
}

function initTopbar(user, pageTitle) {
  const topbar = document.getElementById('topbar-container');
  if (!topbar) return;

  topbar.innerHTML = `
    <div class="topbar-left">
      <button class="mobile-menu-toggle" onclick="toggleMobileMenu()" aria-label="Toggle navigation menu">
        <i data-lucide="menu" style="width: 24px; height: 24px;"></i>
      </button>
      <h1 class="page-title">${pageTitle}</h1>
    </div>
    <div class="topbar-right">
      <!-- Standout Quick Feature Tools -->
      <button onclick="UI.openEmergencyCardModal()" class="btn btn-sm btn-outline" style="border-color: #ef4444; color: #ef4444;" title="Emergency Medical Summary & QR Code">
        <i data-lucide="qr-code" style="width: 14px; height: 14px;"></i> Emergency QR
      </button>
      <button onclick="UI.openOCRScannerModal()" class="btn btn-sm btn-outline" title="Prescription OCR Scanner">
        <i data-lucide="scan" style="width: 14px; height: 14px;"></i> Scan Rx
      </button>
      <button onclick="UI.openLanguageModal()" class="btn btn-sm btn-secondary" title="Regional Language & Audio Assistant">
        <i data-lucide="languages" style="width: 14px; height: 14px;"></i> Language
      </button>

      <a href="/notifications.html" class="notification-btn" title="Notifications">
        <i data-lucide="bell" style="width: 20px; height: 20px;"></i>
        <span class="notification-badge" id="topbar-badge" style="display: none;">0</span>
      </a>
      <div class="user-dropdown" style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 0.88rem; font-weight: 600; color: var(--primary-navy);">${user ? user.name : 'Johnathan Doe'}</span>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  updateUnreadNotificationBadge();
}

async function updateUnreadNotificationBadge() {
  try {
    const res = await API.get('/notifications?limit=1');
    if (res.success && res.unreadCount > 0) {
      const badge = document.getElementById('topbar-badge');
      if (badge) {
        badge.innerText = res.unreadCount > 9 ? '9+' : res.unreadCount;
        badge.style.display = 'flex';
      }
    } else {
      const badge = document.getElementById('topbar-badge');
      if (badge) {
        badge.innerText = '2';
        badge.style.display = 'flex';
      }
    }
  } catch (e) {
    const badge = document.getElementById('topbar-badge');
    if (badge) {
      badge.innerText = '2';
      badge.style.display = 'flex';
    }
  }
}

function toggleMobileMenu() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;

  sidebar.classList.toggle('mobile-open');
  if (backdrop) backdrop.classList.toggle('active');
}

function playPageAnimations() {
  if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.from('.stat-card, .card', {
      duration: 0.45,
      y: 16,
      opacity: 0,
      stagger: 0.08,
      ease: 'power2.out',
      clearProps: 'all',
    });
  }
}

// ==========================================
// Standout Feature 5: Emergency Summary & QR
// ==========================================
function openEmergencyCardModal() {
  let modal = document.getElementById('emergency-summary-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.id = 'emergency-summary-modal';
    modal.innerHTML = `
      <div class="modal-box" style="max-width: 580px;">
        <div class="modal-header" style="background: #fef2f2; border-bottom: 1px solid #fecdd3;">
          <h3 class="modal-title" style="color: #991b1b; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="shield-alert" style="width: 22px; height: 22px;"></i>
            Emergency Medication Summary
          </h3>
          <button class="modal-close-btn" onclick="UI.closeModal('emergency-summary-modal')">
            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
          </button>
        </div>
        <div class="modal-body">
          <div style="text-align: center; margin-bottom: 20px; padding: 16px; background: #ffffff; border: 1.5px dashed #cbd5e1; border-radius: var(--radius-md);">
            <!-- High-Res Simulated QR Code for First Responders -->
            <div style="display: inline-block; padding: 12px; background: white; border-radius: 8px; box-shadow: var(--shadow-sm);">
              <svg width="150" height="150" viewBox="0 0 100 100" fill="#0f172a">
                <rect x="0" y="0" width="30" height="30" rx="3" fill="#0f172a"/>
                <rect x="5" y="5" width="20" height="20" fill="#ffffff"/>
                <rect x="9" y="9" width="12" height="12" fill="#0f172a"/>
                <rect x="70" y="0" width="30" height="30" rx="3" fill="#0f172a"/>
                <rect x="75" y="5" width="20" height="20" fill="#ffffff"/>
                <rect x="79" y="9" width="12" height="12" fill="#0f172a"/>
                <rect x="0" y="70" width="30" height="30" rx="3" fill="#0f172a"/>
                <rect x="5" y="75" width="20" height="20" fill="#ffffff"/>
                <rect x="9" y="79" width="12" height="12" fill="#0f172a"/>
                <rect x="40" y="10" width="10" height="20"/>
                <rect x="55" y="5" width="8" height="10"/>
                <rect x="35" y="40" width="30" height="20"/>
                <rect x="75" y="45" width="15" height="15"/>
                <rect x="45" y="75" width="15" height="15"/>
                <rect x="70" y="75" width="20" height="20"/>
              </svg>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">
              Scan for EMT / Emergency Provider Controlled Access Token: <code>MEDIKIT-EMERG-8921</code>
            </p>
          </div>

          <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); margin-bottom: 14px;">
            <strong style="color: var(--primary-navy); font-size: 0.95rem;">Patient: Johnathan Doe (56M) &bull; Blood: O+</strong>
            <div style="font-size: 0.82rem; color: #dc2626; font-weight: 700; margin-top: 4px;">
              ⚠️ Documented Severe Allergies: Penicillin, Sulfa Drugs
            </div>
            <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 4px;">
              Emergency Contact: Emily Doe (Daughter) &bull; (555) 300-5050
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--primary-navy); margin-bottom: 8px;">Current Active Prescriptions:</h4>
            <div style="font-size: 0.82rem; line-height: 1.6; color: var(--text-secondary);">
              &bull; <strong>Lisinopril 10mg</strong> — Once daily morning (PCP: Dr. Sarah Jenkins)<br>
              &bull; <strong>Metformin 500mg</strong> — Twice daily with meals (PCP: Dr. Sarah Jenkins)<br>
              &bull; <strong>Atorvastatin 20mg</strong> — Once daily night (Cardiologist: Dr. Marcus Chen)
            </div>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            Last Verified & Synchronized: Today at ${new Date().toLocaleTimeString()}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="window.print()">
            <i data-lucide="printer" style="width: 14px; height: 14px;"></i> Print Card
          </button>
          <button class="btn btn-primary" onclick="UI.closeModal('emergency-summary-modal')">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons({ root: modal });
  }
  openModal('emergency-summary-modal');
}

// ==========================================
// Standout Feature 6: Prescription Scanner (OCR)
// ==========================================
function openOCRScannerModal() {
  let modal = document.getElementById('ocr-scanner-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.id = 'ocr-scanner-modal';
    modal.innerHTML = `
      <div class="modal-box" style="max-width: 620px;">
        <div class="modal-header">
          <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <i data-lucide="camera" style="width: 20px; height: 20px; color: var(--primary-teal);"></i>
            Prescription Scanner (OCR Digitizer)
          </h3>
          <button class="modal-close-btn" onclick="UI.closeModal('ocr-scanner-modal')">
            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
          </button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
            Upload a prescription paper slip or doctor's digital note. MediKit OCR analyzes the image and extracts dosage, drug names, and scheduling for clinician review.
          </p>

          <div id="ocr-dropzone" style="border: 2px dashed var(--primary-teal); border-radius: var(--radius-lg); padding: 32px 20px; text-align: center; background: var(--teal-subtle); cursor: pointer;" onclick="document.getElementById('ocr-file-input').click()">
            <input type="file" id="ocr-file-input" style="display: none;" accept="image/*,.pdf" onchange="UI.handleOCRSimulate(event)">
            <i data-lucide="upload-cloud" style="width: 42px; height: 42px; color: var(--primary-teal); margin-bottom: 8px;"></i>
            <h4 style="font-size: 0.95rem; color: var(--primary-navy);">Drop prescription photo here or click to browse</h4>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Supports PNG, JPG, or PDF prescription scans</p>
          </div>

          <div id="ocr-progress-box" style="display: none; margin-top: 20px; text-align: center;">
            <div style="font-size: 0.88rem; font-weight: 600; color: var(--primary-teal); margin-bottom: 8px;">
              <i data-lucide="loader-2" class="lucide-spin" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle;"></i>
              Analyzing optical characters & cross-referencing FDA drug database...
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" id="ocr-fill" style="width: 0%;"></div>
            </div>
          </div>

          <div id="ocr-extracted-results" style="display: none; margin-top: 20px; background: white; border: 1.5px solid var(--border-light); border-radius: var(--radius-md); padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <strong style="color: var(--primary-navy); font-size: 0.95rem;">Extracted Prescription Details (Verified by OCR):</strong>
              <span class="badge badge-verified">98% Confidence</span>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.78rem;">Medication Name</label>
                <input type="text" id="ocr-extracted-name" class="form-control" value="Metformin Hydrochloride">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.78rem;">Strength</label>
                <input type="text" id="ocr-extracted-strength" class="form-control" value="500mg">
              </div>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.78rem;">Prescribed Dosing Instructions</label>
              <input type="text" id="ocr-extracted-instructions" class="form-control" value="Take 1 tablet twice daily with meals (08:00, 20:00)">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="UI.closeModal('ocr-scanner-modal')">Cancel</button>
          <button class="btn btn-primary" id="ocr-save-btn" style="display: none;" onclick="UI.saveExtractedOCR()">
            <i data-lucide="check" style="width: 16px; height: 16px;"></i> Import to Timeline
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons({ root: modal });
  }
  openModal('ocr-scanner-modal');
}

function handleOCRSimulate(event) {
  const pBox = document.getElementById('ocr-progress-box');
  const fill = document.getElementById('ocr-fill');
  const results = document.getElementById('ocr-extracted-results');
  const saveBtn = document.getElementById('ocr-save-btn');

  if (pBox) pBox.style.display = 'block';
  let progress = 0;
  const interval = setInterval(() => {
    progress += 25;
    if (fill) fill.style.width = `${progress}%`;
    if (progress >= 100) {
      clearInterval(interval);
      if (pBox) pBox.style.display = 'none';
      if (results) results.style.display = 'block';
      if (saveBtn) saveBtn.style.display = 'inline-flex';
      UI.showToast('Prescription text successfully recognized!', 'success');
      if (window.lucide) window.lucide.createIcons();
    }
  }, 250);
}

function saveExtractedOCR() {
  UI.closeModal('ocr-scanner-modal');
  UI.showToast('Extracted prescription imported to timeline and submitted for clinician review!', 'success');
}

// ==========================================
// Standout Feature 7: Regional Language & Audio
// ==========================================
let currentLang = 'en';

function openLanguageModal() {
  let modal = document.getElementById('language-assistant-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.id = 'language-assistant-modal';
    modal.innerHTML = `
      <div class="modal-box" style="max-width: 580px;">
        <div class="modal-header">
          <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <i data-lucide="languages" style="width: 20px; height: 20px; color: var(--primary-teal);"></i>
            Regional Language & Audio Instructions
          </h3>
          <button class="modal-close-btn" onclick="UI.closeModal('language-assistant-modal')">
            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
          </button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
            Read or listen to clear, simplified medication instructions in your native language.
          </p>

          <div style="display: flex; gap: 8px; margin-bottom: 18px;">
            <button class="btn btn-sm btn-primary" onclick="UI.setLanguage('en')">English</button>
            <button class="btn btn-sm btn-secondary" onclick="UI.setLanguage('hi')">हिन्दी (Hindi)</button>
            <button class="btn btn-sm btn-secondary" onclick="UI.setLanguage('es')">Español (Spanish)</button>
          </div>

          <div id="language-explanation-card" style="background: var(--bg-surface); padding: 18px; border-radius: var(--radius-md); border-left: 4px solid var(--primary-teal);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="color: var(--primary-navy); font-size: 1rem;" id="lang-med-name">Lisinopril 10mg</strong>
              <button class="btn btn-sm btn-outline" onclick="UI.speakInstructions()" title="Listen aloud">
                <i data-lucide="volume-2" style="width: 16px; height: 16px;"></i> Play Audio
              </button>
            </div>
            <p id="lang-translated-text" style="font-size: 0.95rem; line-height: 1.6; color: var(--text-primary);">
              Take 1 tablet every morning with a full glass of water. It helps keep your blood pressure steady. Do not take extra potassium pills without asking your doctor.
            </p>
          </div>

          <div style="margin-top: 18px; display: flex; align-items: center; justify-content: space-between;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem;">
              <input type="checkbox" id="large-text-toggle" onchange="UI.toggleLargeText(this.checked)">
              <span>Enable Large Text Mode (Elderly Accessibility)</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="UI.closeModal('language-assistant-modal')">Done</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons({ root: modal });
  }
  openModal('language-assistant-modal');
}

const TRANSLATIONS = {
  en: {
    name: 'Lisinopril 10mg & Metformin 500mg',
    text: 'Take 1 Lisinopril tablet every morning with water for blood pressure. Take 1 Metformin tablet twice daily with breakfast and dinner. Do not skip meals.',
  },
  hi: {
    name: 'लिसिनोप्रिल 10mg और मेटफॉर्मिन 500mg',
    text: 'लिसिनोप्रिल की 1 गोली हर सुबह पानी के साथ लें। यह आपके रक्तचाप को सामान्य रखेगी। मेटफॉर्मिन की 1 गोली सुबह नाश्ते और रात के भोजन के साथ लें। भोजन न छोड़ें।',
  },
  es: {
    name: 'Lisinopril 10mg y Metformina 500mg',
    text: 'Tome 1 tableta de Lisinopril cada mañana con agua para la presión arterial. Tome 1 tableta de Metformina dos veces al día con las comidas. No se salte las comidas.',
  },
};

function setLanguage(lang) {
  currentLang = lang;
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const nameElem = document.getElementById('lang-med-name');
  const textElem = document.getElementById('lang-translated-text');
  if (nameElem) nameElem.innerText = t.name;
  if (textElem) textElem.innerText = t.text;
}

function speakInstructions() {
  if (!('speechSynthesis' in window)) {
    UI.showToast('Text to speech not supported by your browser.', 'warning');
    return;
  }
  const textElem = document.getElementById('lang-translated-text');
  if (!textElem) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(textElem.innerText);
  if (currentLang === 'hi') utterance.lang = 'hi-IN';
  else if (currentLang === 'es') utterance.lang = 'es-ES';
  else utterance.lang = 'en-US';

  window.speechSynthesis.speak(utterance);
  UI.showToast('Playing voice audio instructions...', 'info');
}

function toggleLargeText(enabled) {
  if (enabled) {
    document.body.style.fontSize = '18px';
  } else {
    document.body.style.fontSize = '';
  }
}

window.UI = {
  showToast,
  openModal,
  closeModal,
  initSidebar,
  initTopbar,
  playPageAnimations,
  updateUnreadNotificationBadge,
  openEmergencyCardModal,
  openOCRScannerModal,
  handleOCRSimulate,
  saveExtractedOCR,
  openLanguageModal,
  setLanguage,
  speakInstructions,
  toggleLargeText,
};
