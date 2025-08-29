export function getLastNameOrSingle(name) {
  if (!name) return '';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0];
  } else {
    return parts.length >= 2 ? parts[1] : parts[0];
  }
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function capitalizeWords(str) {
  if (!str) return '';

  return str
    .split(' ')
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function treatSpaces(str) {
  if (!str) return '';

  return str
    .trim() // Remove leading/trailing spaces
    .split(/\s+/) // Split by one or more spaces
    .join(' '); // Join with single spaces
}

export function formatDateToDBString(date) {
  const dateObj = date instanceof Date ? date : new Date(date);

  // Validate the date
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided to formatDateToDBString');
  }

  const isoString = dateObj.toISOString();

  // Convert from "2025-08-28T22:00:00.000Z" to "2025-08-28 22:00:00.000"
  return isoString.replace('T', ' ').replace('Z', '');
}

