import 'package:flutter/material.dart';

import '../models/user_role.dart';
import '../models/visit.dart';
import '../screens/visit_execution_screen.dart';
import '../screens/visit_report_screen.dart';
import '../theme/app_colors.dart';

class VisitSummaryCard extends StatelessWidget {
  const VisitSummaryCard({
    required this.visit,
    required this.role,
    required this.email,
    this.onVisitCompleted,
    super.key,
  });

  final Visit visit;
  final UserRole role;
  final String email;
  final VoidCallback? onVisitCompleted;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final status = _badgeForStatus(visit.status, isDark);
    final canStartVisit = !status.isCompleted && status.label == 'Programada' && role.isInspector;

    final cardColor = isDark ? AppColors.darkCard : const Color(0xFFF9FAFB);
    final borderColor = isDark ? AppColors.darkCardBorder : const Color(0xFFE5E7EB);
    final titleColor = isDark ? const Color(0xFFF8FAFC) : const Color(0xFF111827);
    final mutedColor = isDark ? AppColors.darkMuted : const Color(0xFF6B7280);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: isDark ? const Color(0x55000000) : const Color(0x12000000),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
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
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: status.background,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        status.label,
                        style: TextStyle(
                          color: status.foreground,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      visit.client,
                      style: TextStyle(
                        color: titleColor,
                        fontSize: 19,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: isDark ? AppColors.darkCardBorder : const Color(0xFFF3F4F6)),
                ),
                child: Text(
                  _formatTime(visit.visitedAt),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: mutedColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _infoRow(context, Icons.storefront_outlined, 'Sucursal: ${visit.branch}'),
          const SizedBox(height: 8),
          _infoRow(context, Icons.place_outlined, 'Área: ${visit.area}'),
          const SizedBox(height: 8),
          _infoRow(context, Icons.water_drop_outlined, 'Dosificadores: ${visit.areaDispensersCount}'),
          if (!status.isCompleted) ...[
            const SizedBox(height: 14),
            Divider(height: 1, color: borderColor),
            const SizedBox(height: 12),
            Row(
              children: [
                Text(
                  canStartVisit ? 'Lista para iniciar' : 'Ver información de la visita',
                  style: TextStyle(
                    color: mutedColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const Spacer(),
                if (canStartVisit)
                  ElevatedButton.icon(
                    onPressed: () async {
                      final completed = await Navigator.of(context).push<bool>(
                        MaterialPageRoute<bool>(builder: (_) => VisitExecutionScreen(visit: visit, email: email)),
                      );
                      if (completed == true) {
                        onVisitCompleted?.call();
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      elevation: 0,
                      backgroundColor: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF111827),
                      foregroundColor: isDark ? AppColors.darkBackground : Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      textStyle: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    icon: const Icon(Icons.play_arrow_rounded, size: 18),
                    label: const Text('Comenzar visita'),
                  )
                else
                  TextButton(
                    onPressed: () {},
                    child: const Text('Ver detalles'),
                  ),
              ],
            ),
          ] else ...[
            const SizedBox(height: 14),
            Divider(height: 1, color: borderColor),
            const SizedBox(height: 12),
            Text(
              'Informe de visita',
              style: TextStyle(
                color: mutedColor,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _openReport(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: titleColor,
                      side: BorderSide(color: isDark ? AppColors.darkCardBorder : const Color(0xFFD1D5DB)),
                      minimumSize: const Size.fromHeight(44),
                      textStyle: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    icon: const Icon(Icons.visibility_outlined, size: 18),
                    label: const Text('Ver informe'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _openReport(context, openWithDownload: true),
                    style: ElevatedButton.styleFrom(
                      elevation: 0,
                      backgroundColor: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF111827),
                      foregroundColor: isDark ? AppColors.darkBackground : Colors.white,
                      minimumSize: const Size.fromHeight(44),
                      textStyle: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    icon: const Icon(Icons.download_rounded, size: 18),
                    label: const Text('Descargar PDF'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _openReport(BuildContext context, {bool openWithDownload = false}) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => VisitReportScreen(
          visitId: visit.id,
          email: email,
          openWithDownload: openWithDownload,
        ),
      ),
    );
  }

  Widget _infoRow(BuildContext context, IconData icon, String text) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        Icon(icon, size: 18, color: isDark ? const Color(0xFF64748B) : const Color(0xFF9CA3AF)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(fontSize: 14, color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF4B5563)),
          ),
        ),
      ],
    );
  }

  _StatusBadge _badgeForStatus(String rawStatus, bool isDark) {
    final status = rawStatus.toLowerCase();
    if (status.contains('complet') || status.contains('final')) {
      return _StatusBadge(
        label: 'Completada',
        background: isDark ? const Color(0x1F22C55E) : const Color(0xFFDCFCE7),
        foreground: isDark ? const Color(0xFF86EFAC) : const Color(0xFF15803D),
        isCompleted: true,
      );
    }
    if (status.contains('pend')) {
      return _StatusBadge(
        label: 'Pendiente',
        background: isDark ? const Color(0x1F94A3B8) : const Color(0xFFE5E7EB),
        foreground: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF374151),
        isCompleted: false,
      );
    }
    return _StatusBadge(
      label: 'Programada',
      background: isDark ? const Color(0x1F3B82F6) : const Color(0xFFDBEAFE),
      foreground: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
      isCompleted: false,
    );
  }

  String _formatTime(String input) {
    final date = DateTime.tryParse(input)?.toLocal();
    if (date == null) {
      return '--:--';
    }

    final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
    final minute = date.minute.toString().padLeft(2, '0');
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $period';
  }
}

class _StatusBadge {
  const _StatusBadge({
    required this.label,
    required this.background,
    required this.foreground,
    required this.isCompleted,
  });

  final String label;
  final Color background;
  final Color foreground;
  final bool isCompleted;
}
