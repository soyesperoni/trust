import 'package:flutter_test/flutter_test.dart';
import 'package:trust_mobile/src/models/visit.dart';

void main() {
  group('Visit.fromJson', () {
    test('reads dispenser count from canonical backend key', () {
      final visit = Visit.fromJson({
        'id': 1,
        'client': 'Cliente',
        'branch': 'Sucursal',
        'area': 'Área',
        'visited_at': '2026-01-01T10:00:00Z',
        'inspector': 'Inspector',
        'status': 'scheduled',
        'area_dispensers_count': 3,
      });

      expect(visit.areaDispensersCount, 3);
    });

    test('supports alternate payload keys and numeric formats', () {
      final visit = Visit.fromJson({
        'dispensers_count': 2.0,
      });

      expect(visit.areaDispensersCount, 2);
    });

    test('supports nested area payload with dispenser counters', () {
      final visit = Visit.fromJson({
        'area': {
          'id': 99,
          'name': 'Producción',
          'dispensers_count': '4',
        },
      });

      expect(visit.areaDispensersCount, 4);
    });

    test('falls back to dispensers list length when available', () {
      final visit = Visit.fromJson({
        'area': {
          'name': 'Producción',
          'dispensers': [
            {'id': 1},
            {'id': 2},
            {'id': 3},
          ],
        },
      });

      expect(visit.areaDispensersCount, 3);
    });
  });
}
