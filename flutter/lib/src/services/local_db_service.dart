import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

/// Estados persistidos de la cola de sincronizacion.
abstract final class SyncQueueStatus {
  static const String pending = 'pending';
  static const String synced = 'synced';
  static const String error = 'error';
}

/// Resumen de la cola local por estado.
class SyncQueueSummary {
  const SyncQueueSummary({
    required this.pending,
    required this.synced,
    required this.error,
  });

  const SyncQueueSummary.empty()
      : pending = 0,
        synced = 0,
        error = 0;

  final int pending;
  final int synced;
  final int error;

  int get total => pending + synced + error;

  bool get hasPending => pending > 0 || error > 0;
}

/// Entrada de la cola local de sincronizacion.
class SyncQueueEntry {
  const SyncQueueEntry({
    required this.id,
    required this.entityType,
    required this.entityId,
    required this.payload,
    required this.status,
    required this.retries,
    required this.lastError,
    required this.technicianUpdatedAt,
    required this.nextRetryAt,
  });

  final int id;
  final String entityType;
  final String entityId;
  final String payload;
  final String status;
  final int retries;
  final String lastError;
  final String technicianUpdatedAt;
  final String? nextRetryAt;

  factory SyncQueueEntry.fromMap(Map<String, Object?> map) {
    return SyncQueueEntry(
      id: (map['id'] as num?)?.toInt() ?? 0,
      entityType: map['entity_type'] as String? ?? '',
      entityId: map['entity_id'] as String? ?? '',
      payload: map['payload'] as String? ?? '{}',
      status: map['status'] as String? ?? SyncQueueStatus.pending,
      retries: (map['retries'] as num?)?.toInt() ?? 0,
      lastError: map['last_error'] as String? ?? '',
      technicianUpdatedAt: map['technician_updated_at'] as String? ?? '',
      nextRetryAt: map['next_retry_at'] as String?,
    );
  }

  Map<String, dynamic> decodeOperation() {
    final decoded = jsonDecode(payload);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }
    throw const FormatException('Operacion de sincronizacion invalida.');
  }
}

/// Persistencia local SQLite para visitas, auditorias, evidencias y cola.
class LocalDbService {
  LocalDbService._();

  static final LocalDbService instance = LocalDbService._();

  static const String _databaseName = 'trust_offline.db';
  static const int _databaseVersion = 1;

  Database? _database;
  Future<Database>? _opening;

  Future<Database> get database {
    final current = _database;
    if (current != null) {
      return Future.value(current);
    }
    return _opening ??= _open();
  }

  Future<Database> _open() async {
    try {
      final directory = await _resolveDirectory();
      final path =
          '${directory.path}${directory.path.endsWith('/') ? '' : '/'}$_databaseName';
      final db = await openDatabase(
        path,
        version: _databaseVersion,
        onCreate: _createSchema,
        onUpgrade: _upgradeSchema,
      );
      _database = db;
      return db;
    } finally {
      _opening = null;
    }
  }

  Future<Directory> _resolveDirectory() async {
    try {
      return await getApplicationDocumentsDirectory();
    } catch (_) {
      return Directory(await getDatabasesPath());
    }
  }

  Future<void> _createSchema(Database db, int version) async {
    await db.execute('''
      CREATE TABLE visits (
        id INTEGER PRIMARY KEY,
        payload TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        technician_updated_at TEXT,
        updated_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE audits (
        id INTEGER PRIMARY KEY,
        payload TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        technician_updated_at TEXT,
        updated_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        mime_type TEXT,
        base64_data TEXT NOT NULL,
        queue_id INTEGER,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE signatures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        base64_data TEXT NOT NULL,
        queue_id INTEGER,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        mime_type TEXT,
        base64_data TEXT NOT NULL,
        queue_id INTEGER,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retries INTEGER NOT NULL DEFAULT 0,
        last_error TEXT NOT NULL DEFAULT '',
        technician_updated_at TEXT NOT NULL,
        next_retry_at TEXT,
        last_attempt_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        queue_id INTEGER,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    ''');

    await db.execute(
        'CREATE INDEX idx_sync_queue_status ON sync_queue(status, next_retry_at)');
    await db.execute(
        'CREATE INDEX idx_sync_queue_entity ON sync_queue(entity_type, entity_id)');
    await db.execute(
        'CREATE INDEX idx_photos_entity ON photos(entity_type, entity_id)');
    await db.execute(
        'CREATE INDEX idx_signatures_entity ON signatures(entity_type, entity_id)');
    await db.execute(
        'CREATE INDEX idx_receipts_entity ON receipts(entity_type, entity_id)');
    await db
        .execute('CREATE INDEX idx_sync_logs_created ON sync_logs(created_at)');
  }

  Future<void> _upgradeSchema(
      Database db, int oldVersion, int newVersion) async {
    // Reservado para futuras migraciones del esquema local.
  }

  Future<void> close() async {
    await _database?.close();
    _database = null;
  }

  String _nowIso() => DateTime.now().toUtc().toIso8601String();

  int _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse('${value ?? ''}') ?? 0;
  }

  Map<String, dynamic> _decodePayload(Map<String, Object?> row) {
    final decoded = jsonDecode(row['payload'] as String? ?? '{}');
    final payload =
        decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
    payload['local_sync_status'] = row['sync_status'];
    payload['local_updated_at'] = row['updated_at'];
    return payload;
  }

  Future<void> _saveEntity(
    String table,
    Map<String, dynamic> payload, {
    required String syncStatus,
  }) async {
    final id = _asInt(payload['id']);
    if (id <= 0) {
      return;
    }
    final db = await database;
    final now = _nowIso();
    await db.insert(
      table,
      {
        'id': id,
        'payload': jsonEncode(payload),
        'sync_status': syncStatus,
        'technician_updated_at': payload['technician_updated_at'] ?? now,
        'updated_at': now,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> saveVisit(Map<String, dynamic> visit,
      {String syncStatus = SyncQueueStatus.synced}) {
    return _saveEntity('visits', visit, syncStatus: syncStatus);
  }

  Future<void> saveAudit(Map<String, dynamic> audit,
      {String syncStatus = SyncQueueStatus.synced}) {
    return _saveEntity('audits', audit, syncStatus: syncStatus);
  }

  Future<Map<String, dynamic>?> loadVisit(int id) async {
    final db = await database;
    final rows =
        await db.query('visits', where: 'id = ?', whereArgs: [id], limit: 1);
    if (rows.isEmpty) return null;
    return _decodePayload(rows.first);
  }

  Future<Map<String, dynamic>?> loadAudit(int id) async {
    final db = await database;
    final rows =
        await db.query('audits', where: 'id = ?', whereArgs: [id], limit: 1);
    if (rows.isEmpty) return null;
    return _decodePayload(rows.first);
  }

  Future<List<Map<String, dynamic>>> loadVisits() async {
    final db = await database;
    final rows = await db.query('visits', orderBy: 'updated_at DESC');
    return rows.map(_decodePayload).toList(growable: false);
  }

  Future<List<Map<String, dynamic>>> loadAudits() async {
    final db = await database;
    final rows = await db.query('audits', orderBy: 'updated_at DESC');
    return rows.map(_decodePayload).toList(growable: false);
  }

  Future<void> updateEntitySyncStatus(
      String entityType, int entityId, String status) async {
    final table = entityType == 'audit' ? 'audits' : 'visits';
    final db = await database;
    await db.update(
      table,
      {'sync_status': status, 'updated_at': _nowIso()},
      where: 'id = ?',
      whereArgs: [entityId],
    );
  }

  Future<int> savePhoto({
    required String entityType,
    required String entityId,
    required String fileName,
    required String mimeType,
    required String base64Data,
    int? queueId,
    String syncStatus = SyncQueueStatus.pending,
  }) async {
    final db = await database;
    return db.insert('photos', {
      'entity_type': entityType,
      'entity_id': entityId,
      'file_name': fileName,
      'mime_type': mimeType,
      'base64_data': base64Data,
      'queue_id': queueId,
      'sync_status': syncStatus,
      'created_at': _nowIso(),
    });
  }

  Future<int> saveSignature({
    required String entityType,
    required String entityId,
    required String base64Data,
    int? queueId,
    String syncStatus = SyncQueueStatus.pending,
  }) async {
    final db = await database;
    return db.insert('signatures', {
      'entity_type': entityType,
      'entity_id': entityId,
      'base64_data': base64Data,
      'queue_id': queueId,
      'sync_status': syncStatus,
      'created_at': _nowIso(),
    });
  }

  Future<int> saveReceipt({
    required String entityType,
    required String entityId,
    required String fileName,
    required String mimeType,
    required String base64Data,
    int? queueId,
    String syncStatus = SyncQueueStatus.pending,
  }) async {
    final db = await database;
    return db.insert('receipts', {
      'entity_type': entityType,
      'entity_id': entityId,
      'file_name': fileName,
      'mime_type': mimeType,
      'base64_data': base64Data,
      'queue_id': queueId,
      'sync_status': syncStatus,
      'created_at': _nowIso(),
    });
  }

  Future<Map<String, dynamic>?> loadReceipt({
    required String entityType,
    required String entityId,
    String? mimeType,
  }) async {
    final db = await database;
    final rows = await db.query(
      'receipts',
      where: mimeType == null
          ? 'entity_type = ? AND entity_id = ?'
          : 'entity_type = ? AND entity_id = ? AND mime_type = ?',
      whereArgs: mimeType == null
          ? [entityType, entityId]
          : [entityType, entityId, mimeType],
      orderBy: 'id DESC',
      limit: 1,
    );
    return rows.isEmpty ? null : rows.first;
  }

  Future<int> enqueueOperation({
    required String entityType,
    required String entityId,
    required Map<String, dynamic> data,
    DateTime? technicianUpdatedAt,
    bool includeEntityId = true,
    String? queueEntityId,
  }) async {
    final timestamp =
        (technicianUpdatedAt ?? DateTime.now()).toUtc().toIso8601String();
    final operation = <String, dynamic>{
      'entity_type': entityType,
      if (includeEntityId) 'entity_id': int.tryParse(entityId) ?? entityId,
      'data': data,
      'technician_updated_at': timestamp,
    };
    final db = await database;
    final now = _nowIso();
    return db.insert('sync_queue', {
      'entity_type': entityType,
      'entity_id': queueEntityId ?? entityId,
      'payload': jsonEncode(operation),
      'status': SyncQueueStatus.pending,
      'retries': 0,
      'last_error': '',
      'technician_updated_at': timestamp,
      'next_retry_at': null,
      'last_attempt_at': null,
      'created_at': now,
      'updated_at': now,
    });
  }

  Future<List<SyncQueueEntry>> dueQueue({
    int limit = 40,
    bool force = false,
    int maxRetries = 5,
  }) async {
    final db = await database;
    final now = _nowIso();
    final rows = await db.query(
      'sync_queue',
      where: force
          ? "status IN ('pending', 'error') AND retries < ?"
          : "status IN ('pending', 'error') AND retries < ? AND (next_retry_at IS NULL OR next_retry_at <= ?)",
      whereArgs: force ? [maxRetries] : [maxRetries, now],
      orderBy: 'id ASC',
      limit: limit,
    );
    return rows.map(SyncQueueEntry.fromMap).toList(growable: false);
  }

  Future<void> markQueueSynced(int id) async {
    final db = await database;
    await db.update(
      'sync_queue',
      {
        'status': SyncQueueStatus.synced,
        'last_error': '',
        'next_retry_at': null,
        'last_attempt_at': _nowIso(),
        'updated_at': _nowIso(),
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> markQueueError(
    int id, {
    required String message,
    required int retries,
    String? nextRetryAt,
  }) async {
    final db = await database;
    await db.update(
      'sync_queue',
      {
        'status': SyncQueueStatus.error,
        'retries': retries,
        'last_error':
            message.length > 1000 ? message.substring(0, 1000) : message,
        'next_retry_at': nextRetryAt,
        'last_attempt_at': _nowIso(),
        'updated_at': _nowIso(),
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> resetFailedQueue() async {
    final db = await database;
    await db.update(
      'sync_queue',
      {
        'status': SyncQueueStatus.pending,
        'retries': 0,
        'last_error': '',
        'next_retry_at': null,
        'updated_at': _nowIso(),
      },
      where: "status = 'error'",
    );
  }

  Future<void> markAttachmentsSynced(int queueId) async {
    final db = await database;
    final values = {'sync_status': SyncQueueStatus.synced};
    await db
        .update('photos', values, where: 'queue_id = ?', whereArgs: [queueId]);
    await db.update('signatures', values,
        where: 'queue_id = ?', whereArgs: [queueId]);
    await db.update('receipts', values,
        where: 'queue_id = ?', whereArgs: [queueId]);
  }

  Future<void> markEntityAttachmentsSynced(
      String entityType, String entityId) async {
    final db = await database;
    final values = {'sync_status': SyncQueueStatus.synced};
    for (final table in ['photos', 'signatures', 'receipts']) {
      await db.update(
        table,
        values,
        where: 'entity_type = ? AND entity_id = ?',
        whereArgs: [entityType, entityId],
      );
    }
  }

  Future<void> setAttachmentQueueId(
      String table, int rowId, int queueId) async {
    const allowedTables = {'photos', 'signatures', 'receipts'};
    if (!allowedTables.contains(table)) {
      throw ArgumentError.value(table, 'table', 'Tabla de adjuntos no valida');
    }
    final db = await database;
    await db.update(
      table,
      {'queue_id': queueId},
      where: 'id = ?',
      whereArgs: [rowId],
    );
  }

  Future<String?> latestQueueStatus(String entityType, String entityId) async {
    final db = await database;
    final rows = await db.query(
      'sync_queue',
      columns: ['status'],
      where: 'entity_type = ? AND entity_id = ?',
      whereArgs: [entityType, entityId],
      orderBy: 'id DESC',
      limit: 1,
    );
    return rows.isEmpty ? null : rows.first['status'] as String?;
  }

  Future<bool> hasPendingOperation(String entityType, String entityId) async {
    final status = await latestQueueStatus(entityType, entityId);
    return status == SyncQueueStatus.pending || status == SyncQueueStatus.error;
  }

  Future<SyncQueueSummary> queueSummary() async {
    final db = await database;
    final rows = await db.rawQuery(
      'SELECT status, COUNT(*) AS total FROM sync_queue GROUP BY status',
    );
    var pending = 0;
    var synced = 0;
    var error = 0;
    for (final row in rows) {
      final total = (row['total'] as num?)?.toInt() ?? 0;
      switch (row['status']) {
        case SyncQueueStatus.pending:
          pending = total;
          break;
        case SyncQueueStatus.synced:
          synced = total;
          break;
        case SyncQueueStatus.error:
          error = total;
          break;
      }
    }
    return SyncQueueSummary(pending: pending, synced: synced, error: error);
  }

  Future<void> addSyncLog({
    int? queueId,
    required String entityType,
    required String entityId,
    required String status,
    required String message,
  }) async {
    final db = await database;
    await db.insert('sync_logs', {
      'queue_id': queueId,
      'entity_type': entityType,
      'entity_id': entityId,
      'status': status,
      'message': message.length > 1000 ? message.substring(0, 1000) : message,
      'created_at': _nowIso(),
    });
  }

  Future<List<Map<String, dynamic>>> loadSyncLogs({int limit = 100}) async {
    final db = await database;
    return db.query('sync_logs', orderBy: 'id DESC', limit: limit);
  }

  Future<String> getOrCreateDeviceId() async {
    final db = await database;
    final rows = await db.query(
      'app_settings',
      columns: ['value'],
      where: 'key = ?',
      whereArgs: ['device_id'],
      limit: 1,
    );
    if (rows.isNotEmpty) {
      return rows.first['value'] as String;
    }
    final random =
        Random.secure().nextInt(0xFFFFFF).toRadixString(16).padLeft(6, '0');
    final deviceId =
        'trust-${DateTime.now().millisecondsSinceEpoch.toRadixString(16)}-$random';
    await db.insert(
      'app_settings',
      {'key': 'device_id', 'value': deviceId},
      conflictAlgorithm: ConflictAlgorithm.ignore,
    );
    return deviceId;
  }
}
