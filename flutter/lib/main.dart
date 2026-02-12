import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'src/screens/login_screen.dart';

void main() {
  runApp(const TrustApp());
}

class TrustApp extends StatefulWidget {
  const TrustApp({super.key});

  @override
  State<TrustApp> createState() => _TrustAppState();
}

class _TrustAppState extends State<TrustApp> {
  ThemeMode _themeMode = ThemeMode.light;
  bool _showSplash = true;

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(const Duration(milliseconds: 1600), () {
      if (!mounted) {
        return;
      }
      setState(() {
        _showSplash = false;
      });
    });
  }

  void _toggleThemeMode() {
    setState(() {
      _themeMode = _themeMode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    });
  }

  @override
  Widget build(BuildContext context) {
    const darkOrange = Color(0xFFB87700);

    return MaterialApp(
      title: 'Trust Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFE5B43C)).copyWith(
          surface: Colors.white,
        ),
        scaffoldBackgroundColor: Colors.white,
        textTheme: GoogleFonts.poppinsTextTheme(),
        primaryTextTheme: GoogleFonts.poppinsTextTheme(),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: darkOrange,
          brightness: Brightness.dark,
        ).copyWith(
          surface: darkOrange,
        ),
        scaffoldBackgroundColor: darkOrange,
        textTheme: GoogleFonts.poppinsTextTheme(ThemeData.dark().textTheme),
        primaryTextTheme: GoogleFonts.poppinsTextTheme(ThemeData.dark().primaryTextTheme),
        useMaterial3: true,
      ),
      themeMode: _themeMode,
      home: _showSplash
          ? const TrustSplashScreen()
          : LoginScreen(
              isDarkMode: _themeMode == ThemeMode.dark,
              onToggleThemeMode: _toggleThemeMode,
            ),
    );
  }
}

class TrustSplashScreen extends StatelessWidget {
  const TrustSplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Text(
          'trust',
          style: GoogleFonts.poppins(
            color: const Color(0xFFFACC15),
            fontSize: 54,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
