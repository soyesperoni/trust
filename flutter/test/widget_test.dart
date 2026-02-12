import 'package:flutter_test/flutter_test.dart';
import 'package:trust_mobile/main.dart';

void main() {
  testWidgets('renders Trust Mobile app shell', (WidgetTester tester) async {
    await tester.pumpWidget(const TrustApp());

    expect(find.text('Trust Dashboard'), findsOneWidget);
  });
}
