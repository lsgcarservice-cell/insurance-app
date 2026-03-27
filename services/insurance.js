function calculatePremium(carValue, type) {
  let rate = 0;

  if (type === '1') rate = 0.03;
  if (type === '2+') rate = 0.025;
  if (type === '3+') rate = 0.02;

  const premium = carValue * rate;
  const vat = premium * 0.07;

  return {
    premium,
    vat,
    total: premium + vat
  };
}

module.exports = { calculatePremium };