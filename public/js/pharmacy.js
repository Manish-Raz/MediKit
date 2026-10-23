/**
 * MediSync Pharmacy Dashboard Logic
 */

const SAMPLE_PHARMACY_ITEMS = [
  {
    _id: '671900000000000000000061',
    medicationName: 'Lisinopril',
    brandName: 'Prinivil',
    activeIngredient: 'lisinopril',
    strength: '10mg',
    form: 'Tablet',
    availabilityStatus: 'in_stock',
    quantity: 250,
    price: 12.5,
    prescriptionRequired: true,
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    _id: '671900000000000000000062',
    medicationName: 'Metformin',
    brandName: 'Glucophage',
    activeIngredient: 'metformin',
    strength: '500mg',
    form: 'Tablet',
    availabilityStatus: 'in_stock',
    quantity: 180,
    price: 9.0,
    prescriptionRequired: true,
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    _id: '671900000000000000000063',
    medicationName: 'Atorvastatin',
    brandName: 'Lipitor',
    activeIngredient: 'atorvastatin',
    strength: '20mg',
    form: 'Tablet',
    availabilityStatus: 'in_stock',
    quantity: 120,
    price: 24.0,
    prescriptionRequired: true,
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    _id: '671900000000000000000064',
    medicationName: 'Coumadin',
    brandName: 'Coumadin',
    activeIngredient: 'warfarin',
    strength: '5mg',
    form: 'Tablet',
    availabilityStatus: 'low_stock',
    quantity: 15,
    price: 28.5,
    prescriptionRequired: true,
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    _id: '671900000000000000000065',
    medicationName: 'Advil',
    brandName: 'Advil',
    activeIngredient: 'ibuprofen',
    strength: '200mg',
    form: 'Tablet',
    availabilityStatus: 'in_stock',
    quantity: 500,
    price: 6.99,
    prescriptionRequired: false,
    lastVerifiedAt: new Date().toISOString(),
  },
];

let currentPharmacy = null;
let inventoryItems = SAMPLE_PHARMACY_ITEMS;
let activeItemToEdit = null;

async function initPharmacyDashboard() {
  currentPharmacy = await Auth.checkAuth(['pharmacy']);
  UI.initSidebar(currentPharmacy, 'dashboard');
  UI.initTopbar(currentPharmacy, 'Pharmacy Inventory & Verification Hub');

  await loadPharmacyData();
  setupEventListeners();
  UI.playPageAnimations();
}

async function loadPharmacyData() {
  let summary = {
    totalItems: 5,
    inStock: 4,
    lowStock: 1,
    outOfStock: 0,
  };

  try {
    const [summaryRes, inventoryRes] = await Promise.all([
      API.get('/dashboard/summary'),
      API.get('/pharmacy/inventory'),
    ]);

    if (summaryRes.success && summaryRes.summary) {
      summary = summaryRes.summary;
    }
    if (inventoryRes.success && inventoryRes.items && inventoryRes.items.length > 0) {
      inventoryItems = inventoryRes.items;
    } else {
      inventoryItems = SAMPLE_PHARMACY_ITEMS;
    }
  } catch (err) {
    inventoryItems = SAMPLE_PHARMACY_ITEMS;
  }

  renderMetrics(summary);
  renderInventoryTable(inventoryItems);
}

function renderMetrics(summary) {
  const totalElem = document.getElementById('pharmacy-total-items');
  const inStockElem = document.getElementById('pharmacy-in-stock');
  const lowStockElem = document.getElementById('pharmacy-low-stock');
  const outStockElem = document.getElementById('pharmacy-out-stock');

  if (totalElem) totalElem.innerText = summary.totalItems || inventoryItems.length;
  if (inStockElem) inStockElem.innerText = summary.inStock || inventoryItems.filter((i) => i.availabilityStatus === 'in_stock').length;
  if (lowStockElem) lowStockElem.innerText = summary.lowStock || inventoryItems.filter((i) => i.availabilityStatus === 'low_stock').length;
  if (outStockElem) outStockElem.innerText = summary.outOfStock || inventoryItems.filter((i) => i.availabilityStatus === 'out_of_stock').length;
}

function renderInventoryTable(items) {
  const tbody = document.getElementById('pharmacy-inventory-tbody');
  if (!tbody) return;

  tbody.innerHTML = items
    .map((item) => {
      const statusBadge =
        item.availabilityStatus === 'in_stock'
          ? '<span class="badge badge-taken">In Stock</span>'
          : item.availabilityStatus === 'low_stock'
          ? '<span class="badge badge-warning">Low Stock</span>'
          : '<span class="badge badge-missed">Out of Stock</span>';

      return `
        <tr>
          <td>
            <strong style="color: var(--primary-navy);">${item.medicationName}</strong>
            ${item.brandName ? `<span style="font-size: 0.78rem; color: var(--text-muted);"> (${item.brandName})</span>` : ''}
            <div style="font-size: 0.75rem; color: var(--text-muted);">Active: ${item.activeIngredient}</div>
          </td>
          <td>${item.strength} (${item.form})</td>
          <td>${statusBadge}</td>
          <td><strong>${item.quantity}</strong> units</td>
          <td>$${Number(item.price).toFixed(2)}</td>
          <td>
            <span style="font-size: 0.78rem; color: var(--text-muted);">
              ${new Date(item.lastVerifiedAt).toLocaleString()}
            </span>
          </td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="openEditItemModal('${item._id}')">
              <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i> Update
            </button>
          </td>
        </tr>
      `;
    })
    .join('');

  if (window.lucide) window.lucide.createIcons();
}

function openAddItemModal() {
  const form = document.getElementById('add-inventory-form');
  if (form) form.reset();
  UI.openModal('add-item-modal');
}

async function submitAddItem(e) {
  if (e) e.preventDefault();

  const medicationName = document.getElementById('item-med-name').value.trim();
  const brandName = document.getElementById('item-brand-name').value.trim();
  const activeIngredient = document.getElementById('item-active-ingredient').value.trim();
  const strength = document.getElementById('item-strength').value.trim();
  const form = document.getElementById('item-form').value;
  const availabilityStatus = document.getElementById('item-status').value;
  const quantity = document.getElementById('item-quantity').value;
  const price = document.getElementById('item-price').value;
  const prescriptionRequired = document.getElementById('item-rx-required').checked;

  if (!medicationName || !activeIngredient || !strength) {
    UI.showToast('Medication name, active ingredient, and strength are required.', 'error');
    return;
  }

  try {
    const res = await API.post('/pharmacy/inventory', {
      medicationName,
      brandName,
      activeIngredient,
      strength,
      form,
      availabilityStatus,
      quantity,
      price,
      prescriptionRequired,
    });

    if (res.success) {
      UI.closeModal('add-item-modal');
      UI.showToast(`${medicationName} added to pharmacy inventory!`, 'success');
      await loadPharmacyData();
      return;
    }
  } catch (err) {
    // Local demo insertion
    inventoryItems.unshift({
      _id: `item-${Date.now()}`,
      medicationName,
      brandName,
      activeIngredient,
      strength,
      form,
      availabilityStatus,
      quantity: Number(quantity) || 100,
      price: Number(price) || 10,
      prescriptionRequired,
      lastVerifiedAt: new Date().toISOString(),
    });
    UI.closeModal('add-item-modal');
    UI.showToast(`${medicationName} added to catalog (Demo mode)!`, 'success');
    renderInventoryTable(inventoryItems);
  }
}

function openEditItemModal(itemId) {
  const item = inventoryItems.find((i) => i._id === itemId);
  if (!item) return;

  activeItemToEdit = item;
  document.getElementById('edit-item-name').innerText = `${item.medicationName} (${item.strength})`;
  document.getElementById('edit-item-status').value = item.availabilityStatus;
  document.getElementById('edit-item-quantity').value = item.quantity;
  document.getElementById('edit-item-price').value = item.price;
  document.getElementById('edit-item-rx-required').checked = item.prescriptionRequired;

  UI.openModal('edit-item-modal');
}

async function submitEditItem(e) {
  if (e) e.preventDefault();
  if (!activeItemToEdit) return;

  const availabilityStatus = document.getElementById('edit-item-status').value;
  const quantity = document.getElementById('edit-item-quantity').value;
  const price = document.getElementById('edit-item-price').value;
  const prescriptionRequired = document.getElementById('edit-item-rx-required').checked;

  try {
    const res = await API.patch(`/pharmacy/inventory/${activeItemToEdit._id}`, {
      availabilityStatus,
      quantity,
      price,
      prescriptionRequired,
    });

    if (res.success) {
      UI.closeModal('edit-item-modal');
      UI.showToast('Inventory item updated and timestamp refreshed!', 'success');
      activeItemToEdit = null;
      await loadPharmacyData();
      return;
    }
  } catch (err) {
    // Local demo update
    activeItemToEdit.availabilityStatus = availabilityStatus;
    activeItemToEdit.quantity = Number(quantity);
    activeItemToEdit.price = Number(price);
    activeItemToEdit.prescriptionRequired = prescriptionRequired;
    activeItemToEdit.lastVerifiedAt = new Date().toISOString();
    UI.closeModal('edit-item-modal');
    UI.showToast('Inventory item updated and timestamp refreshed (Demo mode)!', 'success');
    renderInventoryTable(inventoryItems);
  }
}

function setupEventListeners() {
  const addForm = document.getElementById('add-inventory-form');
  if (addForm) addForm.addEventListener('submit', submitAddItem);

  const editForm = document.getElementById('edit-inventory-form');
  if (editForm) editForm.addEventListener('submit', submitEditItem);

  const searchInput = document.getElementById('inventory-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = inventoryItems.filter(
        (i) =>
          i.medicationName.toLowerCase().includes(q) ||
          i.activeIngredient.toLowerCase().includes(q) ||
          (i.brandName && i.brandName.toLowerCase().includes(q))
      );
      renderInventoryTable(filtered);
    });
  }
}

window.initPharmacyDashboard = initPharmacyDashboard;
window.openAddItemModal = openAddItemModal;
window.openEditItemModal = openEditItemModal;
