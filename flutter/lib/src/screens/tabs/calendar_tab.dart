import 'package:flutter/material.dart';

class CalendarTab extends StatelessWidget {
  const CalendarTab({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Text(
          'Calendario móvil listo para conectar con agenda de visitas.',
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
