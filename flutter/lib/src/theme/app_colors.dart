import 'package:flutter/material.dart';

class AppColors {
  const AppColors._();

  static const Color primary = Color(0xFF2E3192);
  static const Color primaryDark = Color(0xFF252876);
  static const Color primarySoft = Color(0xFFDDE1FF);

  static const Color secondary = Color(0xFF92B93B);
  static const Color secondaryDark = Color(0xFF7F9F33);
  static const Color secondarySoft = Color(0xFFE8F2D6);

  // Backward-compatible aliases used throughout existing screens.
  static const Color yellow = secondary;
  static const Color yellowDark = secondaryDark;
  static const Color yellowSoft = secondarySoft;

  static const Color black = Color(0xFF111111);
  static const Color charcoal = Color(0xFF2A2A2A);

  static const Color gray900 = Color(0xFF1F1F1F);
  static const Color gray700 = Color(0xFF4F4F4F);
  static const Color gray500 = Color(0xFF7A7A7A);
  static const Color gray300 = Color(0xFFD6D6D6);
  static const Color gray100 = Color(0xFFF3F3F3);
  static const Color gray50 = Color(0xFFF8F8F8);

  static const Color danger = Color(0xFFDC2626);

  // Dark palette aligned with Next.js mobile frontend.
  static const Color darkBackground = Color(0xFF020617);
  static const Color darkSurface = Color(0xFF0F172A);
  static const Color darkCard = Color(0xFF161E27);
  static const Color darkCardBorder = Color(0xFF1E293B);
  static const Color darkMuted = Color(0xFF94A3B8);
}
