import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'home_screen.dart';
import '../services/trust_repository.dart';
import '../theme/app_colors.dart';
import '../models/user_role.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    required this.isDarkMode,
    required this.onToggleThemeMode,
    super.key,
  });

  final bool isDarkMode;
  final VoidCallback onToggleThemeMode;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _repository = TrustRepository();

  bool _isSubmitting = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _isSubmitting) {
      return;
    }

    setState(() => _isSubmitting = true);
    final email = _emailController.text.trim();

    try {
      final response = await _repository.login(
        email: email,
        password: _passwordController.text,
      );
      final user = response['user'] as Map<String, dynamic>?;
      final resolvedEmail = (user?['email'] as String?)?.trim();
      final resolvedRole = UserRoleParsing.fromBackendRole(user?['role'] as String?);

      if (!mounted) {
        return;
      }

      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => HomeScreen(
            email: (resolvedEmail == null || resolvedEmail.isEmpty) ? email : resolvedEmail,
            role: resolvedRole,
            isDarkMode: widget.isDarkMode,
            onToggleThemeMode: widget.onToggleThemeMode,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    const primary = AppColors.yellow;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final background = isDark ? AppColors.darkBackground : Colors.white;
    final titleColor = isDark ? Colors.white : primary;
    final inputFill = isDark ? AppColors.darkSurface : Colors.white;
    final inputBorder = isDark ? AppColors.darkCardBorder : AppColors.gray300;
    final hintColor = isDark ? AppColors.darkMuted : const Color(0xFF94A3B8);
    final inputTextColor = isDark ? Colors.white : const Color(0xFF111827);

    return Scaffold(
      backgroundColor: background,
      body: SafeArea(
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (!isDark)
              Positioned(
                top: -220,
                right: -220,
                child: Container(
                  width: 600,
                  height: 600,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [Color(0xCCF3F4F6), Color(0x00FFFFFF)],
                    ),
                  ),
                ),
              ),
            if (!isDark)
              Positioned(
                bottom: -160,
                left: -160,
                child: Container(
                  width: 500,
                  height: 500,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(0x99F3F4F6),
                  ),
                ),
              ),
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 380),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: 24),
                        Text(
                          'trust',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.poppins(
                            color: titleColor,
                            fontWeight: FontWeight.w700,
                            fontSize: 60,
                            letterSpacing: -1,
                          ),
                        ),
                        const SizedBox(height: 60),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                          TextFormField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            decoration: InputDecoration(
                              hintText: 'Correo electrónico',
                              hintStyle: TextStyle(color: hintColor, fontSize: 16, fontWeight: FontWeight.w500),
                              filled: true,
                              fillColor: inputFill,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(color: inputBorder),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(color: inputBorder),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: const BorderSide(color: primary, width: 2),
                              ),
                            ),
                            style: TextStyle(color: inputTextColor, fontSize: 16),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Ingresa tu correo electrónico';
                              }
                              if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value.trim())) {
                                return 'Ingresa un correo válido';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 14),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: true,
                            decoration: InputDecoration(
                              hintText: 'Contraseña',
                              hintStyle: TextStyle(color: hintColor, fontSize: 16, fontWeight: FontWeight.w500),
                              filled: true,
                              fillColor: inputFill,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(color: inputBorder),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(color: inputBorder),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: const BorderSide(color: primary, width: 2),
                              ),
                            ),
                            style: TextStyle(color: inputTextColor, fontSize: 16),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Ingresa tu contraseña';
                              }
                              return null;
                            },
                          ),
                          FilledButton(
                            style: FilledButton.styleFrom(
                              backgroundColor: primary,
                              disabledBackgroundColor: const Color(0xFFFFE680),
                              foregroundColor: const Color(0xFF111827),
                              padding: const EdgeInsets.symmetric(vertical: 18),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              textStyle: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
