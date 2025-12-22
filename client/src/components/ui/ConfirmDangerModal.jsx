import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDangerModal({ open, onClose, onConfirm, title, description, confirmText = 'Delete', cancelText = 'Cancel', loading }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-red-700">{title}</h2>
        <p className="text-gray-700 dark:text-gray-200">{description}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>{cancelText}</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
}
