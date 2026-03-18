import 'package:flutter/material.dart';

import '../models/audit.dart';
import '../models/user_role.dart';
import '../screens/audit_execution_screen.dart';
import '../theme/app_colors.dart';

class AuditSummaryCard extends StatelessWidget {
  const AuditSummaryCard({required this.audit, required this.role, required this.email, super.key});

  final Audit audit;
  final UserRole role;
  final String email;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final status = _badgeForStatus(audit.status, isDark);
    final isCompleted = status.isCompleted;
    final canStart = !isCompleted && role.isInspector;
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
            audit.client,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 19,
              color: titleColor,
            ),
          ),
          const SizedBox(height: 8),
          Text('Auditoría • ${audit.formName}', style: TextStyle(color: mutedColor)),
          const SizedBox(height: 12),
          _infoRow(context, Icons.storefront_outlined, 'Sucursal: ${audit.branch}'),
          const SizedBox(height: 8),
          _infoRow(context, Icons.place_outlined, 'Área: ${audit.area}'),
          const SizedBox(height: 12),
          Divider(height: 1, color: borderColor),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                isCompleted ? 'Auditoría finalizada' : 'Auditoría pendiente',
                style: TextStyle(
                  color: mutedColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              if (canStart)
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => AuditExecutionScreen(audit: audit, email: email)));
                  },
                  style: ElevatedButton.styleFrom(
                    elevation: 0,
                    backgroundColor: isDark ? const Color(0xFFF8FAFC) : AppColors.primary,
                    foregroundColor: isDark ? AppColors.darkBackground : Colors.white,
                    textStyle: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  icon: const Icon(Icons.play_arrow_rounded, size: 16),
                  label: const Text('Auditar'),
                ),
            ],
          ),
        ],
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
    final value = rawStatus.toLowerCase();
    if (value.contains('complet') || value.contains('final')) {
      return _StatusBadge(
        label: 'Completada',
        background: isDark ? const Color(0x1F22C55E) : const Color(0xFFDCFCE7),
        foreground: isDark ? const Color(0xFF86EFAC) : const Color(0xFF15803D),
        isCompleted: true,
      );
    }

    return _StatusBadge(
      label: 'Programada',
      background: isDark ? const Color(0x1F3B82F6) : const Color(0xFFDBEAFE),
      foreground: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
      isCompleted: false,
    );
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
