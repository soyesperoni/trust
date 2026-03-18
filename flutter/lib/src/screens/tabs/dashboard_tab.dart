import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/dashboard_stats.dart';
import '../../models/user_role.dart';
import '../../models/visit.dart';
import '../../models/audit.dart';
import '../../services/trust_repository.dart';
import '../../theme/app_colors.dart';
import '../audits/start_audit_screen.dart';

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
  static const Duration _refreshInterval = Duration(seconds: 1);

  Timer? _refreshTimer;
  _DashboardPayload? _payload;
  Object? _error;
  bool _isLoading = true;

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
    final chartValues = _buildChartValues(payload);

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      child: ListView(
        children: [
          Text(
            'Rendimiento de Auditorías',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 14),
          _AuditScoreCard(payload: payload),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  label: 'Visitas Pendientes',
                  value: payload.stats.pendingVisits,
                  cardColor: Theme.of(context).brightness == Brightness.dark ? AppColors.darkCard : AppColors.primarySoft,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: _MetricCard(
                  label: 'Auditorías Pendientes',
                  value: payload.pendingAudits,
                  cardColor: Theme.of(context).brightness == Brightness.dark ? AppColors.darkCard : AppColors.secondarySoft,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _MetricCard(
            label: 'Incidencias Activas',
            value: payload.stats.incidents,
            cardColor: Theme.of(context).brightness == Brightness.dark ? AppColors.darkCard : const Color(0xFFE9F7E2),
          ),
          const SizedBox(height: 20),
          _MiniBarChart(values: chartValues),
          const SizedBox(height: 20),
          SizedBox(
            height: 120,
            child: FilledButton.icon(
              onPressed: widget.role.isInspector ? _openStartAuditFlow : null,
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Iniciar Auditoría'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                disabledBackgroundColor: Theme.of(context).brightness == Brightness.dark ? AppColors.darkCard : const Color(0xFFE5E7EB),
                disabledForegroundColor: Theme.of(context).brightness == Brightness.dark ? AppColors.darkMuted : const Color(0xFF6B7280),
                textStyle: const TextStyle(fontWeight: FontWeight.w700),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              ),
            ),
          ),
          const SizedBox(height: 4),
        ],
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
      _repository.loadDashboardStats(widget.email),
      _repository.loadVisits(widget.email),
      _repository.loadAudits(widget.email),
    ]);

    final stats = results[0] as DashboardStats;
    final visits = results[1] as List<Visit>;
    final audits = results[2] as List<Audit>;

    return _DashboardPayload(
      stats: stats,
      todayVisits: _pickVisits(visits),
      totalAudits: audits.length,
      pendingAudits: _countPendingAudits(audits),
    );
  }

  int _countPendingAudits(List<Audit> audits) {
    return audits.where((audit) => audit.status.toLowerCase() == 'scheduled').length;
  }

  List<double> _buildChartValues(_DashboardPayload payload) {
    final completedAudits = (payload.totalAudits - payload.pendingAudits).clamp(0, 9999);
    final completedVisits = (payload.stats.visits - payload.stats.pendingVisits).clamp(0, 9999);
    final todayVisits = payload.todayVisits.length;
    final incidents = payload.stats.incidents;
    final maxValue = [
      completedAudits.toDouble(),
      completedVisits.toDouble(),
      todayVisits.toDouble(),
      incidents.toDouble(),
      payload.pendingAudits.toDouble(),
    ].reduce((a, b) => a > b ? a : b);

    if (maxValue <= 0) {
      return const [0.35, 0.48, 0.4, 0.3, 0.45];
    }

    return [
      (completedAudits / maxValue).toDouble(),
      (completedVisits / maxValue).toDouble(),
      (todayVisits / maxValue).toDouble(),
      (incidents / maxValue).toDouble(),
      (payload.pendingAudits / maxValue).toDouble(),
    ];
  }

  List<Visit> _pickVisits(List<Visit> visits) {
    if (visits.isEmpty) {
      return const [];
    }

    final now = DateTime.now();
    final todayVisits = visits.where((visit) {
      final parsed = DateTime.tryParse(visit.visitedAt)?.toLocal();
      if (parsed == null) {
        return false;
      }
      return parsed.year == now.year && parsed.month == now.month && parsed.day == now.day;
    }).toList(growable: false);

    if (todayVisits.isEmpty) {
      return const [];
    }

    final sorted = [...todayVisits]
      ..sort((a, b) {
        final aDate = DateTime.tryParse(a.visitedAt)?.toLocal();
        final bDate = DateTime.tryParse(b.visitedAt)?.toLocal();
        if (aDate == null && bDate == null) {
          return 0;
        }
        if (aDate == null) {
          return 1;
        }
        if (bDate == null) {
          return -1;
        }
        return aDate.compareTo(bDate);
      });

    return sorted.take(3).toList(growable: false);
  }
}

class _DashboardPayload {
  const _DashboardPayload({
    required this.stats,
    required this.todayVisits,
    required this.totalAudits,
    required this.pendingAudits,
  });

  final DashboardStats stats;
  final List<Visit> todayVisits;
  final int totalAudits;
  final int pendingAudits;
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.cardColor,
  });

  final String label;
  final int value;
  final Color cardColor;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      constraints: const BoxConstraints(minHeight: 120),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isDark ? AppColors.darkCardBorder : const Color(0x00000000)),
        boxShadow: [
          BoxShadow(color: isDark ? const Color(0x4D000000) : const Color(0x0A000000), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '$value',
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF111827), height: 1),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isDark ? AppColors.darkMuted : const Color(0xFF4B5563)),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _AuditScoreCard extends StatelessWidget {
  const _AuditScoreCard({required this.payload});

  final _DashboardPayload payload;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final completedAudits = (payload.totalAudits - payload.pendingAudits).clamp(0, 9999);
    final score = payload.totalAudits == 0
        ? 0
        : ((completedAudits / payload.totalAudits) * 100).round();
    final secondaryValue = payload.totalAudits == 0 ? 0 : (100 - score).clamp(0, 100).toInt();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark ? AppColors.darkCardBorder : const Color(0xFFE8EBFF),
        ),
        boxShadow: isDark ? null : const [BoxShadow(color: Color(0x12000000), blurRadius: 20, offset: Offset(0, 8))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Score General',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isDark ? AppColors.darkMuted : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$score%',
                style: TextStyle(
                  fontSize: 42,
                  fontWeight: FontWeight.w800,
                  height: 1,
                  color: isDark ? Colors.white : AppColors.primary,
                ),
              ),
              const SizedBox(width: 10),
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'cumplimiento',
                  style: TextStyle(
                    fontSize: 15,
                    color: isDark ? AppColors.darkMuted : const Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              minHeight: 12,
              value: score / 100,
              backgroundColor: isDark ? const Color(0xFF22303E) : const Color(0xFFDDE6FF),
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.secondary),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _ScoreChip(
                  label: 'Auditorías cerradas',
                  value: completedAudits,
                  chipColor: isDark ? const Color(0xFF1C2B44) : const Color(0xFFE8EEFF),
                  valueColor: isDark ? Colors.white : AppColors.primary,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ScoreChip(
                  label: 'Pendientes',
                  value: payload.pendingAudits,
                  chipColor: isDark ? const Color(0xFF2A3A21) : const Color(0xFFE9F7E2),
                  valueColor: isDark ? const Color(0xFFC9E39A) : AppColors.secondaryDark,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ScoreChip(
                  label: 'Brecha',
                  value: secondaryValue,
                  suffix: '%',
                  chipColor: isDark ? const Color(0xFF312345) : const Color(0xFFF1E8FF),
                  valueColor: isDark ? const Color(0xFFDDC6FF) : AppColors.primaryDark,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ScoreChip extends StatelessWidget {
  const _ScoreChip({
    required this.label,
    required this.value,
    required this.chipColor,
    required this.valueColor,
    this.suffix = '',
  });

  final String label;
  final int value;
  final Color chipColor;
  final Color valueColor;
  final String suffix;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(color: chipColor, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$value$suffix',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: valueColor,
              height: 1,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Theme.of(context).brightness == Brightness.dark ? AppColors.darkMuted : const Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniBarChart extends StatelessWidget {
  const _MiniBarChart({required this.values});

  final List<double> values;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    const labels = ['Cerradas', 'Visitas OK', 'Hoy', 'Incidencias', 'Pend.'];

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: isDark ? AppColors.darkCardBorder : const Color(0xFFE8EBFF),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Actividad dinámica',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: isDark ? Colors.white : AppColors.primary,
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 140,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: List.generate(values.length, (index) {
                final value = values[index].clamp(0.08, 1.0);
                final barColor = index.isEven ? AppColors.primary : AppColors.secondary;

                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 650),
                          curve: Curves.easeOutBack,
                          height: 110 * value,
                          decoration: BoxDecoration(
                            color: barColor,
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          labels[index],
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.darkMuted : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}
