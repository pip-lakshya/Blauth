const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

function getErrorMessage(responseBody, status) {
  if (responseBody && typeof responseBody === "object") {
    return responseBody.message || responseBody.error || `Backend request failed (${status}).`;
  }
  return `Backend request failed (${status}).`;
}

export async function registerIdentity({ verified, credentials }) {
  const requestBody = {
    verified,
    credentials: {
      name: credentials?.name,
      studentId: credentials?.studentId,
      email: credentials?.email,
      phone: credentials?.phone,
      dob: credentials?.dob,
    },
  };

  const response = await fetch(`${API_BASE_URL}/identity/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getErrorMessage(responseBody, response.status));
  }
  if (!responseBody?.walletId) {
    throw new Error("Backend registration did not return a wallet ID.");
  }

  return responseBody;
}

export async function getWallet(walletId) {
  if (!walletId) {
    throw new Error("A wallet ID is required.");
  }

  const response = await fetch(`${API_BASE_URL}/identity/${encodeURIComponent(walletId)}`);
  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getErrorMessage(responseBody, response.status));
  }
  if (!responseBody?.credentials) {
    throw new Error("Backend wallet response did not include identity credentials.");
  }

  return responseBody;
}

export async function getDisclosureHistory(walletId) {
  if (!walletId) {
    throw new Error("A wallet ID is required.");
  }

  const response = await fetch(`${API_BASE_URL}/identity/${encodeURIComponent(walletId)}/disclosures`);
  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getErrorMessage(responseBody, response.status));
  }
  if (!Array.isArray(responseBody?.disclosures)) {
    throw new Error("Backend disclosure history response is invalid.");
  }

  return responseBody.disclosures;
}

export async function createVerificationRequest({ walletId, verifierId, requestedFields }) {
  const response = await fetch(`${API_BASE_URL}/verify/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletId, verifierId, requestedFields }),
  });

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getErrorMessage(responseBody, response.status));
  }
  if (!responseBody?.requestId) {
    throw new Error("Backend verification request did not return a request ID.");
  }

  return responseBody;
}

export async function submitConsent({ requestId, approvedFields }) {
  const response = await fetch(`${API_BASE_URL}/verify/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, approvedFields }),
  });

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getErrorMessage(responseBody, response.status));
  }
  if (typeof responseBody?.verified !== "boolean" || !responseBody.data || typeof responseBody.data !== "object") {
    throw new Error("Backend consent response is invalid.");
  }

  return {
    consentApproved: responseBody.verified,
    data: responseBody.data,
  };
}

export async function verifyAgeOver18(walletId) {
  const { requestId } = await createVerificationRequest({
    walletId,
    verifierId: "age-restricted-service",
    requestedFields: ["ageOver18"],
  });
  const { consentApproved, data } = await submitConsent({
    requestId,
    approvedFields: ["ageOver18"],
  });
  const disclosedFields = Object.keys(data);

  if (!consentApproved || disclosedFields.length !== 1 || disclosedFields[0] !== "ageOver18" || typeof data.ageOver18 !== "boolean") {
    throw new Error("Backend age verification did not return an age-over-18 result.");
  }

  return { requestId, ageOver18: data.ageOver18 };
}
