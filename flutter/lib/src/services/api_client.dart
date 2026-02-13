import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  static const String baseUrl = String.fromEnvironment(
    'TRUST_API_BASE_URL',
    defaultValue: 'https://trust.supplymax.net/api',
  );

  final http.Client _client;
  String? _csrfToken;

  String get _normalizedBaseUrl =>
      baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;

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
    final uri = Uri.parse('$_normalizedBaseUrl/login/');
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

  Future<Map<String, dynamic>> _loginWithUsersFallback({required String email}) async {
    final uri = Uri.parse('$_normalizedBaseUrl/users/');
    final response = await _client.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
      },
    );

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
    if (_csrfToken != null && _csrfToken!.isNotEmpty) {
      return;
    }

    final uri = Uri.parse('$_normalizedBaseUrl/csrf/');
    final response = await _client.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
      },
    );

    final decoded = _decodeJsonBody(
      response,
      fallbackError: 'No fue posible obtener token CSRF.',
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(decoded['error'] ?? 'Error ${response.statusCode} al obtener CSRF');
    }

    _csrfToken = decoded['csrf_token'] as String?;
    if (_csrfToken == null || _csrfToken!.isEmpty) {
      throw Exception('No fue posible obtener token CSRF.');
    }
  }

  Map<String, String> _authHeaders(String email, {bool includeCsrf = false}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'X-Current-User-Email': email,
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
    final response = await _client.get(
      uri,
      headers: _authHeaders(email),
    );

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
    final response = await _client.post(
      uri,
      headers: _authHeaders(email, includeCsrf: true),
      body: jsonEncode(body),
    );

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
      ..headers['X-CSRFToken'] = _csrfToken!
      ..fields.addAll(fields)
      ..files.addAll(files);

    final streamed = await _client.send(request);
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
    final response = await _client.patch(
      uri,
      headers: _authHeaders(email, includeCsrf: true),
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
    await _ensureCsrfToken();
    final request = http.MultipartRequest('PATCH', Uri.parse('$_normalizedBaseUrl$path'))
      ..headers['X-Current-User-Email'] = email
      ..headers['X-CSRFToken'] = _csrfToken!
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
