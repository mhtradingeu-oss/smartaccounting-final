import React, { useState } from 'react';
import { exportDATEV } from '../services/exportsAPI';

export default function DatevExport() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kontenrahmen, setKontenrahmen] = useState('skr03');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const params = { from, to, kontenrahmen, format: 'csv' };
      const response = await exportDATEV(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'datev-export.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Export failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleExport} className="datev-export-form">
      <h2>DATEV Export</h2>
      <div>
        <label>
          From:{' '}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label>
          To: <input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
        </label>
      </div>
      <div>
        <label>
          Kontenrahmen:
          <select value={kontenrahmen} onChange={(e) => setKontenrahmen(e.target.value)}>
            <option value="skr03">SKR03</option>
            <option value="skr04">SKR04</option>
          </select>
        </label>
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Exporting...' : 'Export DATEV'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
