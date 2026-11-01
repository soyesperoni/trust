import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trust_mobile/src/services/local_db_service.dart';
import 'package:trust_mobile/src/widgets/sync_status_badge.dart';

void main() {
  Widget wrap(Widget child) {
    return MaterialApp(home: Scaffold(body: child));
  }

  testWidgets('muestra pendiente, sincronizado y error', (tester) async {
    await tester.pumpWidget(wrap(
      const Column(
        children: [
          SyncStatusBadge(
            entityType: 'visit',
            entityId: '1',
            status: SyncQueueStatus.pending,
            compact: true,
          ),
          SyncStatusBadge(
            entityType: 'visit',
            entityId: '2',
            status: SyncQueueStatus.synced,
            compact: true,
          ),
          SyncStatusBadge(
            entityType: 'audit',
            entityId: '3',
            status: SyncQueueStatus.error,
            compact: true,
          ),
        ],
      ),
    ));

    expect(find.text('Pendiente'), findsOneWidget);
    expect(find.text('Sincronizado'), findsOneWidget);
    expect(find.text('Error'), findsOneWidget);
  });
}
