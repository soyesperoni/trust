import 'package:flutter/material.dart';

import 'tabs/calendar_tab.dart';
import 'tabs/dashboard_tab.dart';
import 'tabs/incidents_tab.dart';
import 'tabs/visits_tab.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({required this.email, super.key});

  final String email;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final tabs = [
      DashboardTab(email: widget.email),
      const CalendarTab(),
      VisitsTab(email: widget.email),
      IncidentsTab(email: widget.email),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trust Mobile'),
        centerTitle: true,
      ),
      body: tabs[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (value) => setState(() => _currentIndex = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.calendar_month_outlined), label: 'Calendario'),
          NavigationDestination(icon: Icon(Icons.history), label: 'Historial'),
          NavigationDestination(icon: Icon(Icons.report_problem_outlined), label: 'Incidencias'),
        ],
      ),
    );
  }
}
