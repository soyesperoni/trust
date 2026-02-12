import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final List<_NotificationItem> _todayItems = [
    const _NotificationItem(
      title: 'Visita programada',
      message: 'Se ha asignado una nueva visita para la Sucursal Centro a las 09:00 AM.',
      time: '2m',
      icon: Icons.event,
      iconBackground: Color(0xFFDBEAFE),
      iconColor: Color(0xFF2563EB),
      cardBackground: Color(0xFFEFF6FF),
      unread: true,
    ),
    const _NotificationItem(
      title: 'Incidencia crítica',
      message: 'Reporte de seguridad en Plaza Satélite #105. Requiere atención inmediata.',
      time: '45m',
      icon: Icons.warning,
      iconBackground: Color(0xFFFEE2E2),
      iconColor: Color(0xFFDC2626),
      cardBackground: Color(0xFFFEF2F2),
      unread: true,
    ),
    const _NotificationItem(
      title: 'Recordatorio del sistema',
      message: 'No olvides sincronizar tus reportes antes de las 6:00 PM para el cierre del día.',
      time: '2h',
      icon: Icons.notifications_none_rounded,
      iconBackground: AppColors.yellowSoft,
      iconColor: Color(0xFFB45309),
      cardBackground: Colors.white,
    ),
  ];

  final List<_NotificationItem> _previousItems = [
    const _NotificationItem(
      title: 'Reporte aprobado',
      message: 'El supervisor aprobó tu visita a Almacén Norte #08.',
      time: 'Ayer',
      icon: Icons.check_circle,
      iconBackground: Color(0xFFDCFCE7),
      iconColor: Color(0xFF15803D),
      cardBackground: Colors.white,
    ),
    const _NotificationItem(
      title: 'Reunión de equipo',
      message: 'Se ha reprogramado la reunión mensual de coordinadores para el próximo lunes.',
      time: 'Hace 2 días',
      icon: Icons.group,
      iconBackground: Color(0xFFF3E8FF),
      iconColor: Color(0xFF7E22CE),
      cardBackground: Colors.white,
    ),
    const _NotificationItem(
      title: 'Actualización disponible',
      message: 'Una nueva versión de la aplicación está lista para descargar. Mejoras de rendimiento incluidas.',
      time: 'Hace 3 días',
      icon: Icons.settings,
      iconBackground: Color(0xFFF3F4F6),
      iconColor: Color(0xFF4B5563),
      cardBackground: Colors.white,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        leadingWidth: 54,
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back),
          color: AppColors.gray700,
        ),
        titleSpacing: 0,
        title: const Text(
          'Notificaciones',
          style: TextStyle(
            color: AppColors.gray900,
            fontSize: 28,
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          TextButton(
            onPressed: _clearAll,
            child: const Text(
              'Limpiar todo',
              style: TextStyle(
                color: Color(0xFF2563EB),
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 120),
        children: [
          _NotificationSection(title: 'Hoy', items: _todayItems),
          const SizedBox(height: 22),
          _NotificationSection(title: 'Anteriores', items: _previousItems),
        ],
      ),

    );
  }

  void _clearAll() {
    setState(() {
      _todayItems.clear();
      _previousItems.clear();
    });
  }
}

class _NotificationSection extends StatelessWidget {
  const _NotificationSection({required this.title, required this.items});

  final String title;
  final List<_NotificationItem> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4),
          child: Text(
            title.toUpperCase(),
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.gray500,
              letterSpacing: 0.8,
            ),
          ),
        ),
        const SizedBox(height: 10),
        if (items.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.gray50,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.gray100),
            ),
            child: const Text(
              'No hay notificaciones.',
              style: TextStyle(
                color: AppColors.gray500,
                fontWeight: FontWeight.w500,
              ),
            ),
          )
        else
          ...items.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _NotificationCard(item: item),
              )),
      ],
    );
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({required this.item});

  final _NotificationItem item;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: item.cardBackground,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: item.iconBackground,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Icon(item.icon, color: item.iconColor, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        item.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.gray900,
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      item.time,
                      style: TextStyle(
                        color: item.unread ? const Color(0xFF2563EB) : AppColors.gray500,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  item.message,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.gray700,
                    fontSize: 14,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
          if (item.unread)
            Container(
              width: 10,
              height: 10,
              margin: const EdgeInsets.only(left: 8, top: 16),
              decoration: const BoxDecoration(
                color: Color(0xFF3B82F6),
                shape: BoxShape.circle,
              ),
            ),
        ],
      ),
    );
  }
}

class _NotificationItem {
  const _NotificationItem({
    required this.title,
    required this.message,
    required this.time,
    required this.icon,
    required this.iconBackground,
    required this.iconColor,
    required this.cardBackground,
    this.unread = false,
  });

  final String title;
  final String message;
  final String time;
  final IconData icon;
  final Color iconBackground;
  final Color iconColor;
  final Color cardBackground;
  final bool unread;
}
