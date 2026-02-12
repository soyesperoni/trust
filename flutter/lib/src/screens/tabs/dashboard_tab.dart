import 'package:flutter/material.dart';

import '../../models/dashboard_stats.dart';
import '../../services/trust_repository.dart';

class DashboardTab extends StatelessWidget {
  const DashboardTab({required this.email, super.key});

  final String email;

  @override
  Widget build(BuildContext context) {
    final repository = TrustRepository();

    return FutureBuilder<DashboardStats>(
      future: repository.loadDashboardStats(email),
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

        final stats = snapshot.data!;
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 110),
          child: Row(
            children: [
              Expanded(
                child: _MetricCard(
                  label: 'Visitas pendientes',
                  value: stats.pendingVisits,
                  icon: Icons.pending_actions_rounded,
                  iconBackground: const Color(0xFFFFEDD5),
                  iconColor: const Color(0xFFEA580C),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MetricCard(
                  label: 'Incidencias',
                  value: stats.incidents,
                  icon: Icons.report_problem_rounded,
                  iconBackground: const Color(0xFFFEE2E2),
                  iconColor: const Color(0xFFDC2626),
                ),
              ),
            ],
          ),
        );
      },
    );
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
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: iconBackground, shape: BoxShape.circle),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(height: 10),
          Text(
            '$value',
            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, height: 1),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF4B5563)),
          ),
        ],
      ),
    );
  }
}
