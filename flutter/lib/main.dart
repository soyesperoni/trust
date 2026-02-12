import 'package:flutter/material.dart';

import 'src/screens/login_screen.dart';

void main() {
  runApp(const TrustApp());
}

class TrustApp extends StatelessWidget {
  const TrustApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Trust Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFE5B43C)),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}
