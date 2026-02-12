import 'package:flutter/material.dart';

import '../models/user_role.dart';
import '../models/visit.dart';
import '../screens/visit_execution_screen.dart';

class VisitSummaryCard extends StatelessWidget {
  const VisitSummaryCard({
    required this.visit,
    required this.role,
    required this.email,
    super.key,
  });

  final Visit visit;
  final UserRole role;
  final String email;

  @override
  Widget build(BuildContext context) {
    final status = _badgeForStatus(visit.status);
    final canStartVisit = !status.isCompleted && status.label == 'Programada' && role.isInspector;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x12000000),
            blurRadius: 10,
            offset: Offset(0, 4),
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
                      style: const TextStyle(
                        color: Color(0xFF111827),
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
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFF3F4F6)),
                ),
                child: Text(
                  _formatTime(visit.visitedAt),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF4B5563),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _infoRow(Icons.storefront_outlined, 'Sucursal: ${visit.branch}'),
          const SizedBox(height: 8),
          _infoRow(Icons.place_outlined, 'Área: ${visit.area}'),
          const SizedBox(height: 8),
          _infoRow(Icons.water_drop_outlined, 'Dosificadores: ${visit.areaDispensersCount}'),
          if (!status.isCompleted) ...[
            const SizedBox(height: 14),
            const Divider(height: 1, color: Color(0xFFE5E7EB)),
            const SizedBox(height: 12),
            Row(
              children: [
                Text(
                  canStartVisit ? 'Lista para iniciar' : 'Ver información de la visita',
                  style: const TextStyle(
                    color: Color(0xFF6B7280),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const Spacer(),
                if (canStartVisit)
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => VisitExecutionScreen(visit: visit, email: email)),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      elevation: 0,
                      backgroundColor: const Color(0xFF111827),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
          ],
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFF9CA3AF)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 14, color: Color(0xFF4B5563)),
          ),
        ),
      ],
    );
  }

  _StatusBadge _badgeForStatus(String rawStatus) {
    final status = rawStatus.toLowerCase();
    if (status.contains('complet') || status.contains('final')) {
      return const _StatusBadge(
        label: 'Completada',
        background: Color(0xFFDCFCE7),
        foreground: Color(0xFF15803D),
        isCompleted: true,
      );
    }
    if (status.contains('pend')) {
      return const _StatusBadge(
        label: 'Pendiente',
        background: Color(0xFFE5E7EB),
        foreground: Color(0xFF374151),
        isCompleted: false,
      );
    }
    return const _StatusBadge(
      label: 'Programada',
      background: Color(0xFFDBEAFE),
      foreground: Color(0xFF1D4ED8),
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
