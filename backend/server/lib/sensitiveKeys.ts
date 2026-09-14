export const SENSITIVE_KEYS = new Set([
  'firstname',
  'lastname',
  'middlename',
  'fullname',
  'name', // only if object is a person/beneficiary
  'birthdate',
  'contactnumber',
  'phonenumber',
  'addressstreet',
  'street',
  'householdno',
  'passwordhash',
  'password',
  'token',
  'refreshtoken',
]);
