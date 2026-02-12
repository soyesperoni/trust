import 'package:flutter/material.dart';

import '../../services/trust_repository.dart';

class IncidentsTab extends StatelessWidget {
  const IncidentsTab({required this.email, super.key});

  final String email;

  @override
  Widget build(BuildContext context) {
    final repository = TrustRepository();
    return FutureBuilder(
      future: repository.loadIncidents(email),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(child: Text('Error cargando incidencias: ${snapshot.error}'));
        }

        final incidents = snapshot.data ?? [];
        if (incidents.isEmpty) {
          return const Center(child: Text('Sin incidencias registradas.'));
        }

        return ListView.separated(
          itemCount: incidents.length,
          separatorBuilder: (_, _) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final incident = incidents[index];
            return ListTile(
              leading: const Icon(Icons.report_problem_outlined),
              title: Text('${incident.type} • ${incident.status}'),
              subtitle: Text('Dispensador: ${incident.dispenser}\n${incident.createdAt}'),
              isThreeLine: true,
            );
          },
        );
      },
    );
  }
}
