import 'package:flutter/material.dart';

import '../../models/incident.dart';
import '../../services/trust_repository.dart';

class IncidentsTab extends StatefulWidget {
  const IncidentsTab({required this.email, super.key});

  final String email;

  @override
  State<IncidentsTab> createState() => _IncidentsTabState();
}

class _IncidentsTabState extends State<IncidentsTab> {
  static const List<String> _filters = ['Todas', 'Abiertas', 'En Proceso', 'Cerradas'];

  final TextEditingController _searchController = TextEditingController();
  String _selectedFilter = _filters.first;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final repository = TrustRepository();
    return FutureBuilder<List<Incident>>(
      future: repository.loadIncidents(widget.email),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(child: Text('Error cargando incidencias: ${snapshot.error}'));
        }

        final incidents = snapshot.data ?? [];
        final filteredIncidents = _applyFilters(incidents, _selectedFilter, _searchController.text);

        return Column(
          children: [
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(999),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Row(
                  children: [
                    const Icon(Icons.search, color: Color(0xFF6B7280)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                          hintText: 'Buscar incidencias...',
                          border: InputBorder.none,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.filter_list_rounded, color: Color(0xFF4B5563)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemBuilder: (context, index) {
                  final filter = _filters[index];
                  final selected = _selectedFilter == filter;
                  return ChoiceChip(
                    label: Text(filter),
                    selected: selected,
                    onSelected: (_) => setState(() => _selectedFilter = filter),
                    showCheckmark: false,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: selected ? Colors.transparent : const Color(0xFFE5E7EB)),
                    ),
                    selectedColor: const Color(0xFF111827),
                    backgroundColor: const Color(0xFFF3F4F6),
                    labelStyle: TextStyle(
                      color: selected ? Colors.white : const Color(0xFF374151),
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  );
                },
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemCount: _filters.length,
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: filteredIncidents.isEmpty
                  ? const Center(child: Text('Sin incidencias registradas.'))
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 120),
                      itemCount: filteredIncidents.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final incident = filteredIncidents[index];
                        final severity = _severityFor(incident.status);
                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFFF3F4F6)),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x14000000),
                                blurRadius: 6,
                                offset: Offset(0, 2),
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
                                        Text(
                                          'ID #INC-${incident.id.toString().padLeft(4, '0')}',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: Color(0xFF6B7280),
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: .4,
                                          ),
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          _titleCase(incident.type),
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFF111827),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  _SeverityBadge(severity: severity),
                                ],
                              ),
                              const SizedBox(height: 10),
                              _IncidentMetaRow(
                                icon: Icons.store_rounded,
                                text: incident.dispenser,
                              ),
                              const SizedBox(height: 4),
                              _IncidentMetaRow(
                                icon: Icons.schedule,
                                text: _friendlyDate(incident.createdAt),
                              ),
                              const SizedBox(height: 12),
                              const Divider(height: 1, color: Color(0xFFF3F4F6)),
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(
                                  onPressed: () {},
                                  style: TextButton.styleFrom(
                                    foregroundColor: const Color(0xFFFBC02D),
                                    textStyle: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  child: const Text('Ver detalles'),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }

  List<Incident> _applyFilters(List<Incident> incidents, String filter, String query) {
    final normalizedQuery = query.trim().toLowerCase();

    return incidents.where((incident) {
      final matchesFilter = switch (filter) {
        'Abiertas' => incident.status.toLowerCase().contains('open'),
        'En Proceso' => incident.status.toLowerCase().contains('progress'),
        'Cerradas' => incident.status.toLowerCase().contains('closed'),
        _ => true,
      };

      final matchesQuery = normalizedQuery.isEmpty ||
          incident.type.toLowerCase().contains(normalizedQuery) ||
          incident.dispenser.toLowerCase().contains(normalizedQuery) ||
          incident.id.toString().contains(normalizedQuery);

      return matchesFilter && matchesQuery;
    }).toList();
  }

  _IncidentSeverity _severityFor(String status) {
    final normalized = status.toLowerCase();
    if (normalized.contains('closed')) {
      return _IncidentSeverity.low;
    }
    if (normalized.contains('progress')) {
      return _IncidentSeverity.medium;
    }
    return _IncidentSeverity.critical;
  }

  static String _titleCase(String text) {
    if (text.isEmpty) {
      return text;
    }
    return text
        .split(RegExp(r'[\s_-]+'))
        .where((word) => word.isNotEmpty)
        .map((word) => '${word[0].toUpperCase()}${word.substring(1).toLowerCase()}')
        .join(' ');
  }

  static String _friendlyDate(String date) {
    final parsed = DateTime.tryParse(date);
    if (parsed == null) {
      return date.isEmpty ? 'Sin fecha' : date;
    }

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final value = DateTime(parsed.year, parsed.month, parsed.day);

    final time = TimeOfDay.fromDateTime(parsed);
    final suffix = time.period == DayPeriod.am ? 'AM' : 'PM';
    final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
    final minutes = time.minute.toString().padLeft(2, '0');
    final formattedTime = '$hour:$minutes $suffix';

    if (value == today) {
      return 'Hoy, $formattedTime';
    }
    if (value == yesterday) {
      return 'Ayer, $formattedTime';
    }

    const months = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    return '${parsed.day} ${months[parsed.month - 1]}, $formattedTime';
  }
}

enum _IncidentSeverity { critical, medium, low }

class _SeverityBadge extends StatelessWidget {
  const _SeverityBadge({required this.severity});

  final _IncidentSeverity severity;

  @override
  Widget build(BuildContext context) {
    final (label, background, foreground) = switch (severity) {
      _IncidentSeverity.critical => ('Crítica', const Color(0xFFFFDAD6), const Color(0xFF410002)),
      _IncidentSeverity.medium => ('Media', const Color(0xFFFFF8E1), const Color(0xFFFF8F00)),
      _IncidentSeverity.low => ('Baja', const Color(0xFFF3F4F6), const Color(0xFF4B5563)),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _IncidentMetaRow extends StatelessWidget {
  const _IncidentMetaRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: const Color(0xFF9CA3AF), size: 18),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF4B5563),
            ),
          ),
        ),
      ],
    );
  }
}
