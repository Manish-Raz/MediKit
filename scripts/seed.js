require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const PatientProfile = require('../src/models/PatientProfile');
const DoctorProfile = require('../src/models/DoctorProfile');
const CaregiverProfile = require('../src/models/CaregiverProfile');
const PharmacyProfile = require('../src/models/PharmacyProfile');
const PatientAccess = require('../src/models/PatientAccess');
const MedicationCatalog = require('../src/models/MedicationCatalog');
const Prescription = require('../src/models/Prescription');
const ScheduledDose = require('../src/models/ScheduledDose');
const InteractionRule = require('../src/models/InteractionRule');
const Notification = require('../src/models/Notification');
const PharmacyInventory = require('../src/models/PharmacyInventory');
const AuditLog = require('../src/models/AuditLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medikit';

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed] Connected to database for seeding...');

    // Clear existing collections for a clean, deterministic demo state
    await Promise.all([
      User.deleteMany({}),
      PatientProfile.deleteMany({}),
      DoctorProfile.deleteMany({}),
      CaregiverProfile.deleteMany({}),
      PharmacyProfile.deleteMany({}),
      PatientAccess.deleteMany({}),
      MedicationCatalog.deleteMany({}),
      Prescription.deleteMany({}),
      ScheduledDose.deleteMany({}),
      InteractionRule.deleteMany({}),
      Notification.deleteMany({}),
      PharmacyInventory.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    console.log('[Seed] Existing collections cleared.');

    // 1. Create Demo Users
    const defaultPassword = 'Password123!';

    const patientUser = await User.create({
      name: 'Johnathan Doe',
      email: 'john.patient@medikit.demo',
      password: defaultPassword,
      role: 'patient',
      phone: '(555) 100-2020',
      timezone: 'America/New_York',
      status: 'active',
    });

    const doctor1User = await User.create({
      name: 'Dr. Sarah Jenkins, MD',
      email: 'dr.jenkins@medikit.demo',
      password: defaultPassword,
      role: 'doctor',
      phone: '(555) 200-3030',
      timezone: 'America/New_York',
      status: 'active',
    });

    const doctor2User = await User.create({
      name: 'Dr. Marcus Chen, MD',
      email: 'dr.chen@medikit.demo',
      password: defaultPassword,
      role: 'doctor',
      phone: '(555) 200-4040',
      timezone: 'America/New_York',
      status: 'active',
    });

    const caregiverUser = await User.create({
      name: 'Emily Doe',
      email: 'emily.caregiver@medikit.demo',
      password: defaultPassword,
      role: 'caregiver',
      phone: '(555) 300-5050',
      timezone: 'America/New_York',
      status: 'active',
    });

    const pharmacyUser = await User.create({
      name: 'Metro Center Pharmacy Admin',
      email: 'metro.pharmacy@medikit.demo',
      password: defaultPassword,
      role: 'pharmacy',
      phone: '(555) 400-6060',
      timezone: 'America/New_York',
      status: 'active',
    });

    console.log('[Seed] Demo users created.');

    // 2. Create Profiles
    await PatientProfile.create({
      user: patientUser._id,
      dateOfBirth: new Date('1968-05-14'),
      gender: 'male',
      bloodType: 'O+',
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
    });

    await DoctorProfile.create({
      user: doctor1User._id,
      specialty: 'Internal Medicine & Primary Care',
      licenseNumber: 'MD-NY-849201',
      clinicHospital: 'Metropolis Health Pavilion',
      verifiedStatus: true,
      bio: 'Board-certified internist with 15+ years experience coordinating chronic cardiovascular and metabolic conditions.',
      officePhone: '(555) 200-3030',
    });

    await DoctorProfile.create({
      user: doctor2User._id,
      specialty: 'Cardiovascular Disease',
      licenseNumber: 'MD-NY-918234',
      clinicHospital: 'St. Jude Heart Institute',
      verifiedStatus: true,
      bio: 'Cardiologist specializing in hypertension management and coronary artery disease prevention.',
      officePhone: '(555) 200-4040',
    });

    await CaregiverProfile.create({
      user: caregiverUser._id,
      relationship: 'Daughter & Primary Caregiver',
      phone: '(555) 300-5050',
      notes: 'Assists with daily morning reminders and grocery shopping.',
    });

    await PharmacyProfile.create({
      user: pharmacyUser._id,
      pharmacyName: 'Metro Center Apothecary & Health Supply',
      licenseNumber: 'PHARM-88204-NY',
      address: '320 Broadway Suite 101',
      city: 'Metropolis',
      postalCode: '10001',
      phone: '(555) 400-6060',
      latitude: 40.7128,
      longitude: -74.006,
      operatingHours: '8:00 AM - 10:00 PM (Daily)',
      verifiedStatus: true,
    });

    console.log('[Seed] Role profiles created.');

    // 3. Create Patient Access Authorizations
    await PatientAccess.create([
      {
        patient: patientUser._id,
        authorizedUser: doctor1User._id,
        role: 'doctor',
        relationshipLabel: 'Primary Care Physician',
        permissions: {
          canViewMedications: true,
          canRecordDoses: false,
          canPrescribe: true,
        },
        status: 'active',
      },
      {
        patient: patientUser._id,
        authorizedUser: doctor2User._id,
        role: 'doctor',
        relationshipLabel: 'Attending Cardiologist',
        permissions: {
          canViewMedications: true,
          canRecordDoses: false,
          canPrescribe: true,
        },
        status: 'active',
      },
      {
        patient: patientUser._id,
        authorizedUser: caregiverUser._id,
        role: 'caregiver',
        relationshipLabel: 'Primary Family Caregiver',
        permissions: {
          canViewMedications: true,
          canRecordDoses: true,
          canPrescribe: false,
        },
        status: 'active',
      },
    ]);

    console.log('[Seed] Patient access relationships established.');

    // 4. Seed Interaction Rules (Documented Clinical Ruleset)
    await InteractionRule.create([
      {
        primaryIngredient: 'aspirin',
        interactingIngredient: 'warfarin',
        severity: 'severe',
        warningTitle: 'Severe Hemorrhage & Bleeding Risk',
        clinicalExplanation:
          'Concurrent administration of Aspirin (antiplatelet) and Warfarin (anticoagulant) substantially increases the risk of severe upper gastrointestinal bleeding and systemic hemorrhage.',
        recommendation:
          'Co-administration is generally contraindicated unless strictly indicated and closely monitored with frequent INR testing.',
        evidenceSource: 'FDA Drug Safety Communication / National Library of Medicine (NLM)',
        verificationDate: new Date('2024-01-15'),
        ruleVersion: '1.2.0-clinical',
      },
      {
        primaryIngredient: 'lisinopril',
        interactingIngredient: 'ibuprofen',
        severity: 'moderate',
        warningTitle: 'Reduced Antihypertensive Efficacy & Nephrotoxicity Risk',
        clinicalExplanation:
          'NSAIDs such as Ibuprofen may attenuate the blood-pressure lowering effect of ACE inhibitors (Lisinopril) and increase the risk of acute renal impairment and hyperkalemia.',
        recommendation:
          'Consider acetaminophen for analgesia when possible, or monitor serum creatinine and blood pressure if NSAID use is unavoidable.',
        evidenceSource: 'Micromedex Healthcare Series / American College of Cardiology',
        verificationDate: new Date('2024-02-10'),
        ruleVersion: '1.1.0-clinical',
      },
      {
        primaryIngredient: 'lisinopril',
        interactingIngredient: 'potassium chloride',
        severity: 'severe',
        warningTitle: 'Hyperkalemia Risk',
        clinicalExplanation:
          'ACE inhibitors reduce aldosterone production leading to potassium retention. Co-administration with potassium chloride or potassium-sparing agents can cause life-threatening hyperkalemia.',
        recommendation: 'Avoid potassium supplements without explicit laboratory monitoring of serum potassium levels.',
        evidenceSource: 'FDA Package Insert / NIH PubChem',
        verificationDate: new Date('2024-03-01'),
        ruleVersion: '1.0.0-clinical',
      },
      {
        primaryIngredient: 'clopidogrel',
        interactingIngredient: 'omeprazole',
        severity: 'moderate',
        warningTitle: 'Decreased Antiplatelet Efficacy',
        clinicalExplanation:
          'Omeprazole competitively inhibits CYP2C19, significantly reducing metabolic conversion of Clopidogrel to its active antiplatelet metabolite.',
        recommendation: 'Consider alternative acid reducers such as pantoprazole or H2 blockers (famotidine).',
        evidenceSource: 'FDA Safety Alert (Nov 2009 / Updated 2021)',
        verificationDate: new Date('2024-01-20'),
        ruleVersion: '1.0.0-clinical',
      },
      {
        primaryIngredient: 'sertraline',
        interactingIngredient: 'tramadol',
        severity: 'severe',
        warningTitle: 'Potential Serotonin Syndrome',
        clinicalExplanation:
          'Both Sertraline (SSRI) and Tramadol elevate synaptic serotonin levels. Combining them can precipitate life-threatening serotonin syndrome (autonomic instability, hyperthermia, tremor, confusion).',
        recommendation: 'Avoid combination or use non-serotonergic analgesics.',
        evidenceSource: 'FDA MedWatch Clinical Alert',
        verificationDate: new Date('2024-02-18'),
        ruleVersion: '1.1.0-clinical',
      },
    ]);

    console.log('[Seed] Demonstration interaction rules loaded.');

    // 5. Seed Medication Catalog
    const catalogItems = await MedicationCatalog.create([
      {
        name: 'Prinivil',
        brandName: 'Prinivil',
        activeIngredient: 'lisinopril',
        strength: '10mg',
        form: 'Tablet',
        category: 'Cardiovascular',
        description: 'ACE inhibitor used for managing hypertension and heart failure.',
      },
      {
        name: 'Glucophage',
        brandName: 'Glucophage',
        activeIngredient: 'metformin',
        strength: '500mg',
        form: 'Tablet',
        category: 'Endocrine',
        description: 'Biguanide antidiabetic agent improving glycemic control in type-2 diabetes.',
      },
      {
        name: 'Lipitor',
        brandName: 'Lipitor',
        activeIngredient: 'atorvastatin',
        strength: '20mg',
        form: 'Tablet',
        category: 'Cardiovascular',
        description: 'HMG-CoA reductase inhibitor for lowering LDL cholesterol.',
      },
      {
        name: 'Advil',
        brandName: 'Advil',
        activeIngredient: 'ibuprofen',
        strength: '200mg',
        form: 'Tablet',
        category: 'Analgesic / NSAID',
        description: 'Nonsteroidal anti-inflammatory drug used for fever and pain relief.',
      },
      {
        name: 'Coumadin',
        brandName: 'Coumadin',
        activeIngredient: 'warfarin',
        strength: '5mg',
        form: 'Tablet',
        category: 'Anticoagulant',
        description: 'Anticoagulant used to prevent and treat blood clots.',
      },
      {
        name: 'Bayer Aspirin',
        brandName: 'Bayer',
        activeIngredient: 'aspirin',
        strength: '81mg',
        form: 'Tablet',
        category: 'Antiplatelet',
        description: 'Low-dose acetylsalicylic acid used for secondary cardiovascular prophylaxis.',
      },
    ]);

    console.log('[Seed] Medication catalog populated.');

    // 6. Create Active Prescriptions for Patient
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10);
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 50);

    const pres1 = await Prescription.create({
      patient: patientUser._id,
      doctor: doctor1User._id,
      medicationName: 'Lisinopril',
      activeIngredient: 'lisinopril',
      strength: '10mg',
      dosageInstructions: 'Take 1 tablet by mouth daily in the morning with water.',
      route: 'Oral',
      frequency: 'once_daily',
      scheduledTimes: ['08:00'],
      startDate,
      endDate,
      specialInstructions: 'Monitor blood pressure weekly. Avoid potassium supplements.',
      status: 'active',
      version: 1,
    });
    pres1.rootPrescriptionId = pres1._id;
    await pres1.save();

    const pres2 = await Prescription.create({
      patient: patientUser._id,
      doctor: doctor1User._id,
      medicationName: 'Metformin',
      activeIngredient: 'metformin',
      strength: '500mg',
      dosageInstructions: 'Take 1 tablet by mouth twice daily with meals.',
      route: 'Oral',
      frequency: 'twice_daily',
      scheduledTimes: ['08:00', '20:00'],
      startDate,
      endDate,
      specialInstructions: 'Take with food to avoid gastrointestinal upset.',
      status: 'active',
      version: 1,
    });
    pres2.rootPrescriptionId = pres2._id;
    await pres2.save();

    const pres3 = await Prescription.create({
      patient: patientUser._id,
      doctor: doctor2User._id,
      medicationName: 'Atorvastatin',
      activeIngredient: 'atorvastatin',
      strength: '20mg',
      dosageInstructions: 'Take 1 tablet by mouth once daily at bedtime.',
      route: 'Oral',
      frequency: 'once_daily',
      scheduledTimes: ['20:00'],
      startDate,
      endDate,
      specialInstructions: 'Take consistently at night. Report any unexplained muscle soreness.',
      status: 'active',
      version: 1,
    });
    pres3.rootPrescriptionId = pres3._id;
    await pres3.save();

    console.log('[Seed] Prescriptions created.');

    // 7. Seed Scheduled Doses (Mixture of Taken, Skipped, Missed, Upcoming for today and yesterday)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const makeDate = (d, h, m) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);

    await ScheduledDose.create([
      // Yesterday's doses
      {
        patient: patientUser._id,
        prescription: pres1._id,
        scheduledTime: makeDate(yesterday, 8, 0),
        doseTimeSlot: '08:00',
        medicationName: 'Lisinopril',
        strength: '10mg',
        dosageInstructions: 'Take 1 tablet by mouth daily in the morning.',
        status: 'taken',
        actualActionTime: makeDate(yesterday, 8, 15),
        recordedBy: patientUser._id,
        recordedByRole: 'patient',
      },
      {
        patient: patientUser._id,
        prescription: pres2._id,
        scheduledTime: makeDate(yesterday, 8, 0),
        doseTimeSlot: '08:00',
        medicationName: 'Metformin',
        strength: '500mg',
        dosageInstructions: 'Take 1 tablet with breakfast.',
        status: 'taken',
        actualActionTime: makeDate(yesterday, 8, 20),
        recordedBy: patientUser._id,
        recordedByRole: 'patient',
      },
      {
        patient: patientUser._id,
        prescription: pres2._id,
        scheduledTime: makeDate(yesterday, 20, 0),
        doseTimeSlot: '20:00',
        medicationName: 'Metformin',
        strength: '500mg',
        dosageInstructions: 'Take 1 tablet with dinner.',
        status: 'skipped',
        actualActionTime: makeDate(yesterday, 20, 30),
        skipReason: 'Mild stomach nausea after evening meal',
        recordedBy: patientUser._id,
        recordedByRole: 'patient',
      },
      {
        patient: patientUser._id,
        prescription: pres3._id,
        scheduledTime: makeDate(yesterday, 20, 0),
        doseTimeSlot: '20:00',
        medicationName: 'Atorvastatin',
        strength: '20mg',
        dosageInstructions: 'Take 1 tablet at bedtime.',
        status: 'taken',
        actualActionTime: makeDate(yesterday, 21, 0),
        recordedBy: caregiverUser._id,
        recordedByRole: 'caregiver',
        notes: 'Daughter assisted with evening medication schedule.',
      },

      // Today's doses
      {
        patient: patientUser._id,
        prescription: pres1._id,
        scheduledTime: makeDate(today, 8, 0),
        doseTimeSlot: '08:00',
        medicationName: 'Lisinopril',
        strength: '10mg',
        dosageInstructions: 'Take 1 tablet by mouth daily in the morning.',
        status: 'taken',
        actualActionTime: makeDate(today, 8, 5),
        recordedBy: patientUser._id,
        recordedByRole: 'patient',
      },
      {
        patient: patientUser._id,
        prescription: pres2._id,
        scheduledTime: makeDate(today, 8, 0),
        doseTimeSlot: '08:00',
        medicationName: 'Metformin',
        strength: '500mg',
        dosageInstructions: 'Take 1 tablet with breakfast.',
        status: 'taken',
        actualActionTime: makeDate(today, 8, 10),
        recordedBy: patientUser._id,
        recordedByRole: 'patient',
      },
      {
        patient: patientUser._id,
        prescription: pres2._id,
        scheduledTime: makeDate(today, 20, 0),
        doseTimeSlot: '20:00',
        medicationName: 'Metformin',
        strength: '500mg',
        dosageInstructions: 'Take 1 tablet with dinner.',
        status: 'upcoming',
      },
      {
        patient: patientUser._id,
        prescription: pres3._id,
        scheduledTime: makeDate(today, 20, 0),
        doseTimeSlot: '20:00',
        medicationName: 'Atorvastatin',
        strength: '20mg',
        dosageInstructions: 'Take 1 tablet at bedtime.',
        status: 'upcoming',
      },
    ]);

    console.log('[Seed] Realistic scheduled dose timeline populated.');

    // 8. Seed Notifications
    await Notification.create([
      {
        recipient: patientUser._id,
        relatedPatient: patientUser._id,
        type: 'prescription_new',
        title: 'New Prescription: Lisinopril 10mg',
        message: 'Dr. Sarah Jenkins added Lisinopril 10mg once daily to your medication schedule.',
        isRead: true,
        readAt: new Date(),
        actionLink: '/patient-dashboard.html',
      },
      {
        recipient: patientUser._id,
        relatedPatient: patientUser._id,
        type: 'dose_reminder',
        title: 'Evening Doses Scheduled',
        message: 'Reminder: Metformin 500mg and Atorvastatin 20mg are scheduled for 8:00 PM tonight.',
        isRead: false,
        actionLink: '/patient-dashboard.html',
      },
      {
        recipient: doctor1User._id,
        relatedPatient: patientUser._id,
        type: 'system',
        title: 'Patient Authorization Confirmed',
        message: 'Johnathan Doe confirmed your authorization as Primary Care Physician.',
        isRead: true,
        readAt: new Date(),
        actionLink: '/doctor-dashboard.html',
      },
      {
        recipient: caregiverUser._id,
        relatedPatient: patientUser._id,
        type: 'system',
        title: 'Caregiver Authorization Granted',
        message: 'Johnathan Doe enabled dose logging permissions for your account.',
        isRead: true,
        readAt: new Date(),
        actionLink: '/caregiver-dashboard.html',
      },
    ]);

    console.log('[Seed] Notifications seeded.');

    // 9. Seed Pharmacy Inventory
    await PharmacyInventory.create([
      {
        pharmacy: pharmacyUser._id,
        medicationName: 'Lisinopril',
        brandName: 'Prinivil',
        activeIngredient: 'lisinopril',
        strength: '10mg',
        form: 'Tablet',
        availabilityStatus: 'in_stock',
        quantity: 250,
        price: 12.5,
        prescriptionRequired: true,
        isDemoStock: true,
        lastVerifiedAt: new Date(),
      },
      {
        pharmacy: pharmacyUser._id,
        medicationName: 'Metformin',
        brandName: 'Glucophage',
        activeIngredient: 'metformin',
        strength: '500mg',
        form: 'Tablet',
        availabilityStatus: 'in_stock',
        quantity: 180,
        price: 9.0,
        prescriptionRequired: true,
        isDemoStock: true,
        lastVerifiedAt: new Date(),
      },
      {
        pharmacy: pharmacyUser._id,
        medicationName: 'Atorvastatin',
        brandName: 'Lipitor',
        activeIngredient: 'atorvastatin',
        strength: '20mg',
        form: 'Tablet',
        availabilityStatus: 'in_stock',
        quantity: 120,
        price: 24.0,
        prescriptionRequired: true,
        isDemoStock: true,
        lastVerifiedAt: new Date(),
      },
      {
        pharmacy: pharmacyUser._id,
        medicationName: 'Advil',
        brandName: 'Advil',
        activeIngredient: 'ibuprofen',
        strength: '200mg',
        form: 'Tablet',
        availabilityStatus: 'in_stock',
        quantity: 500,
        price: 6.99,
        prescriptionRequired: false,
        isDemoStock: true,
        lastVerifiedAt: new Date(),
      },
      {
        pharmacy: pharmacyUser._id,
        medicationName: 'Coumadin',
        brandName: 'Coumadin',
        activeIngredient: 'warfarin',
        strength: '5mg',
        form: 'Tablet',
        availabilityStatus: 'low_stock',
        quantity: 15,
        price: 28.5,
        prescriptionRequired: true,
        isDemoStock: true,
        lastVerifiedAt: new Date(),
      },
    ]);

    console.log('[Seed] Pharmacy inventory loaded.');

    // 10. Audit Log Seed
    await AuditLog.create([
      {
        actor: doctor1User._id,
        actorRole: 'doctor',
        patient: patientUser._id,
        action: 'prescription_created',
        targetRecordId: pres1._id,
        targetModel: 'Prescription',
        description: 'Dr. Sarah Jenkins created initial prescription for Lisinopril 10mg.',
      },
      {
        actor: doctor1User._id,
        actorRole: 'doctor',
        patient: patientUser._id,
        action: 'prescription_created',
        targetRecordId: pres2._id,
        targetModel: 'Prescription',
        description: 'Dr. Sarah Jenkins created initial prescription for Metformin 500mg.',
      },
      {
        actor: patientUser._id,
        actorRole: 'patient',
        patient: patientUser._id,
        action: 'dose_status_updated',
        description: 'Patient marked yesterday morning Lisinopril dose as taken.',
      },
    ]);

    console.log('[Seed] Audit log records initialized.');
    console.log('====================================================');
    console.log(' Demo Seeding Finished Successfully!');
    console.log(' Demo Accounts Created (Password for all: Password123!)');
    console.log(' - Patient:   john.patient@medikit.demo');
    console.log(' - Doctor 1:  dr.jenkins@medikit.demo (Primary Care)');
    console.log(' - Doctor 2:  dr.chen@medikit.demo (Cardiologist)');
    console.log(' - Caregiver: emily.caregiver@medikit.demo');
    console.log(' - Pharmacy:  metro.pharmacy@medikit.demo');
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed with error:', error);
    process.exit(1);
  }
};

seedDatabase();
