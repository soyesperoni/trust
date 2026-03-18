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
    final isCompleted = audit.status.toLowerCase().contains('complet') || audit.status.toLowerCase().contains('final');
    final canStart = !isCompleted && role.isInspector;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? AppColors.darkCardBorder : const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(audit.client, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
          const SizedBox(height: 8),
          Text('Auditoría • ${audit.formName}', style: TextStyle(color: isDark ? AppColors.darkMuted : AppColors.gray500)),
          const SizedBox(height: 8),
          Text('Sucursal: ${audit.branch}'),
          Text('Área: ${audit.area}'),
          const SizedBox(height: 10),
          Row(
            children: [
              Chip(label: Text(isCompleted ? 'Completada' : 'Programada')),
              const Spacer(),
              if (canStart)
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => AuditExecutionScreen(audit: audit, email: email)));
                  },
                  icon: const Icon(Icons.play_arrow_rounded, size: 16),
                  label: const Text('Auditar'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
