import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  static const String baseUrl = 'https://trust.supplymax.net/api';

  final http.Client _client;

  Map<String, dynamic> _decodeJsonBody(http.Response response, {required String fallbackError}) {
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      throw const FormatException('La respuesta no es un objeto JSON válido');
    } on FormatException {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        final rawMessage = response.body.trim();
        throw Exception(rawMessage.isEmpty ? fallbackError : rawMessage);
      }
      throw Exception('Respuesta inválida del servidor. Intenta nuevamente.');
    }
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final uri = Uri.parse('$baseUrl/login/');
    final response = await _client.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    final decoded = _decodeJsonBody(
      response,
      fallbackError: 'Error ${response.statusCode} al iniciar sesión',
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(decoded['error'] ?? 'Error ${response.statusCode} al iniciar sesión');
    }

    return decoded;
  }

  Future<Map<String, dynamic>> getJson(
    String path, {
    required String email,
    Map<String, String>? queryParameters,
  }) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: queryParameters);
    final response = await _client.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'X-Current-User-Email': email,
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Error ${response.statusCode} al consultar $path');
    }

    return _decodeJsonBody(
      response,
      fallbackError: 'Error ${response.statusCode} al consultar $path',
    );
  }

  Future<Map<String, dynamic>> patchJson(
    String path, {
    required String email,
    required Map<String, dynamic> body,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await _client.patch(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'X-Current-User-Email': email,
      },
      body: jsonEncode(body),
    );

    final decoded = _decodeJsonBody(
      response,
      fallbackError: 'Error ${response.statusCode} al actualizar $path',
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(decoded['error'] ?? 'Error ${response.statusCode} al actualizar $path');
    }
    return decoded;
  }

  Future<Map<String, dynamic>> patchMultipart(
    String path, {
    required String email,
    required Map<String, String> fields,
    List<http.MultipartFile> files = const [],
  }) async {
    final request = http.MultipartRequest('PATCH', Uri.parse('$baseUrl$path'))
      ..headers['X-Current-User-Email'] = email
      ..fields.addAll(fields)
      ..files.addAll(files);

    final streamed = await _client.send(request);
    final response = await http.Response.fromStream(streamed);
    final decoded = _decodeJsonBody(
      response,
      fallbackError: 'Error ${response.statusCode} al actualizar $path',
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(decoded['error'] ?? 'Error ${response.statusCode} al actualizar $path');
    }
    return decoded;
  }
}
