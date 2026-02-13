import 'dart:async';

import 'package:flutter/material.dart';
import '../../models/incident.dart';
import '../../models/user_role.dart';
import '../../services/trust_repository.dart';
import '../incidents/incident_detail_screen.dart';
import '../incidents/new_incident_screen.dart';

class IncidentsTab extends StatefulWidget {
  const IncidentsTab({required this.email, required this.role, super.key});

  final String email;
  final UserRole role;

  @override
  State<IncidentsTab> createState() => _IncidentsTabState();
}

class _IncidentsTabState extends State<IncidentsTab> {
  static const Duration _refreshInterval = Duration(seconds: 10);

  final TextEditingController _searchController = TextEditingController();
  final TrustRepository _repository = TrustRepository();

  Timer? _refreshTimer;
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

    final filteredIncidents = _applyFilters(_incidents, _searchController.text);

    return Stack(
      children: [
        Column(
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
                  ],
                ),
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
                              Text(
                                'ID #INC-${incident.id.toString().padLeft(4, '0')}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF6B7280),
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: .4,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(incident.client, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Color(0xFF111827))),
                              const SizedBox(height: 10),
                              _IncidentMetaRow(icon: Icons.store_rounded, text: 'Sucursal: ${incident.branch}'),
                              const SizedBox(height: 4),
                              _IncidentMetaRow(icon: Icons.map_outlined, text: 'Área: ${incident.area}'),
                              const SizedBox(height: 4),
                              _IncidentMetaRow(icon: Icons.water_drop_outlined, text: 'Dosificador: ${incident.dispenser}'),
                              const SizedBox(height: 4),
                              _IncidentMetaRow(icon: Icons.schedule, text: 'Creación: ${_friendlyDate(incident.createdAt)}'),
                              const SizedBox(height: 12),
                              const Divider(height: 1, color: Color(0xFFF3F4F6)),
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(
                                  onPressed: () => Navigator.of(context).push(
                                    MaterialPageRoute<void>(
                                      builder: (_) => IncidentDetailScreen(
                                        email: widget.email,
                                        incidentId: incident.id,
                                      ),
                                    ),
                                  ),
                                  style: TextButton.styleFrom(foregroundColor: const Color(0xFFFBC02D), textStyle: const TextStyle(fontWeight: FontWeight.w700)),
                                  child: const Text('Ver detalle'),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
        if (widget.role.canCreateIncidents)
          Positioned(
            right: 20,
            bottom: 20,
            child: FloatingActionButton(
              heroTag: 'incidents-create-fab',
              backgroundColor: const Color(0xFFFBC02D),
              foregroundColor: Colors.black,
              onPressed: _openNewIncidentFlow,
              child: const Icon(Icons.add),
            ),
          ),
      ],
    );
  }

  Future<void> _openNewIncidentFlow() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => NewIncidentScreen(email: widget.email),
      ),
    );

    if (created == true) {
      await _refreshIncidents(showLoader: true);
    }
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

  List<Incident> _applyFilters(List<Incident> incidents, String query) {
    final normalizedQuery = query.trim().toLowerCase();

    return incidents.where((incident) {
      final matchesQuery = normalizedQuery.isEmpty ||
          incident.client.toLowerCase().contains(normalizedQuery) ||
          incident.branch.toLowerCase().contains(normalizedQuery) ||
          incident.area.toLowerCase().contains(normalizedQuery) ||
          incident.dispenser.toLowerCase().contains(normalizedQuery) ||
          incident.id.toString().contains(normalizedQuery);

      return matchesQuery;
    }).toList();
  }

  static String _friendlyDate(String raw) {
    final date = DateTime.tryParse(raw)?.toLocal();
    if (date == null) return raw;

    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
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
