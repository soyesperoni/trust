import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../models/dashboard_stats.dart';
import '../models/incident.dart';
import '../models/audit.dart';
import '../models/visit.dart';
import 'api_client.dart';
import 'local_db_service.dart';
import 'sync_queue_service.dart';

class TrustRepository {
  TrustRepository({
    ApiClient? apiClient,
    LocalDbService? localDb,
    SyncQueueService? syncQueue,
  })  : _apiClient = apiClient ?? ApiClient(),
        _localDb = localDb ?? LocalDbService.instance,
        _syncQueue = syncQueue ?? SyncQueueService.instance;

  final ApiClient _apiClient;
  final LocalDbService _localDb;
  final SyncQueueService _syncQueue;

  Future<bool> _ensureOfflineReady() async {
    try {
      await _syncQueue.initialize(apiClient: _apiClient, localDb: _localDb);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> hasPendingSync(String entityType, int entityId) async {
    if (!await _ensureOfflineReady()) {
      return false;
    }
    try {
      final pending =
          await _localDb.hasPendingOperation(entityType, '$entityId');
      if (pending) {
        _syncQueue.notifyQueued(entityType, '$entityId');
      }
      return pending;
    } catch (_) {
      return false;
    }
  }

  Future<SyncQueueSummary> syncSummary() async {
    if (!await _ensureOfflineReady()) {
      return const SyncQueueSummary.empty();
    }
    return _syncQueue.summary();
  }

  Future<SyncFlushResult> retryPendingSync() async {
    if (!await _ensureOfflineReady()) {
      return const SyncFlushResult();
    }
    return _syncQueue.retryFailed();
  }

  Future<List<SyncQueueEntry>> loadSyncQueueEntries({int limit = 200}) async {
    if (!await _ensureOfflineReady()) {
      return const <SyncQueueEntry>[];
    }
    try {
      return await _localDb.loadQueueEntries(limit: limit);
    } catch (_) {
      return const <SyncQueueEntry>[];
    }
  }

  Future<List<Map<String, dynamic>>> loadSyncLogs({int limit = 50}) async {
    if (!await _ensureOfflineReady()) {
      return const <Map<String, dynamic>>[];
    }
    try {
      return await _localDb.loadSyncLogs(limit: limit);
    } catch (_) {
      return const <Map<String, dynamic>>[];
    }
  }



  Future<void> _cacheReceipt({
    required String entityType,
    required int entityId,
    required String fileName,
    required Uint8List bytes,
  }) async {
    if (!await _ensureOfflineReady()) return;
    try {
      await _localDb.saveReceipt(
        entityType: entityType,
        entityId: '$entityId',
        fileName: fileName,
        mimeType: 'application/pdf',
        base64Data: base64Encode(bytes),
        syncStatus: SyncQueueStatus.synced,
      );
    } catch (_) {
      return;
    }
  }

  Future<Uint8List?> _loadCachedReceipt({
    required String entityType,
    required int entityId,
  }) async {
    if (!await _ensureOfflineReady()) return null;
    try {
      final row = await _localDb.loadReceipt(
        entityType: entityType,
        entityId: '$entityId',
        mimeType: 'application/pdf',
      );
      final raw = row?['base64_data'] as String?;
      if (raw == null || raw.isEmpty) return null;
      return base64Decode(raw);
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> _safeLoadVisit(int id) async {
    try {
      return await _localDb.loadVisit(id);
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> _safeLoadAudit(int id) async {
    try {
      return await _localDb.loadAudit(id);
    } catch (_) {
      return null;
    }
  }

  Future<bool> _safeSaveVisit(
    Map<String, dynamic> visit, {
    String syncStatus = SyncQueueStatus.synced,
  }) async {
    try {
      await _localDb.saveVisit(visit, syncStatus: syncStatus);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> _safeSaveAudit(
    Map<String, dynamic> audit, {
    String syncStatus = SyncQueueStatus.synced,
  }) async {
    try {
      await _localDb.saveAudit(audit, syncStatus: syncStatus);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<List<_EvidencePayload>> _readEvidence(List<http.MultipartFile> files) async {
    final evidence = <_EvidencePayload>[];
    for (final file in files) {
      final bytes = await file.finalize().toBytes();
      evidence.add(
        _EvidencePayload(
          bytes: bytes,
          fileName: file.filename ?? 'evidencia-${evidence.length + 1}',
          contentType: file.contentType,
        ),
      );
    }
    return evidence;
  }

  List<http.MultipartFile> _multipartEvidence(List<_EvidencePayload> evidence) {
    return evidence
        .map(
          (item) => http.MultipartFile.fromBytes(
            'evidence_files',
            item.bytes,
            filename: item.fileName,
            contentType: item.contentType,
          ),
        )
        .toList(growable: false);
  }

  Future<List<_LocalAttachment>> _persistAttachments({
    required String entityType,
    required int entityId,
    required List<_EvidencePayload> files,
  }) async {
    final attachments = <_LocalAttachment>[];
    for (final file in files) {
      final mimeType = file.contentType?.mimeType ?? _guessMimeType(file.fileName);
      final base64Data = base64Encode(file.bytes);
      final mediaType = mimeType.startsWith('image/')
          ? 'photo'
          : mimeType.startsWith('video/')
              ? 'video'
              : 'other';
      final parentKey = entityType == 'visit' ? 'visit_id' : 'audit_id';
      final queueEntityType = entityType == 'visit' ? 'visit_media' : 'audit_media';
      final queueData = <String, dynamic>{
        parentKey: entityId,
        'file_name': file.fileName,
        'file_base64': base64Data,
        'media_type': mediaType,
        'description': '',
      };

      final int rowId;
      final String table;
      if (mediaType == 'photo') {
        rowId = await _localDb.savePhoto(
          entityType: entityType,
          entityId: '$entityId',
          fileName: file.fileName,
          mimeType: mimeType,
          base64Data: base64Data,
        );
        table = 'photos';
      } else {
        rowId = await _localDb.saveReceipt(
          entityType: entityType,
          entityId: '$entityId',
          fileName: file.fileName,
          mimeType: mimeType,
          base64Data: base64Data,
        );
        table = 'receipts';
      }

      attachments.add(
        _LocalAttachment(
          table: table,
          rowId: rowId,
          parentEntityId: entityId,
          queueEntityType: queueEntityType,
          queueData: queueData,
        ),
      );
    }
    return attachments;
  }

  Future<int?> _persistSignature({
    required String entityType,
    required int entityId,
    required Map<String, dynamic> report,
  }) async {
    final raw = report['responsible_signature'];
    if (raw is! String || raw.trim().isEmpty) {
      return null;
    }
    final base64Data = raw.contains(',') ? raw.substring(raw.indexOf(',') + 1) : raw;
    if (base64Data.isEmpty) {
      return null;
    }
    return _localDb.saveSignature(
      entityType: entityType,
      entityId: '$entityId',
      base64Data: base64Data,
    );
  }

  Future<void> _enqueueAttachments({
    required List<_LocalAttachment> attachments,
    required DateTime technicianUpdatedAt,
  }) async {
    for (final attachment in attachments) {
      final queueId = await _localDb.enqueueOperation(
        entityType: attachment.queueEntityType,
        entityId: '${attachment.parentEntityId}-${attachment.rowId}',
        queueEntityId: '${attachment.parentEntityId}',
        includeEntityId: false,
        data: attachment.queueData,
        technicianUpdatedAt: technicianUpdatedAt,
      );
      await _localDb.setAttachmentQueueId(attachment.table, attachment.rowId, queueId);
    }
  }

  String _guessMimeType(String fileName) {
    final lower = fileName.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.mp4')) return 'video/mp4';
    if (lower.endsWith('.mov')) return 'video/quicktime';
    if (lower.endsWith('.pdf')) return 'application/pdf';
    return 'application/octet-stream';
  }

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

  Future<Map<String, dynamic>> loadGmailStatus() {
    return _apiClient.loadGmailStatus();
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
    try {
      final json = await _apiClient.getJson('/visits/', email: email);
      final results = (json['results'] as List<dynamic>? ?? []);
      final visits = results
          .whereType<Map<String, dynamic>>()
          .map(Visit.fromJson)
          .toList(growable: false);
      await _cacheServerVisits(results.whereType<Map<String, dynamic>>());
      return visits;
    } on ApiNetworkException {
      final cached = await _loadCachedVisits();
      if (cached.isEmpty) rethrow;
      return cached;
    }
  }

  Future<void> _cacheServerVisits(Iterable<Map<String, dynamic>> visits) async {
    if (!await _ensureOfflineReady()) return;
    try {
      for (final visit in visits) {
        final id = visit['id'];
        if (id == null) continue;
        if (await _localDb.hasPendingOperation('visit', '$id')) continue;
        await _localDb.saveVisit(visit);
      }
    } catch (_) {
      return;
    }
  }

  Future<List<Visit>> _loadCachedVisits() async {
    if (!await _ensureOfflineReady()) return const <Visit>[];
    try {
      final rows = await _localDb.loadVisits();
      return rows.map(Visit.fromJson).toList(growable: false);
    } catch (_) {
      return const <Visit>[];
    }
  }

  Future<Visit> loadVisitById(String email, int visitId) async {
    final visits = await loadVisits(email);
    return visits.firstWhere((visit) => visit.id == visitId);
  }

  Future<List<Audit>> loadAudits(String email) async {
    try {
      final json = await _apiClient.getJson('/audits/', email: email);
      final results = (json['results'] as List<dynamic>? ?? []);
      final audits = results
          .whereType<Map<String, dynamic>>()
          .map(Audit.fromJson)
          .toList(growable: false);
      await _cacheServerAudits(results.whereType<Map<String, dynamic>>());
      return audits;
    } on ApiNetworkException {
      final cached = await _loadCachedAudits();
      if (cached.isEmpty) rethrow;
      return cached;
    }
  }

  Future<void> _cacheServerAudits(Iterable<Map<String, dynamic>> audits) async {
    if (!await _ensureOfflineReady()) return;
    try {
      for (final audit in audits) {
        final id = audit['id'];
        if (id == null) continue;
        if (await _localDb.hasPendingOperation('audit', '$id')) continue;
        await _localDb.saveAudit(audit);
      }
    } catch (_) {
      return;
    }
  }

  Future<List<Audit>> _loadCachedAudits() async {
    if (!await _ensureOfflineReady()) return const <Audit>[];
    try {
      final rows = await _localDb.loadAudits();
      return rows.map(Audit.fromJson).toList(growable: false);
    } catch (_) {
      return const <Audit>[];
    }
  }

  Future<Audit> startAudit({
    required String email,
    required int auditId,
    required double latitude,
    required double longitude,
  }) async {
    var localReady = await _ensureOfflineReady();
    final startedAt = DateTime.now().toUtc().toIso8601String();
    final cached = localReady ? await _safeLoadAudit(auditId) : null;
    final operationData = <String, dynamic>{
      'started_at': startedAt,
      'start_latitude': latitude,
      'start_longitude': longitude,
    };
    if (cached != null && cached['inspector_id'] != null) {
      operationData['inspector_id'] = cached['inspector_id'];
    }
    if (localReady && cached != null) {
      final localPayload = <String, dynamic>{
        ...cached,
        ...operationData,
        'technician_updated_at': startedAt,
      };
      localReady = await _safeSaveAudit(localPayload, syncStatus: SyncQueueStatus.pending);
    }

    try {
      final response = await _apiClient.patchJson(
        '/audits/$auditId/mobile-flow/',
        email: email,
        body: {
          'action': 'start',
          ...operationData,
        },
      );
      await _safeSaveAudit(response);
      return Audit.fromJson(response);
    } on ApiNetworkException {
      if (!localReady) rethrow;
      await _localDb.enqueueOperation(
        entityType: 'audit',
        entityId: '$auditId',
        data: operationData,
        technicianUpdatedAt: DateTime.parse(startedAt),
      );
      final localPayload = <String, dynamic>{
        ...?await _safeLoadAudit(auditId),
        'id': auditId,
        ...operationData,
        'technician_updated_at': startedAt,
      };
      return Audit.fromJson(localPayload);
    }
  }

  Future<Audit> completeAudit({
    required String email,
    required int auditId,
    required double latitude,
    required double longitude,
    required Map<String, dynamic> auditReport,
    List<http.MultipartFile> evidenceFiles = const [],
  }) async {
    var localReady = await _ensureOfflineReady();
    final completedAt = DateTime.now().toUtc().toIso8601String();
    final report = Map<String, dynamic>.from(auditReport);
    final evidence = await _readEvidence(evidenceFiles);
    final cached = localReady ? await _safeLoadAudit(auditId) : null;
    final localPayload = <String, dynamic>{
      ...?cached,
      'id': auditId,
      'status': 'completed',
      'completed_at': completedAt,
      'end_latitude': latitude,
      'end_longitude': longitude,
      'audit_report': report,
      'technician_updated_at': completedAt,
    };

    List<_LocalAttachment> attachments = const <_LocalAttachment>[];
    int? signatureRowId;
    if (localReady) {
      localReady = await _safeSaveAudit(localPayload, syncStatus: SyncQueueStatus.pending);
    }
    if (localReady) {
      try {
        attachments = await _persistAttachments(
          entityType: 'audit',
          entityId: auditId,
          files: evidence,
        );
        signatureRowId = await _persistSignature(
          entityType: 'audit',
          entityId: auditId,
          report: report,
        );
      } catch (_) {
        localReady = false;
      }
    }

    try {
      final response = evidence.isEmpty
          ? await _apiClient.patchJson(
              '/audits/$auditId/mobile-flow/',
              email: email,
              body: {
                'action': 'complete',
                'end_latitude': latitude,
                'end_longitude': longitude,
                'audit_report': report,
              },
            )
          : await _apiClient.patchMultipart(
              '/audits/$auditId/mobile-flow/',
              email: email,
              fields: {
                'action': 'complete',
                'end_latitude': latitude.toString(),
                'end_longitude': longitude.toString(),
                'audit_report': jsonEncode(report),
              },
              files: _multipartEvidence(evidence),
            );
      await _safeSaveAudit(response);
      if (localReady) {
        await _localDb.markEntityAttachmentsSynced('audit', '$auditId');
      }
      return Audit.fromJson(response);
    } on ApiNetworkException {
      if (!localReady) rethrow;
      final queueId = await _localDb.enqueueOperation(
        entityType: 'audit',
        entityId: '$auditId',
        data: {
          'status': 'completed',
          'completed_at': completedAt,
          'end_latitude': latitude,
          'end_longitude': longitude,
          'audit_report': report,
        },
        technicianUpdatedAt: DateTime.parse(completedAt),
      );
      if (signatureRowId != null) {
        await _localDb.setAttachmentQueueId('signatures', signatureRowId, queueId);
      }
      await _enqueueAttachments(
        attachments: attachments,
        technicianUpdatedAt: DateTime.parse(completedAt),
      );
      return Audit.fromJson(localPayload);
    }
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
    await _safeSaveAudit(response);

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
    List<Map<String, dynamic>> productAssignments = const [],
  }) {
    final body = <String, dynamic>{
      'area_id': areaId,
      'model_id': modelId,
      'is_active': true,
    };
    if (productAssignments.isNotEmpty) {
      body['product_assignments'] = productAssignments;
    } else {
      body['product_ids'] = productIds;
    }
    return _apiClient.postJson(
      '/dispensers/',
      email: email,
      body: body,
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

  Future<List<Map<String, dynamic>>> loadUsers(String email) async {
    final json = await _apiClient.getJson('/users/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().toList(growable: false);
  }

  Future<Map<String, dynamic>> updateUser({
    required String email,
    required int userId,
    required Map<String, dynamic> body,
  }) {
    return _apiClient.putJson(
      '/users/$userId/',
      email: email,
      body: body,
    );
  }

  Future<Map<String, dynamic>> deleteUser({
    required String email,
    required int userId,
  }) {
    return _apiClient.deleteJson(
      '/users/$userId/',
      email: email,
    );
  }

  Future<Map<String, dynamic>> updateClient({
    required String email,
    required int clientId,
    required Map<String, dynamic> body,
  }) {
    return _apiClient.putJson(
      '/clients/$clientId/',
      email: email,
      body: body,
    );
  }

  Future<Map<String, dynamic>> deleteClient({
    required String email,
    required int clientId,
  }) {
    return _apiClient.deleteJson(
      '/clients/$clientId/',
      email: email,
    );
  }

  Future<Map<String, dynamic>> updateBranch({
    required String email,
    required int branchId,
    required Map<String, dynamic> body,
  }) {
    return _apiClient.putJson(
      '/branches/$branchId/',
      email: email,
      body: body,
    );
  }

  Future<Map<String, dynamic>> deleteBranch({
    required String email,
    required int branchId,
  }) {
    return _apiClient.deleteJson(
      '/branches/$branchId/',
      email: email,
    );
  }

  Future<Map<String, dynamic>> updateArea({
    required String email,
    required int areaId,
    required Map<String, dynamic> body,
  }) {
    return _apiClient.putJson(
      '/areas/$areaId/',
      email: email,
      body: body,
    );
  }

  Future<Map<String, dynamic>> deleteArea({
    required String email,
    required int areaId,
  }) {
    return _apiClient.deleteJson(
      '/areas/$areaId/',
      email: email,
    );
  }

  Future<Map<String, dynamic>> updateDispenser({
    required String email,
    required int dispenserId,
    required Map<String, dynamic> body,
  }) {
    return _apiClient.putJson(
      '/dispensers/$dispenserId/',
      email: email,
      body: body,
    );
  }

  Future<Map<String, dynamic>> deleteDispenser({
    required String email,
    required int dispenserId,
  }) {
    return _apiClient.deleteJson(
      '/dispensers/$dispenserId/',
      email: email,
    );
  }

  Future<Map<String, dynamic>> createProduct({
    required String email,
    required String name,
    required String description,
  }) {
    return _apiClient.postJson(
      '/products/',
      email: email,
      body: {
        'name': name,
        'description': description,
      },
    );
  }

  Future<Map<String, dynamic>> updateProduct({
    required String email,
    required int productId,
    required Map<String, dynamic> body,
  }) {
    return _apiClient.putJson(
      '/products/$productId/',
      email: email,
      body: body,
    );
  }

  Future<Map<String, dynamic>> deleteProduct({
    required String email,
    required int productId,
  }) {
    return _apiClient.deleteJson(
      '/products/$productId/',
      email: email,
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

  Future<List<Map<String, dynamic>>> loadNozzles(String email) async {
    final json = await _apiClient.getJson('/nozzles/', email: email);
    final results = (json['results'] as List<dynamic>? ?? []);
    return results.whereType<Map<String, dynamic>>().toList(growable: false);
  }

  Future<Visit> startVisit({
    required String email,
    required int visitId,
    required double latitude,
    required double longitude,
  }) async {
    var localReady = await _ensureOfflineReady();
    final startedAt = DateTime.now().toUtc().toIso8601String();
    final cached = localReady ? await _safeLoadVisit(visitId) : null;
    final operationData = <String, dynamic>{
      'started_at': startedAt,
      'start_latitude': latitude,
      'start_longitude': longitude,
    };
    if (cached != null && cached['inspector_id'] != null) {
      operationData['inspector_id'] = cached['inspector_id'];
    }
    if (localReady && cached != null) {
      final localPayload = <String, dynamic>{
        ...cached,
        ...operationData,
        'technician_updated_at': startedAt,
      };
      localReady = await _safeSaveVisit(localPayload, syncStatus: SyncQueueStatus.pending);
    }

    try {
      final response = await _apiClient.patchJson(
        '/visits/$visitId/mobile-flow/',
        email: email,
        body: {
          'action': 'start',
          ...operationData,
        },
      );
      await _safeSaveVisit(response);
      return Visit.fromJson(response);
    } on ApiNetworkException {
      if (!localReady) rethrow;
      await _localDb.enqueueOperation(
        entityType: 'visit',
        entityId: '$visitId',
        data: operationData,
        technicianUpdatedAt: DateTime.parse(startedAt),
      );
      final localPayload = <String, dynamic>{
        ...?await _safeLoadVisit(visitId),
        'id': visitId,
        ...operationData,
        'technician_updated_at': startedAt,
      };
      return Visit.fromJson(localPayload);
    }
  }

  Future<Visit> completeVisit({
    required String email,
    required int visitId,
    required double latitude,
    required double longitude,
    required Map<String, dynamic> visitReport,
    List<http.MultipartFile> evidenceFiles = const [],
  }) async {
    var localReady = await _ensureOfflineReady();
    final completedAt = DateTime.now().toUtc().toIso8601String();
    final report = Map<String, dynamic>.from(visitReport);
    final evidence = await _readEvidence(evidenceFiles);
    final cached = localReady ? await _safeLoadVisit(visitId) : null;
    final localPayload = <String, dynamic>{
      ...?cached,
      'id': visitId,
      'status': 'completed',
      'completed_at': completedAt,
      'end_latitude': latitude,
      'end_longitude': longitude,
      'visit_report': report,
      'technician_updated_at': completedAt,
    };

    List<_LocalAttachment> attachments = const <_LocalAttachment>[];
    int? signatureRowId;
    if (localReady) {
      localReady = await _safeSaveVisit(localPayload, syncStatus: SyncQueueStatus.pending);
    }
    if (localReady) {
      try {
        attachments = await _persistAttachments(
          entityType: 'visit',
          entityId: visitId,
          files: evidence,
        );
        signatureRowId = await _persistSignature(
          entityType: 'visit',
          entityId: visitId,
          report: report,
        );
      } catch (_) {
        localReady = false;
      }
    }

    try {
      final response = evidence.isEmpty
          ? await _apiClient.patchJson(
              '/visits/$visitId/mobile-flow/',
              email: email,
              body: {
                'action': 'complete',
                'end_latitude': latitude,
                'end_longitude': longitude,
                'visit_report': report,
              },
            )
          : await _apiClient.patchMultipart(
              '/visits/$visitId/mobile-flow/',
              email: email,
              fields: {
                'action': 'complete',
                'end_latitude': latitude.toString(),
                'end_longitude': longitude.toString(),
                'visit_report': jsonEncode(report),
              },
              files: _multipartEvidence(evidence),
            );
      await _safeSaveVisit(response);
      if (localReady) {
        await _localDb.markEntityAttachmentsSynced('visit', '$visitId');
      }
      return Visit.fromJson(response);
    } on ApiNetworkException {
      if (!localReady) rethrow;
      final queueId = await _localDb.enqueueOperation(
        entityType: 'visit',
        entityId: '$visitId',
        data: {
          'status': 'completed',
          'completed_at': completedAt,
          'end_latitude': latitude,
          'end_longitude': longitude,
          'visit_report': report,
        },
        technicianUpdatedAt: DateTime.parse(completedAt),
      );
      if (signatureRowId != null) {
        await _localDb.setAttachmentQueueId('signatures', signatureRowId, queueId);
      }
      await _enqueueAttachments(
        attachments: attachments,
        technicianUpdatedAt: DateTime.parse(completedAt),
      );
      return Visit.fromJson(localPayload);
    }
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
    try {
      final response = await _apiClient.getRaw('/visits/$visitId/report', email: email);
      await _cacheReceipt(
        entityType: 'visit',
        entityId: visitId,
        fileName: 'visita-$visitId.pdf',
        bytes: response.bodyBytes,
      );
      return response.bodyBytes;
    } on ApiNetworkException {
      final cached = await _loadCachedReceipt(entityType: 'visit', entityId: visitId);
      if (cached == null) rethrow;
      return cached;
    }
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
    try {
      final response = await _apiClient.getRaw('/audits/$auditId/report', email: email);
      await _cacheReceipt(
        entityType: 'audit',
        entityId: auditId,
        fileName: 'auditoria-$auditId.pdf',
        bytes: response.bodyBytes,
      );
      return response.bodyBytes;
    } on ApiNetworkException {
      final cached = await _loadCachedReceipt(entityType: 'audit', entityId: auditId);
      if (cached == null) rethrow;
      return cached;
    }
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


class _EvidencePayload {
  const _EvidencePayload({
    required this.bytes,
    required this.fileName,
    required this.contentType,
  });

  final Uint8List bytes;
  final String fileName;
  final MediaType? contentType;
}

class _LocalAttachment {
  const _LocalAttachment({
    required this.table,
    required this.rowId,
    required this.parentEntityId,
    required this.queueEntityType,
    required this.queueData,
  });

  final String table;
  final int rowId;
  final int parentEntityId;
  final String queueEntityType;
  final Map<String, dynamic> queueData;
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
