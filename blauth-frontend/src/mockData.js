export const verifierRequests = {
  "college-portal": {
    verifier: "College Portal",
    purpose: "Confirm your student account details for campus access.",
    requestedFields: ["name", "studentId", "email"],
  },
  "student-services": {
    verifier: "Student Services",
    purpose: "Confirm the details needed to support your student request.",
    requestedFields: ["name", "college", "studentId", "phone"],
  },
};

export const identityFieldLabels = {
  name: "Name",
  email: "Email",
  college: "College",
  studentId: "Student ID",
  dob: "Date of Birth",
  phone: "Phone",
};
