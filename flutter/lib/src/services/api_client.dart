import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  static const String baseUrl = 'https://trust.supplymax.net/api';

  final http.Client _client;

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

    return jsonDecode(response.body) as Map<String, dynamic>;
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

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
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
    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(decoded['error'] ?? 'Error ${response.statusCode} al actualizar $path');
    }
    return decoded;
  }
}
