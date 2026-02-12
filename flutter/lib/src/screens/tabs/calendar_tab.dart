import 'package:flutter/material.dart';

import '../../models/user_role.dart';
import '../../models/visit.dart';
import '../../services/trust_repository.dart';
import '../../theme/app_colors.dart';
import '../../widgets/visit_summary_card.dart';

class CalendarTab extends StatefulWidget {
  const CalendarTab({required this.email, required this.role, super.key});

  final String email;
  final UserRole role;

  @override
  State<CalendarTab> createState() => _CalendarTabState();
}

class _CalendarTabState extends State<CalendarTab> {
  static const Color _primary = AppColors.yellow;
  static const Color _surfaceVariant = AppColors.gray100;
  static const Color _outline = AppColors.gray300;

  final TrustRepository _repository = TrustRepository();

  late DateTime _currentMonth;
  DateTime? _selectedDate;
  late Future<List<Visit>> _visitsFuture;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _currentMonth = DateTime(now.year, now.month);
    _selectedDate = DateTime(now.year, now.month, now.day);
    _visitsFuture = _repository.loadVisitsByMonth(widget.email, _currentMonth);
  }

  @override
  Widget build(BuildContext context) {
    final backgroundColor = Theme.of(context).scaffoldBackgroundColor;

    return Container(
      color: backgroundColor,
      child: FutureBuilder<List<Visit>>(
        future: _visitsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text('No se pudo cargar el calendario: ${snapshot.error}'),
              ),
            );
          }

          final visits = snapshot.data ?? const <Visit>[];
          final visitsByDay = _groupVisitsByDay(visits);
          final selectedDate = _resolveSelectedDate(visitsByDay);
          final dayVisits = visitsByDay[_dateKey(selectedDate)] ?? const <Visit>[];

          return SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildCalendarCard(visitsByDay, selectedDate),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Actividades del día ${selectedDate.day}',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF111827),
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${dayVisits.length} Eventos',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF6B7280),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                if (dayVisits.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9FAFB),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'No hay visitas programadas para este día.',
                      style: TextStyle(color: Color(0xFF4B5563)),
                    ),
                  )
                else
                  ...dayVisits.map(
                    (visit) => Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _ActivityCard(visit: visit, role: widget.role, email: widget.email, onVisitCompleted: _refreshVisits),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildCalendarCard(Map<String, List<Visit>> visitsByDay, DateTime selectedDate) {
    const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    final firstDayOfMonth = DateTime(_currentMonth.year, _currentMonth.month, 1);
    final leadingSlots = firstDayOfMonth.weekday - 1;
    final daysInMonth = DateTime(_currentMonth.year, _currentMonth.month + 1, 0).day;
    final totalGridItems = ((leadingSlots + daysInMonth + 6) ~/ 7) * 7;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _surfaceVariant.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: _outline.withValues(alpha: 0.5)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              _calendarButton(
                Icons.chevron_left_rounded,
                onTap: () => _changeMonth(-1),
              ),
              Expanded(
                child: Center(
                  child: Text(
                    '${_monthName(_currentMonth.month)} ${_currentMonth.year}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF111827),
                    ),
                  ),
                ),
              ),
              _calendarButton(
                Icons.chevron_right_rounded,
                onTap: () => _changeMonth(1),
              ),
            ],
          ),
          const SizedBox(height: 14),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: weekDays.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisSpacing: 4,
              crossAxisSpacing: 4,
              childAspectRatio: 1.7,
            ),
            itemBuilder: (_, index) {
              return Center(
                child: Text(
                  weekDays[index],
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.6,
                    color: Color(0xFF9CA3AF),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 6),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: totalGridItems,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisSpacing: 6,
              crossAxisSpacing: 6,
            ),
            itemBuilder: (_, index) {
              if (index < leadingSlots || index >= leadingSlots + daysInMonth) {
                return const SizedBox.shrink();
              }

              final day = index - leadingSlots + 1;
              final date = DateTime(_currentMonth.year, _currentMonth.month, day);
              final key = _dateKey(date);
              final hasVisits = (visitsByDay[key] ?? const <Visit>[]).isNotEmpty;
              return _dayChip(
                text: '$day',
                selected: _isSameDate(date, selectedDate),
                hasVisits: hasVisits,
                onTap: () => setState(() => _selectedDate = date),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _calendarButton(IconData icon, {required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        height: 34,
        width: 34,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.55),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 20, color: const Color(0xFF4B5563)),
      ),
    );
  }

  Widget _dayChip({
    required String text,
    required bool selected,
    required bool hasVisits,
    required VoidCallback onTap,
  }) {
    final baseTextColor = hasVisits ? const Color(0xFF111827) : const Color(0xFF6B7280);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? _primary : Colors.white.withValues(alpha: 0.6),
          shape: BoxShape.circle,
          border: hasVisits && !selected
              ? Border.all(color: const Color(0xFFF59E0B), width: 1.2)
              : null,
        ),
        child: Text(
          text,
          style: TextStyle(
            color: selected ? Colors.white : baseTextColor,
            fontSize: 14,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
      ),
    );
  }


  void _refreshVisits() {
    setState(() {
      _visitsFuture = _repository.loadVisitsByMonth(widget.email, _currentMonth);
    });
  }

  void _changeMonth(int delta) {
    final next = DateTime(_currentMonth.year, _currentMonth.month + delta);
    setState(() {
      _currentMonth = DateTime(next.year, next.month);
      _selectedDate = DateTime(_currentMonth.year, _currentMonth.month, 1);
      _visitsFuture = _repository.loadVisitsByMonth(widget.email, _currentMonth);
    });
  }

  DateTime _resolveSelectedDate(Map<String, List<Visit>> visitsByDay) {
    if (_selectedDate != null && _selectedDate!.year == _currentMonth.year && _selectedDate!.month == _currentMonth.month) {
      return _selectedDate!;
    }

    if (visitsByDay.isNotEmpty) {
      final earliest = visitsByDay.keys.toList()..sort();
      final day = DateTime.tryParse(earliest.first);
      if (day != null) {
        _selectedDate = day;
        return day;
      }
    }

    final fallback = DateTime(_currentMonth.year, _currentMonth.month, 1);
    _selectedDate = fallback;
    return fallback;
  }

  Map<String, List<Visit>> _groupVisitsByDay(List<Visit> visits) {
    final grouped = <String, List<Visit>>{};
    for (final visit in visits) {
      final parsed = DateTime.tryParse(visit.visitedAt);
      if (parsed == null) {
        continue;
      }
      final localDate = parsed.toLocal();
      final key = _dateKey(localDate);
      grouped.putIfAbsent(key, () => []).add(visit);
    }

    for (final entry in grouped.entries) {
      entry.value.sort((a, b) => a.visitedAt.compareTo(b.visitedAt));
    }
    return grouped;
  }

  bool _isSameDate(DateTime first, DateTime second) {
    return first.year == second.year && first.month == second.month && first.day == second.day;
  }

  String _dateKey(DateTime date) {
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '${date.year}-$month-$day';
  }

  String _monthName(int month) {
    const monthNames = [
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
    return monthNames[month - 1];
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({
    required this.visit,
    required this.role,
    required this.email,
    required this.onVisitCompleted,
  });

  final Visit visit;
  final UserRole role;
  final String email;
  final VoidCallback onVisitCompleted;

  @override
  Widget build(BuildContext context) {
    return VisitSummaryCard(
      visit: visit,
      role: role,
      email: email,
      onVisitCompleted: onVisitCompleted,
    );
  }
}
