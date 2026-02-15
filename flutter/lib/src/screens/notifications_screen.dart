import 'package:flutter/material.dart';

import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({
    required this.email,
    super.key,
  });

  final String email;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final TrustRepository _repository = TrustRepository();

  bool _loading = true;
  String? _error;
  List<_NotificationItem> _items = const [];

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final payload = await _repository.loadNotifications(widget.email);
      if (!mounted) return;
      final now = DateTime.now();
      final items = payload
          .map((item) => _NotificationItem.fromJson(item, now: now))
          .toList(growable: false);
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final backgroundColor = Theme.of(context).scaffoldBackgroundColor;

    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        backgroundColor: backgroundColor,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        leadingWidth: 54,
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back),
        ),
        title: const Text(
          'Notificaciones',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        actions: [
          TextButton(
            onPressed: _clearAll,
            child: const Text('Limpiar todo'),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: RefreshIndicator(
                onRefresh: _loadNotifications,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  children: [
                    const SizedBox(height: 12),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 460),
                      child: Column(
                        children: [
                          if (_error != null)
                            _StatusMessage(
                              message: _error!,
                              isDark: isDark,
                              isError: true,
                            )
                          else if (_items.isEmpty)
                            _StatusMessage(
                              message: 'No hay notificaciones.',
                              isDark: isDark,
                            )
                          else
                            ..._items.map((item) => Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: _NotificationCard(item: item),
                                )),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  void _clearAll() {
    setState(() => _items = const []);
  }
}

class _StatusMessage extends StatelessWidget {
  const _StatusMessage({
    required this.message,
    required this.isDark,
    this.isError = false,
  });

  final String message;
  final bool isDark;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isError
            ? (isDark ? const Color(0xFF3F1D1D) : const Color(0xFFFEF2F2))
            : (isDark ? AppColors.darkCard : AppColors.gray50),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isError
              ? const Color(0xFFFECACA)
              : (isDark ? AppColors.darkCardBorder : AppColors.gray100),
        ),
      ),
      child: Text(
        message,
        style: TextStyle(
          color: isError
              ? const Color(0xFFB91C1C)
              : (isDark ? AppColors.darkMuted : AppColors.gray500),
          fontSize: 13,
        ),
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({required this.item});

  final _NotificationItem item;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : item.cardBackground,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? AppColors.darkCardBorder : Colors.transparent,
        ),
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
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      item.time,
                      style: TextStyle(
                        color: item.unread ? const Color(0xFF2563EB) : (isDark ? AppColors.darkMuted : AppColors.gray500),
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
                  style: TextStyle(
                    color: isDark ? AppColors.darkMuted : AppColors.gray700,
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

  factory _NotificationItem.fromJson(Map<String, dynamic> json, {required DateTime now}) {
    final title = (json['title'] as String?)?.trim();
    final message = (json['message'] as String?)?.trim();
    final type = (json['type'] as String?)?.trim().toLowerCase();
    final createdAt = DateTime.tryParse((json['created_at'] as String?) ?? '');

    final appearance = _appearanceForType(type);
    return _NotificationItem(
      title: (title == null || title.isEmpty) ? 'Notificación' : title,
      message: (message == null || message.isEmpty) ? 'Sin detalle.' : message,
      time: _timeAgo(createdAt, now),
      icon: appearance.icon,
      iconBackground: appearance.iconBackground,
      iconColor: appearance.iconColor,
      cardBackground: appearance.cardBackground,
      unread: json['unread'] == true,
    );
  }

  final String title;
  final String message;
  final String time;
  final IconData icon;
  final Color iconBackground;
  final Color iconColor;
  final Color cardBackground;
  final bool unread;

  static ({
    IconData icon,
    Color iconBackground,
    Color iconColor,
    Color cardBackground,
  }) _appearanceForType(String? type) {
    switch (type) {
      case 'incident':
        return (
          icon: Icons.warning,
          iconBackground: const Color(0xFFFEE2E2),
          iconColor: const Color(0xFFDC2626),
          cardBackground: const Color(0xFFFEF2F2),
        );
      case 'visit':
      default:
        return (
          icon: Icons.event,
          iconBackground: const Color(0xFFDBEAFE),
          iconColor: const Color(0xFF2563EB),
          cardBackground: const Color(0xFFEFF6FF),
        );
    }
  }

  static String _timeAgo(DateTime? date, DateTime now) {
    if (date == null) return 'Ahora';
    final difference = now.difference(date);
    if (difference.inMinutes < 1) return 'Ahora';
    if (difference.inMinutes < 60) return '${difference.inMinutes}m';
    if (difference.inHours < 24) return '${difference.inHours}h';
    if (difference.inDays == 1) return 'Ayer';
    return 'Hace ${difference.inDays} días';
  }
}
