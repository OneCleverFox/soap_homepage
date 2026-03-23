const puppeteer = require('puppeteer');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatFieldValue(field) {
  const value = field?.value;

  if (field?.type === 'checkbox') {
    const yesChecked = value ? '[x]' : '[ ]';
    const noChecked = value ? '[ ]' : '[x]';
    return `${yesChecked} Ja    ${noChecked} Nein`;
  }

  if (field?.type === 'date' && value) {
    try {
      return new Date(value).toLocaleDateString('de-DE');
    } catch (error) {
      return String(value);
    }
  }

  if (field?.type === 'select' && Array.isArray(field?.options)) {
    const selected = field.options.find((item) => item.value === value);
    return selected?.label || String(value || '');
  }

  if (field?.type === 'multiselect' && Array.isArray(field?.options)) {
    const selectedValues = Array.isArray(value) ? value : [];
    const labels = selectedValues.map((selectedValue) => {
      const option = field.options.find((item) => item.value === selectedValue);
      return option?.label || selectedValue;
    }).filter(Boolean);
    return labels.join(', ');
  }

  return String(value || '');
}

class AdminDocumentRenderService {
  static buildHtml(documentData) {
    const sections = Array.isArray(documentData?.content_json?.sections)
      ? documentData.content_json.sections
      : [];

    const renderedSections = sections
      .map((section) => {
        const fields = Array.isArray(section?.fields) ? section.fields : [];
        const rows = fields
          .map((field) => {
            const value = formatFieldValue(field);
            return `
              <tr>
                <td class="label-cell">${escapeHtml(field?.label || '')}</td>
                <td class="value-cell">${escapeHtml(value) || '&nbsp;'}</td>
              </tr>
            `;
          })
          .join('');

        return `
          <section class="section-block">
            <h2>${escapeHtml(section?.title || '')}</h2>
            <table class="doc-table">
              <tbody>
                ${rows}
              </tbody>
            </table>
          </section>
        `;
      })
      .join('');

    return `
      <!doctype html>
      <html lang="de">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(documentData?.title || 'Dokument')}</title>
          <style>
            @page {
              size: A4;
              margin: 18mm 14mm 20mm 14mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #1f1f1f;
              font-size: 12px;
              line-height: 1.5;
              background: #fff;
            }

            .container {
              width: 100%;
            }

            .doc-header {
              border-bottom: 1px solid #666;
              padding-bottom: 8px;
              margin-bottom: 16px;
            }

            .doc-title {
              margin: 0;
              font-size: 20px;
              font-weight: 700;
              letter-spacing: 0.2px;
            }

            .doc-meta {
              margin-top: 6px;
              font-size: 12px;
              color: #333;
            }

            .section-block {
              margin-bottom: 14px;
              page-break-inside: avoid;
            }

            .section-block h2 {
              margin: 0 0 8px;
              font-size: 14px;
              font-weight: 700;
              border-bottom: 1px solid #9a9a9a;
              padding-bottom: 4px;
            }

            .doc-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            .doc-table td {
              border: 1px solid #b8b8b8;
              padding: 7px 8px;
              vertical-align: top;
            }

            .label-cell {
              width: 38%;
              font-weight: 600;
              background: #f4f4f4;
            }

            .value-cell {
              width: 62%;
              white-space: pre-wrap;
              word-break: break-word;
              min-height: 24px;
            }

            .guardrail {
              margin-top: 12px;
              border-top: 1px solid #8c8c8c;
              padding-top: 8px;
              font-size: 11px;
              color: #303030;
            }
          </style>
        </head>
        <body>
          <main class="container">
            <header class="doc-header">
              <h1 class="doc-title">${escapeHtml(documentData?.title || '')}</h1>
              <div class="doc-meta">Typ: ${escapeHtml(documentData?.document_type || '')} | Version: ${escapeHtml(documentData?.version || '1.0')} | Status: ${escapeHtml(documentData?.status || '')}</div>
            </header>
            ${renderedSections}
            <div class="guardrail">${escapeHtml(documentData?.content_json?.legal_guardrail || '')}</div>
          </main>
        </body>
      </html>
    `;
  }

  static async generatePdfBuffer(documentData, html) {
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const safeTitle = escapeHtml(documentData?.title || 'Dokument');
      const safeVersion = escapeHtml(documentData?.version || '1.0');

      return await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size:9px;width:100%;padding:0 14mm;color:#333;display:flex;justify-content:space-between;">
            <span>${safeTitle}</span>
            <span>Version ${safeVersion}</span>
            <span>Seite <span class="pageNumber"></span> / <span class="totalPages"></span></span>
          </div>
        `,
        margin: {
          top: '16mm',
          right: '0mm',
          bottom: '14mm',
          left: '0mm'
        }
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = AdminDocumentRenderService;