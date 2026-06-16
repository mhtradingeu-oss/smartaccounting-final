import { formatDatevLine } from '../../src/utils/datev/datevFormatter';

test('formats DATEV EXTF line correctly', () => {
  const line = formatDatevLine({
    belegdatum: '20260115',
    buchungstext: 'Invoice 1001',
    sollKonto: '8400',
    habenKonto: '1000',
    betrag: 119.0,
    steuerkennzeichen: 'U19',
    belegnummer: 'INV-1001',
  });

  expect(line).toContain(';8400;1000;119,00;U19;INV-1001');
});
