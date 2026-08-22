function createDisclosureHistoryEntry({
  disclosureId,
  requestId,
  verifierId,
  requestedFields,
  approvedFields,
  disclosedFields,
  withheldFields,
  outcome,
}) {
  return {
    disclosureId,
    requestId,
    verifier: verifierId,
    verifierId,
    timestamp: new Date().toISOString(),
    requestedFields,
    approvedFields,
    sharedFields: disclosedFields,
    disclosedFields,
    withheldFields,
    outcome,
  };
}

module.exports = { createDisclosureHistoryEntry };
