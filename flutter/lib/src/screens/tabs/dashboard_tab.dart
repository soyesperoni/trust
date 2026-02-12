import 'package:flutter/material.dart';

import '../../services/trust_repository.dart';
import '../../widgets/stat_card.dart';

class DashboardTab extends StatelessWidget {
  const DashboardTab({required this.email, super.key});

  final String email;

  @override
  Widget build(BuildContext context) {
    final repository = TrustRepository();
    return FutureBuilder(
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
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            StatCard(title: 'Clientes', value: stats.clients, icon: Icons.apartment),
            StatCard(title: 'Sucursales', value: stats.branches, icon: Icons.storefront),
            StatCard(title: 'Áreas', value: stats.areas, icon: Icons.map_outlined),
            StatCard(title: 'Dosificadores', value: stats.dispensers, icon: Icons.water_drop_outlined),
            StatCard(title: 'Productos', value: stats.products, icon: Icons.inventory_2_outlined),
            StatCard(title: 'Visitas', value: stats.visits, icon: Icons.history),
            StatCard(title: 'Visitas pendientes', value: stats.pendingVisits, icon: Icons.event_note_outlined),
            StatCard(title: 'Incidencias', value: stats.incidents, icon: Icons.report_problem_outlined),
          ],
        );
      },
    );
  }
}
