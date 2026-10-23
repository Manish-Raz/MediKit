const request = require('supertest');
const mongoose = require('mongoose');
const createApp = require('../src/app');
const User = require('../src/models/User');
const Prescription = require('../src/models/Prescription');
const ScheduledDose = require('../src/models/ScheduledDose');
const InteractionRule = require('../src/models/InteractionRule');
const PatientAccess = require('../src/models/PatientAccess');
const PharmacyInventory = require('../src/models/PharmacyInventory');
const { processOverdueDoses, calculatePatientAdherence } = require('../src/services/adherenceService');
const { checkInteractions } = require('../src/services/interactionService');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/medisync_test';
let app;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  app = createApp(TEST_DB_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Clear collections before each test run
  await Promise.all([
    User.deleteMany({}),
    Prescription.deleteMany({}),
    ScheduledDose.deleteMany({}),
    InteractionRule.deleteMany({}),
    PatientAccess.deleteMany({}),
    PharmacyInventory.deleteMany({}),
  ]);
});

describe('1. Authentication & Security', () => {
  it('should register a new patient and verify password is never stored in plaintext', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Alice Patient',
        email: 'alice@test.com',
        password: 'SecretPassword123!',
        role: 'patient',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.user.password).toBeUndefined();

    // Verify raw database record
    const dbUser = await User.findOne({ email: 'alice@test.com' });
    expect(dbUser).toBeDefined();
    expect(dbUser.password).not.toBe('SecretPassword123!');
    expect(dbUser.password).toMatch(/^\$2[aby]\$/); // bcrypt hash format
  });

  it('should reject unauthenticated access to protected APIs', async () => {
    const res = await request(app).get('/api/v1/patients/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should log in an existing user and establish session cookie', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Bob Doctor',
      email: 'bob@test.com',
      password: 'DoctorPassword123!',
      role: 'doctor',
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'bob@test.com',
        password: 'DoctorPassword123!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.headers['set-cookie']).toBeDefined();
    expect(loginRes.body.user.role).toBe('doctor');
  });
});

describe('2. Patient Access & Cross-User Security', () => {
  it('should prevent an unauthorized doctor from prescribing for an unrelated patient', async () => {
    // 1. Create Patient
    const patientRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Patient One',
      email: 'p1@test.com',
      password: 'Password123!',
      role: 'patient',
    });
    const patientId = patientRes.body.user._id;

    // 2. Register Doctor
    const doctorAgent = request.agent(app);
    await doctorAgent.post('/api/v1/auth/register').send({
      name: 'Dr. Stranger',
      email: 'stranger@test.com',
      password: 'Password123!',
      role: 'doctor',
    });

    // 3. Attempt prescription without access grant -> Expect 403 Forbidden
    const presRes = await doctorAgent.post('/api/v1/prescriptions').send({
      patientId,
      medicationName: 'Amoxicillin',
      activeIngredient: 'amoxicillin',
      strength: '500mg',
      dosageInstructions: 'Take 1 capsule every 8 hours',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    expect(presRes.status).toBe(403);
    expect(presRes.body.error).toMatch(/Access denied/i);
  });

  it('should permit prescription creation once explicit patient authorization is granted', async () => {
    // 1. Register Patient & login
    const patientAgent = request.agent(app);
    const pRes = await patientAgent.post('/api/v1/auth/register').send({
      name: 'Patient Two',
      email: 'p2@test.com',
      password: 'Password123!',
      role: 'patient',
    });
    const patientId = pRes.body.user._id;

    // 2. Register Doctor
    const doctorAgent = request.agent(app);
    await doctorAgent.post('/api/v1/auth/register').send({
      name: 'Dr. Friendly',
      email: 'friendly@test.com',
      password: 'Password123!',
      role: 'doctor',
    });

    // 3. Patient grants access to doctor
    const grantRes = await patientAgent.post(`/api/v1/patients/${patientId}/access`).send({
      email: 'friendly@test.com',
      relationshipLabel: 'Primary Doctor',
    });
    expect(grantRes.status).toBe(201);

    // 4. Doctor now prescribes successfully
    const presRes = await doctorAgent.post('/api/v1/prescriptions').send({
      patientId,
      medicationName: 'Amoxicillin',
      activeIngredient: 'amoxicillin',
      strength: '500mg',
      dosageInstructions: 'Take 1 capsule three times daily',
      frequency: 'three_times_daily',
      startDate: new Date(),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    expect(presRes.status).toBe(201);
    expect(presRes.body.prescription.medicationName).toBe('Amoxicillin');
    expect(presRes.body.dosesGenerated).toBeGreaterThan(0);
  });
});

describe('3. Drug Duplication & Interaction Detection Engine', () => {
  it('should detect duplicate medication entries and active ingredient overlaps', async () => {
    const patient = await User.create({
      name: 'Charlie Patient',
      email: 'charlie@test.com',
      password: 'Password123!',
      role: 'patient',
    });

    const doctor = await User.create({
      name: 'Dr. House',
      email: 'house@test.com',
      password: 'Password123!',
      role: 'doctor',
    });

    // Create an existing active prescription for Lisinopril
    await Prescription.create({
      patient: patient._id,
      doctor: doctor._id,
      medicationName: 'Prinivil',
      activeIngredient: 'lisinopril',
      strength: '10mg',
      dosageInstructions: '1 tablet daily',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      scheduledTimes: ['08:00'],
    });

    // 1. Check duplicate ingredient under different brand name
    const check1 = await checkInteractions({
      patientId: patient._id,
      medicationName: 'Zestril',
      activeIngredient: 'lisinopril',
    });

    expect(check1.ingredientDuplicateWarnings.length).toBe(1);
    expect(check1.ingredientDuplicateWarnings[0].type).toBe('DUPLICATE_ACTIVE_INGREDIENT');
    expect(check1.disclaimer).toBeDefined();

    // 2. Check direct duplicate medication name
    const check2 = await checkInteractions({
      patientId: patient._id,
      medicationName: 'Prinivil',
      activeIngredient: 'lisinopril',
    });

    expect(check2.duplicateWarnings.length).toBe(1);
    expect(check2.duplicateWarnings[0].type).toBe('DUPLICATE_MEDICATION');
  });

  it('should flag potential drug interactions from configured clinical ruleset', async () => {
    const patient = await User.create({
      name: 'David Patient',
      email: 'david@test.com',
      password: 'Password123!',
      role: 'patient',
    });

    const doctor = await User.create({
      name: 'Dr. Watson',
      email: 'watson@test.com',
      password: 'Password123!',
      role: 'doctor',
    });

    // Seed interaction rule: Warfarin + Aspirin
    await InteractionRule.create({
      primaryIngredient: 'aspirin',
      interactingIngredient: 'warfarin',
      severity: 'severe',
      warningTitle: 'Bleeding Risk',
      clinicalExplanation: 'High risk of gastrointestinal hemorrhage.',
    });

    // Patient is already on Warfarin
    await Prescription.create({
      patient: patient._id,
      doctor: doctor._id,
      medicationName: 'Coumadin',
      activeIngredient: 'warfarin',
      strength: '5mg',
      dosageInstructions: 'Take once daily',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      scheduledTimes: ['18:00'],
    });

    // Doctor checks prescribing Aspirin
    const report = await checkInteractions({
      patientId: patient._id,
      medicationName: 'Bayer Aspirin',
      activeIngredient: 'aspirin',
    });

    expect(report.interactionWarnings.length).toBe(1);
    expect(report.interactionWarnings[0].severity).toBe('severe');
    expect(report.interactionWarnings[0].warningTitle).toBe('Bleeding Risk');
  });
});

describe('4. Prescription Lifecycle & Version History', () => {
  it('should preserve previous version when modifying a prescription and cancel future doses on discontinuation', async () => {
    // 1. Setup Patient and Doctor with Access
    const patient = await User.create({
      name: 'Eva Patient',
      email: 'eva@test.com',
      password: 'Password123!',
      role: 'patient',
    });

    const doctorAgent = request.agent(app);
    const docRes = await doctorAgent.post('/api/v1/auth/register').send({
      name: 'Dr. Revisions',
      email: 'revisions@test.com',
      password: 'Password123!',
      role: 'doctor',
    });
    const doctorId = docRes.body.user._id;

    await PatientAccess.create({
      patient: patient._id,
      authorizedUser: doctorId,
      role: 'doctor',
      permissions: { canViewMedications: true, canPrescribe: true },
      status: 'active',
    });

    // 2. Doctor creates initial prescription
    const createRes = await doctorAgent.post('/api/v1/prescriptions').send({
      patientId: patient._id,
      medicationName: 'Metformin',
      activeIngredient: 'metformin',
      strength: '500mg',
      dosageInstructions: 'Take 1 tablet daily with breakfast',
      frequency: 'once_daily',
      startDate: new Date(),
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });
    const presId = createRes.body.prescription._id;

    // 3. Doctor modifies prescription (e.g. increase dosage to 1000mg twice daily)
    const updateRes = await doctorAgent.patch(`/api/v1/prescriptions/${presId}`).send({
      strength: '1000mg',
      dosageInstructions: 'Take 1 tablet twice daily with meals',
      frequency: 'twice_daily',
      modificationReason: 'Inadequate glycemic control at 500mg daily dose.',
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.prescription.version).toBe(2);
    expect(updateRes.body.prescription.strength).toBe('1000mg');

    // Verify original prescription is retained with status 'modified'
    const originalPres = await Prescription.findById(presId);
    expect(originalPres.status).toBe('modified');
    expect(originalPres.version).toBe(1);

    // 4. Discontinue the new version
    const newPresId = updateRes.body.prescription._id;
    const discRes = await doctorAgent.post(`/api/v1/prescriptions/${newPresId}/discontinue`).send({
      discontinuationReason: 'Patient achieved target HbA1c with diet and exercise.',
    });

    expect(discRes.status).toBe(200);
    expect(discRes.body.prescription.status).toBe('discontinued');

    // Verify no future upcoming doses exist for discontinued prescription
    const futureDoses = await ScheduledDose.find({
      prescription: newPresId,
      scheduledTime: { $gt: new Date() },
      status: 'upcoming',
    });
    expect(futureDoses.length).toBe(0);
  });
});

describe('5. Dose Tracking, Idempotency & Adherence Calculation', () => {
  it('should allow patient to mark dose Taken or Skipped with reason and enforce idempotency', async () => {
    const patientAgent = request.agent(app);
    const pRes = await patientAgent.post('/api/v1/auth/register').send({
      name: 'Frank Patient',
      email: 'frank@test.com',
      password: 'Password123!',
      role: 'patient',
    });
    const patientId = pRes.body.user._id;

    const doctor = await User.create({
      name: 'Dr. Dose',
      email: 'dose@test.com',
      password: 'Password123!',
      role: 'doctor',
    });

    const prescription = await Prescription.create({
      patient: patientId,
      doctor: doctor._id,
      medicationName: 'Lisinopril',
      activeIngredient: 'lisinopril',
      strength: '10mg',
      dosageInstructions: '1 tablet in the morning',
      startDate: new Date(),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'active',
      scheduledTimes: ['08:00'],
    });

    const dose = await ScheduledDose.create({
      patient: patientId,
      prescription: prescription._id,
      scheduledTime: new Date(),
      doseTimeSlot: '08:00',
      medicationName: 'Lisinopril',
      strength: '10mg',
      status: 'upcoming',
    });

    // 1. Mark as Skipped with reason
    const skipRes = await patientAgent.patch(`/api/v1/doses/${dose._id}/status`).send({
      status: 'skipped',
      skipReason: 'Feeling dizzy upon standing',
    });

    expect(skipRes.status).toBe(200);
    expect(skipRes.body.dose.status).toBe('skipped');
    expect(skipRes.body.dose.skipReason).toBe('Feeling dizzy upon standing');

    // 2. Mark as Taken
    const takeRes = await patientAgent.patch(`/api/v1/doses/${dose._id}/status`).send({
      status: 'taken',
    });
    expect(takeRes.status).toBe(200);
    expect(takeRes.body.dose.status).toBe('taken');

    // 3. Repeat exact action (Idempotency test)
    const idempotentRes = await patientAgent.patch(`/api/v1/doses/${dose._id}/status`).send({
      status: 'taken',
    });
    expect(idempotentRes.status).toBe(200);
    expect(idempotentRes.body.message).toContain('already marked');
  });

  it('should process overdue doses to Missed status and calculate adherence statistics accurately', async () => {
    const patient = await User.create({
      name: 'Grace Patient',
      email: 'grace@test.com',
      password: 'Password123!',
      role: 'patient',
    });

    const doctor = await User.create({
      name: 'Dr. Chronos',
      email: 'chronos@test.com',
      password: 'Password123!',
      role: 'doctor',
    });

    const prescription = await Prescription.create({
      patient: patient._id,
      doctor: doctor._id,
      medicationName: 'Atorvastatin',
      activeIngredient: 'atorvastatin',
      strength: '20mg',
      dosageInstructions: '1 tablet daily at night',
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'active',
      scheduledTimes: ['20:00'],
    });

    // Create 3 doses:
    // 1 taken 2 days ago
    // 1 overdue 3 hours ago (still marked 'upcoming')
    // 1 skipped yesterday
    await ScheduledDose.create({
      patient: patient._id,
      prescription: prescription._id,
      scheduledTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
      doseTimeSlot: '20:00',
      medicationName: 'Atorvastatin',
      status: 'taken',
    });

    await ScheduledDose.create({
      patient: patient._id,
      prescription: prescription._id,
      scheduledTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      doseTimeSlot: '20:00',
      medicationName: 'Atorvastatin',
      status: 'skipped',
      skipReason: 'Doctor instructed temporary pause',
    });

    const overdueDose = await ScheduledDose.create({
      patient: patient._id,
      prescription: prescription._id,
      scheduledTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      doseTimeSlot: '20:00',
      medicationName: 'Atorvastatin',
      status: 'upcoming',
    });

    // Run the backend overdue processor
    const overdueResult = await processOverdueDoses(60);
    expect(overdueResult.processedCount).toBeGreaterThanOrEqual(1);

    const reloadedDose = await ScheduledDose.findById(overdueDose._id);
    expect(reloadedDose.status).toBe('missed');

    // Calculate adherence stats (1 taken out of 3 evaluated = 33%)
    const stats = await calculatePatientAdherence(patient._id, 30);
    expect(stats.taken).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.missed).toBe(1);
    expect(stats.adherenceRate).toBe(33);
    expect(stats.hasSevereAdherenceRisk).toBe(true);
  });
});
