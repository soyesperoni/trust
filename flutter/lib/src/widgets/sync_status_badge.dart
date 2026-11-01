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
    this.status,
    super.key,
  });

  final String entityType;
  final String entityId;
  final bool compact;

  /// Estado explicito para filas historicas de la cola. Si es nulo, el badge
  /// consulta y escucha el ultimo estado de la entidad en la base local.
  final String? status;

  @override
  State<SyncStatusBadge> createState() => _SyncStatusBadgeState();
}

class _SyncStatusBadgeState extends State<SyncStatusBadge> {
  StreamSubscription<SyncQueueEvent>? _subscription;
  String? _status;

  @override
  void initState() {
    super.initState();
    if (widget.status == null) {
      _refresh();
      _subscription = SyncQueueService.instance.events.listen((event) {
        if (event.entityId == widget.entityId) {
          _refresh();
        }
      });
    }
  }

  @override
  void didUpdateWidget(covariant SyncStatusBadge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.entityId != widget.entityId ||
        oldWidget.entityType != widget.entityType ||
        oldWidget.status != widget.status) {
      _refresh();
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    if (widget.status != null) return;
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
    final status = widget.status ?? _status;
    if (status == null) {
      return const SizedBox.shrink();
    }
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isPending = status == SyncQueueStatus.pending;
    final isError = status == SyncQueueStatus.error;
    final foreground = isError
        ? AppColors.danger
        : isPending
            ? AppColors.warning
            : AppColors.success;
    final background = isError
        ? (isDark ? const Color(0xFF3F1D1D) : AppColors.dangerSoft)
        : isPending
            ? (isDark ? const Color(0xFF3B2E12) : AppColors.warningSoft)
            : (isDark ? const Color(0xFF14321F) : AppColors.successSoft);
    final label = widget.compact
        ? (isError
            ? 'Error'
            : isPending
                ? 'Pendiente'
                : 'Sincronizado')
        : (isError
            ? 'Error de sincronizacion'
            : isPending
                ? 'Pendiente de sincronizar'
                : 'Sincronizado');

    return Tooltip(
      message: isError
          ? 'La ultima sincronizacion fallo. Revisa el log de sincronizacion.'
          : isPending
              ? 'Guardado en el dispositivo. Se enviara al recuperar conexion.'
              : 'Sincronizado con el servidor.',
      child: Padding(
        padding: EdgeInsets.only(top: widget.compact ? 0 : 8),
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
              Icon(Icons.error_outline, size: 13, color: foreground),
            ],
          ],
        ),
      ),
    );
  }
}
