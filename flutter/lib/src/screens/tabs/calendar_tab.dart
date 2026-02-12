import 'package:flutter/material.dart';

class CalendarTab extends StatelessWidget {
  const CalendarTab({super.key});

  static const Color _primary = Color(0xFFFBC02D);
  static const Color _surfaceVariant = Color(0xFFF3F4F6);
  static const Color _outline = Color(0xFFE5E7EB);

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildCalendarCard(),
            const SizedBox(height: 20),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Actividades del día 12',
                    style: TextStyle(
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
                  child: const Text(
                    '3 Eventos',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            const _ActivityCard(
              status: 'Programada',
              title: 'Sucursal Centro #402',
              time: '09:00 AM',
              location: 'Av. Reforma 222, CDMX',
              contact: 'Juan Pérez',
              statusBackground: Color(0xFFDBEAFE),
              statusTextColor: Color(0xFF1D4ED8),
            ),
            const SizedBox(height: 14),
            const _ActivityCard(
              status: 'Completada',
              title: 'Plaza Satélite #105',
              time: '11:30 AM',
              location: 'Cto. Centro Comercial 2251',
              contact: 'María González',
              statusBackground: Color(0xFFDCFCE7),
              statusTextColor: Color(0xFF15803D),
            ),
            const SizedBox(height: 14),
            const _ActivityCard(
              status: 'En proceso',
              title: 'Almacén Norte #08',
              time: '03:00 PM',
              location: 'Calle Industrial 5, Monterrey',
              contact: 'Ing. Roberto Díaz',
              statusBackground: Color(0xFFFEF3C7),
              statusTextColor: Color(0xFF92400E),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCalendarCard() {
    const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const leadingDays = [26, 27, 28, 29, 30, 31];
    const monthDays = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

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
              _calendarButton(Icons.chevron_left_rounded),
              const Expanded(
                child: Center(
                  child: Text(
                    'Febrero 2026',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF111827),
                    ),
                  ),
                ),
              ),
              _calendarButton(Icons.chevron_right_rounded),
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
            itemCount: leadingDays.length + monthDays.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisSpacing: 6,
              crossAxisSpacing: 6,
            ),
            itemBuilder: (_, index) {
              if (index < leadingDays.length) {
                return _dayChip(text: '${leadingDays[index]}', enabled: false);
              }

              final day = monthDays[index - leadingDays.length];
              return _dayChip(text: '$day', selected: day == 12);
            },
          ),
        ],
      ),
    );
  }

  Widget _calendarButton(IconData icon) {
    return InkWell(
      onTap: () {},
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

  Widget _dayChip({required String text, bool enabled = true, bool selected = false}) {
    if (selected) {
      return Container(
        alignment: Alignment.center,
        decoration: const BoxDecoration(color: _primary, shape: BoxShape.circle),
        child: Text(
          text,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      );
    }

    return InkWell(
      onTap: enabled ? () {} : null,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: enabled ? 0.6 : 0.0),
          shape: BoxShape.circle,
        ),
        child: Text(
          text,
          style: TextStyle(
            color: enabled ? const Color(0xFF374151) : const Color(0xFFD1D5DB),
            fontSize: enabled ? 14 : 12,
            fontWeight: enabled ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({
    required this.status,
    required this.title,
    required this.time,
    required this.location,
    required this.contact,
    required this.statusBackground,
    required this.statusTextColor,
  });

  final String status;
  final String title;
  final String time;
  final String location;
  final String contact;
  final Color statusBackground;
  final Color statusTextColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.transparent),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 3,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: statusBackground,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        status,
                        style: TextStyle(
                          color: statusTextColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      title,
                      style: const TextStyle(
                        color: Color(0xFF111827),
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFF3F4F6)),
                ),
                child: Text(
                  time,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF4B5563),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.location_on_outlined, size: 18, color: Color(0xFF9CA3AF)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  location,
                  style: const TextStyle(fontSize: 14, color: Color(0xFF4B5563)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.person_outline_rounded, size: 18, color: Color(0xFF9CA3AF)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Contacto: $contact',
                  style: const TextStyle(fontSize: 14, color: Color(0xFF4B5563)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
