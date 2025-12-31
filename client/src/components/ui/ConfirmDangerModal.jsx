import React from 'react';
import AsyncModal from './AsyncModal';
import { Button } from './Button';

export function ConfirmDangerModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  loading,
}) {
  return (
    <AsyncModal open={open} onClose={onClose} title={title} ariaLabel={description || title}>
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-200">{description}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </AsyncModal>
  );
}
