const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

router.get('/pharmacies', locationController.getNearbyPharmacies);
router.get('/hospitals', locationController.getNearbyHospitals);

module.exports = router;
