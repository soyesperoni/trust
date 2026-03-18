import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/user_role.dart';
import '../../models/visit.dart';
import '../../models/audit.dart';
import '../../services/trust_repository.dart';
import '../../theme/app_colors.dart';
import '../../widgets/visit_summary_card.dart';
import '../../widgets/audit_summary_card.dart';

class VisitsTab extends StatefulWidget {
  const VisitsTab({required this.email, required this.role, super.key});

  final String email;
  final UserRole role;

  @override
  State<VisitsTab> createState() => _VisitsTabState();
}

class _VisitsTabState extends State<VisitsTab> {
  final TrustRepository _repository = TrustRepository();
  final TextEditingController _searchController = TextEditingController();
  static const Duration _refreshInterval = Duration(seconds: 1);

  Timer? _refreshTimer;
  _VisitFilter _selectedFilter = _VisitFilter.all;
  _HistoryTypeFilter _selectedTypeFilter = _HistoryTypeFilter.all;
  List<Visit> _visits = const [];
  List<Audit> _audits = const [];
  Object? _error;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _refreshVisits(showLoader: true);
    _refreshTimer = Timer.periodic(_refreshInterval, (_) => _refreshVisits());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _visits.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null && _visits.isEmpty) {
      return Center(child: Text('Error cargando visitas: $_error'));
    }

    if (_visits.isEmpty && _audits.isEmpty) {
      return const Center(child: Text('Sin visitas ni auditorías registradas.'));
    }

    final filteredVisits = _applyFilters(_visits);
    final filteredAudits = _applyAuditFilters(_audits);

    return Column(
      children: [
        _HistoryHeader(
          searchController: _searchController,
          selectedFilter: _selectedFilter,
          selectedTypeFilter: _selectedTypeFilter,
          onFilterChanged: (filter) => setState(() => _selectedFilter = filter),
          onTypeFilterChanged: (filter) => setState(() => _selectedTypeFilter = filter),
          onSearchChanged: (_) => setState(() {}),
          onResetSearch: () {
            _searchController.clear();
            setState(() {});
          },
        ),
        Expanded(
          child: filteredVisits.isEmpty && filteredAudits.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24),
                    child: Text(
                      'No hay visitas ni auditorías que coincidan con los filtros aplicados.',
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                  children: [
                    if (_selectedTypeFilter != _HistoryTypeFilter.audits && filteredVisits.isNotEmpty) ...[
                      const Padding(
                        padding: EdgeInsets.only(bottom: 8),
                        child: Text('Visitas', style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                      ...filteredVisits.map((visit) => Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: VisitSummaryCard(
                              visit: visit,
                              role: widget.role,
                              email: widget.email,
                            ),
                          )),
                    ],
                    if (_selectedTypeFilter != _HistoryTypeFilter.visits && filteredAudits.isNotEmpty) ...[
                      const Padding(
                        padding: EdgeInsets.only(bottom: 8),
                        child: Text('Auditorías', style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                      ...filteredAudits.map((audit) => Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: AuditSummaryCard(audit: audit, role: widget.role, email: widget.email),
                          )),
                    ],
                  ],
                ),
        ),
      ],
    );
  }

  Future<void> _refreshVisits({bool showLoader = false}) async {
    if (showLoader && mounted) {
      setState(() => _isLoading = true);
    }

    try {
      final responses = await Future.wait([
        _repository.loadVisits(widget.email),
        _repository.loadAudits(widget.email),
      ]);
      final visits = responses[0] as List<Visit>;
      final audits = responses[1] as List<Audit>;
      if (!mounted) {
        return;
      }
      setState(() {
        _visits = visits;
        _audits = audits;
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

  List<Visit> _applyFilters(List<Visit> visits) {
    if (_selectedTypeFilter == _HistoryTypeFilter.audits) {
      return const [];
    }
    final normalizedQuery = _searchController.text.trim().toLowerCase();

    return visits.where((visit) {
      final matchesStatus = switch (_selectedFilter) {
        _VisitFilter.all => true,
        _VisitFilter.scheduled => _isScheduled(visit.status),
        _VisitFilter.completed => _isCompleted(visit.status),
      };

      if (!matchesStatus) {
        return false;
      }

      if (normalizedQuery.isEmpty) {
        return true;
      }

      final searchableFields = [
        visit.client,
        visit.branch,
        visit.area,
      ].map((value) => value.toLowerCase());

      return searchableFields.any((field) => field.contains(normalizedQuery));
    }).toList();
  }

  List<Audit> _applyAuditFilters(List<Audit> audits) {
    if (_selectedTypeFilter == _HistoryTypeFilter.visits) {
      return const [];
    }
    final normalizedQuery = _searchController.text.trim().toLowerCase();

    return audits.where((audit) {
      final matchesStatus = switch (_selectedFilter) {
        _VisitFilter.all => true,
        _VisitFilter.scheduled => _isScheduled(audit.status),
        _VisitFilter.completed => _isCompleted(audit.status),
      };

      if (!matchesStatus) {
        return false;
      }

      if (normalizedQuery.isEmpty) {
        return true;
      }

      final searchableFields = [audit.client, audit.branch, audit.area, audit.formName].map((value) => value.toLowerCase());
      return searchableFields.any((field) => field.contains(normalizedQuery));
    }).toList();
  }

  bool _isScheduled(String status) {
    final value = _normalizeStatus(status);
    return value.contains('scheduled') || value.contains('programad') || value.contains('pend');
  }

  bool _isCompleted(String status) {
    final value = _normalizeStatus(status);
    return value.contains('completed') || value.contains('complet') || value.contains('finaliz');
  }

  String _normalizeStatus(String status) {
    return status.trim().toLowerCase();
  }
}

class _HistoryHeader extends StatelessWidget {
  const _HistoryHeader({
    required this.searchController,
    required this.selectedFilter,
    required this.selectedTypeFilter,
    required this.onFilterChanged,
    required this.onTypeFilterChanged,
    required this.onSearchChanged,
    required this.onResetSearch,
  });

  final TextEditingController searchController;
  final _VisitFilter selectedFilter;
  final _HistoryTypeFilter selectedTypeFilter;
  final ValueChanged<_VisitFilter> onFilterChanged;
  final ValueChanged<_HistoryTypeFilter> onTypeFilterChanged;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onResetSearch;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: searchController,
                  onChanged: onSearchChanged,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'Buscar por cliente, sucursal o área...',
                    hintStyle: TextStyle(
                      color: Theme.of(context).brightness == Brightness.dark ? AppColors.darkMuted : AppColors.gray500,
                      fontSize: 15,
                    ),
                    prefixIcon: Icon(
                      Icons.search,
                      color: Theme.of(context).brightness == Brightness.dark ? AppColors.darkMuted : AppColors.gray500,
                    ),
                    filled: true,
                    fillColor: Theme.of(context).brightness == Brightness.dark ? AppColors.darkCard : AppColors.gray100,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(999),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              IconButton.filledTonal(
                onPressed: onResetSearch,
                icon: const Icon(Icons.restart_alt_rounded),
                tooltip: 'Restaurar búsqueda',
                style: IconButton.styleFrom(
                  backgroundColor: Theme.of(context).brightness == Brightness.dark ? AppColors.darkCard : AppColors.gray100,
                  foregroundColor: Theme.of(context).brightness == Brightness.dark ? AppColors.darkMuted : AppColors.gray700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: _HistoryTypeFilter.values
                .map(
                  (filter) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(filter.label),
                      selected: selectedTypeFilter == filter,
                      showCheckmark: false,
                      selectedColor: Theme.of(context).brightness == Brightness.dark ? AppColors.yellow : AppColors.black,
                      backgroundColor: Theme.of(context).brightness == Brightness.dark ? AppColors.darkCard : Colors.white,
                      side: BorderSide(
                        color: selectedTypeFilter == filter
                            ? (Theme.of(context).brightness == Brightness.dark ? AppColors.yellow : AppColors.black)
                            : (Theme.of(context).brightness == Brightness.dark ? AppColors.darkCardBorder : AppColors.gray300),
                      ),
                      labelStyle: TextStyle(
                        color: selectedTypeFilter == filter
                            ? (Theme.of(context).brightness == Brightness.dark ? AppColors.black : Colors.white)
                            : (Theme.of(context).brightness == Brightness.dark ? AppColors.darkMuted : AppColors.gray700),
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                      onSelected: (_) => onTypeFilterChanged(filter),
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 10),
          Row(
            children: _VisitFilter.values
                .map(
                  (filter) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(filter.label),
                      selected: selectedFilter == filter,
                      showCheckmark: false,
                      selectedColor: Theme.of(context).brightness == Brightness.dark ? AppColors.yellow : AppColors.black,
                      backgroundColor: Theme.of(context).brightness == Brightness.dark ? AppColors.darkCard : Colors.white,
                      side: BorderSide(
                        color: selectedFilter == filter
                            ? (Theme.of(context).brightness == Brightness.dark ? AppColors.yellow : AppColors.black)
                            : (Theme.of(context).brightness == Brightness.dark ? AppColors.darkCardBorder : AppColors.gray300),
                      ),
                      labelStyle: TextStyle(
                        color: selectedFilter == filter
                            ? (Theme.of(context).brightness == Brightness.dark ? AppColors.black : Colors.white)
                            : (Theme.of(context).brightness == Brightness.dark ? AppColors.darkMuted : AppColors.gray700),
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                      onSelected: (_) => onFilterChanged(filter),
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}

enum _VisitFilter {
  all('Todas'),
  scheduled('Programadas'),
  completed('Finalizadas');

  const _VisitFilter(this.label);
  final String label;
}

enum _HistoryTypeFilter {
  all('Todo'),
  visits('Visitas'),
  audits('Auditorías');

  const _HistoryTypeFilter(this.label);
  final String label;
}
