import '../models/dashboard_stats.dart';
import '../models/incident.dart';
import '../models/visit.dart';
import 'api_client.dart';

class TrustRepository {
  TrustRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  final ApiClient _apiClient;

  Future<DashboardStats> loadDashboardStats(String email) async {
    final json = await _apiClient.getJson('/dashboard/', email: email);
    return DashboardStats.fromJson(json['stats'] as Map<String, dynamic>? ?? {});
  }

  Future<List<Visit>> loadVisits(String email) async {
    final json = await _apiClient.getJson('/visits/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results
        .whereType<Map<String, dynamic>>()
        .map(Visit.fromJson)
        .toList(growable: false);
  }

  Future<List<Incident>> loadIncidents(String email) async {
    final json = await _apiClient.getJson('/incidents/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results
        .whereType<Map<String, dynamic>>()
        .map(Incident.fromJson)
        .toList(growable: false);
  }
}
