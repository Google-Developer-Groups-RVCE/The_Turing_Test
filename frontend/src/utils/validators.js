export const validateRegistration = (data) => {
  const errors = {};
  if (!data.username || data.username.length < 3) {
    errors.username = 'Username must be at least 3 characters';
  }
  if (!data.password || data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }
  return errors;
};

export const validateLogin = (data) => {
  const errors = {};
  if (!data.username) {
    errors.username = 'Username is required';
  }
  if (!data.password) {
    errors.password = 'Password is required';
  }
  return errors;
};
