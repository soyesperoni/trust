import 'package:flutter/material.dart';
import '../../models/visit.dart';
import '../../services/trust_repository.dart';
import '../../theme/app_colors.dart';

class VisitsTab extends StatelessWidget {
  const VisitsTab({required this.email, super.key});

  final String email;

  @override
  Widget build(BuildContext context) {
    final repository = TrustRepository();
    return FutureBuilder<List<Visit>>(
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

        return Column(
          children: [
            const _HistoryHeader(),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                itemCount: visits.length,
                separatorBuilder: (_, __) => const SizedBox(height: 14),
                itemBuilder: (context, index) => _VisitCard(visit: visits[index]),
              ),
            ),
          ],
        );
      },
    );
  }

}

class _HistoryHeader extends StatelessWidget {
  const _HistoryHeader();

  @override
  Widget build(BuildContext context) {
    const chips = ['Programadas', 'Finalizadas'];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 48,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: AppColors.gray100,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.search, color: AppColors.gray500),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Buscar historial...',
                          style: TextStyle(color: AppColors.gray500, fontSize: 16),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 34,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: chips.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final selected = index == 0;
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: selected ? AppColors.black : Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: selected ? null : Border.all(color: AppColors.gray300),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    chips[index],
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: selected ? Colors.white : AppColors.gray700,
                    ),
                  ),
                );
              },
            ),
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
    final badge = _statusBadge(visit.status);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.gray50,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.gray100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _formatDate(visit.visitedAt),
                  style: const TextStyle(
                    color: AppColors.gray500,
                    fontWeight: FontWeight.w500,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        '${visit.branch} #${visit.id}',
                        style: const TextStyle(
                          color: AppColors.black,
                          fontWeight: FontWeight.w700,
                          fontSize: 20,
                          height: 1.15,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: badge.background,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        badge.label,
                        style: TextStyle(
                          color: badge.foreground,
                          fontWeight: FontWeight.w700,
                          fontSize: 11,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 8),
            child: Row(
              children: [
                const Icon(Icons.location_on, size: 18, color: AppColors.gray500),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    visit.area,
                    style: const TextStyle(
                      color: AppColors.gray700,
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 2, 12, 12),
            child: SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () {},
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  foregroundColor: AppColors.gray700,
                ),
                child: const Text(
                  'Ver reporte',
                  style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  _StatusStyle _statusBadge(String rawStatus) {
    final status = rawStatus.toLowerCase();
    if (status.contains('program')) {
      return const _StatusStyle('PROGRAMADA', AppColors.yellowSoft, AppColors.charcoal);
    }

    return const _StatusStyle('FINALIZADA', AppColors.gray100, AppColors.gray700);
  }

  String _formatDate(String value) {
    if (value.isEmpty) {
      return 'Sin fecha';
    }

    final parsed = DateTime.tryParse(value);
    if (parsed == null) {
      return value;
    }

    const weekdays = [
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ];
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    return '${weekdays[parsed.weekday - 1]}, ${parsed.day.toString().padLeft(2, '0')} de ${months[parsed.month - 1]}';
  }
}

class _StatusStyle {
  const _StatusStyle(this.label, this.background, this.foreground);

  final String label;
  final Color background;
  final Color foreground;
}
