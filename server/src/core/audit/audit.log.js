class AuditLog {

  static record(event) {
    console.log('[AUDIT]', {
      time: new Date(),
      ...event,
    });
  }

}

module.exports = AuditLog;
