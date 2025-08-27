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

