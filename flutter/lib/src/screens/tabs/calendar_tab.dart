import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/audit.dart';
import '../../models/user_role.dart';
import '../../models/visit.dart';
import '../../services/trust_repository.dart';
import '../../theme/app_colors.dart';
import '../../widgets/audit_summary_card.dart';
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
  static const Duration _refreshInterval = Duration(seconds: 1);

  Timer? _refreshTimer;
  List<Visit> _visits = const <Visit>[];
  List<Audit> _audits = const <Audit>[];
  Object? _error;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _currentMonth = DateTime(now.year, now.month);
    _selectedDate = DateTime(now.year, now.month, now.day);
    _refreshCalendar(showLoader: true);
    _refreshTimer = Timer.periodic(_refreshInterval, (_) => _refreshCalendar());
  }


  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final backgroundColor = Theme.of(context).scaffoldBackgroundColor;

    return Container(
      color: backgroundColor,
      child: Builder(
        builder: (context) {
          if (_isLoading && _visits.isEmpty && _audits.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (_error != null && _visits.isEmpty && _audits.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text('No se pudo cargar el calendario: $_error'),
              ),
            );
          }

          final eventsByDay = _groupEventsByDay(_visits, _audits);
          final selectedDate = _resolveSelectedDate(eventsByDay);
          final dayEvents = eventsByDay[_dateKey(selectedDate)] ?? const <_CalendarEvent>[];

          return Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildCalendarCard(eventsByDay, selectedDate),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Actividades del día ${selectedDate.day}',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Theme.of(context).brightness == Brightness.dark ? AppColors.darkCard : const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${dayEvents.length} Eventos',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context).brightness == Brightness.dark ? AppColors.darkMuted : const Color(0xFF6B7280),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Expanded(
                  child: dayEvents.isEmpty
                      ? Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: Theme.of(context).brightness == Brightness.dark ? AppColors.darkCard : const Color(0xFFF9FAFB),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'No hay visitas o auditorías programadas para este día.',
                            style: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? AppColors.darkMuted : const Color(0xFF4B5563)),
                          ),
                        )
                      : ListView.builder(
                          itemCount: dayEvents.length,
                          itemBuilder: (context, index) {
                            final event = dayEvents[index];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 14),
                              child: _ActivityCard(
                                event: event,
                                role: widget.role,
                                email: widget.email,
                                onVisitCompleted: () => _refreshCalendar(),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildCalendarCard(Map<String, List<_CalendarEvent>> eventsByDay, DateTime selectedDate) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    final firstDayOfMonth = DateTime(_currentMonth.year, _currentMonth.month, 1);
    final leadingSlots = firstDayOfMonth.weekday - 1;
    final daysInMonth = DateTime(_currentMonth.year, _currentMonth.month + 1, 0).day;
    final totalGridItems = ((leadingSlots + daysInMonth + 6) ~/ 7) * 7;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : _surfaceVariant.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: isDark ? AppColors.darkCardBorder : _outline.withValues(alpha: 0.5)),
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
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF111827),
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
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.6,
                    color: isDark ? const Color(0xFF64748B) : const Color(0xFF9CA3AF),
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
              final hasVisits = (eventsByDay[key] ?? const <_CalendarEvent>[]).isNotEmpty;
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        height: 34,
        width: 34,
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : Colors.white.withValues(alpha: 0.55),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 20, color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF4B5563)),
      ),
    );
  }

  Widget _dayChip({
    required String text,
    required bool selected,
    required bool hasVisits,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseTextColor = hasVisits
        ? (isDark ? const Color(0xFFF8FAFC) : const Color(0xFF111827))
        : (isDark ? AppColors.darkMuted : const Color(0xFF6B7280));

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? _primary : (isDark ? AppColors.darkSurface : Colors.white.withValues(alpha: 0.6)),
          shape: BoxShape.circle,
          border: hasVisits && !selected
              ? Border.all(color: isDark ? const Color(0xFFFDE68A) : const Color(0xFFF59E0B), width: 1.2)
              : null,
        ),
        child: Text(
          text,
          style: TextStyle(
            color: selected ? AppColors.black : baseTextColor,
            fontSize: 14,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
      ),
    );
  }


  Future<void> _refreshCalendar({bool showLoader = false}) async {
    if (showLoader && mounted) {
      setState(() => _isLoading = true);
    }

    try {
      final results = await Future.wait<dynamic>([
        _repository.loadVisitsByMonth(widget.email, _currentMonth),
        _repository.loadAuditsByMonth(widget.email, _currentMonth),
      ]);
      final visits = results[0] as List<Visit>;
      final audits = results[1] as List<Audit>;
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

  void _changeMonth(int delta) {
    final next = DateTime(_currentMonth.year, _currentMonth.month + delta);
    setState(() {
      _currentMonth = DateTime(next.year, next.month);
      _selectedDate = DateTime(_currentMonth.year, _currentMonth.month, 1);
    });
    _refreshCalendar();
  }


  DateTime _resolveSelectedDate(Map<String, List<_CalendarEvent>> eventsByDay) {
    if (_selectedDate != null && _selectedDate!.year == _currentMonth.year && _selectedDate!.month == _currentMonth.month) {
      return _selectedDate!;
    }

    if (eventsByDay.isNotEmpty) {
      final earliest = eventsByDay.keys.toList()..sort();
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

  Map<String, List<_CalendarEvent>> _groupEventsByDay(List<Visit> visits, List<Audit> audits) {
    final grouped = <String, List<_CalendarEvent>>{};
    for (final visit in visits) {
      final parsed = DateTime.tryParse(visit.visitedAt);
      if (parsed == null) {
        continue;
      }
      final localDate = parsed.toLocal();
      final key = _dateKey(localDate);
      grouped.putIfAbsent(key, () => []).add(_CalendarEvent.fromVisit(visit, localDate));
    }

    for (final audit in audits) {
      if (!_isScheduledAudit(audit)) {
        continue;
      }
      final parsed = DateTime.tryParse(audit.auditedAt);
      if (parsed == null) {
        continue;
      }
      final localDate = parsed.toLocal();
      final key = _dateKey(localDate);
      grouped.putIfAbsent(key, () => []).add(_CalendarEvent.fromAudit(audit, localDate));
    }

    for (final entry in grouped.entries) {
      entry.value.sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
    }
    return grouped;
  }

  bool _isScheduledAudit(Audit audit) {
    final status = audit.status.toLowerCase().trim();
    return status == 'scheduled' || status == 'programada';
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
    required this.event,
    required this.role,
    required this.email,
    required this.onVisitCompleted,
  });

  final _CalendarEvent event;
  final UserRole role;
  final String email;
  final VoidCallback onVisitCompleted;

  @override
  Widget build(BuildContext context) {
    if (event.visit != null) {
      return VisitSummaryCard(
        visit: event.visit!,
        role: role,
        email: email,
        onVisitCompleted: onVisitCompleted,
      );
    }

    return AuditSummaryCard(
      audit: event.audit!,
      role: role,
      email: email,
    );
  }
}

class _CalendarEvent {
  const _CalendarEvent._({
    required this.scheduledAt,
    this.visit,
    this.audit,
  });

  factory _CalendarEvent.fromVisit(Visit visit, DateTime scheduledAt) {
    return _CalendarEvent._(visit: visit, scheduledAt: scheduledAt);
  }

  factory _CalendarEvent.fromAudit(Audit audit, DateTime scheduledAt) {
    return _CalendarEvent._(audit: audit, scheduledAt: scheduledAt);
  }

  final DateTime scheduledAt;
  final Visit? visit;
  final Audit? audit;
}
