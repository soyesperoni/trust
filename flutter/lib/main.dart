import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'src/screens/login_screen.dart';
import 'src/theme/app_colors.dart';

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
    return MaterialApp(
      title: 'Trust Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: AppColors.yellow).copyWith(
          primary: AppColors.yellow,
          onPrimary: AppColors.black,
          secondary: AppColors.charcoal,
          onSecondary: Colors.white,
          surface: Colors.white,
          onSurface: AppColors.gray900,
          onSurfaceVariant: AppColors.gray500,
          outline: AppColors.gray300,
        ),
        scaffoldBackgroundColor: AppColors.gray50,
        textTheme: GoogleFonts.poppinsTextTheme(),
        primaryTextTheme: GoogleFonts.poppinsTextTheme(),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.yellowDark,
          brightness: Brightness.dark,
        ).copyWith(
          primary: AppColors.yellow,
          onPrimary: AppColors.black,
          surface: AppColors.black,
          onSurface: Colors.white,
          onSurfaceVariant: AppColors.gray300,
          outline: AppColors.gray700,
        ),
        scaffoldBackgroundColor: AppColors.black,
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
      backgroundColor: AppColors.black,
      body: Center(
        child: Text(
          'trust',
          style: GoogleFonts.poppins(
            color: AppColors.yellow,
            fontSize: 54,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
