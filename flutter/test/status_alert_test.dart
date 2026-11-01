import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trust_mobile/src/widgets/status_alert.dart';

Widget _wrap(Widget child) {
  return MaterialApp(home: Scaffold(body: child));
}

void main() {
  testWidgets('emailUnauthorized muestra aviso y accion', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      _wrap(StatusAlert.emailUnauthorized(onAuthorize: () => tapped = true)),
    );

    expect(find.text('Correo no autorizado'), findsOneWidget);
    expect(find.text('Autorizar correo'), findsOneWidget);

    await tester.tap(find.text('Autorizar correo'));
    expect(tapped, isTrue);
  });

  testWidgets('sessionExpired dirige a iniciar sesion', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      _wrap(StatusAlert.sessionExpired(onLogin: () => tapped = true)),
    );

    expect(find.text('Sesion expirada'), findsOneWidget);
    await tester.tap(find.text('Iniciar sesion'));
    expect(tapped, isTrue);
  });

  testWidgets('pdfUnavailable distingue visita y auditoria', (tester) async {
    await tester.pumpWidget(
      _wrap(StatusAlert.pdfUnavailable(isAudit: false)),
    );
    expect(find.textContaining('La visita no esta registrada'), findsOneWidget);

    await tester.pumpWidget(
      _wrap(StatusAlert.pdfUnavailable(isAudit: true)),
    );
    expect(find.textContaining('La auditoria no esta registrada'), findsOneWidget);
  });

  testWidgets('printerUnavailable y biometricsUnavailable permiten reintentar',
      (tester) async {
    var printerRetries = 0;
    await tester.pumpWidget(
      _wrap(StatusAlert.printerUnavailable(onRetry: () => printerRetries++)),
    );
    expect(find.text('Impresora no disponible'), findsOneWidget);
    await tester.tap(find.text('Reintentar impresion'));
    expect(printerRetries, 1);

    var biometricRetries = 0;
    var usePassword = false;
    await tester.pumpWidget(
      _wrap(
        StatusAlert.biometricsUnavailable(
          onRetry: () => biometricRetries++,
          onUsePassword: () => usePassword = true,
        ),
      ),
    );
    expect(find.text('Biometria no disponible'), findsOneWidget);
    await tester.tap(find.text('Reintentar'));
    expect(biometricRetries, 1);
    await tester.tap(find.text('Usar contrasena'));
    expect(usePassword, isTrue);
  });
}
