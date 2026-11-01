import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:trust_mobile/src/services/api_client.dart';

void main() {
  test('loadGmailStatus consulta el estado publico del correo', () async {
    final client = MockClient((request) async {
      expect(request.method, 'GET');
      expect(request.url.path, '/api/gmail/status/');
      return http.Response(
        '{"configured": true, "authorized": false, '
        '"email": "trust@supplymax.net", '
        '"authorize_url": "/api/gmail/authorize/"}',
        200,
        headers: {'content-type': 'application/json'},
      );
    });

    final status = await ApiClient(client: client).loadGmailStatus();

    expect(status['configured'], isTrue);
    expect(status['authorized'], isFalse);
    expect(status['email'], 'trust@supplymax.net');
    expect(status['authorize_url'], '/api/gmail/authorize/');
  });

  test('loadGmailStatus propaga el error del backend', () async {
    final client = MockClient((request) async {
      return http.Response(
        '{"error": "No disponible"}',
        503,
        headers: {'content-type': 'application/json'},
      );
    });

    expect(
      () => ApiClient(client: client).loadGmailStatus(),
      throwsA(
        predicate<Exception>(
          (error) => error.toString().contains('No disponible'),
        ),
      ),
    );
  });
}
