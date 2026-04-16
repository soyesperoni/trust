import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

class PushNotificationService {
  PushNotificationService._();

  static final PushNotificationService instance = PushNotificationService._();

  bool _initialized = false;
  String? _cachedToken;

  Future<void> init({required GlobalKey<ScaffoldMessengerState> messengerKey}) async {
    if (_initialized) {
      return;
    }
    _initialized = true;

    try {
      final messaging = FirebaseMessaging.instance;

      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      debugPrint('Permiso de notificaciones: ${settings.authorizationStatus.name}');

      _cachedToken = await messaging.getToken();
      debugPrint('-------------------------------------------------------');
      debugPrint('TOKEN OBTENIDO: ${_cachedToken ?? 'null'}');
      debugPrint('-------------------------------------------------------');

      messaging.onTokenRefresh.listen((newToken) {
        _cachedToken = newToken;
        debugPrint('FCM token actualizado: $newToken');
      });

      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('¡LLEGÓ UN MENSAJE EN PRIMER PLANO!');
        final body = message.notification?.body;
        if (body == null || body.isEmpty) {
          return;
        }

        messengerKey.currentState?.showSnackBar(
          SnackBar(
            content: Text(body),
            behavior: SnackBarBehavior.floating,
          ),
        );
      });
    } catch (error, stackTrace) {
      debugPrint('Error en Firebase Messaging: $error');
      debugPrint('$stackTrace');
    }
  }

  Future<String?> getToken() async {
    if (_cachedToken != null && _cachedToken!.isNotEmpty) {
      return _cachedToken;
    }

    try {
      _cachedToken = await FirebaseMessaging.instance.getToken();
      return _cachedToken;
    } catch (error) {
      debugPrint('No fue posible obtener el token FCM bajo demanda: $error');
      return null;
    }
  }
}
