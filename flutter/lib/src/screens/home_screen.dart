import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'login_screen.dart';
import 'tabs/calendar_tab.dart';
import 'tabs/dashboard_tab.dart';
import 'tabs/incidents_tab.dart';
import 'tabs/visits_tab.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    required this.email,
    required this.isDarkMode,
    required this.onToggleThemeMode,
    super.key,
  });

  final String email;
  final bool isDarkMode;
  final VoidCallback onToggleThemeMode;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final tabs = [
      DashboardTab(
        email: widget.email,
        onViewMoreTodayVisits: () => setState(() => _currentIndex = 1),
      ),
      CalendarTab(email: widget.email),
      VisitsTab(email: widget.email),
      IncidentsTab(email: widget.email),
    ];

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 20,
        title: Text(
          'trust',
          style: GoogleFonts.poppins(
            color: const Color(0xFFFACC15),
            fontWeight: FontWeight.bold,
            fontSize: 34,
            letterSpacing: -1,
          ),
        ),
        actions: [
          IconButton(
            tooltip: widget.isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
            onPressed: widget.onToggleThemeMode,
            icon: Icon(widget.isDarkMode ? Icons.wb_sunny_rounded : Icons.nightlight_round),
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.notifications_none_rounded),
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16),
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
        ],
      ),
      body: tabs[_currentIndex],
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          decoration: BoxDecoration(
            color: Theme.of(context).bottomAppBarTheme.color ?? Theme.of(context).colorScheme.surface,
            border: Border(top: BorderSide(color: Color(0xFFF3F4F6))),
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
                showDot: true,
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
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
    this.showDot = false,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final bool showDot;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
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
                color: selected ? const Color(0xFFFFF9C4) : Colors.transparent,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Center(
                    child: Icon(
                      icon,
                      size: 22,
                      color: selected ? const Color(0xFF111827) : const Color(0xFF6B7280),
                    ),
                  ),
                  if (showDot)
                    const Positioned(
                      right: 14,
                      top: 6,
                      child: DecoratedBox(
                        decoration: BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle),
                        child: SizedBox(width: 8, height: 8),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: selected ? const Color(0xFF111827) : const Color(0xFF6B7280),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
