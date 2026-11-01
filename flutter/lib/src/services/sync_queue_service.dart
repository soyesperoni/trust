import 'dart:async';
import 'dart:math';

import 'package:connectivity_plus/connectivity_plus.dart';

import 'api_client.dart';
import 'local_db_service.dart';

/// Evento emitido cuando cambia el estado de un elemento de la cola.
class SyncQueueEvent {
  const SyncQueueEvent({
    required this.queueId,
    required this.entityType,
    required this.entityId,
    required this.status,
    required this.message,
  });

  final int queueId;
  final String entityType;
  final String entityId;
  final String status;
  final String message;
}

/// Resultado de un intento de vaciado de la cola.
class SyncFlushResult {
  const SyncFlushResult({
    this.processed = 0,
    this.synced = 0,
    this.failed = 0,
    this.conflicts = 0,
    this.duplicates = 0,
  });

  final int processed;
  final int synced;
  final int failed;
  final int conflicts;
  final int duplicates;

  bool get hadActivity => processed > 0;
}

/// Cola de sincronizacion offline con reintentos y backoff exponencial.
class SyncQueueService {
  SyncQueueService._();

  static final SyncQueueService instance = SyncQueueService._();

  static const int maxRetries = 5;
  static const int batchSize = 40;

  final Connectivity _connectivity = Connectivity();
  final StreamController<SyncQueueEvent> _events =
      StreamController<SyncQueueEvent>.broadcast();

  ApiClient? _apiClient;
  LocalDbService? _localDb;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  Timer? _retryTimer;
  Future<void>? _initializeFuture;
  bool _initialized = false;
  bool _isFlushing = false;
  bool _isOnline = true;
  String _deviceId = 'trust-device';

  Stream<SyncQueueEvent> get events => _events.stream;

  bool get isOnline => _isOnline;

  bool get isInitialized => _initialized;

  /// Inicializa la base local, el identificador de dispositivo y el listener
  /// de conectividad. Es idempotente y seguro entre pantallas.
  Future<void> initialize({
    required ApiClient apiClient,
    LocalDbService? localDb,
  }) {
    if (_initialized) {
      return Future.value();
    }
    final pending = _initializeFuture;
    if (pending != null) {
      return pending;
    }
    final future = _initialize(apiClient, localDb ?? LocalDbService.instance);
    _initializeFuture = future;
    return future;
  }

  Future<void> _initialize(ApiClient apiClient, LocalDbService localDb) async {
    try {
      _apiClient = apiClient;
      _localDb = localDb;
      _deviceId = await localDb.getOrCreateDeviceId();

      try {
        final results = await _connectivity.checkConnectivity();
        _isOnline = _hasConnection(results);
        _connectivitySubscription =
            _connectivity.onConnectivityChanged.listen(_onConnectivityChanged);
      } catch (_) {
        _isOnline = true;
      }

      _initialized = true;
      if (_isOnline) {
        unawaited(syncPending());
      }
    } catch (_) {
      _initializeFuture = null;
      rethrow;
    }
  }

  bool _hasConnection(List<ConnectivityResult> results) {
    return results.any((result) => result != ConnectivityResult.none);
  }

  void _onConnectivityChanged(List<ConnectivityResult> results) {
    final online = _hasConnection(results);
    final recovered = online && !_isOnline;
    _isOnline = online;
    if (online) {
      unawaited(syncPending(force: recovered));
    }
  }

  Future<SyncQueueSummary> summary() async {
    final db = _localDb;
    if (db == null) {
      return const SyncQueueSummary.empty();
    }
    return db.queueSummary();
  }

  Future<String?> statusFor(String entityType, String entityId) async {
    final db = _localDb;
    if (db == null) {
      return null;
    }
    return db.latestQueueStatus(entityType, entityId);
  }

  /// Reintenta manualmente todos los elementos en error.
  Future<SyncFlushResult> retryFailed() async {
    final db = _localDb;
    if (db == null) {
      return const SyncFlushResult();
    }
    await db.resetFailedQueue();
    return syncPending(force: true);
  }

  /// Envia los elementos pendientes o vencidos. Con [force] se incluyen los
  /// que estan en espera de backoff, por ejemplo al recuperar conexion.
  Future<SyncFlushResult> syncPending({bool force = false}) async {
    if (!_initialized || _isFlushing || !_isOnline) {
      return const SyncFlushResult();
    }
    final db = _localDb;
    final apiClient = _apiClient;
    if (db == null || apiClient == null) {
      return const SyncFlushResult();
    }

    _isFlushing = true;
    var attempted = <SyncQueueEntry>[];
    try {
      final entries = await db.dueQueue(
        limit: batchSize,
        force: force,
        maxRetries: maxRetries,
      );
      if (entries.isEmpty) {
        return const SyncFlushResult();
      }

      final sendable = <SyncQueueEntry>[];
      final operations = <Map<String, dynamic>>[];
      for (final entry in entries) {
        try {
          operations.add(entry.decodeOperation());
          sendable.add(entry);
        } on FormatException catch (error) {
          await _recordFailure(entry, db, error.message, retryable: false);
        }
      }
      if (operations.isEmpty) {
        return SyncFlushResult(
            processed: entries.length, failed: entries.length);
      }
      attempted = sendable;

      final response = await apiClient.postSyncBatch(
        deviceId: _deviceId,
        operations: operations,
      );

      final results =
          response['results'] as List<dynamic>? ?? const <dynamic>[];
      var synced = 0;
      var failed = 0;
      var conflicts = 0;
      var duplicates = 0;

      for (var index = 0; index < sendable.length; index++) {
        final entry = sendable[index];
        final rawResult = index < results.length ? results[index] : null;
        final result = rawResult is Map<String, dynamic>
            ? rawResult
            : rawResult is Map
                ? Map<String, dynamic>.from(rawResult)
                : <String, dynamic>{};
        final status = result['status'] as String? ?? SyncQueueStatus.error;
        final message = result['error_message'] as String? ?? '';
        final isDuplicate = result['duplicate'] == true;

        if (status == SyncQueueStatus.synced) {
          await _recordSuccess(entry, db);
          synced++;
          if (isDuplicate) duplicates++;
        } else if (status == 'conflict') {
          await _recordFailure(
            entry,
            db,
            message.isEmpty ? 'Conflicto de version con el servidor.' : message,
            retryable: false,
          );
          conflicts++;
        } else if (status == SyncQueueStatus.pending) {
          await _recordFailure(
            entry,
            db,
            message.isEmpty
                ? 'El servidor dejo la operacion pendiente.'
                : message,
          );
          failed++;
        } else {
          await _recordFailure(
            entry,
            db,
            message.isEmpty ? 'Error de sincronizacion.' : message,
          );
          failed++;
        }
      }

      if (results.length < sendable.length) {
        for (var index = results.length; index < sendable.length; index++) {
          await _recordFailure(
            sendable[index],
            db,
            'El servidor no devolvio resultado para la operacion.',
          );
          failed++;
        }
      }

      return SyncFlushResult(
        processed: sendable.length,
        synced: synced,
        failed: failed,
        conflicts: conflicts,
        duplicates: duplicates,
      );
    } on ApiNetworkException catch (error) {
      _isOnline = false;
      for (final entry in attempted) {
        await _recordFailure(entry, db, error.message);
      }
      return SyncFlushResult(
          processed: attempted.length, failed: attempted.length);
    } catch (error) {
      for (final entry in attempted) {
        await _recordFailure(entry, db, error.toString());
      }
      return SyncFlushResult(
          processed: attempted.length, failed: attempted.length);
    } finally {
      _isFlushing = false;
    }
  }

  Future<void> _recordSuccess(SyncQueueEntry entry, LocalDbService db) async {
    await db.markQueueSynced(entry.id);
    await db.markAttachmentsSynced(entry.id);
    final entityId = int.tryParse(entry.entityId);
    if (entityId != null) {
      final entityType = entry.entityType == 'visit_media'
          ? 'visit'
          : entry.entityType == 'audit_media'
              ? 'audit'
              : entry.entityType;
      await db.updateEntitySyncStatus(
          entityType, entityId, SyncQueueStatus.synced);
    }
    await db.addSyncLog(
      queueId: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      status: SyncQueueStatus.synced,
      message: 'Operacion sincronizada.',
    );
    _emit(entry, SyncQueueStatus.synced, '');
  }

  Future<void> _recordFailure(
    SyncQueueEntry entry,
    LocalDbService db,
    String message, {
    bool retryable = true,
  }) async {
    final retries = retryable ? entry.retries + 1 : maxRetries;
    final canRetry = retryable && retries < maxRetries;
    final nextRetryAt = canRetry
        ? DateTime.now().toUtc().add(_backoff(retries)).toIso8601String()
        : null;
    await db.markQueueError(
      entry.id,
      message: message,
      retries: retries,
      nextRetryAt: nextRetryAt,
    );
    await db.addSyncLog(
      queueId: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      status: SyncQueueStatus.error,
      message: message,
    );
    _emit(entry, SyncQueueStatus.error, message);
    if (canRetry) {
      _retryTimer?.cancel();
      _retryTimer = Timer(_backoff(retries), () {
        if (_initialized) {
          unawaited(syncPending(force: true));
        }
      });
    }
  }

  /// Backoff exponencial: 20s, 40s, 80s, 160s y 320s, con tope de 15 minutos.
  Duration _backoff(int retries) {
    final exponent = retries.clamp(1, 7);
    final seconds = pow(2, exponent).toInt() * 10;
    return Duration(seconds: min(seconds, 900));
  }

  void _emit(SyncQueueEntry entry, String status, String message) {
    if (_events.isClosed) return;
    _events.add(
      SyncQueueEvent(
        queueId: entry.id,
        entityType: entry.entityType,
        entityId: entry.entityId,
        status: status,
        message: message,
      ),
    );
  }

  Future<void> dispose() async {
    _retryTimer?.cancel();
    _retryTimer = null;
    await _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
    _initialized = false;
    _initializeFuture = null;
  }
}
