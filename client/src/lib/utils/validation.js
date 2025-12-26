import { VALIDATION } from '../constants';

export const validateEmail = (email) => {
  if (!email) {
    return 'Email is required';
  }
  if (!VALIDATION.EMAIL_REGEX.test(email)) {
    return 'Invalid email format';
  }
  // Valid email, return undefined
  return undefined;
};

export const validatePassword = (password) => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`;
  }
  // Valid password, return undefined
  return undefined;
};

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  // Field present, return undefined
  return undefined;
};

export const validatePhone = (phone) => {
  if (!phone) {
    // Phone is optional, return undefined
    return undefined;
  }
  if (!VALIDATION.PHONE_REGEX.test(phone)) {
    return 'Invalid phone format';
  }
  // Valid phone, return undefined
  return undefined;
};

export const validateAmount = (amount) => {
  if (!amount) {
    return 'Amount is required';
  }
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return 'Amount must be a positive number';
  }
  // Valid amount, return undefined
  return undefined;
};

export const validateForm = (data, rules) => {
  const errors = {};

  Object.keys(rules).forEach((field) => {
    const rule = rules[field];
    const value = data[field];

    if (rule.required) {
      const error = validateRequired(value, rule.label || field);
      if (error) {
        errors[field] = error;
        return;
      }
    }

    if (rule.type === 'email') {
      const error = validateEmail(value);
      if (error) {
        errors[field] = error;
      }
    }

    if (rule.type === 'password') {
      const error = validatePassword(value);
      if (error) {
        errors[field] = error;
      }
    }

    if (rule.type === 'phone') {
      const error = validatePhone(value);
      if (error) {
        errors[field] = error;
      }
    }

    if (rule.type === 'amount') {
      const error = validateAmount(value);
      if (error) {
        errors[field] = error;
      }
    }
  });

  return errors;
};
