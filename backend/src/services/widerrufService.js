/**
 * Widerrufsfristen-Service
 * Fristberechnung und Ausschlusslogik gemäß § 355 BGB
 */

const WITHDRAWAL_DAYS = parseInt(process.env.WITHDRAWAL_DAYS || '14', 10);

/**
 * Produkt-/Vertragstypen, die vom Widerrufsrecht ausgeschlossen sind.
 * Erweiterbar über Konfiguration.
 * 
 * Typische Ausschlussgründe (§ 312g Abs. 2 BGB):
 * - Maßgefertigte / personalisierte Waren
 * - Verderbliche Waren
 * - Entsiegelte Hygieneartikel
 * - Digitale Inhalte nach Ausführungsbeginn mit Zustimmung
 */
const EXCLUDED_PRODUCT_TYPES = (process.env.WITHDRAWAL_EXCLUDED_TYPES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Prüft ob ein einzelnes Order-Item vom Widerruf ausgeschlossen ist.
 * Erweiterbar: hier können eigene Geschäftsregeln eingebaut werden.
 *
 * @param {Object} item - Ein Bestellartikel
 * @returns {{ excluded: boolean, reason: string }}
 */
function excludeFromWithdrawal(item) {
  const snapKategorie = (item?.produktSnapshot?.kategorie || '').toLowerCase();
  const produktType = (item?.produktType || '').toLowerCase();

  // Personalisierte Waren
  const isPersonalized =
    item?.konfiguration?.personalisierung &&
    item.konfiguration.personalisierung.trim().length > 0;

  if (isPersonalized) {
    return {
      excluded: true,
      reason: 'Personalisierte/maßgefertigte Ware – kein Widerrufsrecht (§ 312g Abs. 2 Nr. 1 BGB)'
    };
  }

  // Konfigurierbare Ausschlüsse
  if (EXCLUDED_PRODUCT_TYPES.includes(snapKategorie) || EXCLUDED_PRODUCT_TYPES.includes(produktType)) {
    return {
      excluded: true,
      reason: `Produktkategorie "${snapKategorie || produktType}" vom Widerrufsrecht ausgeschlossen`
    };
  }

  return { excluded: false, reason: '' };
}

/**
 * Berechnet ob eine Bestellung innerhalb der Widerrufsfrist liegt.
 *
 * @param {Object} order - Mongoose Order-Dokument oder plain Object
 * @returns {{ withinPeriod: boolean, uncertain: boolean, deadlineDate: Date|null, message: string }}
 */
function isWithinWithdrawalPeriod(order) {
  if (!order) {
    return { withinPeriod: false, uncertain: false, deadlineDate: null, message: 'Keine Bestellung angegeben' };
  }

  const now = new Date();
  let referenceDate = null;
  let uncertain = false;

  // Bevorzuge Zustelldatum (Lieferdatum)
  const deliveryDate =
    order.versand?.zugestelltAm ||
    order.deliveryDate ||
    null;

  if (deliveryDate) {
    referenceDate = new Date(deliveryDate);
  } else {
    // Fallback auf Bestelldatum
    const orderDate = order.createdAt || order.orderDate || null;
    if (orderDate) {
      referenceDate = new Date(orderDate);
      uncertain = true;
    }
  }

  if (!referenceDate) {
    return {
      withinPeriod: false,
      uncertain: true,
      deadlineDate: null,
      message: 'Kein Referenzdatum verfügbar – Frist bitte manuell prüfen'
    };
  }

  const deadlineDate = new Date(referenceDate);
  deadlineDate.setDate(deadlineDate.getDate() + WITHDRAWAL_DAYS);

  const withinPeriod = now <= deadlineDate;

  return {
    withinPeriod,
    uncertain,
    deadlineDate,
    message: withinPeriod
      ? uncertain
        ? `Frist läuft voraussichtlich bis ${deadlineDate.toLocaleDateString('de-DE')} (bitte prüfen – kein Lieferdatum vorhanden)`
        : `Frist läuft bis ${deadlineDate.toLocaleDateString('de-DE')}`
      : `Widerrufsfrist abgelaufen (war bis ${deadlineDate.toLocaleDateString('de-DE')})`
  };
}

/**
 * Gibt alle widerrufbaren Bestellungen aus einer Liste zurück.
 * Schließt Bestellungen mit Status 'storniert' oder 'abgelehnt' aus.
 *
 * @param {Array} orders - Array von Order-Objekten
 * @returns {Array} Gefilterte und angereicherte Bestellungen
 */
function getEligibleOrders(orders) {
  if (!Array.isArray(orders)) return [];

  const ineligibleStatuses = ['storniert', 'abgelehnt'];

  return orders
    .filter((order) => !ineligibleStatuses.includes(order.status))
    .map((order) => {
      const periodCheck = isWithinWithdrawalPeriod(order);

      // Prüfe ob alle Artikel ausgeschlossen sind
      const artikelChecks = (order.artikel || []).map((item) => ({
        ...item,
        withdrawalExclusion: excludeFromWithdrawal(item)
      }));
      const allExcluded =
        artikelChecks.length > 0 &&
        artikelChecks.every((item) => item.withdrawalExclusion.excluded);

      return {
        _id: order._id,
        bestellnummer: order.bestellnummer || order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        gesamtsumme: order.preise?.gesamtsumme,
        artikel: artikelChecks,
        withdrawal: {
          ...periodCheck,
          allItemsExcluded: allExcluded,
          eligible: periodCheck.withinPeriod && !allExcluded
        }
      };
    })
    .filter((order) => order.withdrawal.withinPeriod && !order.withdrawal.allItemsExcluded);
}

module.exports = {
  isWithinWithdrawalPeriod,
  excludeFromWithdrawal,
  getEligibleOrders,
  WITHDRAWAL_DAYS
};
