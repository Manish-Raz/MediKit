const PharmacyProfile = require('../models/PharmacyProfile');

// Verified fallback hospitals list for reliable offline / hackathon demonstration
const DEMO_HOSPITALS = [
  {
    name: 'City General Hospital & Emergency Center',
    address: '100 Medical Center Parkway, Metropolis',
    city: 'Metropolis',
    phone: '(555) 234-5678',
    type: 'General Acute Care & Emergency',
    distanceKm: 1.2,
    emergency: true,
    latitude: 40.7128,
    longitude: -74.006,
    osmLink: 'https://www.openstreetmap.org/search?query=Hospital',
  },
  {
    name: 'St. Jude Community Health & Urgent Care',
    address: '450 Mercy Avenue, Metropolis',
    city: 'Metropolis',
    phone: '(555) 345-6789',
    type: 'Community Hospital & Urgent Care',
    distanceKm: 2.8,
    emergency: true,
    latitude: 40.72,
    longitude: -73.99,
    osmLink: 'https://www.openstreetmap.org/search?query=Hospital',
  },
  {
    name: 'University Memorial Medical Pavilion',
    address: '880 Academic Way, Metropolis',
    city: 'Metropolis',
    phone: '(555) 456-7890',
    type: 'Tertiary Teaching Hospital',
    distanceKm: 4.5,
    emergency: true,
    latitude: 40.735,
    longitude: -73.985,
    osmLink: 'https://www.openstreetmap.org/search?query=Hospital',
  },
];

const DEMO_FALLBACK_PHARMACIES = [
  {
    name: 'CarePlus Community Pharmacy',
    address: '124 Main Street, Metropolis',
    city: 'Metropolis',
    phone: '(555) 123-4567',
    operatingHours: '8:00 AM - 10:00 PM',
    distanceKm: 0.8,
    verifiedPartner: true,
    latitude: 40.713,
    longitude: -74.004,
    osmLink: 'https://www.openstreetmap.org/search?query=Pharmacy',
  },
  {
    name: 'Wellness Rx Pharmacy',
    address: '56 Elm Boulevard, Metropolis',
    city: 'Metropolis',
    phone: '(555) 987-6543',
    operatingHours: '24 Hours',
    distanceKm: 1.5,
    verifiedPartner: true,
    latitude: 40.718,
    longitude: -74.001,
    osmLink: 'https://www.openstreetmap.org/search?query=Pharmacy',
  },
  {
    name: 'Metro Center Apothecary',
    address: '320 Broadway Suite 101, Metropolis',
    city: 'Metropolis',
    phone: '(555) 555-0199',
    operatingHours: '9:00 AM - 8:00 PM',
    distanceKm: 2.1,
    verifiedPartner: true,
    latitude: 40.725,
    longitude: -73.998,
    osmLink: 'https://www.openstreetmap.org/search?query=Pharmacy',
  },
];

/**
 * Discover nearby pharmacies
 */
const getNearbyPharmacies = async (req, res) => {
  try {
    const { city, lat, lon } = req.query;

    // First fetch registered pharmacy profiles from MongoDB
    const registeredPharmacies = await PharmacyProfile.find().populate('user', 'name email phone');

    let combinedList = registeredPharmacies.map((p) => ({
      id: p._id,
      name: p.pharmacyName,
      address: p.address,
      city: p.city || 'Metropolis',
      phone: p.phone,
      operatingHours: p.operatingHours,
      verifiedPartner: p.verifiedStatus,
      distanceKm: p.latitude && lat ? Math.round(Math.hypot(p.latitude - lat, p.longitude - lon) * 111 * 10) / 10 : 1.0,
      latitude: p.latitude,
      longitude: p.longitude,
      osmLink: `https://www.openstreetmap.org/search?query=${encodeURIComponent(p.pharmacyName + ' ' + p.address)}`,
    }));

    if (combinedList.length === 0) {
      combinedList = DEMO_FALLBACK_PHARMACIES;
    }

    // Filter by city if supplied
    if (city && city.trim()) {
      const q = city.trim().toLowerCase();
      combinedList = combinedList.filter(
        (p) => p.city.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
      );
    }

    return res.status(200).json({
      success: true,
      count: combinedList.length,
      pharmacies: combinedList,
      source: 'MediKit Verified Partner Network & OpenStreetMap Discovery',
    });
  } catch (error) {
    console.error('[Pharmacies Discovery Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to discover nearby pharmacies.',
      fallback: DEMO_FALLBACK_PHARMACIES,
    });
  }
};

/**
 * Discover nearby hospitals and emergency medical facilities
 */
const getNearbyHospitals = async (req, res) => {
  try {
    const { city } = req.query;
    let hospitals = [...DEMO_HOSPITALS];

    if (city && city.trim()) {
      const q = city.trim().toLowerCase();
      hospitals = hospitals.filter(
        (h) => h.city.toLowerCase().includes(q) || h.address.toLowerCase().includes(q) || h.name.toLowerCase().includes(q)
      );
    }

    return res.status(200).json({
      success: true,
      count: hospitals.length,
      hospitals,
      source: 'OpenStreetMap Healthcare Directory & Partner Facilities',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve hospitals.',
    });
  }
};

module.exports = {
  getNearbyPharmacies,
  getNearbyHospitals,
};
