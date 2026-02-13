import 'dart:convert';

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

  Future<List<Incident>> loadIncidents(String email) async {
    final json = await _apiClient.getJson('/incidents/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().map(Incident.fromJson).toList(growable: false);
  }
}
