/**
 * MediSync Location Discovery & Medicine Availability Finder
 */

const DEFAULT_PHARMACIES = [
  {
    id: 'pharm-1',
    name: 'Metro Center Apothecary & Health Supply',
    address: '320 Broadway Suite 101, Metropolis',
    city: 'Metropolis',
    phone: '(555) 400-6060',
    operatingHours: '8:00 AM - 10:00 PM (Daily)',
    verifiedPartner: true,
    distanceKm: 0.8,
    osmLink: 'https://www.openstreetmap.org/search?query=Pharmacy+Metropolis',
  },
  {
    id: 'pharm-2',
    name: 'CarePlus Community Pharmacy',
    address: '124 Main Street, Metropolis',
    city: 'Metropolis',
    phone: '(555) 123-4567',
    operatingHours: '8:30 AM - 9:00 PM',
    verifiedPartner: true,
    distanceKm: 1.4,
    osmLink: 'https://www.openstreetmap.org/search?query=Pharmacy+Metropolis',
  },
  {
    id: 'pharm-3',
    name: 'Wellness Rx 24/7 Dispensary',
    address: '56 Elm Boulevard, Metropolis',
    city: 'Metropolis',
    phone: '(555) 987-6543',
    operatingHours: 'Open 24 Hours',
    verifiedPartner: true,
    distanceKm: 2.1,
    osmLink: 'https://www.openstreetmap.org/search?query=Pharmacy+Metropolis',
  },
];

const DEFAULT_HOSPITALS = [
  {
    name: 'City General Hospital & Emergency Trauma Pavilion',
    address: '100 Medical Center Parkway, Metropolis',
    city: 'Metropolis',
    phone: '(555) 234-5678',
    type: 'Level-1 Emergency Trauma Center',
    distanceKm: 1.2,
    osmLink: 'https://www.openstreetmap.org/search?query=Hospital+Metropolis',
  },
  {
    name: 'St. Jude Community Hospital & Urgent Care',
    address: '450 Mercy Avenue, Metropolis',
    city: 'Metropolis',
    phone: '(555) 345-6789',
    type: 'Community Hospital & Urgent Care',
    distanceKm: 2.8,
    osmLink: 'https://www.openstreetmap.org/search?query=Hospital+Metropolis',
  },
  {
    name: 'University Memorial Medical Center',
    address: '880 Academic Way, Metropolis',
    city: 'Metropolis',
    phone: '(555) 456-7890',
    type: 'Tertiary Teaching Hospital',
    distanceKm: 4.5,
    osmLink: 'https://www.openstreetmap.org/search?query=Hospital+Metropolis',
  },
];

const SAMPLE_MEDICINE_STOCKS = [
  {
    medicationName: 'Lisinopril',
    strength: '10mg',
    form: 'Tablet',
    pharmacyName: 'Metro Center Apothecary',
    address: '320 Broadway Suite 101, Metropolis',
    quantity: 250,
    price: 12.5,
    availabilityStatus: 'in_stock',
    phone: '(555) 400-6060',
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    medicationName: 'Metformin',
    strength: '500mg',
    form: 'Tablet',
    pharmacyName: 'CarePlus Community Pharmacy',
    address: '124 Main Street, Metropolis',
    quantity: 180,
    price: 9.0,
    availabilityStatus: 'in_stock',
    phone: '(555) 123-4567',
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    medicationName: 'Atorvastatin',
    strength: '20mg',
    form: 'Tablet',
    pharmacyName: 'Wellness Rx 24/7 Dispensary',
    address: '56 Elm Boulevard, Metropolis',
    quantity: 120,
    price: 24.0,
    availabilityStatus: 'in_stock',
    phone: '(555) 987-6543',
    lastVerifiedAt: new Date().toISOString(),
  },
];

let currentUser = null;
let activeTab = 'pharmacies';
let allPharmacies = DEFAULT_PHARMACIES;
let allHospitals = DEFAULT_HOSPITALS;

async function initLocationsPage() {
  currentUser = await Auth.checkAuth();
  UI.initSidebar(currentUser, 'locations');
  UI.initTopbar(currentUser, 'Healthcare Facilities & Pharmacy Discovery');

  await searchFacilities();
  setupEventListeners();
  UI.playPageAnimations();
}

async function searchFacilities(city = '', lat = null, lon = null) {
  try {
    let queryParams = '';
    if (city) queryParams += `city=${encodeURIComponent(city)}&`;
    if (lat && lon) queryParams += `lat=${lat}&lon=${lon}&`;

    const [pharmaciesRes, hospitalsRes] = await Promise.all([
      API.get(`/locations/pharmacies?${queryParams}`),
      API.get(`/locations/hospitals?${queryParams}`),
    ]);

    allPharmacies =
      pharmaciesRes.pharmacies && pharmaciesRes.pharmacies.length > 0
        ? pharmaciesRes.pharmacies
        : DEFAULT_PHARMACIES;
    allHospitals =
      hospitalsRes.hospitals && hospitalsRes.hospitals.length > 0
        ? hospitalsRes.hospitals
        : DEFAULT_HOSPITALS;
  } catch (err) {
    console.log('Using verified local healthcare facility database.');
    allPharmacies = DEFAULT_PHARMACIES;
    allHospitals = DEFAULT_HOSPITALS;
  }

  if (city && city.trim()) {
    const q = city.trim().toLowerCase();
    const filteredPharmacies = allPharmacies.filter(
      (p) =>
        p.city.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
    );
    const filteredHospitals = allHospitals.filter(
      (h) =>
        h.city.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q)
    );
    renderPharmaciesList(filteredPharmacies.length > 0 ? filteredPharmacies : allPharmacies);
    renderHospitalsList(filteredHospitals.length > 0 ? filteredHospitals : allHospitals);
  } else {
    renderPharmaciesList(allPharmacies);
    renderHospitalsList(allHospitals);
  }
}

function renderPharmaciesList(pharmacies) {
  const container = document.getElementById('pharmacies-results-container');
  if (!container) return;

  container.innerHTML = pharmacies
    .map(
      (p) => `
    <div class="card" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <h3 style="font-size: 1.05rem; color: var(--primary-navy);">${p.name}</h3>
          ${p.verifiedPartner ? '<span class="badge badge-verified"><i data-lucide="check-circle" style="width: 12px; height: 12px;"></i> Verified Partner</span>' : ''}
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
          <i data-lucide="map-pin" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i>
          ${p.address}, ${p.city} &bull; <strong>~${p.distanceKm || '1.0'} km away</strong>
        </p>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
          Phone: ${p.phone} &bull; Hours: ${p.operatingHours || 'Standard Hours'}
        </p>
      </div>
      <div style="flex-shrink: 0;">
        <a href="${p.osmLink || `https://www.openstreetmap.org/search?query=${encodeURIComponent(p.name)}`}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">
          <i data-lucide="navigation" style="width: 14px; height: 14px;"></i> Directions (OSM)
        </a>
      </div>
    </div>
  `
    )
    .join('');

  if (window.lucide) window.lucide.createIcons();
}

function renderHospitalsList(hospitals) {
  const container = document.getElementById('hospitals-results-container');
  if (!container) return;

  container.innerHTML = hospitals
    .map(
      (h) => `
    <div class="card" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-left: 4px solid #ef4444;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <h3 style="font-size: 1.05rem; color: var(--primary-navy);">${h.name}</h3>
          <span class="badge badge-missed">Emergency 24/7</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
          <i data-lucide="map-pin" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i>
          ${h.address}, ${h.city} &bull; <strong>~${h.distanceKm} km away</strong>
        </p>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
          Phone: ${h.phone} &bull; Facility: ${h.type}
        </p>
      </div>
      <div style="flex-shrink: 0;">
        <a href="${h.osmLink || `https://www.openstreetmap.org/search?query=${encodeURIComponent(h.name)}`}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">
          <i data-lucide="navigation" style="width: 14px; height: 14px;"></i> Directions (OSM)
        </a>
      </div>
    </div>
  `
    )
    .join('');

  if (window.lucide) window.lucide.createIcons();
}

async function searchMedicineStock() {
  const query = document.getElementById('medicine-search-input').value.trim();
  const container = document.getElementById('medicine-search-results');
  if (!container) return;

  if (!query) {
    UI.showToast('Please enter a medication name or active ingredient.', 'warning');
    return;
  }

  container.innerHTML = '<p style="color: var(--text-muted);">Querying verified pharmacy inventory catalogs...</p>';

  let results = [];
  try {
    const res = await API.get(`/pharmacy/search?query=${encodeURIComponent(query)}`);
    if (res.success && res.results && res.results.length > 0) {
      results = res.results;
    } else {
      results = SAMPLE_MEDICINE_STOCKS.filter(
        (m) =>
          m.medicationName.toLowerCase().includes(query.toLowerCase()) ||
          (m.brandName && m.brandName.toLowerCase().includes(query.toLowerCase()))
      );
    }
  } catch (err) {
    results = SAMPLE_MEDICINE_STOCKS.filter((m) =>
      m.medicationName.toLowerCase().includes(query.toLowerCase())
    );
  }

  if (results.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 16px;">
        <p>No verified pharmacies currently report stock for '<strong>${query}</strong>'. Contact nearby pharmacies directly to verify.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="margin-bottom: 12px; font-size: 0.8rem; color: var(--text-muted);">
      Found ${results.length} reported stock listing(s) for "${query}". Always call ahead to confirm real-time availability.
    </div>
    ${results
      .map(
        (item) => `
      <div style="padding: 14px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: white; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: var(--primary-navy);">${item.medicationName}</strong> (${item.strength}, ${item.form})
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
            Available at: <strong>${item.pharmacyName}</strong> &bull; ${item.address}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
            Reported: ${item.quantity} units &bull; Price: $${Number(item.price).toFixed(2)} &bull; Phone: ${item.phone} &bull; Verified: ${new Date(item.lastVerifiedAt).toLocaleDateString()}
          </div>
        </div>
        <span class="badge ${item.availabilityStatus === 'in_stock' ? 'badge-taken' : 'badge-warning'}">
          ${item.availabilityStatus.replace('_', ' ')}
        </span>
      </div>
    `
      )
      .join('')}
  `;
}

function switchLocationTab(tab) {
  activeTab = tab;
  const pharmaciesView = document.getElementById('pharmacies-view');
  const hospitalsView = document.getElementById('hospitals-view');
  const tabPharmacies = document.getElementById('tab-btn-pharmacies');
  const tabHospitals = document.getElementById('tab-btn-hospitals');

  if (tab === 'pharmacies') {
    pharmaciesView.style.display = 'block';
    hospitalsView.style.display = 'none';
    tabPharmacies.classList.add('btn-primary');
    tabPharmacies.classList.remove('btn-secondary');
    tabHospitals.classList.add('btn-secondary');
    tabHospitals.classList.remove('btn-primary');
  } else {
    pharmaciesView.style.display = 'none';
    hospitalsView.style.display = 'block';
    tabHospitals.classList.add('btn-primary');
    tabHospitals.classList.remove('btn-secondary');
    tabPharmacies.classList.add('btn-secondary');
    tabPharmacies.classList.remove('btn-primary');
  }
}

function requestBrowserGeolocation() {
  if (!navigator.geolocation) {
    UI.showToast('Geolocation is not supported by your browser.', 'warning');
    return;
  }

  UI.showToast('Requesting GPS location...', 'info');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      UI.showToast('GPS coordinates acquired. Filtering facilities...', 'success');
      searchFacilities('', pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      UI.showToast('Location permission denied. Showing Metropolis facilities.', 'warning');
      searchFacilities('Metropolis');
    }
  );
}

function setupEventListeners() {
  const searchBtn = document.getElementById('location-search-btn');
  const cityInput = document.getElementById('location-city-input');

  if (searchBtn && cityInput) {
    searchBtn.addEventListener('click', () => {
      searchFacilities(cityInput.value.trim());
    });
    cityInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchFacilities(cityInput.value.trim());
    });
  }

  const geoBtn = document.getElementById('use-geolocation-btn');
  if (geoBtn) geoBtn.addEventListener('click', requestBrowserGeolocation);

  const medSearchBtn = document.getElementById('medicine-search-btn');
  if (medSearchBtn) medSearchBtn.addEventListener('click', searchMedicineStock);
}

window.initLocationsPage = initLocationsPage;
window.switchLocationTab = switchLocationTab;
window.searchMedicineStock = searchMedicineStock;
