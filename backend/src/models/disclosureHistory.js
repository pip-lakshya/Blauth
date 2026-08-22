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
    verifierId,
    timestamp: new Date().toISOString(),
    requestedFields,
    approvedFields,
    disclosedFields,
    withheldFields,
    outcome,
  };
}

module.exports = { createDisclosureHistoryEntry };
