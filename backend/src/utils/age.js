function calculateAge(dob, currentDate = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!match || Number.isNaN(currentDate.getTime())) {
    throw new Error('Invalid date of birth.');
  }

  const birthYear = Number(match[1]);
  const birthMonth = Number(match[2]);
  const birthDay = Number(match[3]);
  const birthDate = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));

  if (
    birthDate.getUTCFullYear() !== birthYear ||
    birthDate.getUTCMonth() !== birthMonth - 1 ||
    birthDate.getUTCDate() !== birthDay
  ) {
    throw new Error('Invalid date of birth.');
  }

  const currentYear = currentDate.getUTCFullYear();
  const currentMonth = currentDate.getUTCMonth() + 1;
  const currentDay = currentDate.getUTCDate();
  let age = currentYear - birthYear;

  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age -= 1;
  }

  return age;
}

function isAgeOver18(dob, currentDate) {
  return calculateAge(dob, currentDate) >= 18;
}

module.exports = { calculateAge, isAgeOver18 };
