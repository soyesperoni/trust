import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Tipo visual de un [StatusAlert].
enum StatusAlertType {
  /// Aviso neutral o informativo.
  info,

  /// Aviso que requiere atencion pero no bloquea la operacion.
  warning,

  /// Error o estado que impide completar la operacion.
  error,
}

/// Aviso reutilizable de estado para la app movil.
///
/// Muestra un banner con icono, titulo, mensaje y hasta dos acciones. Se adapta
/// a tema claro y oscuro usando [AppColors] y ocupa todo el ancho disponible,
/// por lo que funciona igual en telefono y tablet.
///
/// Ejemplo:
/// ```dart
/// StatusAlert(
///   type: StatusAlertType.warning,
///   title: 'Correo no autorizado',
///   message: 'Autoriza la cuenta para reanudar los envios.',
///   actionLabel: 'Autorizar correo',
///   onAction: _authorizeEmail,
/// )
/// ```
///
/// Para los casos frecuentes existen constructores con textos e instrucciones
/// ya definidos: [StatusAlert.emailUnauthorized],
/// [StatusAlert.sessionExpired], [StatusAlert.pdfUnavailable],
/// [StatusAlert.printerUnavailable] y [StatusAlert.biometricsUnavailable].
class StatusAlert extends StatelessWidget {
  /// Crea un aviso generico.
  const StatusAlert({
    required this.title,
    required this.message,
    this.type = StatusAlertType.warning,
    this.actionLabel,
    this.onAction,
    this.secondaryLabel,
    this.onSecondary,
    this.dismissible = false,
    this.onDismiss,
    super.key,
  })  : assert(
          (actionLabel == null) == (onAction == null),
          'actionLabel y onAction deben definirse juntos.',
        ),
        assert(
          (secondaryLabel == null) == (onSecondary == null),
          'secondaryLabel y onSecondary deben definirse juntos.',
        );

  /// Aviso cuando la cuenta de correo no esta autorizada para enviar.
  factory StatusAlert.emailUnauthorized({
    required VoidCallback onAuthorize,
    String? message,
    VoidCallback? onDismiss,
    Key? key,
  }) {
    return StatusAlert(
      key: key,
      type: StatusAlertType.warning,
      title: 'Correo no autorizado',
      message: message ??
          'La cuenta de correo de la plataforma no esta autorizada para enviar mensajes. '
              'Autorizala para reanudar el envio de notificaciones y reportes.',
      actionLabel: 'Autorizar correo',
      onAction: onAuthorize,
      dismissible: onDismiss != null,
      onDismiss: onDismiss,
    );
  }

  /// Aviso cuando la sesion expiro y hay que volver a iniciar sesion.
  factory StatusAlert.sessionExpired({
    required VoidCallback onLogin,
    Key? key,
  }) {
    return StatusAlert(
      key: key,
      type: StatusAlertType.error,
      title: 'Sesion expirada',
      message:
          'Tu sesion expiro por seguridad. Inicia sesion de nuevo para continuar '
          'donde estabas.',
      actionLabel: 'Iniciar sesion',
      onAction: onLogin,
    );
  }

  /// Aviso cuando el informe PDF no puede generarse porque la visita o la
  /// auditoria todavia no esta registrada.
  factory StatusAlert.pdfUnavailable({
    required bool isAudit,
    VoidCallback? onRetry,
    VoidCallback? onDismiss,
    Key? key,
  }) {
    final record = isAudit ? 'auditoria' : 'visita';
    return StatusAlert(
      key: key,
      type: StatusAlertType.warning,
      title: 'Informe PDF no disponible',
      message:
          'La $record no esta registrada, por lo que todavia no se puede generar '
          'el informe. Completa el registro y vuelve a intentarlo.',
      actionLabel: onRetry == null ? null : 'Reintentar',
      onAction: onRetry,
      dismissible: onDismiss != null,
      onDismiss: onDismiss,
    );
  }

  /// Aviso cuando la impresora termica no esta disponible.
  factory StatusAlert.printerUnavailable({
    VoidCallback? onRetry,
    VoidCallback? onDismiss,
    Key? key,
  }) {
    return StatusAlert(
      key: key,
      type: StatusAlertType.warning,
      title: 'Impresora no disponible',
      message:
          'No se detecto la impresora termica. Verifica que este encendida, con '
          'papel y vinculada por Bluetooth al dispositivo; despues reintenta la '
          'impresion.',
      actionLabel: onRetry == null ? null : 'Reintentar impresion',
      onAction: onRetry,
      dismissible: onDismiss != null,
      onDismiss: onDismiss,
    );
  }

  /// Aviso cuando la biometria no esta disponible en el dispositivo.
  factory StatusAlert.biometricsUnavailable({
    String? message,
    required VoidCallback onRetry,
    VoidCallback? onUsePassword,
    VoidCallback? onDismiss,
    Key? key,
  }) {
    return StatusAlert(
      key: key,
      type: StatusAlertType.warning,
      title: 'Biometria no disponible',
      message: message ??
          'No se pudo usar la biometria en este dispositivo. Revisa que tengas '
              'una huella o Face ID registrado y que el sensor este disponible; '
              'luego reintenta o inicia sesion con tu contrasena.',
      actionLabel: 'Reintentar',
      onAction: onRetry,
      secondaryLabel: onUsePassword == null ? null : 'Usar contrasena',
      onSecondary: onUsePassword,
      dismissible: onDismiss != null,
      onDismiss: onDismiss,
    );
  }

  /// Titulo del aviso.
  final String title;

  /// Detalle o instrucciones para resolver el estado.
  final String message;

  /// Tipo visual del aviso.
  final StatusAlertType type;

  /// Texto de la accion principal; requiere [onAction].
  final String? actionLabel;

  /// Accion principal del aviso.
  final VoidCallback? onAction;

  /// Texto de la accion secundaria; requiere [onSecondary].
  final String? secondaryLabel;

  /// Accion secundaria del aviso.
  final VoidCallback? onSecondary;

  /// Muestra el boton de cierre cuando [onDismiss] esta definido.
  final bool dismissible;

  /// Callback del boton de cierre.
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final style = _StatusAlertStyle.of(type, isDark);
    final titleColor = isDark ? Colors.white : AppColors.gray900;
    final messageColor = isDark ? AppColors.darkMuted : AppColors.gray700;
    final hasActions = onAction != null || onSecondary != null;

    return Semantics(
      container: true,
      liveRegion: true,
      label: '$title. $message',
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
        decoration: BoxDecoration(
          color: style.background,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: style.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(style.icon, size: 20, color: style.accent),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: titleColor,
                    ),
                  ),
                ),
                if (dismissible && onDismiss != null)
                  InkWell(
                    onTap: onDismiss,
                    borderRadius: BorderRadius.circular(16),
                    child: Padding(
                      padding: const EdgeInsets.all(2),
                      child: Icon(
                        Icons.close_rounded,
                        size: 18,
                        color: messageColor,
                        semanticLabel: 'Cerrar aviso',
                      ),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(left: 28, top: 6),
              child: Text(
                message,
                style: TextStyle(
                  fontSize: 13,
                  height: 1.35,
                  color: messageColor,
                ),
              ),
            ),
            if (hasActions)
              Padding(
                padding: const EdgeInsets.only(left: 20, top: 2),
                child: Wrap(
                  spacing: 4,
                  runSpacing: 0,
                  children: [
                    if (actionLabel != null && onAction != null)
                      TextButton(
                        onPressed: onAction,
                        style: TextButton.styleFrom(
                          foregroundColor: style.accent,
                          minimumSize: Size.zero,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          textStyle: const TextStyle(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        child: Text(actionLabel!),
                      ),
                    if (secondaryLabel != null && onSecondary != null)
                      TextButton(
                        onPressed: onSecondary,
                        style: TextButton.styleFrom(
                          foregroundColor:
                              isDark ? Colors.white70 : AppColors.gray700,
                          minimumSize: Size.zero,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(secondaryLabel!),
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  /// Muestra el aviso como dialogo modal.
  ///
  /// Devuelve `true` cuando el usuario elige reintentar y `false` cuando elige
  /// la accion secundaria o cierra el dialogo.
  static Future<bool> show(
    BuildContext context, {
    StatusAlertType type = StatusAlertType.warning,
    required String title,
    required String message,
    String? instructions,
    String retryLabel = 'Reintentar',
    String secondaryLabel = 'Cerrar',
  }) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) {
        final isDark = Theme.of(dialogContext).brightness == Brightness.dark;
        final style = _StatusAlertStyle.of(type, isDark);
        return AlertDialog(
          insetPadding:
              const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          title: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(style.icon, color: style.accent),
              const SizedBox(width: 10),
              Expanded(child: Text(title)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(message),
                if (instructions != null && instructions.trim().isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkSurface : AppColors.gray100,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isDark
                            ? AppColors.darkCardBorder
                            : AppColors.gray300,
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.lightbulb_outline_rounded,
                          size: 18,
                          color:
                              isDark ? AppColors.darkMuted : AppColors.gray500,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            instructions,
                            style: TextStyle(
                              fontSize: 13,
                              height: 1.35,
                              color: isDark
                                  ? AppColors.darkMuted
                                  : AppColors.gray700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(secondaryLabel),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              style: FilledButton.styleFrom(
                backgroundColor: style.accent,
                foregroundColor: isDark ? AppColors.black : Colors.white,
              ),
              child: Text(retryLabel),
            ),
          ],
        );
      },
    );
    return result ?? false;
  }

  /// Alternativa no bloqueante para avisos sin decision.
  static void showSnackBar(
    BuildContext context, {
    required String message,
    StatusAlertType type = StatusAlertType.warning,
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) {
      return;
    }
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final style = _StatusAlertStyle.of(type, isDark);
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          backgroundColor: isDark ? AppColors.darkCard : AppColors.gray900,
          content: Row(
            children: [
              Icon(style.icon, size: 20, color: style.accent),
              const SizedBox(width: 10),
              Expanded(child: Text(message)),
            ],
          ),
          action: actionLabel != null && onAction != null
              ? SnackBarAction(
                  label: actionLabel,
                  textColor: style.accent,
                  onPressed: onAction,
                )
              : null,
        ),
      );
  }
}

/// Banner de aviso conservado para compatibilidad.
///
/// Preferir [StatusAlert] en codigo nuevo.
@Deprecated('Usa StatusAlert en su lugar.')
class StatusBanner extends StatelessWidget {
  const StatusBanner({
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
    this.secondaryLabel,
    this.onSecondary,
    super.key,
  });

  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;

  @override
  Widget build(BuildContext context) {
    return StatusAlert(
      title: title,
      message: message,
      actionLabel: actionLabel,
      onAction: onAction,
      secondaryLabel: secondaryLabel,
      onSecondary: onSecondary,
    );
  }
}

/// Colores e icono resueltos para cada [StatusAlertType].
class _StatusAlertStyle {
  const _StatusAlertStyle({
    required this.accent,
    required this.background,
    required this.border,
    required this.icon,
  });

  final Color accent;
  final Color background;
  final Color border;
  final IconData icon;

  static _StatusAlertStyle of(StatusAlertType type, bool isDark) {
    switch (type) {
      case StatusAlertType.info:
        return _StatusAlertStyle(
          accent: isDark ? const Color(0xFF8FA2FF) : AppColors.primary,
          background: isDark ? const Color(0xFF13203A) : AppColors.primarySoft,
          border: isDark ? const Color(0xFF243B63) : const Color(0xFFB9C2FF),
          icon: Icons.info_outline_rounded,
        );
      case StatusAlertType.error:
        return _StatusAlertStyle(
          accent: isDark ? const Color(0xFFF87171) : AppColors.danger,
          background:
              isDark ? const Color(0xFF2A1315) : const Color(0xFFFEF2F2),
          border: isDark ? const Color(0xFF4C1D1F) : const Color(0xFFFECACA),
          icon: Icons.error_outline_rounded,
        );
      case StatusAlertType.warning:
        return _StatusAlertStyle(
          accent: isDark ? AppColors.secondary : AppColors.secondaryDark,
          background:
              isDark ? const Color(0xFF2A2410) : const Color(0xFFFFFBEB),
          border: isDark ? const Color(0xFF4D4118) : const Color(0xFFFDE68A),
          icon: Icons.warning_amber_rounded,
        );
    }
  }
}
