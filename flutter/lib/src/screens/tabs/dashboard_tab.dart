import 'package:flutter/material.dart';

import '../../models/dashboard_stats.dart';
import '../../models/user_role.dart';
import '../../models/visit.dart';
import '../../services/trust_repository.dart';
import '../../widgets/visit_summary_card.dart';

class DashboardTab extends StatelessWidget {
  const DashboardTab({
    required this.email,
    required this.role,
    required this.onViewMoreTodayVisits,
    super.key,
  });

  final String email;
  final UserRole role;
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
                    cardColor: const Color(0xFFFFEDD5),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: _MetricCard(
                    label: 'Incidencias',
                    value: payload.stats.incidents,
                    cardColor: const Color(0xFFFEE2E2),
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
              ...payload.todayVisits.map(
                (visit) => Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: _VisitCard(visit: visit, role: role, email: email),
                ),
              ),
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
    required this.cardColor,
  });

  final String label;
  final int value;
  final Color cardColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 120),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '$value',
            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: Color(0xFF111827), height: 1),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF4B5563)),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _VisitCard extends StatelessWidget {
  const _VisitCard({required this.visit, required this.role, required this.email});

  final Visit visit;
  final UserRole role;
  final String email;

  @override
  Widget build(BuildContext context) {
    return VisitSummaryCard(visit: visit, role: role, email: email);
  }
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
