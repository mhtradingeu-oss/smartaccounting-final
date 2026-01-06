'use strict';

/**
 * Migration: add url and ensure all columns/relations for file_attachments
 * - Adds missing url column (TEXT, nullable)
 * - Ensures file_type column exists (STRING, nullable)
 * - Ensures all expected relations (companyId, userId, invoiceId, etc) exist
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Always re-describe table to get latest columns
    const table = await queryInterface.describeTable('file_attachments');

    // Helper to add column if missing
    async function addIfMissing(col, def) {
      if (!table[col]) {
        try {
          await queryInterface.addColumn('file_attachments', col, def);
        } catch (err) {
          if (!/already exists/i.test(err.message)) {
            throw err;
          }
        }
      }
    }

    // url column
    await addIfMissing('url', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'File storage URL (optional)',
    });

    // file_type column
    await addIfMissing('file_type', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'MIME type or file category (optional)',
    });

    // companyId relation
    await addIfMissing('companyId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'companies', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // userId relation
    await addIfMissing('userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // invoiceId relation
    await addIfMissing('invoiceId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'invoices', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // --- Polymorphic fields ---
    // attached_to_type (string, allowNull: true)
    await addIfMissing('attached_to_type', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Polymorphic type for attachment',
    });
    // attached_to_id (UUID, allowNull: true)
    await addIfMissing('attached_to_id', {
      type: Sequelize.UUID,
      allowNull: true,
      comment: 'Polymorphic id for attachment (UUID)',
    });
    // If you need to add constraints/foreign keys, check if they exist first (not needed for polymorphic fields)
    // Add any other expected columns/relations here as needed
  },

  down: async (queryInterface, _Sequelize) => {
    // Remove columns if they exist (idempotent)
    const table = await queryInterface.describeTable('file_attachments');
    async function removeIfExists(col) {
      if (table[col]) {
        try {
          await queryInterface.removeColumn('file_attachments', col);
        } catch (err) {
          if (!/does not exist/i.test(err.message)) {
            throw err;
          }
        }
      }
    }
    await removeIfExists('url');
    await removeIfExists('file_type');
    await removeIfExists('companyId');
    await removeIfExists('userId');
    await removeIfExists('invoiceId');
    await removeIfExists('attached_to_type');
    await removeIfExists('attached_to_id');
    // Remove any other columns added above
  },
};
