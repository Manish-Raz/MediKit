const InteractionRule = require('../models/InteractionRule');
const Prescription = require('../models/Prescription');

const CLINICAL_DISCLAIMER =
  'MediKit Drug Interaction & Duplication Checker is an educational and screening aid for demonstration purposes only. It does not substitute professional clinical judgment, full pharmaceutical review, or medical consultation. Absence of a warning does not guarantee safety.';

/**
 * Check a candidate medication or full patient profile for duplicates and interactions.
 * @param {Object} params
 * @param {string} params.patientId
 * @param {string} params.medicationName
 * @param {string} params.activeIngredient
 * @param {string} [params.excludePrescriptionId] - When editing an existing prescription
 */
const checkInteractions = async ({
  patientId,
  medicationName,
  activeIngredient,
  excludePrescriptionId = null,
}) => {
  const query = {
    patient: patientId,
    status: 'active',
  };

  if (excludePrescriptionId) {
    query._id = { $ne: excludePrescriptionId };
  }

  const activePrescriptions = await Prescription.find(query);

  const duplicateWarnings = [];
  const ingredientDuplicateWarnings = [];
  const interactionWarnings = [];
  const candidateIngredientClean = (activeIngredient || '').trim().toLowerCase();
  const candidateNameClean = (medicationName || '').trim().toLowerCase();

  for (const pres of activePrescriptions) {
    const existingNameClean = pres.medicationName.trim().toLowerCase();
    const existingIngredientClean = (pres.activeIngredient || '').trim().toLowerCase();

    // 1. Direct duplicate medication name
    if (candidateNameClean && (candidateNameClean === existingNameClean || candidateNameClean.includes(existingNameClean) || existingNameClean.includes(candidateNameClean))) {
      duplicateWarnings.push({
        type: 'DUPLICATE_MEDICATION',
        severity: 'high',
        medicationsCompared: [medicationName, pres.medicationName],
        activeIngredients: [candidateIngredientClean, existingIngredientClean],
        explanation: `Patient currently has an active prescription for '${pres.medicationName}' (${pres.strength}, ${pres.dosageInstructions}). Prescribing '${medicationName}' may result in therapeutic duplication.`,
        recommendation: 'Verify if this is an intentional dose modification or an inadvertent duplicate prescription.',
        existingPrescriptionId: pres._id,
      });
    }

    // 2. Matching active ingredient under different names
    if (
      candidateIngredientClean &&
      existingIngredientClean &&
      candidateIngredientClean === existingIngredientClean &&
      candidateNameClean !== existingNameClean
    ) {
      ingredientDuplicateWarnings.push({
        type: 'DUPLICATE_ACTIVE_INGREDIENT',
        severity: 'high',
        medicationsCompared: [medicationName, pres.medicationName],
        activeIngredient: candidateIngredientClean,
        explanation: `Both '${medicationName}' and active prescription '${pres.medicationName}' contain the same active ingredient '${candidateIngredientClean}'. Co-administration risks accidental overdose.`,
        recommendation: 'Evaluate total daily intake of active ingredient before confirming.',
        existingPrescriptionId: pres._id,
      });
    }

    // 3. Known drug-drug interaction rule check
    if (candidateIngredientClean && existingIngredientClean) {
      const rule = await InteractionRule.findOne({
        $or: [
          { primaryIngredient: candidateIngredientClean, interactingIngredient: existingIngredientClean },
          { primaryIngredient: existingIngredientClean, interactingIngredient: candidateIngredientClean },
        ],
      });

      if (rule) {
        interactionWarnings.push({
          type: 'POTENTIAL_DRUG_INTERACTION',
          severity: rule.severity,
          medicationsCompared: [medicationName, pres.medicationName],
          ingredientsCompared: [candidateIngredientClean, existingIngredientClean],
          warningTitle: rule.warningTitle,
          explanation: rule.clinicalExplanation,
          recommendation: rule.recommendation,
          evidenceSource: rule.evidenceSource,
          verificationDate: rule.verificationDate,
          ruleVersion: rule.ruleVersion,
          existingPrescriptionId: pres._id,
        });
      }
    }
  }

  // 4. Incomplete ingredient check
  const hasIncompleteIngredient = !candidateIngredientClean;

  const totalWarningsCount =
    duplicateWarnings.length + ingredientDuplicateWarnings.length + interactionWarnings.length;

  return {
    safeToProceedWarning: totalWarningsCount > 0,
    hasIncompleteIngredient,
    totalWarningsCount,
    duplicateWarnings,
    ingredientDuplicateWarnings,
    interactionWarnings,
    disclaimer: CLINICAL_DISCLAIMER,
  };
};

/**
 * Scan all active medications for a patient for internal pair-wise interactions & duplicates.
 */
const checkPatientProfileInteractions = async (patientId) => {
  const activePrescriptions = await Prescription.find({
    patient: patientId,
    status: 'active',
  });

  const duplicateWarnings = [];
  const ingredientDuplicateWarnings = [];
  const interactionWarnings = [];

  for (let i = 0; i < activePrescriptions.length; i++) {
    for (let j = i + 1; j < activePrescriptions.length; j++) {
      const p1 = activePrescriptions[i];
      const p2 = activePrescriptions[j];

      const p1Name = p1.medicationName.trim().toLowerCase();
      const p2Name = p2.medicationName.trim().toLowerCase();
      const p1Ing = (p1.activeIngredient || '').trim().toLowerCase();
      const p2Ing = (p2.activeIngredient || '').trim().toLowerCase();

      if (p1Name === p2Name) {
        duplicateWarnings.push({
          type: 'DUPLICATE_MEDICATION',
          severity: 'high',
          medicationsCompared: [p1.medicationName, p2.medicationName],
          activeIngredients: [p1Ing, p2Ing],
          explanation: `Patient has multiple active prescriptions for '${p1.medicationName}'.`,
          recommendation: 'Reconcile active prescription records.',
          prescriptionIds: [p1._id, p2._id],
        });
      } else if (p1Ing && p2Ing && p1Ing === p2Ing) {
        ingredientDuplicateWarnings.push({
          type: 'DUPLICATE_ACTIVE_INGREDIENT',
          severity: 'high',
          medicationsCompared: [p1.medicationName, p2.medicationName],
          activeIngredient: p1Ing,
          explanation: `Active prescriptions '${p1.medicationName}' and '${p2.medicationName}' share active ingredient '${p1Ing}'.`,
          recommendation: 'Check cumulative daily dose.',
          prescriptionIds: [p1._id, p2._id],
        });
      }

      if (p1Ing && p2Ing) {
        const rule = await InteractionRule.findOne({
          $or: [
            { primaryIngredient: p1Ing, interactingIngredient: p2Ing },
            { primaryIngredient: p2Ing, interactingIngredient: p1Ing },
          ],
        });

        if (rule) {
          interactionWarnings.push({
            type: 'POTENTIAL_DRUG_INTERACTION',
            severity: rule.severity,
            medicationsCompared: [p1.medicationName, p2.medicationName],
            ingredientsCompared: [p1Ing, p2Ing],
            warningTitle: rule.warningTitle,
            explanation: rule.clinicalExplanation,
            recommendation: rule.recommendation,
            evidenceSource: rule.evidenceSource,
            verificationDate: rule.verificationDate,
            ruleVersion: rule.ruleVersion,
            prescriptionIds: [p1._id, p2._id],
          });
        }
      }
    }
  }

  return {
    totalActivePrescriptions: activePrescriptions.length,
    totalWarningsCount:
      duplicateWarnings.length + ingredientDuplicateWarnings.length + interactionWarnings.length,
    duplicateWarnings,
    ingredientDuplicateWarnings,
    interactionWarnings,
    disclaimer: CLINICAL_DISCLAIMER,
  };
};

module.exports = {
  checkInteractions,
  checkPatientProfileInteractions,
  CLINICAL_DISCLAIMER,
};
