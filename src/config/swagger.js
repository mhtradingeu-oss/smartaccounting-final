const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SmartAccounting API',
      version: '1.0.0',
      description: `
        # SmartAccounting API Documentation

        A comprehensive German accounting system API with multi-tenant architecture, 
        role-based access control, and full compliance with German tax regulations.

        ## Features
        - JWT Authentication & Authorization
        - Role-based Access Control (Admin, Accountant, Auditor, Viewer)
        - Invoice Management with OCR
        - German Tax Report Generation
        - ELSTER Integration
        - Bank Statement Processing
        - Multi-language Support (German, English, Arabic)

        ## Authentication
        All protected endpoints require a valid JWT token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`

        ## Error Handling
        The API uses standard HTTP status codes and returns error details in JSON format.
      `,
      contact: {
        name: 'SmartAccounting Support',
        email: 'support@smartaccounting.com',
      },
      license: {
        name: 'Private License',
        url: 'https://smartaccounting.com/license',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || '/api',
        description: 'Configurable API host (defaults to /api)',
      },
      {
        url: 'https://api.smartaccounting.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName', 'role'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique user identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              description: 'User last name',
            },
            role: {
              type: 'string',
              enum: ['admin', 'accountant', 'auditor', 'viewer'],
              description: 'User role for access control',
            },
            companyId: {
              type: 'integer',
              description: 'Associated company ID',
            },
            isActive: {
              type: 'boolean',
              description: 'User account status',
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp',
            },
          },
        },
        Company: {
          type: 'object',
          required: ['name', 'taxNumber', 'address'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique company identifier',
            },
            name: {
              type: 'string',
              description: 'Company name',
            },
            taxNumber: {
              type: 'string',
              description: 'German tax number',
            },
            vatNumber: {
              type: 'string',
              description: 'VAT identification number',
            },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                postalCode: { type: 'string' },
                country: { type: 'string', default: 'Germany' },
              },
            },
            settings: {
              type: 'object',
              description: 'Company-specific settings',
            },
          },
        },
        Invoice: {
          type: 'object',
          required: ['invoiceNumber', 'amount', 'currency', 'issueDate'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique invoice identifier',
            },
            invoiceNumber: {
              type: 'string',
              description: 'Invoice number',
            },
            amount: {
              type: 'number',
              format: 'decimal',
              description: 'Invoice amount',
            },
            currency: {
              type: 'string',
              default: 'EUR',
              description: 'Currency code',
            },
            vatAmount: {
              type: 'number',
              format: 'decimal',
              description: 'VAT amount',
            },
            vatRate: {
              type: 'number',
              format: 'decimal',
              description: 'VAT rate percentage',
            },
            issueDate: {
              type: 'string',
              format: 'date',
              description: 'Invoice issue date',
            },
            dueDate: {
              type: 'string',
              format: 'date',
              description: 'Payment due date',
            },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
              description: 'Invoice status',
            },
            customer: {
              type: 'object',
              description: 'Customer information',
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  unitPrice: { type: 'number' },
                  totalPrice: { type: 'number' },
                },
              },
            },
          },
        },
        TaxReport: {
          type: 'object',
          required: ['reportType', 'period', 'status'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique tax report identifier',
            },
            reportType: {
              type: 'string',
              enum: ['monthly', 'quarterly', 'annual'],
              description: 'Type of tax report',
            },
            period: {
              type: 'string',
              description: 'Reporting period (YYYY-MM or YYYY-QQ or YYYY)',
            },
            status: {
              type: 'string',
              enum: ['draft', 'submitted', 'accepted', 'rejected'],
              description: 'Report status',
            },
            submissionDate: {
              type: 'string',
              format: 'date-time',
              description: 'Date submitted to ELSTER',
            },
            elsterTransactionId: {
              type: 'string',
              description: 'ELSTER transaction identifier',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User management operations',
      },
      {
        name: 'Companies',
        description: 'Company management operations',
      },
      {
        name: 'Invoices',
        description: 'Invoice management and processing',
      },
      {
        name: 'Tax Reports',
        description: 'German tax report generation and submission',
      },
      {
        name: 'Bank Statements',
        description: 'Bank statement processing and reconciliation',
      },
      {
        name: 'System',
        description: 'System health and monitoring endpoints',
      },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js',
  ],
};

const specs = swaggerJsdoc(options);

const customCss = `
  .swagger-ui .topbar { display: none }
  .swagger-ui .info .title { color: #1f2937; }
  .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; }
`;

const swaggerOptions = {
  customCss,
  customSiteTitle: 'SmartAccounting API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
};

module.exports = {
  swaggerUi,
  specs,
  swaggerOptions,
};
