import 'dart:convert';

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

  test('postSyncBatch envia device_id y operaciones al endpoint', () async {
    final client = MockClient((request) async {
      expect(request.method, 'POST');
      expect(request.url.path, '/api/sync/batch/');
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      expect(body['device_id'], 'trust-test');
      expect((body['operations'] as List<dynamic>).length, 1);
      return http.Response(
        '{"success": true, "processed": 1, "summary": {"synced": 1}, '
        '"results": [{"index": 0, "status": "synced"}]}',
        200,
        headers: {'content-type': 'application/json'},
      );
    });

    final result = await ApiClient(client: client).postSyncBatch(
      deviceId: 'trust-test',
      operations: [
        {
          'entity_type': 'visit',
          'entity_id': 7,
          'data': {'status': 'completed'},
          'technician_updated_at': '2026-10-05T12:00:00Z',
        },
      ],
    );

    expect(result['success'], isTrue);
    expect(result['processed'], 1);
  });

  test('postSyncBatch distingue fallos de red', () async {
    final client = MockClient((request) async {
      throw http.ClientException('Sin red', request.url);
    });

    expect(
      () => ApiClient(client: client)
          .postSyncBatch(deviceId: 'trust-test', operations: const []),
      throwsA(isA<ApiNetworkException>()),
    );
  });
}
