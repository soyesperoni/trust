import 'dart:async';

import 'package:flutter/material.dart';

import 'login_screen.dart';
import 'tabs/calendar_tab.dart';
import 'tabs/dashboard_tab.dart';
import '../models/user_role.dart';
import 'tabs/incidents_tab.dart';
import 'tabs/visits_tab.dart';
import 'notifications_screen.dart';
import 'dashboard_quick_setup_screen.dart';
import 'dashboard_quick_user_screen.dart';
import 'profile_screen.dart';
import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    required this.email,
    required this.role,
    required this.isDarkMode,
    required this.onToggleThemeMode,
    super.key,
  });

  final String email;
  final UserRole role;
  final bool isDarkMode;
  final VoidCallback onToggleThemeMode;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const Duration _incidentsRefreshInterval = Duration(seconds: 15);

  int _currentIndex = 0;
  final TrustRepository _repository = TrustRepository();
  Timer? _incidentsRefreshTimer;
  int? _incidentCount;
  VisitStatusFilter _visitsInitialFilter = VisitStatusFilter.all;
  HistoryTypeFilter _visitsInitialTypeFilter = HistoryTypeFilter.all;

  @override
  void initState() {
    super.initState();

    _refreshIncidentCount();
    _incidentsRefreshTimer = Timer.periodic(
      _incidentsRefreshInterval,
      (_) => _refreshIncidentCount(),
    );
  }

  @override
  void dispose() {
    _incidentsRefreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      DashboardTab(
        email: widget.email,
        role: widget.role,
        onMetricTap: _handleDashboardMetricTap,
      ),
      CalendarTab(
        email: widget.email,
        role: widget.role,
      ),
      VisitsTab(
        key: ValueKey('${_visitsInitialTypeFilter.name}-${_visitsInitialFilter.name}'),
        email: widget.email,
        role: widget.role,
        initialFilter: _visitsInitialFilter,
        initialTypeFilter: _visitsInitialTypeFilter,
      ),
      IncidentsTab(email: widget.email, role: widget.role),
    ];

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 20,
        title: FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset(
                'assets/icon/trust_logo_s.png',
                height: 44.2,
              ),
            ],
          ),
        ),
        actions: [
          _TopBarIconButton(
            tooltip: widget.isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
            onPressed: widget.onToggleThemeMode,
            icon: Icon(widget.isDarkMode ? Icons.wb_sunny_rounded : Icons.nightlight_round),
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          if (widget.role == UserRole.generalAdmin || widget.role == UserRole.inspector)
            _TopBarIconButton(
              tooltip: 'Más opciones',
              onPressed: _openQuickCreateMenu,
              icon: const Icon(Icons.add_rounded),
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          const SizedBox(width: 2),
          _TopBarIconButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => NotificationsScreen(email: widget.email)),
              );
            },
            icon: const Icon(Icons.notifications_none_rounded),
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: InkWell(
              borderRadius: BorderRadius.circular(24),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => ProfileScreen(email: widget.email),
                  ),
                );
              },
              child: CircleAvatar(
                radius: 18,
                backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
                child: Text(
                  _initials(widget.email),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSecondaryContainer,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: tabs,
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          decoration: BoxDecoration(
            color: Theme.of(context).brightness == Brightness.dark ? AppColors.darkBackground : (Theme.of(context).bottomAppBarTheme.color ?? Theme.of(context).colorScheme.surface),
            border: Border(top: BorderSide(color: Theme.of(context).brightness == Brightness.dark ? AppColors.darkCardBorder : AppColors.gray100)),
          ),
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _NavItem(
                label: 'Dashboard',
                icon: Icons.dashboard_rounded,
                selected: _currentIndex == 0,
                onTap: () => setState(() => _currentIndex = 0),
              ),
              _NavItem(
                label: 'Calendario',
                icon: Icons.calendar_today_rounded,
                selected: _currentIndex == 1,
                onTap: () => setState(() => _currentIndex = 1),
              ),
              _NavItem(
                label: 'Historial',
                icon: Icons.history,
                selected: _currentIndex == 2,
                onTap: () => setState(() => _currentIndex = 2),
              ),
              _NavItem(
                label: 'Incidencias',
                icon: Icons.report_problem_outlined,
                selected: _currentIndex == 3,
                badgeCount: _incidentCount,
                onTap: () => setState(() => _currentIndex = 3),
              ),
              _NavItem(
                label: 'Salir',
                icon: Icons.logout_rounded,
                selected: false,
                onTap: () {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute<void>(
                      builder: (_) => LoginScreen(
                        isDarkMode: widget.isDarkMode,
                        onToggleThemeMode: widget.onToggleThemeMode,
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }


  Future<void> _openQuickCreateMenu() async {
    final action = await showModalBottomSheet<_QuickCreateAction>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.business_rounded),
                title: const Text('Agregar cliente'),
                subtitle: const Text('Usa el flujo rápido para crear cliente y estructura.'),
                onTap: () => Navigator.of(context).pop(_QuickCreateAction.client),
              ),
              ListTile(
                leading: const Icon(Icons.person_add_alt_1_rounded),
                title: const Text('Agregar usuario'),
                subtitle: const Text('Crea usuario y asigna cuenta o sucursal según su rol.'),
                onTap: () => Navigator.of(context).pop(_QuickCreateAction.user),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );

    if (!mounted || action == null) {
      return;
    }

    if (action == _QuickCreateAction.client) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => DashboardQuickSetupScreen(email: widget.email),
        ),
      );
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => DashboardQuickUserScreen(email: widget.email),
      ),
    );
  }

  void _handleDashboardMetricTap(DashboardMetricShortcut shortcut) {
    setState(() {
      switch (shortcut) {
        case DashboardMetricShortcut.scheduledVisits:
          _visitsInitialTypeFilter = HistoryTypeFilter.visits;
          _visitsInitialFilter = VisitStatusFilter.scheduled;
          _currentIndex = 2;
          break;
        case DashboardMetricShortcut.pendingAudits:
          _visitsInitialTypeFilter = HistoryTypeFilter.audits;
          _visitsInitialFilter = VisitStatusFilter.scheduled;
          _currentIndex = 2;
          break;
        case DashboardMetricShortcut.overdueVisits:
          _visitsInitialTypeFilter = HistoryTypeFilter.visits;
          _visitsInitialFilter = VisitStatusFilter.overdue;
          _currentIndex = 2;
          break;
        case DashboardMetricShortcut.overdueAudits:
          _visitsInitialTypeFilter = HistoryTypeFilter.audits;
          _visitsInitialFilter = VisitStatusFilter.overdue;
          _currentIndex = 2;
          break;
        case DashboardMetricShortcut.activeIncidents:
          _currentIndex = 3;
          break;
      }
    });
  }

  static String _initials(String email) {
    final user = email.split('@').first.trim();
    if (user.isEmpty) {
      return 'TR';
    }
    final parts = user.split(RegExp(r'[._-]+')).where((part) => part.isNotEmpty).toList();
    if (parts.length >= 2) {
      return (parts.first[0] + parts[1][0]).toUpperCase();
    }
    if (user.length >= 2) {
      return user.substring(0, 2).toUpperCase();
    }
    return user[0].toUpperCase();
  }

  Future<void> _refreshIncidentCount() async {
    try {
      final incidents = await _repository.loadIncidents(widget.email);
      if (!mounted) {
        return;
      }
      setState(() => _incidentCount = incidents.length);
    } catch (_) {
      // Silencioso: el contador no debe romper la navegación por fallas de red.
    }
  }
}


enum _QuickCreateAction { client, user }

class _TopBarIconButton extends StatelessWidget {
  const _TopBarIconButton({
    required this.onPressed,
    required this.icon,
    this.color,
    this.tooltip,
  });

  final VoidCallback onPressed;
  final Widget icon;
  final Color? color;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      onPressed: onPressed,
      icon: icon,
      color: color,
      splashRadius: 20,
      visualDensity: VisualDensity.compact,
      constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
      padding: EdgeInsets.zero,
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
    this.badgeCount,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final int? badgeCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final selectedChipColor = isDarkMode ? AppColors.yellow : AppColors.yellowSoft;
    final selectedLabelColor = isDarkMode ? selectedChipColor : AppColors.black;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 32,
              decoration: BoxDecoration(
                color: selected
                    ? selectedChipColor
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Center(
                    child: Icon(
                      icon,
                      size: 22,
                      color: selected
                          ? AppColors.black
                          : (Theme.of(context).brightness == Brightness.dark ? AppColors.darkMuted : AppColors.gray500),
                    ),
                  ),
                  if (badgeCount != null)
                    Positioned(
                      right: 6,
                      top: -2,
                      child: Container(
                        constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(
                          color: Colors.redAccent,
                          borderRadius: BorderRadius.all(Radius.circular(999)),
                        ),
                        child: Text(
                          '$badgeCount',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: selected
                        ? selectedLabelColor
                        : (isDarkMode ? AppColors.darkMuted : AppColors.gray500),
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
