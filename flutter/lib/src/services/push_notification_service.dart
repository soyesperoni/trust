import 'dart:io';
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

      String? token;
      if (Platform.isIOS) {
        debugPrint('Esperando que el token APNS esté disponible...');
        String? apnsToken = await messaging.getAPNSToken();
        int retries = 0;
        // Reintentar durante 15 segundos si el token APNS es nulo
        while (apnsToken == null && retries < 15) {
          await Future.delayed(const Duration(seconds: 1));
          apnsToken = await messaging.getAPNSToken();
          retries++;
          debugPrint('Esperando APNS... Reintento $retries/15 (Token APNS: $apnsToken)');
        }
        
        if (apnsToken != null) {
          debugPrint('Token APNS obtenido con éxito: $apnsToken');
          token = await messaging.getToken();
        } else {
          debugPrint('ADVERTENCIA: No se pudo obtener el token APNS a tiempo.');
        }
      } else {
        token = await messaging.getToken();
      }

      _cachedToken = token;
      debugPrint('-------------------------------------------------------');
      debugPrint('TOKEN FCM OBTENIDO: ${_cachedToken ?? 'null'}');
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
      if (Platform.isIOS) {
        String? apnsToken = await FirebaseMessaging.instance.getAPNSToken();
        if (apnsToken == null) {
          debugPrint('Error: El token APNS no está disponible en este momento.');
          return null;
        }
      }
      _cachedToken = await FirebaseMessaging.instance.getToken();
      return _cachedToken;
    } catch (error) {
      debugPrint('No fue posible obtener el token FCM bajo demanda: $error');
      return null;
    }
  }
}
