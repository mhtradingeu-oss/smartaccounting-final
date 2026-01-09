const nodemailer = require('nodemailer');
const logger = require('../lib/logger');
const fs = require('fs');
const path = require('path');
const { AuditLog } = require('../models');

if (process.env.SAFE_MODE === 'true') {
  logger.warn('SAFE_MODE enabled: Email service disabled');
  module.exports = null;
  // No return needed at top-level
}

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.queue = [];
    this.isProcessing = false;
    // Disable email in test mode
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      logger.warn('EmailService: Disabled in test mode (no transporter, no verify)');
      return;
    }
    this.initializeTransporter();
    this.loadTemplates();
  }

  initializeTransporter() {
    // Skip transporter in test mode
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      logger.warn('EmailService: Skipping transporter initialization in test mode');
      return;
    }
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
      logger.warn('⚠️ Email configuration missing - email features disabled');
      return;
    }
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_PORT === '465',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      // Verify connection
      this.transporter.verify((error, _success) => {
        if (error) {
          logger.error('❌ Email configuration failed:', error);
        } else {
          logger.info('✅ Email service ready');
        }
      });
    } catch (error) {
      logger.error('❌ Failed to initialize email transporter:', error);
    }
  }

  loadTemplates() {
    const templateDir = path.join(__dirname, '../templates/email');

    // Create templates directory if it doesn't exist
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
      this.createDefaultTemplates(templateDir);
    }

    // Load all template files
    try {
      const templateFiles = fs.readdirSync(templateDir);

      templateFiles.forEach((file) => {
        if (file.endsWith('.html')) {
          const templateName = path.basename(file, '.html');
          const templateContent = fs.readFileSync(path.join(templateDir, file), 'utf-8');
          this.templates.set(templateName, templateContent);
        }
      });

      logger.debug(`✅ Loaded ${this.templates.size} email templates`);
    } catch (error) {
      logger.error('❌ Failed to load email templates:', error);
    }
  }

  createDefaultTemplates(templateDir) {
    const templates = {
      welcome: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to SmartAccounting</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to SmartAccounting</h1>
        </div>
        <div class="content">
            <p>Hello {{name}},</p>
            <p>Welcome to SmartAccounting! Your account has been successfully created.</p>
            <p><strong>Company:</strong> {{company}}</p>
            <p><strong>Role:</strong> {{role}}</p>
            <p>You can now access all features of our intelligent accounting platform.</p>
            <p><a href="{{loginUrl}}" class="button">Login to Your Account</a></p>
        </div>
        <div class="footer">
            <p>&copy; 2024 SmartAccounting. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,

      'password-reset': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset - SmartAccounting</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 4px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Hello {{name}},</p>
            <p>We received a request to reset your password for your SmartAccounting account.</p>
            <div class="warning">
                <strong>Security Notice:</strong> If you didn't request this reset, please ignore this email and contact support immediately.
            </div>
            <p>To reset your password, click the button below:</p>
            <p><a href="{{resetUrl}}" class="button">Reset Password</a></p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p><strong>Request Details:</strong></p>
            <ul>
                <li>Time: {{timestamp}}</li>
                <li>IP Address: {{ipAddress}}</li>
            </ul>
        </div>
        <div class="footer">
            <p>&copy; 2024 SmartAccounting. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,

      'invoice-created': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Invoice Created - SmartAccounting</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .invoice-details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .amount { font-size: 24px; font-weight: bold; color: #059669; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Invoice Created Successfully</h1>
        </div>
        <div class="content">
            <p>Hello {{name}},</p>
            <p>A new invoice has been created in your SmartAccounting system.</p>
            <div class="invoice-details">
                <h3>Invoice Details</h3>
                <p><strong>Invoice #:</strong> {{invoiceNumber}}</p>
                <p><strong>Client:</strong> {{clientName}}</p>
                <p><strong>Amount:</strong> <span class="amount">€{{amount}}</span></p>
                <p><strong>Due Date:</strong> {{dueDate}}</p>
                <p><strong>Status:</strong> {{status}}</p>
            </div>
            <p>The invoice has been automatically processed and is ready for review.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 SmartAccounting. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,

      'tax-report-ready': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tax Report Ready - SmartAccounting</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7c3aed; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .report-details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Tax Report Completed</h1>
        </div>
        <div class="content">
            <p>Hello {{name}},</p>
            <p>Your tax report has been successfully generated and is ready for review.</p>
            <div class="report-details">
                <h3>Report Details</h3>
                <p><strong>Period:</strong> {{period}}</p>
                <p><strong>Type:</strong> {{reportType}}</p>
                <p><strong>Status:</strong> {{status}}</p>
                <p><strong>Generated:</strong> {{generatedDate}}</p>
            </div>
            <p><a href="{{reportUrl}}" class="button">View Report</a></p>
        </div>
        <div class="footer">
            <p>&copy; 2024 SmartAccounting. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
    };

    // Create template files
    Object.entries(templates).forEach(([name, content]) => {
      fs.writeFileSync(path.join(templateDir, `${name}.html`), content);
    });

    logger.debug('✅ Created default email templates');
  }

  renderTemplate(templateName, variables) {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    let rendered = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value);
    });

    return rendered;
  }

  async sendEmail(options) {
    if (!this.transporter) {
      logger.warn('Email service not configured - skipping email');
      return false;
    }

    try {
      const { to, subject, template, variables, text, html: initialHtml } = options;
      let html = initialHtml;

      // Render template if provided
      if (template && variables) {
        html = this.renderTemplate(template, variables);
      }

      const mailOptions = {
        from: `SmartAccounting <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: html || text,
        text: text || html?.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Log email sent
      await this.logEmail({
        to,
        subject,
        template,
        status: 'sent',
        messageId: result.messageId,
      });

      logger.info(`✅ Email sent to ${to}: ${subject}`);
      return result;
    } catch (error) {
      logger.error('❌ Failed to send email:', error);

      // Log email failure
      await this.logEmail({
        to: options.to,
        subject: options.subject,
        template: options.template,
        status: 'failed',
        error: error.message,
      });

      throw error;
    }
  }

  async logEmail(emailData = {}) {
    try {
      if (!AuditLog || typeof AuditLog.create !== 'function') {
        return;
      }

      // Skip logging when we do not have the required audit fields
      if (!emailData.userId) {
        return;
      }

      await AuditLog.create({
        action: 'email_sent',
        resourceType: 'email',
        resourceId: emailData.messageId || emailData.to,
        newValues: {
          to: emailData.to,
          subject: emailData.subject,
          template: emailData.template,
          status: emailData.status,
          error: emailData.error,
        },
        userId: emailData.userId,
        reason: `Email ${emailData.status || 'sent'}`,
      });
    } catch (error) {
      logger.error('Failed to log email', { error: error.message });
    }
  }

  // Predefined email methods
  async sendWelcomeEmail(user, company) {
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to SmartAccounting',
      template: 'welcome',
      variables: {
        name: user.firstName || user.email,
        company: company?.name || 'Your Company',
        role: user.role,
        loginUrl: `${process.env.FRONTEND_URL}/login`,
      },
    });
  }

  async sendPasswordResetEmail(user, resetToken, ipAddress) {
    return this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request - SmartAccounting',
      template: 'password-reset',
      variables: {
        name: user.firstName || user.email,
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        timestamp: new Date().toISOString(),
        ipAddress,
      },
    });
  }

  async sendInvoiceNotification(user, invoice) {
    return this.sendEmail({
      to: user.email,
      subject: `Invoice ${invoice.invoiceNumber} Created`,
      template: 'invoice-created',
      variables: {
        name: user.firstName || user.email,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        amount: invoice.totalAmount.toFixed(2),
        dueDate: invoice.dueDate,
        status: invoice.status,
      },
    });
  }

  async sendTaxReportNotification(user, report) {
    return this.sendEmail({
      to: user.email,
      subject: `Tax Report Ready - ${report.period}`,
      template: 'tax-report-ready',
      variables: {
        name: user.firstName || user.email,
        period: report.period,
        reportType: report.type,
        status: report.status,
        generatedDate: report.createdAt,
        reportUrl: `${process.env.FRONTEND_URL}/tax-reports/${report.id}`,
      },
    });
  }

  // Test email configuration
  async testConfiguration() {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    try {
      await this.transporter.verify();

      // Send test email
      const testResult = await this.sendEmail({
        to: process.env.EMAIL_USER,
        subject: 'SmartAccounting - Email Test',
        html: `
          <h2>Email Configuration Test</h2>
          <p>✅ Email service is working correctly!</p>
          <p>Test sent at: ${new Date().toISOString()}</p>
        `,
      });

      return {
        success: true,
        message: 'Email configuration is working',
        testResult,
      };
    } catch (error) {
      throw new Error(`Email test failed: ${error.message}`);
    }
  }
}

// Create and export singleton instance
const emailServiceInstance = new EmailService();
module.exports = emailServiceInstance;
