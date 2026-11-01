import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

/// Error de transporte: la peticion no llego al servidor o no hubo respuesta.
class ApiNetworkException implements Exception {
  const ApiNetworkException(this.message);

  final String message;

  @override
  String toString() => 'ApiNetworkException: $message';
}

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  static const String baseUrl = String.fromEnvironment(
    'TRUST_API_BASE_URL',
    defaultValue: 'https://trust.supplymax.net/api',
  );

  final http.Client _client;
  String? _csrfToken;
  bool _csrfChecked = false;

  String get _normalizedBaseUrl =>
      baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;

  Future<T> _perform<T>(
    Future<T> Function() request, {
    Duration timeout = const Duration(seconds: 45),
  }) async {
    try {
      return await request().timeout(timeout);
    } on TimeoutException {
      throw const ApiNetworkException('Tiempo de espera agotado. Revisa tu conexion.');
    } on http.ClientException catch (error) {
      throw ApiNetworkException('Sin conexion con el servidor: ${error.message}');
    } on Exception catch (error) {
      if (error is ApiNetworkException) rethrow;
      final detail = error.toString().toLowerCase();
      if (detail.contains('socketexception') ||
          detail.contains('failed host lookup') ||
          detail.contains('connection refused') ||
          detail.contains('network is unreachable') ||
          detail.contains('connection closed') ||
          detail.contains('connection reset')) {
        throw const ApiNetworkException('Sin conexion con el servidor.');
      }
      rethrow;
    }
  }

  Map<String, String> _csrfSafeHeaders() {
    final uri = Uri.parse(_normalizedBaseUrl);
    final origin = '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}';
    return {
      'Origin': origin,
      'Referer': '$origin/',
    };
  }

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
    String? fcmToken,
    String? deviceType,
  }) async {
    final uri = Uri.parse('$_normalizedBaseUrl/login/');
    final response = await _perform(() => _client.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'email': email,
        'password': password,
        if (fcmToken != null && fcmToken.isNotEmpty) 'fcm_token': fcmToken,
        if (deviceType != null && deviceType.isNotEmpty) 'device_type': deviceType,
      }),
    ));

    if (response.statusCode == 404) {
      return _loginWithUsersFallback(email: email);
    }

    final decoded = _decodeJsonBody(
      response,
      fallbackError: 'Error ${response.statusCode} al iniciar sesión',
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(decoded['error'] ?? 'Error ${response.statusCode} al iniciar sesión');
    }

    return decoded;
  }

  Future<Map<String, dynamic>> loadGmailStatus() async {
    final uri = Uri.parse('$_normalizedBaseUrl/gmail/status/');
    final response = await _perform(() => _client.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    final decoded = _decodeJsonBody(
      response,
      fallbackError:
          'No fue posible consultar el estado de la cuenta de correo.',
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        decoded['error'] ??
            'No fue posible consultar el estado de la cuenta de correo.',
      );
    }

    return decoded;
  }

  Future<Map<String, dynamic>> _loginWithUsersFallback({required String email}) async {
    final uri = Uri.parse('$_normalizedBaseUrl/users/');
    final response = await _perform(() => _client.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    final decoded = _decodeJsonBody(
      response,
      fallbackError: 'No fue posible validar el usuario. Intenta nuevamente.',
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(decoded['error'] ?? 'Error ${response.statusCode} al validar usuario');
    }

    final users = decoded['results'];
    if (users is! List) {
      throw Exception('Respuesta inválida del servidor. Intenta nuevamente.');
    }

    final normalizedEmail = email.trim().toLowerCase();
    for (final user in users) {
      if (user is! Map<String, dynamic>) {
        continue;
      }
      final candidateEmail = (user['email'] as String? ?? '').trim().toLowerCase();
      final isActive = user['is_active'] == true;
      if (candidateEmail == normalizedEmail && isActive) {
        return {'user': user};
      }
    }

    throw Exception('No encontramos un usuario activo con ese correo.');
  }

  Future<void> _ensureCsrfToken() async {
    if (_csrfChecked) {
      return;
    }

    _csrfChecked = true;

    final uri = Uri.parse('$_normalizedBaseUrl/csrf/');
    try {
      final response = await _perform(() => _client.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
        },
      ));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        _csrfToken = null;
        return;
      }

      final decoded = _decodeJsonBody(
        response,
        fallbackError: 'No fue posible obtener token CSRF.',
      );
      _csrfToken = decoded['csrf_token'] as String?;
    } catch (_) {
      _csrfToken = null;
    }
  }

  Map<String, String> _authHeaders(String email, {bool includeCsrf = false}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'X-Current-User-Email': email,
      ..._csrfSafeHeaders(),
    };
    if (includeCsrf && _csrfToken != null && _csrfToken!.isNotEmpty) {
      headers['X-CSRFToken'] = _csrfToken!;
    }
    return headers;
  }

  Future<Map<String, dynamic>> getJson(
    String path, {
    required String email,
    Map<String, String>? queryParameters,
  }) async {
    final uri = Uri.parse('$_normalizedBaseUrl$path').replace(queryParameters: queryParameters);
    final response = await _perform(() => _client.get(
      uri,
      headers: _authHeaders(email),
    ));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Error ${response.statusCode} al consultar $path');
    }

    return _decodeJsonBody(
      response,
      fallbackError: 'Error ${response.statusCode} al consultar $path',
    );
  }


  Future<Map<String, dynamic>> postJson(
    String path, {
    required String email,
    required Map<String, dynamic> body,
  }) async {
    await _ensureCsrfToken();
    final uri = Uri.parse('$_normalizedBaseUrl$path');
    final response = await _perform(() => _client.post(
      uri,
      headers: _authHeaders(email, includeCsrf: true),
      body: jsonEncode(body),
    ));

    final decoded = _decodeJsonBody(
      response,
      fallbackError: 'Error ${response.statusCode} al crear en $path',
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(decoded['error'] ?? 'Error ${response.statusCode} al crear en $path');
    }
    return decoded;
  }

  Future<Map<String, dynamic>> postMultipart(
    String path, {
    required String email,
    required Map<String, String> fields,
    List<http.MultipartFile> files = const [],
  }) async {
    await _ensureCsrfToken();
    final request = http.MultipartRequest('POST', Uri.parse('$_normalizedBaseUrl$path'))
      ..headers['X-Current-User-Email'] = email
      ..headers.addAll(_csrfSafeHeaders())
      ..fields.addAll(fields)
      ..files.addAll(files);

    if (_csrfToken != null && _csrfToken!.isNotEmpty) {
      request.headers['X-CSRFToken'] = _csrfToken!;
    }

    final streamed = await _perform(
      () => _client.send(request),
      timeout: const Duration(minutes: 3),
    );
    final response = await http.Response.fromStream(streamed);
    final decoded = _decodeJsonBody(
      response,
      fallbackError: 'Error ${response.statusCode} al crear en $path',
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(decoded['error'] ?? 'Error ${response.statusCode} al crear en $path');
    }
    return decoded;
  }

  Future<Map<String, dynamic>> patchJson(
    String path, {
    required String email,
    required Map<String, dynamic> body,
  }) async {
    await _ensureCsrfToken();
    final uri = Uri.parse('$_normalizedBaseUrl$path');
    final response = await _perform(() => _client.patch(
      uri,
      headers: _authHeaders(email, includeCsrf: true),
      body: jsonEncode(body),
    ));

    final decoded = _decodeJsonBody(
      response,
      fallbackError: 'Error ${response.statusCode} al actualizar $path',
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(decoded['error'] ?? 'Error ${response.statusCode} al actualizar $path');
    }
    return decoded;
  }

  Future<Map<String, dynamic>> putJson(
    String path, {
    required String email,
    required Map<String, dynamic> body,
  }) async {
    await _ensureCsrfToken();
    final uri = Uri.parse('$_normalizedBaseUrl$path');
    final response = await _perform(() => _client.put(
      uri,
      headers: _authHeaders(email, includeCsrf: true),
      body: jsonEncode(body),
    ));

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
    await _ensureCsrfToken();
    final request = http.MultipartRequest('PATCH', Uri.parse('$_normalizedBaseUrl$path'))
      ..headers['X-Current-User-Email'] = email
      ..headers.addAll(_csrfSafeHeaders())
      ..fields.addAll(fields)
      ..files.addAll(files);

    if (_csrfToken != null && _csrfToken!.isNotEmpty) {
      request.headers['X-CSRFToken'] = _csrfToken!;
    }

    final streamed = await _perform(
      () => _client.send(request),
      timeout: const Duration(minutes: 3),
    );
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

  Future<Map<String, dynamic>> deleteJson(
    String path, {
    required String email,
  }) async {
    await _ensureCsrfToken();
    final uri = Uri.parse('$_normalizedBaseUrl$path');
    final response = await _perform(() => _client.delete(
      uri,
      headers: _authHeaders(email, includeCsrf: true),
    ));

    if (response.statusCode == 204) {
      return {'status': 'success'};
    }

    final decoded = _decodeJsonBody(
      response,
      fallbackError: 'Error ${response.statusCode} al eliminar $path',
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(decoded['error'] ?? 'Error ${response.statusCode} al eliminar $path');
    }
    return decoded;
  }

  Future<http.Response> getRaw(
    String path, {
    required String email,
    Map<String, String>? queryParameters,
  }) async {
    final uri = Uri.parse('$_normalizedBaseUrl$path').replace(queryParameters: queryParameters);
    final response = await _perform(
      () => _client.get(
        uri,
        headers: _authHeaders(email),
      ),
      timeout: const Duration(minutes: 2),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Error ${response.statusCode} al consultar $path');
    }

    return response;
  }

  /// Envia un lote de operaciones offline. El endpoint es idempotente y usa
  /// device_id + payload para evitar duplicados.
  Future<Map<String, dynamic>> postSyncBatch({
    required String deviceId,
    required List<Map<String, dynamic>> operations,
  }) async {
    final uri = Uri.parse('$_normalizedBaseUrl/sync/batch/');
    final response = await _perform(
      () => _client.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          ..._csrfSafeHeaders(),
        },
        body: jsonEncode({
          'device_id': deviceId,
          'operations': operations,
        }),
      ),
      timeout: const Duration(minutes: 3),
    );

    final decoded = _decodeJsonBody(
      response,
      fallbackError: 'Error ${response.statusCode} al sincronizar los cambios',
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        decoded['error'] ?? 'Error ${response.statusCode} al sincronizar los cambios',
      );
    }
    return decoded;
  }
}
