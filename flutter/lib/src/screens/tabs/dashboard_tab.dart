import 'package:flutter/material.dart';

import '../../models/dashboard_stats.dart';
import '../../models/visit.dart';
import '../../services/trust_repository.dart';

class DashboardTab extends StatelessWidget {
  const DashboardTab({
    required this.email,
    required this.onViewMoreTodayVisits,
    super.key,
  });

  final String email;
  final VoidCallback onViewMoreTodayVisits;

  @override
  Widget build(BuildContext context) {
    final repository = TrustRepository();

    return FutureBuilder<_DashboardPayload>(
      future: _loadPayload(repository),
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

        final payload = snapshot.data!;

        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
          children: [
            Row(
              children: [
                Expanded(
                  child: _MetricCard(
                    label: 'Visitas Pendientes',
                    value: payload.stats.pendingVisits,
                    icon: Icons.pending_actions_rounded,
                    iconBackground: const Color(0xFFFFEDD5),
                    iconColor: const Color(0xFFEA580C),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: _MetricCard(
                    label: 'Incidencias',
                    value: payload.stats.incidents,
                    icon: Icons.report_problem_rounded,
                    iconBackground: const Color(0xFFFEE2E2),
                    iconColor: const Color(0xFFDC2626),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Visitas de Hoy',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF111827),
                  ),
                ),
                TextButton(
                  onPressed: onViewMoreTodayVisits,
                  style: TextButton.styleFrom(
                    backgroundColor: const Color(0xFFFFFDE7),
                    foregroundColor: const Color(0xFFB45309),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                    textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  child: const Text('Ver más'),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (payload.todayVisits.isEmpty)
              const _EmptyVisits()
            else
              ...payload.todayVisits.map((visit) => Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: _VisitCard(visit: visit),
              )),
          ],
        );
      },
    );
  }

  Future<_DashboardPayload> _loadPayload(TrustRepository repository) async {
    final results = await Future.wait<dynamic>([
      repository.loadDashboardStats(email),
      repository.loadVisits(email),
    ]);

    final stats = results[0] as DashboardStats;
    final visits = results[1] as List<Visit>;

    return _DashboardPayload(stats: stats, todayVisits: _pickVisits(visits));
  }

  List<Visit> _pickVisits(List<Visit> visits) {
    if (visits.isEmpty) {
      return const [];
    }

    final now = DateTime.now();
    final todayVisits = visits.where((visit) {
      final parsed = DateTime.tryParse(visit.visitedAt)?.toLocal();
      if (parsed == null) {
        return false;
      }
      return parsed.year == now.year && parsed.month == now.month && parsed.day == now.day;
    }).toList(growable: false);

    if (todayVisits.isEmpty) {
      return const [];
    }

    final sorted = [...todayVisits]
      ..sort((a, b) {
        final aDate = DateTime.tryParse(a.visitedAt)?.toLocal();
        final bDate = DateTime.tryParse(b.visitedAt)?.toLocal();
        if (aDate == null && bDate == null) {
          return 0;
        }
        if (aDate == null) {
          return 1;
        }
        if (bDate == null) {
          return -1;
        }
        return aDate.compareTo(bDate);
      });

    return sorted.take(3).toList(growable: false);
  }
}

class _DashboardPayload {
  const _DashboardPayload({required this.stats, required this.todayVisits});

  final DashboardStats stats;
  final List<Visit> todayVisits;
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
      constraints: const BoxConstraints(minHeight: 120),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: iconBackground, shape: BoxShape.circle),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          Text(
            '$value',
            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: Color(0xFF111827), height: 1),
          ),
          Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF4B5563)),
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
    final status = _badgeForStatus(visit.status);

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(20),
      ),
      padding: const EdgeInsets.all(18),
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
                    const SizedBox(height: 8),
                    Text(
                      '${visit.branch} #${visit.id}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF111827),
                        fontSize: 20,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFF3F4F6)),
                ),
                child: Text(
                  _formatHour(visit.visitedAt),
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF4B5563)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.location_on, size: 18, color: Color(0xFF9CA3AF)),
              const SizedBox(width: 6),
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
              const Icon(Icons.person, size: 18, color: Color(0xFF9CA3AF)),
              const SizedBox(width: 6),
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
                style: TextButton.styleFrom(
                  foregroundColor: status.actionColor,
                  padding: EdgeInsets.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  visualDensity: VisualDensity.compact,
                ),
                child: Text(
                  status.isCompleted ? 'Ver reporte' : 'Ver detalles',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
              if (!status.isCompleted)
                Container(
                  width: 40,
                  height: 40,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(color: Color(0x14000000), blurRadius: 3, offset: Offset(0, 1)),
                    ],
                  ),
                  child: IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.near_me, size: 20, color: Color(0xFF374151)),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  _StatusBadge _badgeForStatus(String rawStatus) {
    final status = rawStatus.toLowerCase();
    if (status.contains('complet') || status.contains('final')) {
      return const _StatusBadge(
        label: 'Completada',
        background: Color(0xFFDCFCE7),
        foreground: Color(0xFF15803D),
        actionColor: Color(0xFF15803D),
        isCompleted: true,
      );
    }
    if (status.contains('pend')) {
      return const _StatusBadge(
        label: 'Pendiente',
        background: Color(0xFFE5E7EB),
        foreground: Color(0xFF374151),
        actionColor: Color(0xFF111827),
        isCompleted: false,
      );
    }
    return const _StatusBadge(
      label: 'Programada',
      background: Color(0xFFDBEAFE),
      foreground: Color(0xFF1D4ED8),
      actionColor: Color(0xFF111827),
      isCompleted: false,
    );
  }

  String _formatHour(String raw) {
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) {
      return '--:--';
    }
    final hour = parsed.hour % 12 == 0 ? 12 : parsed.hour % 12;
    final minute = parsed.minute.toString().padLeft(2, '0');
    final period = parsed.hour >= 12 ? 'PM' : 'AM';
    return '${hour.toString().padLeft(2, '0')}:$minute $period';
  }
}

class _StatusBadge {
  const _StatusBadge({
    required this.label,
    required this.background,
    required this.foreground,
    required this.actionColor,
    required this.isCompleted,
  });

  final String label;
  final Color background;
  final Color foreground;
  final Color actionColor;
  final bool isCompleted;
}

class _EmptyVisits extends StatelessWidget {
  const _EmptyVisits();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Text(
        'No hay visitas para mostrar por ahora.',
        style: TextStyle(color: Color(0xFF6B7280), fontSize: 14),
      ),
    );
  }
}
