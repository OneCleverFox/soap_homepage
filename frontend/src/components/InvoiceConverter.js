import React, { useState } from 'react';
import axios from 'axios';
import './InvoiceConverter.css';

const InvoiceConverter = () => {
  const [file, setFile] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(0.92);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Bitte wählen Sie eine PDF-Datei aus');
      setFile(null);
    }
  };

  const handleExchangeRateChange = (e) => {
    setExchangeRate(parseFloat(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Bitte wählen Sie eine PDF-Datei aus');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('invoice', file);
      formData.append('exchangeRate', exchangeRate);

      const response = await axios.post('/api/convert-invoice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setResult(response.data.data);
        setFile(null);
      } else {
        setError(response.data.error || 'Fehler beim Konvertieren');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Hochladen der Datei');
    } finally {
      setLoading(false);
    }
  };

  const convertAmount = async (usdAmount) => {
    try {
      const response = await axios.post('/api/convert-amount', {
        usdAmount,
        exchangeRate
      });
      return response.data.data;
    } catch (err) {
      console.error('Fehler bei der Konvertierung:', err);
      return null;
    }
  };

  return (
    <div className="invoice-converter">
      <div className="converter-card">
        <h1>💱 Rechnungs-Währungskonverter</h1>
        <p className="subtitle">Konvertieren Sie Dollar-Rechnungen zu Euro</p>

        <form onSubmit={handleSubmit} className="converter-form">
          <div className="form-group">
            <label>PDF-Rechnung hochladen</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={loading}
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="file-label">
                {file ? `✅ ${file.name}` : '📄 PDF auswählen'}
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="exchange-rate">
              Wechselkurs (1 USD = ? EUR)
            </label>
            <input
              id="exchange-rate"
              type="number"
              min="0.5"
              max="2"
              step="0.01"
              value={exchangeRate}
              onChange={handleExchangeRateChange}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={!file || loading}
            className="submit-button"
          >
            {loading ? '⏳ Wird konvertiert...' : '🚀 Konvertieren'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {result && (
          <div className="result-container">
            <h2>✅ Konvertierung erfolgreich!</h2>
            
            <div className="result-section">
              <h3>📊 Gefundene Beträge:</h3>
              <table className="amounts-table">
                <thead>
                  <tr>
                    <th>USD</th>
                    <th>EUR</th>
                  </tr>
                </thead>
                <tbody>
                  {result.amounts.map((amount, idx) => (
                    <tr key={idx}>
                      <td>${amount.usd.toFixed(2)}</td>
                      <td>€{amount.eur.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="result-section totals">
              <h3>💰 Gesamtbetrag:</h3>
              <div className="total-row">
                <span className="label">USD:</span>
                <span className="value">${result.totals.totalUSD.toFixed(2)}</span>
              </div>
              <div className="total-row highlight">
                <span className="label">EUR:</span>
                <span className="value">€{result.totals.totalEUR.toFixed(2)}</span>
              </div>
            </div>

            <div className="result-info">
              <small>
                Wechselkurs: 1 USD = {result.exchangeRate} EUR<br/>
                Verarbeitet am: {new Date(result.processedAt).toLocaleString('de-DE')}
              </small>
            </div>

            <button
              className="reset-button"
              onClick={() => setResult(null)}
            >
              🔄 Neue Rechnung konvertieren
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceConverter;
