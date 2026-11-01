import 'dart:async';

import 'package:flutter/material.dart';

import '../services/local_db_service.dart';
import '../services/sync_queue_service.dart';
import '../theme/app_colors.dart';

/// Indicador compacto del estado de sincronizacion de una entidad local.
class SyncStatusBadge extends StatefulWidget {
  const SyncStatusBadge({
    required this.entityType,
    required this.entityId,
    this.compact = false,
    super.key,
  });

  final String entityType;
  final String entityId;
  final bool compact;

  @override
  State<SyncStatusBadge> createState() => _SyncStatusBadgeState();
}

class _SyncStatusBadgeState extends State<SyncStatusBadge> {
  StreamSubscription<SyncQueueEvent>? _subscription;
  String? _status;

  @override
  void initState() {
    super.initState();
    _refresh();
    _subscription = SyncQueueService.instance.events.listen((event) {
      if (event.entityId == widget.entityId) {
        _refresh();
      }
    });
  }

  @override
  void didUpdateWidget(covariant SyncStatusBadge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.entityId != widget.entityId ||
        oldWidget.entityType != widget.entityType) {
      _refresh();
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      final status = await LocalDbService.instance.latestQueueStatus(
        widget.entityType,
        widget.entityId,
      );
      if (!mounted || status == _status) return;
      setState(() => _status = status);
    } catch (_) {
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = _status;
    if (status == null) {
      return const SizedBox.shrink();
    }
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isPending = status == SyncQueueStatus.pending;
    final isError = status == SyncQueueStatus.error;
    final foreground = isError
        ? const Color(0xFFB91C1C)
        : isPending
            ? const Color(0xFF92400E)
            : const Color(0xFF166534);
    final background = isError
        ? (isDark ? const Color(0xFF3F1D1D) : const Color(0xFFFEE2E2))
        : isPending
            ? (isDark ? const Color(0xFF3B2E12) : const Color(0xFFFEF3C7))
            : (isDark ? const Color(0xFF14321F) : const Color(0xFFDCFCE7));
    final label = isError
        ? 'Error de sincronizacion'
        : isPending
            ? 'Pendiente de sincronizar'
            : 'Sincronizado';

    return Padding(
      padding: EdgeInsets.only(top: widget.compact ? 4 : 8),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration:
                BoxDecoration(color: foreground, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: background,
              borderRadius: BorderRadius.circular(7),
            ),
            child: Text(
              label,
              style: TextStyle(
                color: foreground,
                fontSize: 10,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          if (isError) ...[
            const SizedBox(width: 4),
            Icon(Icons.error_outline, size: 13, color: AppColors.secondary),
          ],
        ],
      ),
    );
  }
}
