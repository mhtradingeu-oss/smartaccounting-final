import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const InvoiceImportPage = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setPreview(null);
    setErrors(null);
    setSuccess(false);
  };

  const handlePreview = async () => {
    if (!file) {
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/invoice-import/preview', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    setPreview(data.preview || []);
    setErrors(data.errors || null);
  };

  const handleCommit = async () => {
    if (!file) {
      return;
    }
    setCommitting(true);
    setErrors(null);
    setSuccess(false);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/invoice-import/commit', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    setCommitting(false);
    if (data.success) {
      setSuccess(true);
    } else {
      setErrors(data.errors || data.message);
    }
  };

  return (
    <Card>
      <h2>Import Invoices (CSV or JSON)</h2>
      <input type="file" accept=".csv,.json" onChange={handleFileChange} />
      <Button onClick={handlePreview} disabled={!file}>
        Preview
      </Button>
      {preview && (
        <div>
          <h3>Preview</h3>
          <ul>
            {preview.map((row, idx) => (
              <li key={idx} style={{ color: row.valid ? 'green' : 'red' }}>
                Row {row.row}: {row.valid ? 'Valid' : row.errors.join(', ')}
              </li>
            ))}
          </ul>
          <Button onClick={handleCommit} disabled={committing || !preview.every((r) => r.valid)}>
            Commit Import
          </Button>
        </div>
      )}
      {errors && <div style={{ color: 'red' }}>{JSON.stringify(errors)}</div>}
      {success && <div style={{ color: 'green' }}>Import successful!</div>}
    </Card>
  );
};

export default InvoiceImportPage;
