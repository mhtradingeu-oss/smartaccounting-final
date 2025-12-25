const express = require("express");
const router = express.Router();
const vatComplianceService = require("../services/vatComplianceService");
const { authenticate, requireRole, requireCompany } = require("../middleware/authMiddleware");
const { disabledFeatureHandler } = require("../utils/disabledFeatureResponse");
const AuditLogService = require("../services/auditLogService");

// VAT/UStG compliance validation endpoint
router.post("/validate-transaction", authenticate, async (req, res) => {
  const { net, vat, gross, vatRate, currency } = req.body;
  const result = vatComplianceService.validateTransaction({ net, vat, gross, vatRate, currency });
  if (!result.valid) {
    return res.status(422).json({ success: false, errors: result.errors });
  }
  res.json({ success: true });
});
// GoBD audit log export endpoint
router.get("/gobd/export", authenticate, requireRole(["auditor"]), async (req, res) => {
  try {
    const { format = "json", from, to } = req.query;
    const logs = await AuditLogService.exportLogs({
      format,
      from,
      to,
      companyId: req.companyId,
    });
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      return res.send(logs);
    }
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to export GoBD audit logs" });
  }
});

const jwtTenantContext = require("../middleware/jwtTenantContext");
router.get("/reports/:type", jwtTenantContext, (req, res) => {
  const { type } = req.params;

  const allowedTypes = ["vat", "tax", "audit"];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Unsupported report type",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      type,
      companyId: req.user.companyId,
      generatedAt: new Date().toISOString(),
    },
  });
});

router.use(disabledFeatureHandler("Compliance overview"));

router.get("/test", (req, res) => {
  res.json({
    message: "Compliance route is working",
    timestamp: new Date().toISOString(),
  });
});

router.get("/overview", authenticate, async (req, res) => {
  try {
    const complianceData = {
      ustVoranmeldung: {
        status: "pending",
        nextDue: "2024-02-10",
        amount: 1250.0,
      },
      jahresabschluss: {
        status: "draft",
        year: 2023,
        dueDate: "2024-07-31",
      },
      goBD: {
        compliant: true,
        lastCheck: "2024-01-15",
      },
      elster: {
        connected: true,
        certificate: "valid",
      },
    };

    res.json({
      success: true,
      data: complianceData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch compliance overview",
    });
  }
});

// Tenant-safe: companyId is always derived from authenticated user context
router.get("/reports/:type", authenticate, (req, res) => {
  if (!req.user || !req.user.companyId) {
    return res.status(403).json({
      success: false,
      message: "Company context required",
    });
  }

  const { type } = req.params;

  const allowedTypes = ["vat", "tax", "audit"];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Unsupported report type",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      type,
      companyId: req.user.companyId,
      generatedAt: new Date().toISOString(),
    },
  });
});

router.get("/deadlines", authenticate, async (req, res) => {
  try {
    const deadlines = [
      {
        type: "VAT Return",
        dueDate: "2024-02-10",
        status: "pending",
      },
      {
        type: "Annual Report",
        dueDate: "2024-07-31",
        status: "draft",
      },
    ];

    res.json({
      success: true,
      data: deadlines,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch compliance deadlines",
    });
  }
});

module.exports = router;
