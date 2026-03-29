function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundCurrency(value) {
  return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
}

function normalizeDiscountPercent(value) {
  const raw = toNumber(value, 0);
  if (raw <= 0) return 0;
  if (raw >= 100) return 100;
  return roundCurrency(raw);
}

function parseDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isInsideSaleWindow(sale, now = new Date()) {
  const startsAt = parseDateOrNull(sale?.startsAt);
  const endsAt = parseDateOrNull(sale?.endsAt);
  const current = parseDateOrNull(now) || new Date();

  if (startsAt && current < startsAt) {
    return false;
  }

  if (endsAt && current > endsAt) {
    return false;
  }

  return true;
}

function isSaleActive(product) {
  const discountPercent = normalizeDiscountPercent(product?.sale?.discountPercent);
  return Boolean(product?.sale?.isOnSale) && discountPercent > 0 && isInsideSaleWindow(product?.sale);
}

function getBasePrice(product) {
  return Math.max(0, roundCurrency(product?.preis));
}

function calculateEffectivePrice(product) {
  const basePrice = getBasePrice(product);
  const discountPercent = normalizeDiscountPercent(product?.sale?.discountPercent);
  const saleActive = Boolean(product?.sale?.isOnSale) && discountPercent > 0 && isInsideSaleWindow(product?.sale);
  const startsAt = parseDateOrNull(product?.sale?.startsAt);
  const endsAt = parseDateOrNull(product?.sale?.endsAt);

  if (!saleActive) {
    return {
      basePrice,
      effectivePrice: basePrice,
      isOnSale: false,
      discountPercent: 0,
      discountAmount: 0,
      startsAt,
      endsAt
    };
  }

  const discountAmount = roundCurrency(basePrice * (discountPercent / 100));
  const effectivePrice = Math.max(0, roundCurrency(basePrice - discountAmount));

  return {
    basePrice,
    effectivePrice,
    isOnSale: true,
    discountPercent,
    discountAmount,
    startsAt,
    endsAt
  };
}

module.exports = {
  calculateEffectivePrice,
  normalizeDiscountPercent,
  isSaleActive,
  roundCurrency
};
