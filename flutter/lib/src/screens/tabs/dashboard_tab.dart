import 'package:flutter/material.dart';

import '../../models/dashboard_stats.dart';
import '../../models/visit.dart';
import '../../services/trust_repository.dart';

class DashboardTab extends StatelessWidget {
  const DashboardTab({required this.email, super.key});

  final String email;

  @override
  Widget build(BuildContext context) {
    final repository = TrustRepository();
    return FutureBuilder<(DashboardStats, List<Visit>)>(
      future: _loadData(repository),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError || snapshot.data == null) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text('No se pudo cargar el dashboard: ${snapshot.error}'),
            ),
          );
        }

        final stats = snapshot.data!.$1;
        final visits = snapshot.data!.$2;
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 110),
          children: [
            SizedBox(
              height: 112,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _MetricCard(
                    label: 'Sucursales',
                    value: stats.branches,
                    icon: Icons.storefront_rounded,
                    iconBackground: const Color(0xFFDBEAFE),
                    iconColor: const Color(0xFF2563EB),
                  ),
                  _MetricCard(
                    label: 'Pendientes',
                    value: stats.pendingVisits,
                    icon: Icons.pending_actions_rounded,
                    iconBackground: const Color(0xFFFFEDD5),
                    iconColor: const Color(0xFFEA580C),
                  ),
                  _MetricCard(
                    label: 'Incidencias',
                    value: stats.incidents,
                    icon: Icons.report_problem_rounded,
                    iconBackground: const Color(0xFFFEE2E2),
                    iconColor: const Color(0xFFDC2626),
                  ),
                  _MetricCard(
                    label: 'Completadas',
                    value: stats.visits - stats.pendingVisits,
                    icon: Icons.check_circle_rounded,
                    iconBackground: const Color(0xFFDCFCE7),
                    iconColor: const Color(0xFF16A34A),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Visitas de Hoy',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600),
                  ),
                ),
                TextButton(
                  style: TextButton.styleFrom(
                    backgroundColor: const Color(0x4DFFF9C4),
                    foregroundColor: const Color(0xFFF57F17),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                  ),
                  onPressed: () {},
                  child: const Text('Ver todas'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (visits.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Text('No hay visitas para mostrar.'),
              )
            else
              ...visits.take(6).map((visit) => _VisitCard(visit: visit)),
          ],
        );
      },
    );
  }

  Future<(DashboardStats, List<Visit>)> _loadData(TrustRepository repository) async {
    final stats = await repository.loadDashboardStats(email);
    final visits = await repository.loadVisits(email);
    return (stats, visits);
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.iconBackground,
    required this.iconColor,
  });

  final String label;
  final int value;
  final IconData icon;
  final Color iconBackground;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 130,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: iconBackground, shape: BoxShape.circle),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$value',
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, height: 1),
              ),
              Text(
                label,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF6B7280)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _VisitCard extends StatelessWidget {
  const _VisitCard({required this.visit});

  final Visit visit;

  @override
  Widget build(BuildContext context) {
    final status = _visitStatus(visit.status);
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(20),
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
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        status.label,
                        style: TextStyle(
                          color: status.foreground,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${visit.branch} #${visit.id}',
                      style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFF3F4F6)),
                ),
                child: Text(
                  _formatTime(visit.visitedAt),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF4B5563),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.location_on_outlined, size: 18, color: Color(0xFF9CA3AF)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  visit.area,
                  style: const TextStyle(fontSize: 14, color: Color(0xFF4B5563)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.person_outline_rounded, size: 18, color: Color(0xFF9CA3AF)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Contacto: ${visit.inspector}',
                  style: const TextStyle(fontSize: 14, color: Color(0xFF4B5563)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, color: Color(0xFFE5E7EB)),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: () {},
                style: TextButton.styleFrom(foregroundColor: const Color(0xFF111827), padding: EdgeInsets.zero),
                child: const Text(
                  'Ver detalles',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
              Container(
                width: 38,
                height: 38,
                decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                child: IconButton(
                  onPressed: () {},
                  icon: const Icon(Icons.near_me_outlined, size: 20, color: Color(0xFF4B5563)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static ({String label, Color background, Color foreground}) _visitStatus(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return (
          label: 'Completada',
          background: const Color(0xFFDCFCE7),
          foreground: const Color(0xFF15803D),
        );
      case 'pending':
        return (
          label: 'Pendiente',
          background: const Color(0xFFE5E7EB),
          foreground: const Color(0xFF374151),
        );
      default:
        return (
          label: 'Programada',
          background: const Color(0xFFDBEAFE),
          foreground: const Color(0xFF1D4ED8),
        );
    }
  }

  static String _formatTime(String input) {
    final date = DateTime.tryParse(input);
    if (date == null) {
      return '--:--';
    }

    final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
    final minute = date.minute.toString().padLeft(2, '0');
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $period';
  }
}
