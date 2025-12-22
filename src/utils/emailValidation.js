class EmailValidation {
  static validateEnvironment() {
    const errors = [];
    const warnings = [];

    if (!process.env.EMAIL_HOST) {
      errors.push('EMAIL_HOST is required');
    }
    
    if (!process.env.EMAIL_USER) {
      errors.push('EMAIL_USER is required');
    }
    
    if (!process.env.EMAIL_PASS) {
      errors.push('EMAIL_PASS is required');
    }

    if (process.env.EMAIL_USER && !this.validateEmailFormat(process.env.EMAIL_USER)) {
      errors.push('EMAIL_USER must be a valid email address');
    }

    const port = parseInt(process.env.EMAIL_PORT) || 587;
    if (port < 1 || port > 65535) {
      errors.push('EMAIL_PORT must be between 1 and 65535');
    }

    if (process.env.EMAIL_PASS && process.env.EMAIL_PASS.length < 8) {
      warnings.push('EMAIL_PASS should be at least 8 characters long');
    }

    if (process.env.EMAIL_HOST === 'smtp.gmail.com' && process.env.EMAIL_PASS && !process.env.EMAIL_PASS.includes(' ')) {
      warnings.push('Gmail requires App Password, not regular password');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      configuration: {
        host: process.env.EMAIL_HOST,
        port,
        secure: port === 465,
        user: process.env.EMAIL_USER,
        hasPassword: !!process.env.EMAIL_PASS,
      },
    };
  }
  
  static validateEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  static generateSecureConfig() {
    return {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    };
  }
  
  static sanitizeEmailForLog(email) {
    if (!email) {return 'N/A';}
    const [user, domain] = email.split('@');
    return `${user.substring(0, 2)}***@${domain}`;
  }
}

module.exports = EmailValidation;
