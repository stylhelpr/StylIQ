import {SavedAddress, SavedCard} from '../../../../store/shoppingStore';

/**
 * Generate JavaScript to auto-fill address fields
 */
export const generateAddressAutofillScript = (address: SavedAddress) => `
(function() {
  const data = {
    name: "${address.fullName}",
    email: "${address.email}",
    phone: "${address.phone}",
    street: "${address.street}",
    city: "${address.city}",
    state: "${address.state}",
    zip: "${address.zipCode}",
    country: "${address.country}"
  };

  // Auto-fill full name
  document.querySelectorAll('input[name*="name"], input[name*="fullname"], input[id*="name"]').forEach(field => {
    if (field && !field.value) field.value = data.name;
    field?.dispatchEvent(new Event('input', {bubbles: true}));
  });

  // Auto-fill email
  document.querySelectorAll('input[type="email"], input[name*="email"]').forEach(field => {
    if (field && !field.value) field.value = data.email;
    field?.dispatchEvent(new Event('input', {bubbles: true}));
  });

  // Auto-fill phone
  document.querySelectorAll('input[name*="phone"], input[id*="phone"]').forEach(field => {
    if (field && !field.value) field.value = data.phone;
    field?.dispatchEvent(new Event('input', {bubbles: true}));
  });

  // Auto-fill street address
  document.querySelectorAll('input[name*="address"], input[name*="street"]').forEach(field => {
    if (field && !field.value) field.value = data.street;
    field?.dispatchEvent(new Event('input', {bubbles: true}));
  });

  // Auto-fill city
  document.querySelectorAll('input[name*="city"]').forEach(field => {
    if (field && !field.value) field.value = data.city;
    field?.dispatchEvent(new Event('input', {bubbles: true}));
  });

  // Auto-fill state/province
  document.querySelectorAll('input[name*="state"], input[name*="province"], select[name*="state"]').forEach(field => {
    if (field && !field.value) field.value = data.state;
    field?.dispatchEvent(new Event('input', {bubbles: true}));
  });

  // Auto-fill zip/postal code
  document.querySelectorAll('input[name*="zip"], input[name*="postal"]').forEach(field => {
    if (field && !field.value) field.value = data.zip;
    field?.dispatchEvent(new Event('input', {bubbles: true}));
  });

  // Auto-fill country
  document.querySelectorAll('input[name*="country"], select[name*="country"]').forEach(field => {
    if (field && !field.value) field.value = data.country;
    field?.dispatchEvent(new Event('input', {bubbles: true}));
  });
})();
`;

/**
 * Generate JavaScript to auto-fill payment card fields
 */
export const generateCardAutofillScript = (card: SavedCard) => `
(function() {
  const data = {
    name: "${card.cardholderName}",
    lastFour: "${card.lastFour}",
    expiry: "${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}"
  };

  // Auto-fill cardholder name
  document.querySelectorAll('input[name*="cardholder"], input[name*="cardname"], input[id*="name"]').forEach(field => {
    if (field && !field.value) field.value = data.name;
    field?.dispatchEvent(new Event('input', {bubbles: true}));
  });

  // Auto-fill expiry date
  document.querySelectorAll('input[name*="expiry"], input[name*="exp"], input[id*="expiry"]').forEach(field => {
    if (field && !field.value) field.value = data.expiry;
    field?.dispatchEvent(new Event('input', {bubbles: true}));
  });

  // Show last 4 digits (never full card number for security)
  const cardNumberFields = document.querySelectorAll('input[name*="card"], input[name*="cardnumber"]');
  cardNumberFields.forEach(field => {
    if (field && !field.value) {
      field.value = '•••• •••• •••• ' + data.lastFour;
      field.setAttribute('readonly', 'true');
      field.dispatchEvent(new Event('input', {bubbles: true}));
    }
  });
})();
`;

/**
 * Extract domain from URL
 */
export const getDomainFromUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return '';
  }
};
