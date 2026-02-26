const fs = require('fs');
const path = require('path');

const en = require('./src/i18n/en.json');
const fr = require('./src/i18n/fr.json');

const enKeys = Object.keys(en);
const frKeys = Object.keys(fr);

const missingInFr = enKeys.filter(k => !frKeys.includes(k));
const missingInEn = frKeys.filter(k => !enKeys.includes(k));

console.log('Missing in FR:', missingInFr);
console.log('Missing in EN:', missingInEn);
console.log('Total EN keys:', enKeys.length);
console.log('Total FR keys:', frKeys.length);
