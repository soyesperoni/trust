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
  static final RoundedRectangleBorder _buttonShape = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(10),
  );

  static const EdgeInsets _buttonPadding = EdgeInsets.symmetric(horizontal: 16, vertical: 14);

  ThemeMode _themeMode = ThemeMode.system;
  bool _showSplash = true;

  bool get _isDarkMode {
    if (_themeMode == ThemeMode.dark) {
      return true;
    }
    if (_themeMode == ThemeMode.light) {
      return false;
    }

    return WidgetsBinding.instance.platformDispatcher.platformBrightness == Brightness.dark;
  }

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
      _themeMode = _isDarkMode ? ThemeMode.light : ThemeMode.dark;
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
          secondaryContainer: AppColors.yellowSoft,
          onSecondaryContainer: AppColors.black,
          surface: Colors.white,
          onSurface: AppColors.gray900,
          onSurfaceVariant: AppColors.gray500,
          outline: AppColors.gray300,
        ),
        scaffoldBackgroundColor: AppColors.gray50,
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            shape: _buttonShape,
            padding: _buttonPadding,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            shape: _buttonShape,
            padding: _buttonPadding,
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            shape: _buttonShape,
            padding: _buttonPadding,
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            shape: _buttonShape,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
        ),
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
          secondary: AppColors.darkMuted,
          onSecondary: Colors.white,
          secondaryContainer: const Color(0xFF3F3A1B),
          onSecondaryContainer: const Color(0xFFF5E9A8),
          surface: AppColors.darkSurface,
          onSurface: const Color(0xFFF8FAFC),
          onSurfaceVariant: AppColors.darkMuted,
          outline: AppColors.darkCardBorder,
        ),
        scaffoldBackgroundColor: AppColors.darkBackground,
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            shape: _buttonShape,
            padding: _buttonPadding,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            shape: _buttonShape,
            padding: _buttonPadding,
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            shape: _buttonShape,
            padding: _buttonPadding,
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            shape: _buttonShape,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
        ),
        textTheme: GoogleFonts.poppinsTextTheme(ThemeData.dark().textTheme),
        primaryTextTheme: GoogleFonts.poppinsTextTheme(ThemeData.dark().primaryTextTheme),
        useMaterial3: true,
      ),
      themeMode: _themeMode,
      home: _showSplash
          ? const TrustSplashScreen()
          : LoginScreen(
              isDarkMode: _isDarkMode,
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
