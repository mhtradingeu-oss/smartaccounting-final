export const formatAttachmentSize = (size = 0) => {
  if (!Number.isFinite(Number(size)) || Number(size) <= 0) {
    return '0 KB';
  }
  const bytes = Number(size);
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const buildAttachmentChip = (file, kind = 'file') => ({
  id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: file?.name || (kind === 'audio' ? 'Voice recording.webm' : 'Attachment'),
  type: file?.type || 'application/octet-stream',
  size: file?.size || 0,
  kind,
  file,
});

export const isSupportedDocumentAttachment = (attachment = {}) => {
  const type = String(attachment.type || attachment.file?.type || '').toLowerCase();
  const name = String(attachment.name || attachment.file?.name || '').toLowerCase();
  return (
    ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'].includes(type) ||
    /\.(pdf|jpe?g|png|tiff?)$/.test(name)
  );
};
