import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/audit.dart';
import '../../models/dashboard_stats.dart';
import '../../models/user_role.dart';
import '../../services/trust_repository.dart';
import '../../theme/app_colors.dart';
import '../audits/start_audit_screen.dart';

enum _ScoreRange { month, week, last6Days }

class DashboardTab extends StatefulWidget {
  const DashboardTab({
    required this.email,
    required this.role,
    super.key,
  });

  final String email;
  final UserRole role;

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  final TrustRepository _repository = TrustRepository();
  static const Duration _refreshInterval = Duration(seconds: 20);

  Timer? _refreshTimer;
  _DashboardPayload? _payload;
  Object? _error;
  bool _isLoading = true;
  _ScoreRange _scoreRange = _ScoreRange.last6Days;

  @override
  void initState() {
    super.initState();
    _refreshData(showLoader: true);
    _refreshTimer = Timer.periodic(_refreshInterval, (_) => _refreshData());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _payload == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_payload == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text('No se pudo cargar el dashboard: $_error'),
        ),
      );
    }

    final payload = _payload!;
    final trendItems = _buildTrendItems(payload.dailyAuditScoreHistory);

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? AppColors.darkBackground
            : AppColors.gray50,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
        child: Column(
          children: [
            _ComplianceHeroCard(payload: payload),
            const SizedBox(height: 12),
            _RiskOverviewGrid(payload: payload),
            const SizedBox(height: 12),
            _TrendCard(
              selectedRange: _scoreRange,
              items: trendItems,
              onChanged: (value) => setState(() => _scoreRange = value),
            ),
            const SizedBox(height: 14),
            SizedBox(
              height: 66,
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: widget.role.isInspector ? _openStartAuditFlow : null,
                icon: const Icon(Icons.play_arrow_rounded),
                label: const Text('Iniciar Auditoría'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor:
                      Theme.of(context).brightness == Brightness.dark
                          ? AppColors.darkCard
                          : const Color(0xFFE5E7EB),
                  disabledForegroundColor:
                      Theme.of(context).brightness == Brightness.dark
                          ? AppColors.darkMuted
                          : const Color(0xFF6B7280),
                  textStyle: const TextStyle(fontWeight: FontWeight.w700),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openStartAuditFlow() async {
    final started = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => StartAuditScreen(email: widget.email),
      ),
    );

    if (started == true) {
      await _refreshData(showLoader: true);
    }
  }

  Future<void> _refreshData({bool showLoader = false}) async {
    if (showLoader && mounted) {
      setState(() => _isLoading = true);
    }

    try {
      final payload = await _loadPayload();
      if (!mounted) {
        return;
      }
      setState(() {
        _payload = payload;
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

  Future<_DashboardPayload> _loadPayload() async {
    final results = await Future.wait<dynamic>([
      _repository.loadDashboardSummary(widget.email),
      _repository.loadAudits(widget.email),
    ]);

    final summary = results[0] as DashboardSummary;
    final audits = results[1] as List<Audit>;

    return _DashboardPayload(
      stats: summary.stats,
      totalAudits: audits.length,
      pendingAudits: _countPendingAudits(audits),
      dailyAuditScoreHistory: summary.dailyAuditScoreHistory,
    );
  }

  int _countPendingAudits(List<Audit> audits) {
    return audits.where((audit) => audit.status.toLowerCase() == 'scheduled').length;
  }

  List<_TrendChartItem> _buildTrendItems(List<DailyAuditScore> history) {
    final sanitized = history
        .where((entry) => entry.date.millisecondsSinceEpoch > 0)
        .map(
          (entry) => _DayScore(
            date: DateTime(entry.date.year, entry.date.month, entry.date.day),
            score: entry.score <= 1
                ? (entry.score * 100).round().clamp(0, 100)
                : entry.score.round().clamp(0, 100),
          ),
        )
        .toList(growable: false)
      ..sort((a, b) => a.date.compareTo(b.date));

    switch (_scoreRange) {
      case _ScoreRange.month:
        return _buildMonthTrend(sanitized);
      case _ScoreRange.week:
        return _buildWeekTrend(sanitized);
      case _ScoreRange.last6Days:
        return _buildLastDaysTrend(sanitized, 6);
    }
  }

  List<_TrendChartItem> _buildMonthTrend(List<_DayScore> items) {
    final grouped = <String, List<int>>{};
    for (final item in items) {
      final key = '${item.date.year}-${item.date.month}';
      grouped.putIfAbsent(key, () => <int>[]).add(item.score);
    }

    final now = DateTime.now();
    return List.generate(6, (index) {
      final offset = 5 - index;
      final monthDate = DateTime(now.year, now.month - offset, 1);
      final key = '${monthDate.year}-${monthDate.month}';
      final scores = grouped[key] ?? const <int>[];
      final score = scores.isEmpty
          ? 0
          : (scores.reduce((a, b) => a + b) / scores.length).round();
      return _TrendChartItem(
        label: '${_monthLabel(monthDate.month)} ${monthDate.year.toString().substring(2)}',
        score: score,
      );
    });
  }

  List<_TrendChartItem> _buildWeekTrend(List<_DayScore> items) {
    final grouped = <DateTime, List<int>>{};
    for (final item in items) {
      final startOfWeek = item.date.subtract(Duration(days: item.date.weekday % 7));
      final key = DateTime(startOfWeek.year, startOfWeek.month, startOfWeek.day);
      grouped.putIfAbsent(key, () => <int>[]).add(item.score);
    }

    final now = DateTime.now();
    final currentWeekStart = DateTime(now.year, now.month, now.day)
        .subtract(Duration(days: now.weekday % 7));

    return List.generate(6, (index) {
      final offset = 5 - index;
      final weekStart = currentWeekStart.subtract(Duration(days: offset * 7));
      final scores = grouped[weekStart] ?? const <int>[];
      final score = scores.isEmpty
          ? 0
          : (scores.reduce((a, b) => a + b) / scores.length).round();
      return _TrendChartItem(
        label: '${weekStart.day.toString().padLeft(2, '0')} ${_monthLabel(weekStart.month)}',
        score: score,
      );
    });
  }

  List<_TrendChartItem> _buildLastDaysTrend(List<_DayScore> items, int count) {
    final byDate = <DateTime, int>{for (final item in items) item.date: item.score};
    final today = DateTime.now();
    final start = DateTime(today.year, today.month, today.day - (count - 1));

    var rollingScore = 0;
    return List.generate(count, (index) {
      final date = DateTime(start.year, start.month, start.day + index);
      if (byDate.containsKey(date)) {
        rollingScore = byDate[date]!;
      }
      return _TrendChartItem(
        label: '${date.day.toString().padLeft(2, '0')} ${_monthLabel(date.month)}',
        score: rollingScore,
      );
    });
  }

  String _monthLabel(int month) {
    const labels = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return labels[(month - 1).clamp(0, 11)];
  }
}

class _DashboardPayload {
  const _DashboardPayload({
    required this.stats,
    required this.totalAudits,
    required this.pendingAudits,
    required this.dailyAuditScoreHistory,
  });

  final DashboardStats stats;
  final int totalAudits;
  final int pendingAudits;
  final List<DailyAuditScore> dailyAuditScoreHistory;
}

class _ComplianceHeroCard extends StatelessWidget {
  const _ComplianceHeroCard({required this.payload});

  final _DashboardPayload payload;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final score = payload.stats.complianceScore.round().clamp(0, 100);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark ? AppColors.darkCardBorder : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Score de cumplimiento',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isDark ? AppColors.darkMuted : const Color(0xFF334155),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$score%',
                style: TextStyle(
                  fontSize: 54,
                  fontWeight: FontWeight.w900,
                  height: 0.95,
                  color: isDark ? Colors.white : AppColors.primaryDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              minHeight: 10,
              value: score / 100,
              backgroundColor: isDark ? AppColors.darkSurface : AppColors.gray100,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.secondary),
            ),
          ),
        ],
      ),
    );
  }
}

class _RiskOverviewGrid extends StatelessWidget {
  const _RiskOverviewGrid({required this.payload});

  final _DashboardPayload payload;

  @override
  Widget build(BuildContext context) {
    final items = [
      _MetricData('Visitas programadas', payload.stats.pendingVisits),
      _MetricData('Auditorías pendientes', payload.stats.scheduledAudits),
      _MetricData('Visitas vencidas', payload.stats.overdueVisits),
      _MetricData('Auditorías vencidas', payload.stats.overdueAudits),
      _MetricData('Incidencias activas', payload.stats.incidents),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final spacing = 10.0;
        final firstRowWidth = (constraints.maxWidth - (spacing * 2)) / 3;
        final secondRowWidth = (constraints.maxWidth - spacing) / 2;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: List.generate(items.length, (index) {
            final width = index < 3 ? firstRowWidth : secondRowWidth;
            return SizedBox(width: width, child: _MetricCard(data: items[index]));
          }),
        );
      },
    );
  }
}

class _MetricData {
  const _MetricData(this.title, this.value);

  final String title;
  final int value;
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.data});

  final _MetricData data;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.darkCardBorder : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '${data.value}',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              height: 1,
              color: isDark ? Colors.white : AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            data.title,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isDark ? AppColors.darkMuted : const Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }
}

class _TrendCard extends StatelessWidget {
  const _TrendCard({
    required this.selectedRange,
    required this.items,
    required this.onChanged,
  });

  final _ScoreRange selectedRange;
  final List<_TrendChartItem> items;
  final ValueChanged<_ScoreRange> onChanged;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: isDark ? AppColors.darkCardBorder : const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Tendencia diaria de cumplimiento',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _RangeButton(
                label: '6 meses',
                selected: selectedRange == _ScoreRange.month,
                onTap: () => onChanged(_ScoreRange.month),
              ),
              _RangeButton(
                label: '6 semanas',
                selected: selectedRange == _ScoreRange.week,
                onTap: () => onChanged(_ScoreRange.week),
              ),
              _RangeButton(
                label: '6 días',
                selected: selectedRange == _ScoreRange.last6Days,
                onTap: () => onChanged(_ScoreRange.last6Days),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 170,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: items
                  .map(
                    (item) => Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text('${item.score}% ', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 4),
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 650),
                              curve: Curves.easeOutCubic,
                              height: (item.score <= 1 ? 2 : item.score) * 1.15,
                              width: 22,
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(999),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              item.label,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: isDark ? AppColors.darkMuted : const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                  .toList(growable: false),
            ),
          ),
        ],
      ),
    );
  }
}

class _RangeButton extends StatelessWidget {
  const _RangeButton({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          color: selected ? AppColors.primary : const Color(0xFFE2E8F0),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: selected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }
}

class _DayScore {
  const _DayScore({required this.date, required this.score});

  final DateTime date;
  final int score;
}

class _TrendChartItem {
  const _TrendChartItem({required this.label, required this.score});

  final String label;
  final int score;
}
