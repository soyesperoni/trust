import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../models/dashboard_stats.dart';
import '../models/incident.dart';
import '../models/audit.dart';
import '../models/visit.dart';
import 'api_client.dart';

class TrustRepository {
  TrustRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  final ApiClient _apiClient;

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? fcmToken,
    String? deviceType,
  }) {
    return _apiClient.login(
      email: email,
      password: password,
      fcmToken: fcmToken,
      deviceType: deviceType,
    );
  }

  Future<DashboardStats> loadDashboardStats(String email) async {
    final json = await _apiClient.getJson('/dashboard/', email: email);
    return DashboardStats.fromJson(json['stats'] as Map<String, dynamic>? ?? {});
  }

  Future<DashboardSummary> loadDashboardSummary(String email) async {
    final json = await _apiClient.getJson('/dashboard/', email: email);
    final stats = DashboardStats.fromJson(json['stats'] as Map<String, dynamic>? ?? {});
    final results = (json['daily_audit_score_history'] as List<dynamic>? ?? const []);
    final history = results
        .whereType<Map<String, dynamic>>()
        .map(DailyAuditScore.fromJson)
        .toList(growable: false);
    return DashboardSummary(stats: stats, dailyAuditScoreHistory: history);
  }


  Future<Map<String, dynamic>> loadCurrentUser(String email) async {
    final json = await _apiClient.getJson('/users/', email: email);
    final results = (json['results'] as List<dynamic>? ?? const []);
    final normalizedEmail = email.trim().toLowerCase();

    for (final entry in results) {
      if (entry is! Map<String, dynamic>) {
        continue;
      }
      final candidateEmail = (entry['email'] as String? ?? '').trim().toLowerCase();
      if (candidateEmail == normalizedEmail) {
        return entry;
      }
    }

    throw Exception('No se encontró el usuario actual.');
  }

  Future<Map<String, dynamic>> updateUserProfile({
    required String currentEmail,
    required int userId,
    required String fullName,
    String? password,
  }) {
    final body = <String, dynamic>{
      'full_name': fullName,
    };
    if (password != null && password.isNotEmpty) {
      body['password'] = password;
    }

    return _apiClient.putJson(
      '/users/$userId/',
      email: currentEmail,
      body: body,
    );
  }
  Future<List<Visit>> loadVisits(String email) async {
    final json = await _apiClient.getJson('/visits/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().map(Visit.fromJson).toList(growable: false);
  }

  Future<Visit> loadVisitById(String email, int visitId) async {
    final visits = await loadVisits(email);
    return visits.firstWhere((visit) => visit.id == visitId);
  }

  Future<List<Audit>> loadAudits(String email) async {
    final json = await _apiClient.getJson('/audits/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().map(Audit.fromJson).toList(growable: false);
  }

  Future<Audit> startAudit({
    required String email,
    required int auditId,
    required double latitude,
    required double longitude,
  }) async {
    final response = await _apiClient.patchJson(
      '/audits/$auditId/mobile-flow/',
      email: email,
      body: {
        'action': 'start',
        'start_latitude': latitude,
        'start_longitude': longitude,
      },
    );
    return Audit.fromJson(response);
  }

  Future<Audit> completeAudit({
    required String email,
    required int auditId,
    required double latitude,
    required double longitude,
    required Map<String, dynamic> auditReport,
    List<http.MultipartFile> evidenceFiles = const [],
  }) async {
    final hasEvidenceFiles = evidenceFiles.isNotEmpty;
    final response = hasEvidenceFiles
        ? await _apiClient.patchMultipart(
            '/audits/$auditId/mobile-flow/',
            email: email,
            fields: {
              'action': 'complete',
              'end_latitude': latitude.toString(),
              'end_longitude': longitude.toString(),
              'audit_report': jsonEncode(auditReport),
            },
            files: evidenceFiles,
          )
        : await _apiClient.patchJson(
            '/audits/$auditId/mobile-flow/',
            email: email,
            body: {
              'action': 'complete',
              'end_latitude': latitude,
              'end_longitude': longitude,
              'audit_report': auditReport,
            },
          );
    return Audit.fromJson(response);
  }

  Future<Audit> createAudit({
    required String email,
    required int areaId,
    int? inspectorId,
    String? notes,
    DateTime? auditedAt,
  }) async {
    final body = <String, dynamic>{
      'area_id': areaId,
    };

    if (inspectorId != null) {
      body['inspector_id'] = inspectorId;
    }
    if (notes != null && notes.trim().isNotEmpty) {
      body['notes'] = notes.trim();
    }
    if (auditedAt != null) {
      body['audited_at'] = auditedAt.toIso8601String();
    }

    final response = await _apiClient.postJson(
      '/audits/',
      email: email,
      body: body,
    );

    return Audit.fromJson(response);
  }



  Future<List<Map<String, dynamic>>> loadDispenserModels(String email) async {
    final json = await _apiClient.getJson('/dispenser-models/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().toList(growable: false);
  }

  Future<List<Map<String, dynamic>>> loadProducts(String email) async {
    final json = await _apiClient.getJson('/products/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().toList(growable: false);
  }

  Future<Map<String, dynamic>> createClient({
    required String email,
    required String name,
    required String code,
    String notes = '',
    String visitType = 'technical',
  }) {
    return _apiClient.postJson(
      '/clients/',
      email: email,
      body: {
        'name': name,
        'code': code,
        'notes': notes,
        'visit_type': visitType,
      },
    );
  }

  Future<Map<String, dynamic>> createBranch({
    required String email,
    required int clientId,
    required String name,
    String address = '',
    String city = '',
  }) {
    return _apiClient.postJson(
      '/branches/',
      email: email,
      body: {
        'client_id': clientId,
        'name': name,
        'address': address,
        'city': city,
      },
    );
  }

  Future<Map<String, dynamic>> createArea({
    required String email,
    required int branchId,
    required String name,
    String description = '',
  }) {
    return _apiClient.postJson(
      '/areas/',
      email: email,
      body: {
        'branch_id': branchId,
        'name': name,
        'description': description,
      },
    );
  }

  Future<Map<String, dynamic>> createDispenser({
    required String email,
    required int areaId,
    required int modelId,
    List<int> productIds = const [],
  }) {
    return _apiClient.postJson(
      '/dispensers/',
      email: email,
      body: {
        'area_id': areaId,
        'model_id': modelId,
        'product_ids': productIds,
        'is_active': true,
      },
    );
  }


  Future<Map<String, dynamic>> createUser({
    required String email,
    required String fullName,
    required String userEmail,
    required String password,
    required String role,
    List<int> clientIds = const [],
    List<int> branchIds = const [],
  }) {
    return _apiClient.postJson(
      '/users/',
      email: email,
      body: {
        'full_name': fullName,
        'email': userEmail,
        'password': password,
        'username': userEmail,
        'role': role,
        'client_ids': clientIds,
        'branch_ids': branchIds,
      },
    );
  }

  Future<List<Map<String, dynamic>>> loadClients(String email) async {
    final json = await _apiClient.getJson('/clients/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().toList(growable: false);
  }

  Future<List<Map<String, dynamic>>> loadBranches(String email) async {
    final json = await _apiClient.getJson('/branches/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().toList(growable: false);
  }

  Future<List<Map<String, dynamic>>> loadAreas(String email) async {
    final json = await _apiClient.getJson('/areas/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().toList(growable: false);
  }

  Future<List<Map<String, dynamic>>> loadDispensers(String email) async {
    final json = await _apiClient.getJson('/dispensers/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().toList(growable: false);
  }

  Future<Visit> startVisit({
    required String email,
    required int visitId,
    required double latitude,
    required double longitude,
  }) async {
    final response = await _apiClient.patchJson(
      '/visits/$visitId/mobile-flow/',
      email: email,
      body: {
        'action': 'start',
        'start_latitude': latitude,
        'start_longitude': longitude,
      },
    );
    return Visit.fromJson(response);
  }

  Future<Visit> completeVisit({
    required String email,
    required int visitId,
    required double latitude,
    required double longitude,
    required Map<String, dynamic> visitReport,
    List<http.MultipartFile> evidenceFiles = const [],
  }) async {
    final hasEvidenceFiles = evidenceFiles.isNotEmpty;
    final response = hasEvidenceFiles
        ? await _apiClient.patchMultipart(
            '/visits/$visitId/mobile-flow/',
            email: email,
            fields: {
              'action': 'complete',
              'end_latitude': latitude.toString(),
              'end_longitude': longitude.toString(),
              'visit_report': jsonEncode(visitReport),
            },
            files: evidenceFiles,
          )
        : await _apiClient.patchJson(
            '/visits/$visitId/mobile-flow/',
            email: email,
            body: {
              'action': 'complete',
              'end_latitude': latitude,
              'end_longitude': longitude,
              'visit_report': visitReport,
            },
          );
    return Visit.fromJson(response);
  }

  Future<List<Visit>> loadVisitsByMonth(String email, DateTime month) async {
    final normalizedMonth = DateTime(month.year, month.month);
    final json = await _apiClient.getJson(
      '/visits/',
      email: email,
      queryParameters: {
        'month': '${normalizedMonth.year}-${normalizedMonth.month.toString().padLeft(2, '0')}',
      },
    );
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().map(Visit.fromJson).toList(growable: false);
  }

  Future<List<Audit>> loadAuditsByMonth(String email, DateTime month) async {
    final normalizedMonth = DateTime(month.year, month.month);
    final json = await _apiClient.getJson(
      '/audits/',
      email: email,
      queryParameters: {
        'month': '${normalizedMonth.year}-${normalizedMonth.month.toString().padLeft(2, '0')}',
      },
    );
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().map(Audit.fromJson).toList(growable: false);
  }

  Future<VisitReportData> loadVisitReportData({
    required String email,
    required int visitId,
  }) async {
    final responses = await Future.wait([
      _apiClient.getJson('/visits/', email: email),
      _apiClient.getJson('/dispensers/', email: email),
    ]);

    final visitsJson = responses[0];
    final dispensersJson = responses[1];

    final visits = (visitsJson['results'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList(growable: false);

    final visit = visits.firstWhere(
      (entry) => (entry['id'] as int? ?? -1) == visitId,
      orElse: () => <String, dynamic>{},
    );

    if (visit.isEmpty) {
      throw Exception('No se encontró la visita.');
    }

    final areaId = visit['area_id'] as int?;
    final dispensers = (dispensersJson['results'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .where((entry) {
          if (areaId == null) return true;
          final area = entry['area'];
          if (area is Map<String, dynamic>) {
            return area['id'] == areaId;
          }
          return false;
        })
        .toList(growable: false);

    return VisitReportData(visit: visit, dispensers: dispensers);
  }

  Future<Uint8List> downloadVisitReportPdf({
    required String email,
    required int visitId,
  }) async {
    final response = await _apiClient.getRaw('/visits/$visitId/report', email: email);
    return response.bodyBytes;
  }

  Future<Map<String, dynamic>> loadAuditReportData({
    required String email,
    required int auditId,
  }) async {
    final auditsJson = await _apiClient.getJson('/audits/', email: email);
    final audits = (auditsJson['results'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList(growable: false);

    final audit = audits.firstWhere(
      (entry) => (entry['id'] as int? ?? -1) == auditId,
      orElse: () => <String, dynamic>{},
    );

    if (audit.isEmpty) {
      throw Exception('No se encontró la auditoría.');
    }
    return audit;
  }

  Future<Uint8List> downloadAuditReportPdf({
    required String email,
    required int auditId,
  }) async {
    final response = await _apiClient.getRaw('/audits/$auditId/report', email: email);
    return response.bodyBytes;
  }


  Future<List<Map<String, dynamic>>> loadNotifications(String email) async {
    final json = await _apiClient.getJson('/notifications/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().toList(growable: false);
  }

  Future<List<Incident>> loadIncidents(String email) async {
    final json = await _apiClient.getJson('/incidents/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().map(Incident.fromJson).toList(growable: false);
  }


  Future<Incident> loadIncidentById({
    required String email,
    required int incidentId,
  }) async {
    final json = await _apiClient.getJson('/incidents/$incidentId/', email: email);
    return Incident.fromJson(json);
  }


  Future<List<Map<String, dynamic>>> loadInspectors(String email) async {
    final json = await _apiClient.getJson('/users/', email: email);
    final results = (json['results'] as List<dynamic>? ?? const []);
    return results
        .whereType<Map<String, dynamic>>()
        .where((entry) => (entry['role'] as String? ?? '').toLowerCase() == 'inspector')
        .toList(growable: false);
  }

  Future<Map<String, dynamic>> scheduleVisitFromIncident({
    required String email,
    required int incidentId,
    required int? inspectorId,
    required DateTime visitedAt,
    String notes = '',
    String visitType = 'technical',
  }) {
    return _apiClient.postJson(
      '/incidents/$incidentId/schedule-visit/',
      email: email,
      body: {
        if (inspectorId != null) 'inspector_id': inspectorId,
        'visited_at': visitedAt.toUtc().toIso8601String(),
        'notes': notes,
        'visit_type': visitType,
      },
    );
  }


  Future<Map<String, dynamic>> createIncident({
    required String email,
    required int clientId,
    required int branchId,
    required int areaId,
    required int dispenserId,
    required String description,
    List<http.MultipartFile> evidenceFiles = const [],
  }) async {
    final fields = {
      'client_id': clientId.toString(),
      'branch_id': branchId.toString(),
      'area_id': areaId.toString(),
      'dispenser_id': dispenserId.toString(),
      'description': description,
    };

    if (evidenceFiles.isNotEmpty) {
      return _apiClient.postMultipart(
        '/incidents/',
        email: email,
        fields: fields,
        files: evidenceFiles,
      );
    }

    return _apiClient.postJson(
      '/incidents/',
      email: email,
      body: {
        'client_id': clientId,
        'branch_id': branchId,
        'area_id': areaId,
        'dispenser_id': dispenserId,
        'description': description,
      },
    );
  }
}

class DailyAuditScore {
  const DailyAuditScore({
    required this.date,
    required this.score,
  });

  final DateTime date;
  final double score;

  factory DailyAuditScore.fromJson(Map<String, dynamic> json) {
    final rawDate = (json['date'] as String? ?? '').trim();
    final parsedDate = DateTime.tryParse(rawDate);
    return DailyAuditScore(
      date: parsedDate ?? DateTime.fromMillisecondsSinceEpoch(0),
      score: (json['score'] as num?)?.toDouble() ?? 0,
    );
  }
}

class DashboardSummary {
  const DashboardSummary({
    required this.stats,
    required this.dailyAuditScoreHistory,
  });

  final DashboardStats stats;
  final List<DailyAuditScore> dailyAuditScoreHistory;
}

class VisitReportData {
  const VisitReportData({
    required this.visit,
    required this.dispensers,
  });

  final Map<String, dynamic> visit;
  final List<Map<String, dynamic>> dispensers;
}
