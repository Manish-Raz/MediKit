const PharmacyInventory = require('../models/PharmacyInventory');
const PharmacyProfile = require('../models/PharmacyProfile');
const MedicationCatalog = require('../models/MedicationCatalog');
const { recordAudit } = require('../services/auditService');

/**
 * Get inventory belonging to current pharmacy user
 */
const getMyInventory = async (req, res) => {
  try {
    const items = await PharmacyInventory.find({ pharmacy: req.user._id }).sort({ medicationName: 1 });
    return res.status(200).json({
      success: true,
      items,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve pharmacy inventory.',
    });
  }
};

/**
 * Add a medication item to pharmacy inventory
 */
const addInventoryItem = async (req, res) => {
  try {
    const {
      medicationName,
      brandName,
      activeIngredient,
      strength,
      form,
      availabilityStatus,
      quantity,
      price,
      prescriptionRequired,
    } = req.body;

    if (!medicationName || !activeIngredient || !strength) {
      return res.status(400).json({
        success: false,
        error: 'Medication name, active ingredient, and strength are required.',
      });
    }

    const item = new PharmacyInventory({
      pharmacy: req.user._id,
      medicationName: medicationName.trim(),
      brandName: brandName ? brandName.trim() : '',
      activeIngredient: activeIngredient.trim().toLowerCase(),
      strength: strength.trim(),
      form: form || 'Tablet',
      availabilityStatus: availabilityStatus || 'in_stock',
      quantity: quantity !== undefined ? Number(quantity) : 100,
      price: price !== undefined ? Number(price) : 0,
      prescriptionRequired: prescriptionRequired !== undefined ? !!prescriptionRequired : true,
      isDemoStock: true,
      lastVerifiedAt: new Date(),
    });

    await item.save();

    await recordAudit({
      actor: req.user,
      actorRole: req.user.role,
      action: 'inventory_added',
      targetRecordId: item._id,
      targetModel: 'PharmacyInventory',
      description: `Pharmacy added ${item.medicationName} (${item.strength}) to catalog.`,
    });

    return res.status(201).json({
      success: true,
      message: 'Item added to pharmacy catalog.',
      item,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'This medication and strength already exists in your inventory. Update the existing record instead.',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to add inventory item.',
    });
  }
};

/**
 * Update an existing inventory item
 */
const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { availabilityStatus, quantity, price, prescriptionRequired } = req.body;

    const item = await PharmacyInventory.findOne({ _id: id, pharmacy: req.user._id });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Inventory item not found.' });
    }

    if (availabilityStatus) item.availabilityStatus = availabilityStatus;
    if (quantity !== undefined) item.quantity = Number(quantity);
    if (price !== undefined) item.price = Number(price);
    if (prescriptionRequired !== undefined) item.prescriptionRequired = !!prescriptionRequired;
    item.lastVerifiedAt = new Date();

    await item.save();

    return res.status(200).json({
      success: true,
      message: 'Inventory item updated.',
      item,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update inventory item.',
    });
  }
};

/**
 * Search medicine stock across verified participating pharmacies
 */
const searchPublicInventory = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Search query is required.' });
    }

    const regex = new RegExp(query.trim(), 'i');

    const items = await PharmacyInventory.find({
      $or: [{ medicationName: regex }, { brandName: regex }, { activeIngredient: regex }],
    })
      .populate('pharmacy', 'name email phone')
      .limit(30);

    // Enhance with pharmacy profile details
    const pharmacyUserIds = items.map((i) => i.pharmacy._id);
    const profiles = await PharmacyProfile.find({ user: { $in: pharmacyUserIds } });
    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.user.toString()] = p;
    });

    const results = items.map((item) => {
      const prof = profileMap[item.pharmacy._id.toString()];
      return {
        _id: item._id,
        medicationName: item.medicationName,
        brandName: item.brandName,
        activeIngredient: item.activeIngredient,
        strength: item.strength,
        form: item.form,
        availabilityStatus: item.availabilityStatus,
        quantity: item.quantity,
        price: item.price,
        isDemoStock: item.isDemoStock,
        lastVerifiedAt: item.lastVerifiedAt,
        pharmacyName: prof ? prof.pharmacyName : item.pharmacy.name,
        address: prof ? prof.address : 'Address available upon contact',
        city: prof ? prof.city : 'Metropolis',
        phone: prof ? prof.phone : item.pharmacy.phone || 'N/A',
        operatingHours: prof ? prof.operatingHours : 'Standard hours',
      };
    });

    return res.status(200).json({
      success: true,
      query,
      count: results.length,
      disclaimer: 'Stock information reflects reported pharmacy catalog data. Contact pharmacy to confirm real-time availability before traveling.',
      results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to search medicine availability.',
    });
  }
};

module.exports = {
  getMyInventory,
  addInventoryItem,
  updateInventoryItem,
  searchPublicInventory,
};
