import 'package:flutter/material.dart';

import '../../models/user_role.dart';
import '../../models/visit.dart';
import '../../services/trust_repository.dart';
import '../../theme/app_colors.dart';
import '../../widgets/visit_summary_card.dart';

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

  _VisitFilter _selectedFilter = _VisitFilter.all;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Visit>>(
      future: _repository.loadVisits(widget.email),
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

        final filteredVisits = _applyFilters(visits);

        return Column(
          children: [
            _HistoryHeader(
              searchController: _searchController,
              selectedFilter: _selectedFilter,
              onFilterChanged: (filter) => setState(() => _selectedFilter = filter),
              onSearchChanged: (_) => setState(() {}),
              onResetSearch: () {
                _searchController.clear();
                setState(() {});
              },
            ),
            Expanded(
              child: filteredVisits.isEmpty
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(horizontal: 24),
                        child: Text(
                          'No hay visitas que coincidan con los filtros aplicados.',
                          textAlign: TextAlign.center,
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                      itemCount: filteredVisits.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 14),
                      itemBuilder: (context, index) => VisitSummaryCard(
                        visit: filteredVisits[index],
                        role: widget.role,
                        email: widget.email,
                      ),
                    ),
            ),
          ],
        );
      },
    );
  }

  List<Visit> _applyFilters(List<Visit> visits) {
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

  bool _isScheduled(String status) {
    final value = status.toLowerCase();
    return value.contains('program') || value.contains('pend');
  }

  bool _isCompleted(String status) {
    final value = status.toLowerCase();
    return value.contains('complet') || value.contains('final');
  }
}

class _HistoryHeader extends StatelessWidget {
  const _HistoryHeader({
    required this.searchController,
    required this.selectedFilter,
    required this.onFilterChanged,
    required this.onSearchChanged,
    required this.onResetSearch,
  });

  final TextEditingController searchController;
  final _VisitFilter selectedFilter;
  final ValueChanged<_VisitFilter> onFilterChanged;
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
                    hintStyle: const TextStyle(color: AppColors.gray500, fontSize: 15),
                    prefixIcon: const Icon(Icons.search, color: AppColors.gray500),
                    filled: true,
                    fillColor: AppColors.gray100,
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
                  backgroundColor: AppColors.gray100,
                  foregroundColor: AppColors.gray700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: _VisitFilter.values
                .map(
                  (filter) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(filter.label),
                      selected: selectedFilter == filter,
                      showCheckmark: false,
                      selectedColor: AppColors.black,
                      backgroundColor: Colors.white,
                      side: BorderSide(
                        color: selectedFilter == filter ? AppColors.black : AppColors.gray300,
                      ),
                      labelStyle: TextStyle(
                        color: selectedFilter == filter ? Colors.white : AppColors.gray700,
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
