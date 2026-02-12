import 'package:flutter/material.dart';

import '../../services/trust_repository.dart';

class VisitsTab extends StatelessWidget {
  const VisitsTab({required this.email, super.key});

  final String email;

  @override
  Widget build(BuildContext context) {
    final repository = TrustRepository();
    return FutureBuilder(
      future: repository.loadVisits(email),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(child: Text('Error cargando visitas: ${snapshot.error}'));
        }

        final visits = snapshot.data ?? [];
        if (visits.isEmpty) {
          return const Center(child: Text('Sin visitas registradas.'));
        }

        return ListView.separated(
          itemCount: visits.length,
          separatorBuilder: (_, _) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final visit = visits[index];
            return ListTile(
              leading: const Icon(Icons.assignment_turned_in_outlined),
              title: Text('${visit.client} • ${visit.branch}'),
              subtitle: Text('${visit.area}\n${visit.visitedAt}'),
              isThreeLine: true,
              trailing: Text(visit.status),
            );
          },
        );
      },
    );
  }
}
