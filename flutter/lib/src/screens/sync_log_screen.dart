import 'package:flutter/material.dart';

import '../services/local_db_service.dart';
import '../services/sync_queue_service.dart';
import '../services/trust_repository.dart';
import '../theme/app_colors.dart';
import '../widgets/sync_status_badge.dart';

/// Pantalla de diagnostico de la cola offline y su historial de sincronizacion.
class SyncLogScreen extends StatefulWidget {
  const SyncLogScreen({super.key});

  @override
  State<SyncLogScreen> createState() => _SyncLogScreenState();
}

class _SyncLogScreenState extends State<SyncLogScreen> {
  final TrustRepository _repository = TrustRepository();

  bool _loading = true;
  bool _retrying = false;
  String? _error;
  SyncQueueSummary _summary = const SyncQueueSummary.empty();
  List<SyncQueueEntry> _entries = const <SyncQueueEntry>[];
  List<Map<String, dynamic>> _logs = const <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool showLoader = true}) async {
    if (!mounted) return;
    if (showLoader) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final summary = await _repository.syncSummary();
      final entries = await _repository.loadSyncQueueEntries();
      final logs = await _repository.loadSyncLogs(limit: 30);
      if (!mounted) return;
      setState(() {
        _summary = summary;
        _entries = entries;
        _logs = logs;
        _loading = false;
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _retryFailed() async {
    if (_retrying) return;
    setState(() => _retrying = true);
    try {
      final result = await _repository.retryPendingSync();
      if (!mounted) return;
      final message = result.processed == 0
          ? 'No hay elementos pendientes de reintento.'
          : 'Procesados: ${result.processed}. Sincronizados: ${result.synced}. Con error: ${result.failed}.';
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
      await _load(showLoader: false);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo reintentar: $error')),
      );
    } finally {
      if (mounted) {
        setState(() => _retrying = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final backgroundColor = Theme.of(context).scaffoldBackgroundColor;

    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        backgroundColor: backgroundColor,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        leadingWidth: 54,
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back),
        ),
        title: const Text(
          'Sincronizacion',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        actions: [
          IconButton(
            tooltip: 'Actualizar',
            onPressed: _loading ? null : () => _load(),
            icon: const Icon(Icons.refresh_rounded),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _load(showLoader: false),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            children: [
              _SummaryCard(
                summary: _summary,
                isDark: isDark,
                isOnline: SyncQueueService.instance.isOnline,
                retrying: _retrying,
                onRetry: _summary.error > 0 ? _retryFailed : null,
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                _MessageBox(
                  message: _error!,
                  isDark: isDark,
                  isError: true,
                ),
              ],
              if (_loading && _entries.isEmpty) ...[
                const SizedBox(height: 48),
                const Center(child: CircularProgressIndicator()),
              ] else if (_entries.isEmpty) ...[
                const SizedBox(height: 12),
                _MessageBox(
                  message:
                      'No hay operaciones en la cola local. Las visitas y auditorias guardadas sin conexion apareceran aqui.',
                  isDark: isDark,
                ),
              ] else ...[
                const SizedBox(height: 24),
                Text(
                  'COLA DE SINCRONIZACION (${_entries.length})',
                  style: TextStyle(
                    color: isDark ? AppColors.darkMuted : AppColors.gray500,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 10),
                ..._entries.map(
                  (entry) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _QueueEntryCard(entry: entry, isDark: isDark),
                  ),
                ),
              ],
              if (_logs.isNotEmpty) ...[
                const SizedBox(height: 16),
                Text(
                  'HISTORIAL RECIENTE',
                  style: TextStyle(
                    color: isDark ? AppColors.darkMuted : AppColors.gray500,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 10),
                ..._logs.map(
                  (log) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _SyncLogCard(log: log, isDark: isDark),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.summary,
    required this.isDark,
    required this.isOnline,
    required this.retrying,
    required this.onRetry,
  });

  final SyncQueueSummary summary;
  final bool isDark;
  final bool isOnline;
  final bool retrying;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final cardColor = isDark ? AppColors.darkCard : Colors.white;
    final borderColor =
        isDark ? AppColors.darkCardBorder : const Color(0xFFE5E7EB);
    final titleColor = isDark ? const Color(0xFFF8FAFC) : AppColors.gray900;
    final mutedColor = isDark ? AppColors.darkMuted : AppColors.gray500;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isOnline ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
                size: 19,
                color: isOnline ? AppColors.success : AppColors.warning,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  isOnline ? 'Con conexion' : 'Sin conexion',
                  style: TextStyle(
                    color: titleColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: isOnline
                      ? (isDark
                          ? const Color(0xFF14321F)
                          : AppColors.successSoft)
                      : (isDark
                          ? const Color(0xFF3B2E12)
                          : AppColors.warningSoft),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isOnline ? 'En linea' : 'Offline',
                  style: TextStyle(
                    color: isOnline ? AppColors.success : AppColors.warning,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _SummaryCounter(
                  label: 'Pendientes',
                  value: summary.pending,
                  color: AppColors.warning,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _SummaryCounter(
                  label: 'Sincronizados',
                  value: summary.synced,
                  color: AppColors.success,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _SummaryCounter(
                  label: 'Con error',
                  value: summary.error,
                  color: AppColors.danger,
                ),
              ),
            ],
          ),
          if (onRetry != null) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: retrying ? null : onRetry,
                icon: retrying
                    ? const SizedBox(
                        width: 15,
                        height: 15,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.sync_problem_rounded, size: 18),
                label: Text(retrying
                    ? 'Reintentando...'
                    : 'Reintentar elementos con error'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: titleColor,
                  side: BorderSide(color: borderColor),
                  minimumSize: const Size.fromHeight(42),
                  textStyle: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
          const SizedBox(height: 6),
          Text(
            'Los elementos guardados sin conexion se envian automaticamente al recuperar la red.',
            style: TextStyle(color: mutedColor, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _SummaryCounter extends StatelessWidget {
  const _SummaryCounter({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$value',
            style: TextStyle(
              color: color,
              fontSize: 20,
              fontWeight: FontWeight.w800,
              height: 1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _QueueEntryCard extends StatelessWidget {
  const _QueueEntryCard({required this.entry, required this.isDark});

  final SyncQueueEntry entry;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    final cardColor = isDark ? AppColors.darkCard : Colors.white;
    final borderColor =
        isDark ? AppColors.darkCardBorder : const Color(0xFFE5E7EB);
    final titleColor = isDark ? const Color(0xFFF8FAFC) : AppColors.gray900;
    final mutedColor = isDark ? AppColors.darkMuted : AppColors.gray500;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _entityLabel(entry.entityType),
                      style: TextStyle(
                        color: titleColor,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'ID ${entry.entityId}',
                      style: TextStyle(color: mutedColor, fontSize: 11),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              SyncStatusBadge(
                entityType: entry.entityType,
                entityId: entry.entityId,
                status: entry.status,
                compact: true,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 14,
            runSpacing: 4,
            children: [
              _MetaText(
                  text: 'Reintentos: ${entry.retries}', color: mutedColor),
              _MetaText(
                text: 'Actualizado: ${_formatDate(entry.updatedAt)}',
                color: mutedColor,
              ),
            ],
          ),
          if (entry.lastError.trim().isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF3F1D1D) : AppColors.dangerSoft,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                entry.lastError,
                style: const TextStyle(
                  color: AppColors.danger,
                  fontSize: 11,
                  height: 1.35,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SyncLogCard extends StatelessWidget {
  const _SyncLogCard({required this.log, required this.isDark});

  final Map<String, dynamic> log;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    final status = (log['status'] as String?) ?? SyncQueueStatus.pending;
    final entityType = (log['entity_type'] as String?) ?? '';
    final entityId = (log['entity_id'] as String?) ?? '';
    final message = (log['message'] as String?) ?? '';
    final createdAt = (log['created_at'] as String?) ?? '';
    final mutedColor = isDark ? AppColors.darkMuted : AppColors.gray500;
    final titleColor = isDark ? const Color(0xFFF8FAFC) : AppColors.gray900;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? AppColors.darkCardBorder : const Color(0xFFE5E7EB),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SyncStatusBadge(
            entityType: entityType,
            entityId: entityId,
            status: status,
            compact: true,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_entityLabel(entityType)} #$entityId',
                  style: TextStyle(
                    color: titleColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (message.trim().isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    message,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: mutedColor, fontSize: 11),
                  ),
                ],
                const SizedBox(height: 3),
                Text(
                  _formatDate(createdAt),
                  style: TextStyle(color: mutedColor, fontSize: 10),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaText extends StatelessWidget {
  const _MetaText({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Text(text, style: TextStyle(color: color, fontSize: 11));
  }
}

class _MessageBox extends StatelessWidget {
  const _MessageBox({
    required this.message,
    required this.isDark,
    this.isError = false,
  });

  final String message;
  final bool isDark;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isError
            ? (isDark ? const Color(0xFF3F1D1D) : const Color(0xFFFEF2F2))
            : (isDark ? AppColors.darkCard : AppColors.gray50),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isError
              ? (isDark ? const Color(0xFF7F1D1D) : const Color(0xFFFECACA))
              : (isDark ? AppColors.darkCardBorder : AppColors.gray100),
        ),
      ),
      child: Text(
        message,
        style: TextStyle(
          color: isError
              ? AppColors.danger
              : (isDark ? AppColors.darkMuted : AppColors.gray500),
          fontSize: 12,
          height: 1.4,
        ),
      ),
    );
  }
}

String _entityLabel(String entityType) {
  switch (entityType) {
    case 'visit':
      return 'Visita';
    case 'audit':
      return 'Auditoria';
    case 'visit_media':
      return 'Evidencia de visita';
    case 'audit_media':
      return 'Evidencia de auditoria';
    default:
      return entityType.isEmpty ? 'Operacion' : entityType;
  }
}

String _formatDate(String raw) {
  if (raw.trim().isEmpty) return 'Sin fecha';
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return raw;
  final local = parsed.toLocal();
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(local.day)}/${two(local.month)}/${local.year} ${two(local.hour)}:${two(local.minute)}';
}
