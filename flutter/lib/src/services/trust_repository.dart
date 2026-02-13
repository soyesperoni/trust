import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../models/dashboard_stats.dart';
import '../models/incident.dart';
import '../models/visit.dart';
import 'api_client.dart';

class TrustRepository {
  TrustRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  final ApiClient _apiClient;

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) {
    return _apiClient.login(email: email, password: password);
  }

  Future<DashboardStats> loadDashboardStats(String email) async {
    final json = await _apiClient.getJson('/dashboard/', email: email);
    return DashboardStats.fromJson(json['stats'] as Map<String, dynamic>? ?? {});
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

  Future<List<Incident>> loadIncidents(String email) async {
    final json = await _apiClient.getJson('/incidents/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().map(Incident.fromJson).toList(growable: false);
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

class VisitReportData {
  const VisitReportData({
    required this.visit,
    required this.dispensers,
  });

  final Map<String, dynamic> visit;
  final List<Map<String, dynamic>> dispensers;
}
