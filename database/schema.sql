
-- =============================================================================
-- SMARTACCOUNTING DATABASE SCHEMA
-- German Tax & Accounting Compliant Schema for MH Trading UG
-- Compliant with: UStG, GoBD, Bilanzrecht, SKR03/SKR04
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CORE SYSTEM TABLES
-- =============================================================================

-- Companies Table (Multi-tenant support)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    legal_form VARCHAR(50) NOT NULL DEFAULT 'UG', -- UG, GmbH, AG, etc.
    
    -- German Business Registration
    handelsregister_number VARCHAR(100),
    amtsgericht VARCHAR(100),
    ust_id_nr VARCHAR(20), -- DE123456789
    steuernummer VARCHAR(50), -- German tax number
    finanzamt VARCHAR(100),
    
    -- Address Information
    street VARCHAR(255) NOT NULL,
    house_number VARCHAR(20),
    postal_code VARCHAR(10) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) DEFAULT 'Deutschland',
    country VARCHAR(50) DEFAULT 'DE',
    
    -- Contact Information
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Business Information
    business_purpose TEXT,
    founding_date DATE,
    fiscal_year_start DATE DEFAULT '01-01',
    
    -- Tax Settings
    vat_scheme VARCHAR(50) DEFAULT 'STANDARD', -- STANDARD, KLEINUNTERNEHMER, REVERSE_CHARGE
    default_vat_rate DECIMAL(5,4) DEFAULT 0.1900,
    reduced_vat_rate DECIMAL(5,4) DEFAULT 0.0700,
    
    -- Accounting Settings
    accounting_method VARCHAR(50) DEFAULT 'EÜR', -- EÜR, BILANZ
    chart_of_accounts VARCHAR(20) DEFAULT 'SKR03', -- SKR03, SKR04
    
    -- Subscription & Status
    subscription_plan VARCHAR(50) DEFAULT 'BASIC',
    subscription_status VARCHAR(20) DEFAULT 'ACTIVE',
    trial_ends_at TIMESTAMP,
    
    -- Compliance Flags
    gobd_compliant BOOLEAN DEFAULT true,
    elster_enabled BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_vat_scheme CHECK (vat_scheme IN ('STANDARD', 'KLEINUNTERNEHMER', 'REVERSE_CHARGE')),
    CONSTRAINT valid_accounting_method CHECK (accounting_method IN ('EÜR', 'BILANZ')),
    CONSTRAINT valid_legal_form CHECK (legal_form IN ('UG', 'GmbH', 'AG', 'OHG', 'KG', 'GbR', 'eK'))
);

-- Users Table with German Role Permissions
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    title VARCHAR(50), -- Dr., Prof., etc.
    
    -- Role & Permissions (German Accounting Roles)
    role VARCHAR(50) NOT NULL DEFAULT 'VIEWER',
    permissions JSONB DEFAULT '{}',
    
    -- Contact Information
    phone VARCHAR(50),
    mobile VARCHAR(50),
    
    -- Professional Information
    employee_id VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    
    -- Security & Access
    last_login_at TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Two-Factor Authentication
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(100),
    
    -- Status & Preferences
    status VARCHAR(20) DEFAULT 'ACTIVE',
    language VARCHAR(5) DEFAULT 'de',
    timezone VARCHAR(50) DEFAULT 'Europe/Berlin',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_role CHECK (role IN ('ADMIN', 'STEUERBERATER', 'BUCHHALTER', 'SACHBEARBEITER', 'WIRTSCHAFTSPRÜFER', 'VIEWER')),
    CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    CONSTRAINT valid_language CHECK (language IN ('de', 'en', 'ar'))
);

-- =============================================================================
-- BUSINESS PARTNER TABLES
-- =============================================================================

-- Clients Table (Customers/Kunden)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Client Classification
    client_type VARCHAR(20) NOT NULL DEFAULT 'BUSINESS', -- BUSINESS, INDIVIDUAL, EU_BUSINESS, NON_EU
    client_number VARCHAR(50) NOT NULL, -- Internal customer number
    
    -- Business Information
    business_name VARCHAR(255),
    legal_form VARCHAR(50),
    
    -- Individual Information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    title VARCHAR(50),
    
    -- Tax Information
    ust_id_nr VARCHAR(20), -- EU VAT ID
    steuernummer VARCHAR(50), -- German tax number
    tax_country VARCHAR(3) DEFAULT 'DE',
    vat_exempt BOOLEAN DEFAULT false,
    reverse_charge_applicable BOOLEAN DEFAULT false,
    
    -- Address Information
    billing_street VARCHAR(255),
    billing_house_number VARCHAR(20),
    billing_postal_code VARCHAR(10),
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_country VARCHAR(3) DEFAULT 'DE',
    
    shipping_street VARCHAR(255),
    shipping_house_number VARCHAR(20),
    shipping_postal_code VARCHAR(10),
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_country VARCHAR(3) DEFAULT 'DE',
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    fax VARCHAR(50),
    website VARCHAR(255),
    
    -- Financial Information
    credit_limit DECIMAL(15,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30, -- Days
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Banking Information
    bank_name VARCHAR(255),
    bank_account_holder VARCHAR(255),
    iban VARCHAR(34),
    bic VARCHAR(11),
    
    -- Status & Classification
    status VARCHAR(20) DEFAULT 'ACTIVE',
    priority VARCHAR(20) DEFAULT 'NORMAL',
    industry VARCHAR(100),
    source VARCHAR(100), -- How they found us
    
    -- Additional Information
    notes TEXT,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_client_type CHECK (client_type IN ('BUSINESS', 'INDIVIDUAL', 'EU_BUSINESS', 'NON_EU')),
    CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')),
    CONSTRAINT unique_client_number_per_company UNIQUE (company_id, client_number)
);

-- Vendors Table (Suppliers/Lieferanten)
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Vendor Classification
    vendor_type VARCHAR(20) NOT NULL DEFAULT 'BUSINESS',
    vendor_number VARCHAR(50) NOT NULL,
    
    -- Business Information
    business_name VARCHAR(255) NOT NULL,
    legal_form VARCHAR(50),
    
    -- Contact Person
    contact_first_name VARCHAR(100),
    contact_last_name VARCHAR(100),
    contact_title VARCHAR(50),
    
    -- Tax Information
    ust_id_nr VARCHAR(20),
    steuernummer VARCHAR(50),
    tax_country VARCHAR(3) DEFAULT 'DE',
    
    -- Address Information
    street VARCHAR(255) NOT NULL,
    house_number VARCHAR(20),
    postal_code VARCHAR(10) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(3) DEFAULT 'DE',
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    fax VARCHAR(50),
    website VARCHAR(255),
    
    -- Financial Information
    payment_terms INTEGER DEFAULT 30,
    discount_terms VARCHAR(100), -- "2% 10 Tage, netto 30"
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Banking Information
    bank_name VARCHAR(255),
    bank_account_holder VARCHAR(255),
    iban VARCHAR(34),
    bic VARCHAR(11),
    
    -- Status & Classification
    status VARCHAR(20) DEFAULT 'ACTIVE',
    category VARCHAR(100),
    
    -- Additional Information
    notes TEXT,
    tags JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_vendor_type CHECK (vendor_type IN ('BUSINESS', 'INDIVIDUAL', 'EU_BUSINESS', 'NON_EU')),
    CONSTRAINT unique_vendor_number_per_company UNIQUE (company_id, vendor_number)
);

-- =============================================================================
-- FINANCIAL TRANSACTION TABLES
-- =============================================================================

-- Invoices Table (Rechnungen)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id),
    
    -- Invoice Identification
    invoice_number VARCHAR(50) NOT NULL,
    invoice_type VARCHAR(30) DEFAULT 'OUTGOING', -- OUTGOING, INCOMING, CREDIT_NOTE, DEBIT_NOTE
    
    -- Dates
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    delivery_date DATE,
    service_period_start DATE,
    service_period_end DATE,
    
    -- Financial Information
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_vat DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    
    -- Payment Information
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    payment_method VARCHAR(50),
    payment_terms INTEGER DEFAULT 30,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Tax Information
    vat_scheme VARCHAR(50) DEFAULT 'STANDARD',
    reverse_charge BOOLEAN DEFAULT false,
    
    -- Document Information
    reference_number VARCHAR(100),
    order_number VARCHAR(100),
    project_reference VARCHAR(100),
    
    -- Status & Processing
    status VARCHAR(20) DEFAULT 'DRAFT',
    sent_at TIMESTAMP,
    printed_at TIMESTAMP,
    
    -- GoBD Compliance
    document_hash VARCHAR(256), -- For integrity verification
    original_filename VARCHAR(255),
    
    -- Additional Information
    notes TEXT,
    internal_notes TEXT,
    tags JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_invoice_type CHECK (invoice_type IN ('OUTGOING', 'INCOMING', 'CREDIT_NOTE', 'DEBIT_NOTE')),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED')),
    CONSTRAINT valid_status CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED')),
    CONSTRAINT unique_invoice_number_per_company UNIQUE (company_id, invoice_number)
);

-- Invoice Line Items Table (Rechnungspositionen)
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Item Identification
    line_number INTEGER NOT NULL,
    item_number VARCHAR(100),
    
    -- Description
    description TEXT NOT NULL,
    detailed_description TEXT,
    
    -- Quantity & Pricing
    quantity DECIMAL(12,4) NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'Stück',
    unit_price DECIMAL(15,6) NOT NULL,
    
    -- Amounts
    line_total DECIMAL(15,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL,
    
    -- Tax Information
    vat_rate DECIMAL(5,4) NOT NULL,
    vat_amount DECIMAL(15,2) NOT NULL,
    vat_category VARCHAR(20) DEFAULT 'STANDARD_19',
    
    -- Additional Information
    cost_center VARCHAR(50),
    project_code VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_vat_category CHECK (vat_category IN ('STANDARD_19', 'REDUCED_7', 'EXEMPT', 'REVERSE_CHARGE')),
    CONSTRAINT unique_line_number_per_invoice UNIQUE (invoice_id, line_number)
);

-- Expenses Table (Ausgaben/Belege)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id),
    
    -- Expense Identification
    expense_number VARCHAR(50),
    external_reference VARCHAR(100), -- Vendor invoice number
    
    -- Dates
    expense_date DATE NOT NULL,
    due_date DATE,
    payment_date DATE,
    
    -- Financial Information
    net_amount DECIMAL(15,2) NOT NULL,
    vat_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    
    -- Classification
    category VARCHAR(100) NOT NULL, -- Office supplies, rent, etc.
    subcategory VARCHAR(100),
    account_code VARCHAR(10), -- SKR03/SKR04 account
    
    -- Payment Information
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    payment_method VARCHAR(50),
    
    -- Tax Information
    vat_rate DECIMAL(5,4) DEFAULT 0.19,
    vat_deductible BOOLEAN DEFAULT true,
    reverse_charge BOOLEAN DEFAULT false,
    
    -- Business Purpose (GoBD Requirement)
    business_purpose TEXT NOT NULL,
    
    -- Document Information
    has_receipt BOOLEAN DEFAULT false,
    receipt_type VARCHAR(50), -- PAPER, DIGITAL, ELECTRONIC
    
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING',
    approval_status VARCHAR(20) DEFAULT 'PENDING',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    
    -- Additional Information
    notes TEXT,
    tags JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
    CONSTRAINT valid_receipt_type CHECK (receipt_type IN ('PAPER', 'DIGITAL', 'ELECTRONIC')),
    CONSTRAINT valid_approval_status CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- =============================================================================
-- BANKING & PAYMENT TABLES
-- =============================================================================

-- Bank Accounts Table
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Account Information
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) DEFAULT 'CHECKING', -- CHECKING, SAVINGS, CREDIT
    
    -- Banking Details
    bank_name VARCHAR(255) NOT NULL,
    iban VARCHAR(34) NOT NULL,
    bic VARCHAR(11),
    account_number VARCHAR(50),
    sort_code VARCHAR(20),
    
    -- Currency & Balance
    currency VARCHAR(3) DEFAULT 'EUR',
    current_balance DECIMAL(15,2) DEFAULT 0,
    available_balance DECIMAL(15,2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE',
    is_default BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_account_type CHECK (account_type IN ('CHECKING', 'SAVINGS', 'CREDIT', 'INVESTMENT')),
    CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'CLOSED'))
);

-- Bank Statements Table
CREATE TABLE bank_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    
    -- Statement Information
    statement_number VARCHAR(100),
    statement_date DATE NOT NULL,
    statement_period_start DATE NOT NULL,
    statement_period_end DATE NOT NULL,
    
    -- Import Information
    import_format VARCHAR(20) NOT NULL, -- CSV, MT940, CAMT053
    filename VARCHAR(255),
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Balance Information
    opening_balance DECIMAL(15,2) NOT NULL,
    closing_balance DECIMAL(15,2) NOT NULL,
    
    -- Processing Status
    processing_status VARCHAR(20) DEFAULT 'PENDING',
    total_transactions INTEGER DEFAULT 0,
    processed_transactions INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_import_format CHECK (import_format IN ('CSV', 'MT940', 'CAMT053', 'OFX')),
    CONSTRAINT valid_processing_status CHECK (processing_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'))
);

-- Bank Transactions Table
CREATE TABLE bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_statement_id UUID NOT NULL REFERENCES bank_statements(id),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    
    -- Transaction Identification
    transaction_reference VARCHAR(100),
    bank_reference VARCHAR(100),
    
    -- Dates
    transaction_date DATE NOT NULL,
    value_date DATE NOT NULL,
    booking_date DATE,
    
    -- Transaction Details
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    transaction_type VARCHAR(20) NOT NULL, -- CREDIT, DEBIT
    
    -- Counterparty Information
    counterparty_name VARCHAR(255),
    counterparty_account VARCHAR(50),
    counterparty_bank_code VARCHAR(20),
    counterparty_reference VARCHAR(100),
    
    -- Description & Purpose
    description TEXT NOT NULL,
    purpose_code VARCHAR(10),
    
    -- Reconciliation
    reconciliation_status VARCHAR(20) DEFAULT 'UNRECONCILED',
    reconciled_with_invoice_id UUID REFERENCES invoices(id),
    reconciled_with_expense_id UUID REFERENCES expenses(id),
    reconciled_by UUID REFERENCES users(id),
    reconciled_at TIMESTAMP,
    
    -- Categorization
    category VARCHAR(100),
    subcategory VARCHAR(100),
    account_code VARCHAR(10),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    CONSTRAINT valid_reconciliation_status CHECK (reconciliation_status IN ('UNRECONCILED', 'MATCHED', 'RECONCILED', 'DISPUTED'))
);

-- =============================================================================
-- ACCOUNTING FRAMEWORK TABLES
-- =============================================================================

-- Chart of Accounts Table (Kontenplan SKR03/SKR04)
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Account Identification
    account_code VARCHAR(10) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    
    -- Account Classification
    account_type VARCHAR(50) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    account_category VARCHAR(100),
    account_group VARCHAR(100),
    
    -- Hierarchy
    parent_account_code VARCHAR(10),
    account_level INTEGER DEFAULT 1,
    
    -- SKR Classification
    skr_type VARCHAR(10) DEFAULT 'SKR03', -- SKR03, SKR04
    
    -- Behavior
    normal_balance VARCHAR(10) NOT NULL, -- DEBIT, CREDIT
    is_system_account BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Tax Information
    vat_rate DECIMAL(5,4),
    automatic_vat BOOLEAN DEFAULT false,
    
    -- Additional Information
    description TEXT,
    usage_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_account_type CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    CONSTRAINT valid_normal_balance CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    CONSTRAINT unique_account_code_per_company UNIQUE (company_id, account_code)
);

-- Journal Entries Table (Buchungssätze)
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Entry Identification
    entry_number VARCHAR(50) NOT NULL,
    entry_type VARCHAR(50) DEFAULT 'MANUAL', -- MANUAL, AUTOMATIC, SYSTEM
    
    -- Dates
    entry_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    
    -- Reference Information
    reference_type VARCHAR(50), -- INVOICE, EXPENSE, BANK_TRANSACTION, etc.
    reference_id UUID,
    reference_number VARCHAR(100),
    
    -- Description
    description TEXT NOT NULL,
    notes TEXT,
    
    -- Financial Information
    total_debit DECIMAL(15,2) NOT NULL,
    total_credit DECIMAL(15,2) NOT NULL,
    
    -- Status & Approval
    status VARCHAR(20) DEFAULT 'DRAFT',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    
    -- GoBD Compliance
    is_locked BOOLEAN DEFAULT false,
    locked_by UUID REFERENCES users(id),
    locked_at TIMESTAMP,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_entry_type CHECK (entry_type IN ('MANUAL', 'AUTOMATIC', 'SYSTEM', 'CORRECTION')),
    CONSTRAINT valid_status CHECK (status IN ('DRAFT', 'POSTED', 'APPROVED', 'CANCELLED')),
    CONSTRAINT balanced_entry CHECK (total_debit = total_credit),
    CONSTRAINT unique_entry_number_per_company UNIQUE (company_id, entry_number)
);

-- Journal Entry Lines Table (Buchungszeilen)
CREATE TABLE journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    
    -- Line Information
    line_number INTEGER NOT NULL,
    account_code VARCHAR(10) NOT NULL,
    
    -- Amounts
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Description
    description TEXT,
    
    -- Tax Information
    vat_rate DECIMAL(5,4),
    vat_amount DECIMAL(15,2) DEFAULT 0,
    vat_account_code VARCHAR(10),
    
    -- Cost Center & Project
    cost_center VARCHAR(50),
    project_code VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_amounts CHECK ((debit_amount > 0 AND credit_amount = 0) OR (debit_amount = 0 AND credit_amount > 0)),
    CONSTRAINT unique_line_number_per_entry UNIQUE (journal_entry_id, line_number)
);

-- =============================================================================
-- TAX & COMPLIANCE TABLES
-- =============================================================================

-- Tax Reports Table (Steuerberichte)
CREATE TABLE tax_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Report Identification
    report_type VARCHAR(50) NOT NULL, -- UST_VA, EÜR, BILANZ, KST, GEWST
    report_period_type VARCHAR(20) NOT NULL, -- MONTHLY, QUARTERLY, ANNUAL
    
    -- Period Information
    period_year INTEGER NOT NULL,
    period_quarter INTEGER, -- 1-4 for quarterly reports
    period_month INTEGER, -- 1-12 for monthly reports
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    
    -- Report Data
    report_data JSONB NOT NULL, -- Structured tax report data
    calculations JSONB, -- Detailed calculations
    
    -- Financial Summary
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_expenses DECIMAL(15,2) DEFAULT 0,
    net_profit DECIMAL(15,2) DEFAULT 0,
    total_vat_collected DECIMAL(15,2) DEFAULT 0,
    total_vat_paid DECIMAL(15,2) DEFAULT 0,
    vat_payable DECIMAL(15,2) DEFAULT 0,
    
    -- Status & Processing
    status VARCHAR(20) DEFAULT 'DRAFT',
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by UUID REFERENCES users(id),
    
    -- ELSTER Integration
    elster_submitted BOOLEAN DEFAULT false,
    elster_submission_id VARCHAR(100),
    elster_submitted_at TIMESTAMP,
    elster_acknowledged BOOLEAN DEFAULT false,
    
    -- File Information
    pdf_file_path VARCHAR(500),
    xml_file_path VARCHAR(500),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_report_type CHECK (report_type IN ('UST_VA', 'EÜR', 'BILANZ', 'KST', 'GEWST')),
    CONSTRAINT valid_period_type CHECK (report_period_type IN ('MONTHLY', 'QUARTERLY', 'ANNUAL')),
    CONSTRAINT valid_status CHECK (status IN ('DRAFT', 'FINALIZED', 'SUBMITTED', 'ACCEPTED', 'REJECTED')),
    CONSTRAINT unique_report_per_period UNIQUE (company_id, report_type, period_year, period_quarter, period_month)
);

-- =============================================================================
-- DOCUMENT MANAGEMENT TABLES
-- =============================================================================

-- File Attachments Table
CREATE TABLE file_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- File Information
    original_filename VARCHAR(500) NOT NULL,
    stored_filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(256) NOT NULL, -- SHA-256 for integrity
    
    -- Classification
    document_type VARCHAR(50) NOT NULL, -- INVOICE, RECEIPT, CONTRACT, BANK_STATEMENT, etc.
    category VARCHAR(100),
    
    -- Relationships
    entity_type VARCHAR(50), -- invoices, expenses, clients, vendors
    entity_id UUID,
    
    -- OCR & Processing
    ocr_processed BOOLEAN DEFAULT false,
    ocr_text TEXT,
    ocr_confidence DECIMAL(5,2),
    ocr_language VARCHAR(10) DEFAULT 'de',
    
    -- Extracted Data
    extracted_data JSONB,
    
    -- Metadata
    uploaded_by UUID REFERENCES users(id),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- GoBD Compliance
    retention_period_years INTEGER DEFAULT 10,
    deletion_date DATE,
    is_archived BOOLEAN DEFAULT false,
    archive_location VARCHAR(500),
    
    -- Status
    processing_status VARCHAR(20) DEFAULT 'PENDING',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_document_type CHECK (document_type IN ('INVOICE', 'RECEIPT', 'BANK_STATEMENT', 'CONTRACT', 'ID_DOCUMENT', 'OTHER')),
    CONSTRAINT valid_processing_status CHECK (processing_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'))
);

-- =============================================================================
-- AUDIT & COMPLIANCE TABLES
-- =============================================================================

-- Audit Log Table (GoBD Compliance)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Event Information
    event_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, EXPORT, etc.
    event_category VARCHAR(50) NOT NULL, -- FINANCIAL, USER_MGMT, SYSTEM, COMPLIANCE
    
    -- Actor Information
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    user_ip_address INET,
    user_agent TEXT,
    
    -- Target Information
    entity_type VARCHAR(50), -- invoices, expenses, users, etc.
    entity_id UUID,
    entity_description VARCHAR(500),
    
    -- Change Details
    old_values JSONB,
    new_values JSONB,
    changes_summary TEXT,
    
    -- Event Details
    description TEXT NOT NULL,
    additional_data JSONB,
    
    -- Compliance & Security
    security_level VARCHAR(20) DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, CRITICAL
    compliance_relevant BOOLEAN DEFAULT true,
    retention_required BOOLEAN DEFAULT true,
    
    -- Timing
    event_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_event_type CHECK (event_type IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'APPROVE', 'REJECT')),
    CONSTRAINT valid_event_category CHECK (event_category IN ('FINANCIAL', 'USER_MGMT', 'SYSTEM', 'COMPLIANCE', 'SECURITY')),
    CONSTRAINT valid_security_level CHECK (security_level IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL'))
);

-- =============================================================================
-- SYSTEM CONFIGURATION TABLES
-- =============================================================================

-- System Settings Table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Setting Information
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB,
    setting_type VARCHAR(50) DEFAULT 'STRING', -- STRING, NUMBER, BOOLEAN, JSON, ENCRYPTED
    
    -- Classification
    category VARCHAR(50) NOT NULL, -- TAX, ACCOUNTING, SYSTEM, USER_INTERFACE
    subcategory VARCHAR(50),
    
    -- Metadata
    description TEXT,
    default_value JSONB,
    is_system_setting BOOLEAN DEFAULT false,
    is_encrypted BOOLEAN DEFAULT false,
    
    -- Modification Tracking
    last_modified_by UUID REFERENCES users(id),
    last_modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_setting_type CHECK (setting_type IN ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'ENCRYPTED')),
    CONSTRAINT unique_setting_per_company UNIQUE (company_id, setting_key)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Companies Indexes
CREATE INDEX idx_companies_ust_id ON companies(ust_id_nr);
CREATE INDEX idx_companies_status ON companies(subscription_status);

-- Users Indexes
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Clients Indexes
CREATE INDEX idx_clients_company_id ON clients(company_id);
CREATE INDEX idx_clients_client_number ON clients(client_number);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_ust_id ON clients(ust_id_nr);

-- Vendors Indexes
CREATE INDEX idx_vendors_company_id ON vendors(company_id);
CREATE INDEX idx_vendors_vendor_number ON vendors(vendor_number);
CREATE INDEX idx_vendors_status ON vendors(status);

-- Invoices Indexes
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);

-- Expenses Indexes
CREATE INDEX idx_expenses_company_id ON expenses(company_id);
CREATE INDEX idx_expenses_vendor_id ON expenses(vendor_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_status ON expenses(status);

-- Bank Transactions Indexes
CREATE INDEX idx_bank_transactions_company_id ON bank_transactions(company_id);
CREATE INDEX idx_bank_transactions_account_id ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_reconciliation ON bank_transactions(reconciliation_status);

-- Journal Entries Indexes
CREATE INDEX idx_journal_entries_company_id ON journal_entries(company_id);
CREATE INDEX idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);
CREATE INDEX idx_journal_entry_lines_account ON journal_entry_lines(account_code);

-- Tax Reports Indexes
CREATE INDEX idx_tax_reports_company_id ON tax_reports(company_id);
CREATE INDEX idx_tax_reports_type_period ON tax_reports(report_type, period_year, period_quarter);
CREATE INDEX idx_tax_reports_status ON tax_reports(status);

-- File Attachments Indexes
CREATE INDEX idx_file_attachments_company_id ON file_attachments(company_id);
CREATE INDEX idx_file_attachments_entity ON file_attachments(entity_type, entity_id);
CREATE INDEX idx_file_attachments_document_type ON file_attachments(document_type);

-- Audit Logs Indexes
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(event_timestamp);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all main tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_statements_updated_at BEFORE UPDATE ON bank_statements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_transactions_updated_at BEFORE UPDATE ON bank_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_reports_updated_at BEFORE UPDATE ON tax_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_file_attachments_updated_at BEFORE UPDATE ON file_attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INITIAL DATA SETUP
-- =============================================================================

-- Insert default SKR03 Chart of Accounts (Sample)
INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_type, account_category, normal_balance, is_system_account, description) VALUES
(uuid_generate_v4(), '0120', 'Bank', 'ASSET', 'CURRENT_ASSETS', 'DEBIT', true, 'Bank account for current operations'),
(uuid_generate_v4(), '1200', 'Forderungen aus Lieferungen und Leistungen', 'ASSET', 'CURRENT_ASSETS', 'DEBIT', true, 'Accounts receivable from customers'),
(uuid_generate_v4(), '1576', 'Vorsteuer 19%', 'ASSET', 'CURRENT_ASSETS', 'DEBIT', true, 'Input VAT at 19%'),
(uuid_generate_v4(), '1571', 'Vorsteuer 7%', 'ASSET', 'CURRENT_ASSETS', 'DEBIT', true, 'Input VAT at 7%'),
(uuid_generate_v4(), '1600', 'Verbindlichkeiten aus Lieferungen und Leistungen', 'LIABILITY', 'CURRENT_LIABILITIES', 'CREDIT', true, 'Accounts payable to vendors'),
(uuid_generate_v4(), '1771', 'Umsatzsteuer 19%', 'LIABILITY', 'CURRENT_LIABILITIES', 'CREDIT', true, 'Output VAT at 19%'),
(uuid_generate_v4(), '1775', 'Umsatzsteuer 7%', 'LIABILITY', 'CURRENT_LIABILITIES', 'CREDIT', true, 'Output VAT at 7%'),
(uuid_generate_v4(), '4120', 'Wareneinkauf 19% Vorsteuer', 'EXPENSE', 'COST_OF_GOODS', 'DEBIT', true, 'Cost of goods sold with 19% input VAT'),
(uuid_generate_v4(), '4400', 'Löhne und Gehälter', 'EXPENSE', 'PERSONNEL', 'DEBIT', true, 'Wages and salaries'),
(uuid_generate_v4(), '8400', 'Erlöse 19% USt', 'REVENUE', 'SALES', 'CREDIT', true, 'Revenue with 19% VAT');

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================

-- Grant permissions (adjust as needed for your user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO smartaccounting_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO smartaccounting_user;
