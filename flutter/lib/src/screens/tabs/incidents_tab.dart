import 'dart:async';

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
  static const Duration _refreshInterval = Duration(seconds: 1);

  final TextEditingController _searchController = TextEditingController();
  final TrustRepository _repository = TrustRepository();

  Timer? _refreshTimer;
  String _selectedFilter = _filters.first;
  List<Incident> _incidents = const [];
  Object? _error;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _refreshIncidents(showLoader: true);
    _refreshTimer = Timer.periodic(_refreshInterval, (_) => _refreshIncidents());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _incidents.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null && _incidents.isEmpty) {
      return Center(child: Text('Error cargando incidencias: $_error'));
    }

    final filteredIncidents = _applyFilters(_incidents, _selectedFilter, _searchController.text);

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
  }

  Future<void> _refreshIncidents({bool showLoader = false}) async {
    if (showLoader && mounted) {
      setState(() => _isLoading = true);
    }

    try {
      final incidents = await _repository.loadIncidents(widget.email);
      if (!mounted) {
        return;
      }
      setState(() {
        _incidents = incidents;
        _error = null;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error;
        _isLoading = false;
      });
    }
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

  static String _friendlyDate(String raw) {
    final date = DateTime.tryParse(raw)?.toLocal();
    if (date == null) {
      return raw;
    }

    final monthNames = [
      'ene',
      'feb',
      'mar',
      'abr',
      'may',
      'jun',
      'jul',
      'ago',
      'sep',
      'oct',
      'nov',
      'dic',
    ];

    final month = monthNames[date.month - 1];
    final day = date.day.toString().padLeft(2, '0');
    final hour = date.hour.toString().padLeft(2, '0');
    final minute = date.minute.toString().padLeft(2, '0');

    return '$day $month ${date.year} • $hour:$minute';
  }
}

enum _IncidentSeverity { critical, medium, low }

class _SeverityBadge extends StatelessWidget {
  const _SeverityBadge({required this.severity});

  final _IncidentSeverity severity;

  @override
  Widget build(BuildContext context) {
    final (label, bg, fg) = switch (severity) {
      _IncidentSeverity.critical => ('Alta', const Color(0xFFFEE2E2), const Color(0xFFB91C1C)),
      _IncidentSeverity.medium => ('Media', const Color(0xFFFEF3C7), const Color(0xFF92400E)),
      _IncidentSeverity.low => ('Baja', const Color(0xFFDCFCE7), const Color(0xFF166534)),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontSize: 11,
          fontWeight: FontWeight.w700,
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
        Icon(icon, size: 16, color: const Color(0xFF9CA3AF)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              color: Color(0xFF4B5563),
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}
