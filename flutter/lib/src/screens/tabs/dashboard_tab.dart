import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/audit.dart';
import '../../models/dashboard_stats.dart';
import '../../models/user_role.dart';
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
    final chartItems = _buildChartItems(payload);

    return Container(
      decoration: BoxDecoration(
        gradient: Theme.of(context).brightness == Brightness.dark
            ? const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFF030712), Color(0xFF111827)],
              )
            : const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFFF5F8FF), Color(0xFFEEF3FF)],
              ),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
        child: Column(
          children: [
            _AuditScoreCard(payload: payload),
            const SizedBox(height: 14),
            _DashboardKpiStrip(payload: payload),
            const SizedBox(height: 14),
            _MiniBarChart(items: chartItems),
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
                  disabledBackgroundColor: Theme.of(context).brightness == Brightness.dark
                      ? AppColors.darkCard
                      : const Color(0xFFE5E7EB),
                  disabledForegroundColor: Theme.of(context).brightness == Brightness.dark
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
      _repository.loadDashboardStats(widget.email),
      _repository.loadAudits(widget.email),
    ]);

    final stats = results[0] as DashboardStats;
    final audits = results[1] as List<Audit>;

    return _DashboardPayload(
      stats: stats,
      totalAudits: audits.length,
      pendingAudits: _countPendingAudits(audits),
    );
  }

  int _countPendingAudits(List<Audit> audits) {
    return audits.where((audit) => audit.status.toLowerCase() == 'scheduled').length;
  }

  List<_BarChartItem> _buildChartItems(_DashboardPayload payload) {
    final completedAudits = (payload.totalAudits - payload.pendingAudits).clamp(0, 9999);
    final completedVisits = (payload.stats.visits - payload.stats.pendingVisits).clamp(0, 9999);
    final incidents = payload.stats.incidents;
    final pendingAudits = payload.pendingAudits;

    final rawItems = <_BarChartItem>[
      _BarChartItem(label: 'Aud. OK', count: completedAudits),
      _BarChartItem(label: 'Visitas', count: completedVisits),
      _BarChartItem(label: 'Incid.', count: incidents),
      _BarChartItem(label: 'Pend.', count: pendingAudits),
    ];

    final maxValue = rawItems
        .map((item) => item.count.toDouble())
        .reduce((a, b) => a > b ? a : b);

    if (maxValue <= 0) {
      return rawItems
          .map((item) => item.copyWith(normalizedValue: 0.1))
          .toList(growable: false);
    }

    return rawItems
        .map(
          (item) => item.copyWith(
            normalizedValue: (item.count / maxValue).toDouble().clamp(0.1, 1.0),
          ),
        )
        .toList(growable: false);
  }
}

class _DashboardPayload {
  const _DashboardPayload({
    required this.stats,
    required this.totalAudits,
    required this.pendingAudits,
  });

  final DashboardStats stats;
  final int totalAudits;
  final int pendingAudits;
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
    final secondaryValue = payload.totalAudits == 0
        ? 0
        : (100 - score).clamp(0, 100).toInt();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: isDark
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF172554), Color(0xFF1E1B4B)],
              )
            : const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFEEF2FF), Color(0xFFE0E7FF)],
              ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark ? const Color(0xFF312E81) : const Color(0xFFC7D2FE),
        ),
        boxShadow: isDark
            ? null
            : const [
                BoxShadow(
                  color: Color(0x1A1E3A8A),
                  blurRadius: 24,
                  offset: Offset(0, 12),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Score General de Auditorías',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isDark ? const Color(0xFFA5B4FC) : const Color(0xFF4338CA),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$score%',
                style: TextStyle(
                  fontSize: 46,
                  fontWeight: FontWeight.w800,
                  height: 1,
                  color: isDark ? Colors.white : AppColors.primary,
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0x3310B981) : const Color(0xFFD1FAE5),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    'cumplimiento',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: isDark ? const Color(0xFF6EE7B7) : const Color(0xFF047857),
                    ),
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
              backgroundColor: isDark ? const Color(0xFF312E81) : const Color(0xFFC7D2FE),
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF22C55E)),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _ScoreChip(
                  label: 'Cerradas',
                  value: completedAudits,
                  chipColor: isDark ? const Color(0x3322D3EE) : const Color(0xFFE0F2FE),
                  valueColor: isDark ? const Color(0xFF67E8F9) : const Color(0xFF0E7490),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ScoreChip(
                  label: 'Pendientes',
                  value: payload.pendingAudits,
                  chipColor: isDark ? const Color(0x334ADE80) : const Color(0xFFDCFCE7),
                  valueColor: isDark ? const Color(0xFF86EFAC) : const Color(0xFF15803D),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ScoreChip(
                  label: 'Brecha',
                  value: secondaryValue,
                  suffix: '%',
                  chipColor: isDark ? const Color(0x33C084FC) : const Color(0xFFF3E8FF),
                  valueColor: isDark ? const Color(0xFFD8B4FE) : const Color(0xFF7E22CE),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DashboardKpiStrip extends StatelessWidget {
  const _DashboardKpiStrip({required this.payload});

  final _DashboardPayload payload;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        Expanded(
          child: _MetricCard(
            title: 'Visitas pendientes',
            value: payload.stats.pendingVisits,
            tone: isDark ? const Color(0xFF1D4ED8) : const Color(0xFFDBEAFE),
            valueColor: isDark ? const Color(0xFFBFDBFE) : const Color(0xFF1D4ED8),
            icon: Icons.event_busy_rounded,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _MetricCard(
            title: 'Incidencias',
            value: payload.stats.incidents,
            tone: isDark ? const Color(0xFF7C2D12) : const Color(0xFFFFEDD5),
            valueColor: isDark ? const Color(0xFFFED7AA) : const Color(0xFF9A3412),
            icon: Icons.warning_amber_rounded,
          ),
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.value,
    required this.tone,
    required this.valueColor,
    required this.icon,
  });

  final String title;
  final int value;
  final Color tone;
  final Color valueColor;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? AppColors.darkCardBorder : const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        children: [
          Container(
            height: 36,
            width: 36,
            decoration: BoxDecoration(
              color: tone,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 20, color: valueColor),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$value',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    height: 1,
                    color: isDark ? Colors.white : AppColors.primaryDark,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.darkMuted : const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
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
              color: Theme.of(context).brightness == Brightness.dark
                  ? AppColors.darkMuted
                  : const Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }
}

class _BarChartItem {
  const _BarChartItem({
    required this.label,
    required this.count,
    this.normalizedValue = 0.08,
  });

  final String label;
  final int count;
  final double normalizedValue;

  _BarChartItem copyWith({double? normalizedValue}) {
    return _BarChartItem(
      label: label,
      count: count,
      normalizedValue: normalizedValue ?? this.normalizedValue,
    );
  }
}

class _MiniBarChart extends StatelessWidget {
  const _MiniBarChart({required this.items});

  final List<_BarChartItem> items;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: isDark ? AppColors.darkCardBorder : const Color(0xFFE2E8F0),
        ),
        boxShadow: isDark
            ? null
            : const [
                BoxShadow(
                  color: Color(0x14000000),
                  blurRadius: 22,
                  offset: Offset(0, 8),
                ),
              ],
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
          const SizedBox(height: 4),
          Text(
            'Resumen de cierres, visitas, incidencias y pendientes',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.darkMuted : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 170,
            child: Stack(
              children: [
                Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: List.generate(
                    4,
                    (index) => Container(
                      height: 1,
                      color: isDark ? const Color(0xFF223043) : const Color(0xFFE2E8F0),
                    ),
                  ),
                ),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: List.generate(items.length, (index) {
                    final item = items[index];
                    final barGradient = index.isEven
                        ? const LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Color(0xFF60A5FA), Color(0xFF2563EB)],
                          )
                        : const LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Color(0xFF34D399), Color(0xFF16A34A)],
                          );

                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text(
                              item.count.toString(),
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: isDark ? Colors.white : AppColors.primaryDark,
                                height: 1,
                              ),
                            ),
                            const SizedBox(height: 6),
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 700),
                              curve: Curves.easeOutCubic,
                              height: 104 * item.normalizedValue,
                              width: 28,
                              decoration: BoxDecoration(
                                gradient: barGradient,
                                borderRadius: BorderRadius.circular(999),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              item.label,
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
              ],
            ),
          ),
        ],
      ),
    );
  }
}
